/* Manutenção — regras puras (sem DOM, sem base de dados). Ficheiro igual na Prodn-Mgt e na Grain-Mgt.
 * Todos os registos ficam numa só loja 'maint' (chave uid), com o campo kind:
 *   shift       — turno de manutenção: técnicos de serviço e notas de passagem de turno
 *   stop        — paragem/avaria: categoria (Process | Breakdown | Other), código FMO, duração (min)
 *   work        — intervenção: o que se fez, material usado, quem fez, início/fim
 *   pmJob       — trabalho de manutenção preventiva planeado para uma semana ISO
 *   pmUpdate    — progresso de um trabalho preventivo (em curso, feito, adiado, cancelado)
 *   rollCheck   — verificação semanal do estado de uma passagem de rolos (só Prodn-Mgt)
 *   rollChange  — troca de rolos de uma passagem, com reestriagem (só Prodn-Mgt)
 *   consumable  — consumível pedido/usado no turno
 *   void        — anulação de um registo (os registos nunca se alteram nem se apagam)
 * Registos de manutenção são separados do diário de turno da Prodn-Mgt (decisão de Zhax, 27-10-2026):
 * os minutos aqui NÃO entram no indicador de paragens de 72 min/dia. */
(function (root) {
  'use strict';
  const KINDS = ['shift', 'stop', 'work', 'pmJob', 'pmUpdate', 'rollCheck', 'rollChange', 'consumable', 'void'];
  // Categorias pedidas por Zhax; os códigos vêm da lista FMO pela primeira letra (P = Process, A = Breakdown, O = Other),
  // como no diário de turno. Códigos sem P/A/O ficam em Other.
  const CATEGORIES = ['Process', 'Breakdown', 'Other'];
  const PREFIX_CAT = { P: 'Process', A: 'Breakdown', O: 'Other' };
  const WORK_TYPES = ['corrective', 'preventive', 'inspection', 'other'];
  const PM_STATUS = ['planned', 'in_progress', 'done', 'postponed', 'cancelled'];
  const PM_UPDATES = ['in_progress', 'done', 'postponed', 'cancelled'];
  const ROLL_COND = ['good', 'monitor', 'worn', 'damaged'];
  const ROLL_REASONS = ['scheduled', 'wear', 'damage', 'other'];
  const UNITS = ['un', 'kg', 'l', 'm', 'par', 'cx'];
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const WEEK_RE = /^\d{4}-W\d{2}$/;
  const isNum = x => typeof x === 'number' && isFinite(x);
  const txt = v => String(v === null || v === undefined ? '' : v).trim();

  // Número: aceita vírgula decimal e espaços de milhares. null = vazio, NaN = inválido.
  function num(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    const s = String(v).trim().replace(/[\s ]/g, '');
    if (!s) return null;
    const n = Number(s.replace(',', '.'));
    return /^-?\d+([.,]\d+)?$/.test(s) ? n : NaN;
  }

  // ---------- datas (texto AAAA-MM-DD, sem fuso) ----------
  const dms = d => Date.parse(d + 'T12:00:00Z');
  const ymd = ms => new Date(ms).toISOString().slice(0, 10);
  function addDays(d, n) { return ymd(dms(d) + n * 86400000); }
  function daysBetween(a, b) { return Math.round((dms(b) - dms(a)) / 86400000); }
  // Semana ISO (segunda a domingo): '2026-W44'
  function weekOf(d) {
    const x = new Date(dms(d));
    const wd = (x.getUTCDay() + 6) % 7;                 // 0 = segunda
    const thu = new Date(dms(d) + (3 - wd) * 86400000);
    const y = thu.getUTCFullYear();
    const jan4 = Date.UTC(y, 0, 4), w1 = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * 86400000;
    const w = Math.floor((Date.UTC(y, thu.getUTCMonth(), thu.getUTCDate()) - w1) / (7 * 86400000)) + 1;
    return y + '-W' + String(w).padStart(2, '0');
  }
  // [segunda, domingo] de uma semana ISO
  function weekRange(week) {
    if (!WEEK_RE.test(week)) return null;
    const y = +week.slice(0, 4), w = +week.slice(6);
    const jan4 = Date.UTC(y, 0, 4), mon = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * 86400000 + (w - 1) * 7 * 86400000;
    return [ymd(mon), ymd(mon + 6 * 86400000)];
  }
  const validWeek = w => { const r = weekRange(w); return !!r && weekOf(r[0]) === w; };

  // ---------- códigos ----------
  const catOfCode = code => PREFIX_CAT[String(code || '').charAt(0)] || 'Other';
  function codesFor(cat, codes) { return (codes || []).filter(c => c.active !== false && catOfCode(c.code) === cat); }
  const findCode = (code, codes) => (codes || []).find(c => c.code === code) || null;

  // Registos em vigor: sem anulações nem os anulados
  function effective(entries) {
    const voided = new Set((entries || []).filter(e => e && e.kind === 'void').map(e => e.voids));
    return (entries || []).filter(e => e && e.kind !== 'void' && !voided.has(e.uid));
  }
  const byTime = (a, b) => (a.t || 0) - (b.t || 0);

  // ---------- validação (devolve lista de campos em falta/inválidos) ----------
  function validateShift(o) {
    const e = [];
    if (!DAY_RE.test(o.prodDay || '')) e.push('prodDay');
    if (o.period !== 'D' && o.period !== 'N') e.push('period');
    if (!txt(o.technicians)) e.push('technicians');
    if (!txt(o.by)) e.push('by');
    return e;
  }
  function validateStop(o, codes) {
    const e = [];
    if (CATEGORIES.indexOf(o.category) < 0) e.push('category');
    const c = o.code ? findCode(o.code, codes) : null;
    if (!c || c.active === false || catOfCode(c.code) !== o.category) e.push('code');
    const d = num(o.durationMin);
    if (d === null || isNaN(d) || d <= 0 || d > 24 * 60) e.push('durationMin');
    if (!txt(o.description)) e.push('description');
    if (!txt(o.by)) e.push('by');
    return e;
  }
  // Material: linhas {item, qty, unit}; linhas totalmente vazias são ignoradas
  function cleanParts(parts) { return (parts || []).filter(p => p && (txt(p.item) || txt(p.qty))); }
  function partsErrors(parts) {
    return cleanParts(parts).some(p => { const q = num(p.qty); return !txt(p.item) || q === null || isNaN(q) || q <= 0 || UNITS.indexOf(p.unit) < 0; }) ? ['parts'] : [];
  }
  function validateWork(o) {
    const e = [];
    if (WORK_TYPES.indexOf(o.workType) < 0) e.push('workType');
    if (!txt(o.equipment)) e.push('equipment');
    if (!txt(o.description)) e.push('description');
    if (!txt(o.doneBy)) e.push('doneBy');
    if (isNum(o.startT) && isNum(o.endT) && o.endT <= o.startT) e.push('endT');
    if ((o.startT !== null && o.startT !== undefined && !isNum(o.startT)) || (o.endT !== null && o.endT !== undefined && !isNum(o.endT))) e.push('time');
    if (!txt(o.by)) e.push('by');
    return e.concat(partsErrors(o.parts));
  }
  function validatePmJob(o) {
    const e = [];
    if (!validWeek(o.week)) e.push('week');
    if (!DAY_RE.test(o.dueDate || '')) e.push('dueDate');
    if (!txt(o.equipment)) e.push('equipment');
    if (!txt(o.task)) e.push('task');
    if (!txt(o.responsible)) e.push('responsible');
    if (!txt(o.by)) e.push('by');
    return e;
  }
  function validatePmUpdate(o, job) {
    const e = [];
    if (!job) e.push('job');
    if (PM_UPDATES.indexOf(o.status) < 0) e.push('status');
    const p = num(o.progressPct);
    if (o.status === 'in_progress' && (p === null || isNaN(p) || p < 0 || p > 100)) e.push('progressPct');
    if (o.status === 'postponed') {
      if (!DAY_RE.test(o.newDue || '')) e.push('newDue');
      if (!txt(o.note)) e.push('note');
    }
    if (o.status === 'cancelled' && !txt(o.note)) e.push('note');
    if (o.status === 'done' && !txt(o.doneBy)) e.push('doneBy');
    if (!txt(o.by)) e.push('by');
    return e;
  }
  const passageOf = (id, passages) => (passages || []).find(p => p.id === id) || null;
  function validateRollCheck(o, passages) {
    const e = [];
    if (!passageOf(o.passageId, passages)) e.push('passageId');
    if (!validWeek(o.week)) e.push('week');
    if (ROLL_COND.indexOf(o.condition) < 0) e.push('condition');
    if (o.plannedChange && !DAY_RE.test(o.plannedChange)) e.push('plannedChange');
    if ((o.condition === 'worn' || o.condition === 'damaged') && !txt(o.note)) e.push('note');
    if (!txt(o.by)) e.push('by');
    return e;
  }
  function validateRollChange(o, passages) {
    const e = [];
    if (!passageOf(o.passageId, passages)) e.push('passageId');
    if (!DAY_RE.test(o.date || '')) e.push('date');
    if (ROLL_REASONS.indexOf(o.reason) < 0) e.push('reason');
    if (o.nextPlanned && (!DAY_RE.test(o.nextPlanned) || (DAY_RE.test(o.date || '') && o.nextPlanned <= o.date))) e.push('nextPlanned');
    if (!txt(o.doneBy)) e.push('doneBy');
    if (!txt(o.by)) e.push('by');
    return e;
  }
  function validateConsumable(o) {
    const e = [];
    if (!txt(o.item)) e.push('item');
    const q = num(o.qty);
    if (q === null || isNaN(q) || q <= 0) e.push('qty');
    if (UNITS.indexOf(o.unit) < 0) e.push('unit');
    if (!txt(o.by)) e.push('by');
    return e;
  }

  // ---------- preventiva ----------
  // Estado de cada trabalho em 'today' (AAAA-MM-DD): último registo de progresso manda; adiado muda a data-limite.
  // overdue = não feito nem cancelado e today > data-limite (o próprio dia-limite ainda conta como dentro do prazo).
  function pmState(entries, today) {
    const eff = effective(entries);
    const ups = eff.filter(e => e.kind === 'pmUpdate').sort(byTime);
    return eff.filter(e => e.kind === 'pmJob').sort(byTime).map(j => {
      const mine = ups.filter(u => u.jobUid === j.uid);
      let status = 'planned', due = j.dueDate, progress = 0, doneAt = null, doneBy = null, postponed = 0;
      mine.forEach(u => {
        status = u.status;
        if (u.status === 'in_progress' && isNum(num(u.progressPct))) progress = num(u.progressPct);
        if (u.status === 'postponed') { due = u.newDue; postponed++; }
        if (u.status === 'done') { progress = 100; doneAt = u.prodDay || null; doneBy = u.doneBy || null; }
      });
      const open = status !== 'done' && status !== 'cancelled';
      const overdue = open && DAY_RE.test(today || '') && today > due;
      return { job: j, uid: j.uid, week: j.week, status, due, progress, doneAt, doneBy, postponed, updates: mine, open, overdue,
        daysLate: overdue ? daysBetween(due, today) : 0 };
    });
  }
  // Resumo de uma semana: trabalhos planeados nessa semana + os de semanas anteriores ainda em aberto
  function pmWeek(entries, week, today) {
    const all = pmState(entries, today);
    const r = weekRange(week);
    const list = all.filter(s => s.week === week || (s.open && r && s.week < week));
    const planned = all.filter(s => s.week === week);
    const done = planned.filter(s => s.status === 'done').length;
    const counted = planned.filter(s => s.status !== 'cancelled').length;
    return { week, list, planned: planned.length, done, compliancePct: counted ? Math.round(done / counted * 1000) / 10 : null,
      overdue: list.filter(s => s.overdue).length, carried: list.filter(s => s.week !== week).length };
  }

  // ---------- rolos ----------
  // passages: [{id, lineId, name, fluteSpec, refluteEveryDays}] (lista de Zhax, por enviar).
  // Data planeada de troca: a mais recente indicada numa verificação ou numa troca (próxima troca).
  // Uma troca sem próxima data limpa o plano; sem plano e com intervalo de reestriagem, a data é calculada (calc: true).
  function rollState(passages, entries, today) {
    const eff = effective(entries).filter(e => e.kind === 'rollCheck' || e.kind === 'rollChange').sort(byTime);
    const thisWeek = DAY_RE.test(today || '') ? weekOf(today) : null;
    return (passages || []).map(p => {
      const mine = eff.filter(e => e.passageId === p.id);
      let plan = null, lastCheck = null, lastChange = null;
      const changes = [];
      mine.forEach(e => {
        if (e.kind === 'rollCheck') { lastCheck = e; if (e.plannedChange) plan = e.plannedChange; }
        else { lastChange = e; changes.push(e); plan = e.nextPlanned || null; }
      });
      let calc = false;
      if (!plan && lastChange && isNum(p.refluteEveryDays) && p.refluteEveryDays > 0) { plan = addDays(lastChange.date, p.refluteEveryDays); calc = true; }
      const dates = changes.map(c => c.date).sort();
      const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i], d));
      const last12 = DAY_RE.test(today || '') ? dates.filter(d => d > addDays(today, -365) && d <= today) : dates;
      const overdue = !!(plan && DAY_RE.test(today || '') && today > plan);
      return { passage: p, id: p.id, lineId: p.lineId, plan, planCalc: calc, overdue, daysLate: overdue ? daysBetween(plan, today) : 0,
        // estado: só da verificação feita depois da última troca (rolos novos ainda sem verificação = null)
        lastCheck, condition: lastCheck && (!lastChange || byTime(lastCheck, lastChange) > 0) ? lastCheck.condition : null,
        checkedThisWeek: !!(lastCheck && thisWeek && lastCheck.week === thisWeek),
        lastChange, changes: changes.length, changes12m: last12.length, refluted: changes.filter(c => c.refluted).length,
        avgDaysBetween: gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null,
        fluteSpec: (lastChange && txt(lastChange.fluteSpec)) || p.fluteSpec || '' };
    });
  }

  // ---------- consumíveis e turno ----------
  // Totais por artigo e unidade (artigo sem distinção de maiúsculas/espaços)
  function consumableTotals(list) {
    const m = new Map();
    (list || []).forEach(c => {
      const q = num(c.qty); if (!isNum(q)) return;
      const k = txt(c.item).toLowerCase().replace(/\s+/g, ' ') + '|' + c.unit;
      const x = m.get(k) || { item: txt(c.item), unit: c.unit, qty: 0, n: 0 };
      x.qty = Math.round((x.qty + q) * 1000) / 1000; x.n++;
      m.set(k, x);
    });
    return Array.from(m.values()).sort((a, b) => a.item.localeCompare(b.item));
  }
  // Registos de um turno (dia de produção + D|N)
  function shiftSummary(entries, day, period) {
    const eff = effective(entries).filter(e => e.prodDay === day && (!period || e.period === period)).sort(byTime);
    const stops = eff.filter(e => e.kind === 'stop'), works = eff.filter(e => e.kind === 'work'), cons = eff.filter(e => e.kind === 'consumable');
    const byCat = {}; CATEGORIES.forEach(c => { byCat[c] = 0; });
    stops.forEach(s => { const d = num(s.durationMin); if (isNum(d)) byCat[CATEGORIES.indexOf(s.category) >= 0 ? s.category : 'Other'] += d; });
    return { shifts: eff.filter(e => e.kind === 'shift'), stops, works, consumables: cons, stopMin: CATEGORIES.reduce((s, c) => s + byCat[c], 0), byCat,
      consumableTotals: consumableTotals(cons) };
  }
  // Avisos para a app e para o relatório: preventiva em atraso e troca de rolos com data passada
  function warnings(entries, passages, today) {
    const w = [];
    pmState(entries, today).filter(s => s.overdue).forEach(s => w.push({ type: 'pm_overdue', uid: s.uid, equipment: s.job.equipment, task: s.job.task,
      due: s.due, daysLate: s.daysLate, responsible: s.job.responsible, week: s.week }));
    rollState(passages, entries, today).filter(r => r.overdue).forEach(r => w.push({ type: 'roll_overdue', passageId: r.id, lineId: r.lineId,
      name: r.passage.name, due: r.plan, calc: r.planCalc, daysLate: r.daysLate }));
    return w;
  }

  const api = { KINDS, CATEGORIES, WORK_TYPES, PM_STATUS, PM_UPDATES, ROLL_COND, ROLL_REASONS, UNITS,
    num, addDays, daysBetween, weekOf, weekRange, validWeek, catOfCode, codesFor, findCode, effective, cleanParts,
    validateShift, validateStop, validateWork, validatePmJob, validatePmUpdate, validateRollCheck, validateRollChange, validateConsumable,
    pmState, pmWeek, rollState, consumableTotals, shiftSummary, warnings, passageOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Maint = api;
})(typeof window !== 'undefined' ? window : this);
