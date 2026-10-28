/* Manutenção — regras puras (sem DOM, sem base de dados). Ficheiro igual na Prodn-Mgt e na Grain-Mgt.
 * Todos os registos ficam numa só loja 'maint' (chave uid), com o campo kind:
 *   shift       — turno de manutenção: técnicos de serviço e notas de passagem de turno
 *   stop        — paragem/avaria: categoria (Process | Breakdown | Other), código FMO, duração (min)
 *   work        — intervenção: o que se fez, material usado, quem fez, início/fim
 *   pmJob       — trabalho de manutenção preventiva planeado para uma semana ISO
 *   pmUpdate    — progresso de um trabalho preventivo (em curso, feito, adiado, cancelado)
 *   rollCheck   — inspecção semanal de um par de rolos depois das horas ideais (bom | para reestriar | crítico) (só Prodn-Mgt)
 *   rollChange  — troca/reestriagem de um par de rolos, com IDs e diâmetros novos (só Prodn-Mgt)
 *   rollMeasure — diâmetro de cada rolo do par (rápido e lento), em mm (só Prodn-Mgt)
 *   brushCheck  — estado das escovas do par (bom | gasto | crítico | em falta) (só Prodn-Mgt)
 *   rollConfig  — Definições dos rolos: horas ideais por passagem, ou IDs dos rolos de um par (com PIN; só Prodn-Mgt)
 *   sensorAck   — defeito de sensor de temperatura já conhecido (silo, cabo, sensor; só Grain-Mgt): sai do aviso do topo
 *   consumable  — consumível pedido/usado no turno
 *   note        — informação adicional: observação, requisito ou outra
 *   void        — anulação de um registo (os registos nunca se alteram nem se apagam)
 * Registos de manutenção são separados do diário de turno da Prodn-Mgt (decisão de Zhax, 27-10-2026):
 * os minutos aqui NÃO entram no indicador de paragens de 72 min/dia. */
(function (root) {
  'use strict';
  const KINDS = ['shift', 'stop', 'work', 'pmJob', 'pmUpdate', 'rollCheck', 'rollChange', 'rollMeasure', 'brushCheck', 'rollConfig', 'sensorAck', 'consumable', 'note', 'void'];
  // Categorias pedidas por Zhax; os códigos vêm da lista FMO pela primeira letra (P = Process, A = Breakdown, O = Other),
  // como no diário de turno. Códigos sem P/A/O ficam em Other.
  const CATEGORIES = ['Process', 'Breakdown', 'Other'];
  const PREFIX_CAT = { P: 'Process', A: 'Breakdown', O: 'Other' };
  const WORK_TYPES = ['corrective', 'preventive', 'inspection', 'other'];
  const PM_STATUS = ['planned', 'in_progress', 'done', 'postponed', 'cancelled'];
  const PM_UPDATES = ['in_progress', 'done', 'postponed', 'cancelled'];
  // Inspecção semanal depois das horas ideais (Zhax, 28-10-2026): ainda bom | para reestriar | estado crítico
  const ROLL_COND = ['good', 'due', 'critical'];
  const BRUSH_STATES = ['good', 'worn', 'critical', 'missing'];   // aviso: crítico ou em falta
  const NOTE_TOPICS = ['observation', 'requirement', 'other'];
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
    if (o.condition && o.condition !== 'good' && !txt(o.note)) e.push('note');
    if (!txt(o.by)) e.push('by');
    return e;
  }
  // Diâmetro (mm): vazio = não medido; com valor, entre 150 e 300 mm (rolos de Ø 250 mm nas tabelas de estriagem)
  const badDia = v => { const n = num(v); return n !== null && (isNaN(n) || n < 150 || n > 300); };
  function validateRollChange(o, passages) {
    const e = [];
    if (!passageOf(o.passageId, passages)) e.push('passageId');
    if (!DAY_RE.test(o.date || '')) e.push('date');
    if (ROLL_REASONS.indexOf(o.reason) < 0) e.push('reason');
    if (badDia(o.diaFast)) e.push('diaFast');
    if (badDia(o.diaSlow)) e.push('diaSlow');
    if (!txt(o.doneBy)) e.push('doneBy');
    if (!txt(o.by)) e.push('by');
    return e;
  }
  function validateRollMeasure(o, passages) {
    const e = [];
    if (!passageOf(o.passageId, passages)) e.push('passageId');
    if (num(o.diaFast) === null && num(o.diaSlow) === null) e.push('diaFast');
    else { if (badDia(o.diaFast)) e.push('diaFast'); if (badDia(o.diaSlow)) e.push('diaSlow'); }
    if (!txt(o.by)) e.push('by');
    return e;
  }
  function validateBrushCheck(o, passages) {
    const e = [];
    if (!passageOf(o.passageId, passages)) e.push('passageId');
    if (BRUSH_STATES.indexOf(o.state) < 0) e.push('state');
    if ((o.state === 'critical' || o.state === 'missing') && !txt(o.note)) e.push('note');
    if (!txt(o.by)) e.push('by');
    return e;
  }
  // Definições dos rolos: horas ideais de um grupo (B1…G3, R) ou IDs dos dois rolos (rápido e lento) de um par
  function validateRollConfig(o, passages, groups) {
    const e = [];
    if (o.scope === 'hours') {
      if ((groups || []).indexOf(o.group) < 0) e.push('group');
      const h = num(o.hours);
      if (h === null || isNaN(h) || h < 100 || h > 20000) e.push('hours');
    } else if (o.scope === 'rollIds') {
      if (!passageOf(o.passageId, passages)) e.push('passageId');
    } else e.push('scope');
    if (!txt(o.reason)) e.push('reason');
    if (!txt(o.by)) e.push('by');
    return e;
  }
  function validateNote(o) {
    const e = [];
    if (NOTE_TOPICS.indexOf(o.topic) < 0) e.push('topic');
    if (!txt(o.text)) e.push('text');
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
  // Horas de marcha da linha: ficheiro roll-hours.json do pipeline (coluna "Hours Run" da folha ENGINEERING do OEE).
  // H = {start, lastDay, lines: {C: {days: {dia: h}, missing: [dias]}}}. Soma de first..last (inclusive), limitada ao último dia
  // com dados, e os dias em falta no intervalo (nunca contados como zero).
  function lineHours(H, lineId, first, last) {
    const L = H && H.lines && H.lines[lineId];
    if (!L || !DAY_RE.test(first || '')) return { hours: null, missing: [] };
    const end = last && H.lastDay ? (last < H.lastDay ? last : H.lastDay) : (H.lastDay || last);
    let h = 0;
    Object.keys(L.days || {}).forEach(d => { if (d >= first && d <= end) h += L.days[d]; });
    return { hours: Math.round(h * 10) / 10, missing: (L.missing || []).filter(d => d >= first && d <= end) };
  }
  // Horas ideais em vigor: as da lista mestre, alteradas pelo último rollConfig (scope 'hours') de cada grupo
  function effectiveLimits(defaults, entries) {
    const out = Object.assign({}, defaults || {});
    effective(entries).filter(e => e.kind === 'rollConfig' && e.scope === 'hours').sort(byTime).forEach(e => { const h = num(e.hours); if (isNum(h)) out[e.group] = h; });
    return out;
  }
  // IDs actuais dos dois rolos do par: último rollConfig (rollIds) ou troca com IDs novos (campos em branco mantêm o ID anterior)
  function rollIdsOf(passageId, entries) {
    let ids = { fast: '', slow: '' };
    effective(entries).filter(e => e.passageId === passageId && ((e.kind === 'rollConfig' && e.scope === 'rollIds') || e.kind === 'rollChange')).sort(byTime).forEach(e => {
      if (e.kind === 'rollConfig') ids = { fast: txt(e.rollFast), slow: txt(e.rollSlow) };
      else ids = { fast: txt(e.newFast) || ids.fast, slow: txt(e.newSlow) || ids.slow };
    });
    return ids;
  }
  // Estado de cada par de rolos em 'today'. ctx = {hours: H (ou null = horas por carregar), limits: {B1: 1200, …, R: 3000}}.
  // Horas desde o dia seguinte à última troca (ou desde o início da contagem, 01-08-2026, com o estado inicial do registo).
  // Inspecção semanal só é pedida depois das horas ideais, ou enquanto a última inspecção disser 'para reestriar' ou 'crítico'.
  function rollState(passages, entries, today, ctx) {
    const c = ctx || {};
    const eff = effective(entries).sort(byTime);
    const thisWeek = DAY_RE.test(today || '') ? weekOf(today) : null;
    return (passages || []).map(p => {
      const base = p.baseline || {};
      const mine = eff.filter(e => e.passageId === p.id);
      const changes = mine.filter(e => e.kind === 'rollChange').sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : byTime(a, b)));
      const last = changes[changes.length - 1] || null;
      const lastChangeDate = last ? last.date : (base.lastChange || null);
      const startDay = lastChangeDate ? addDays(lastChangeDate, 1) : (base.start || null);
      const lh = c.hours ? lineHours(c.hours, p.lineId, startDay, today) : { hours: null, missing: [] };
      const limit = c.limits ? c.limits[p.hoursGroup || p.passage] : undefined;
      const over = isNum(lh.hours) && isNum(limit) && lh.hours >= limit;
      // inspecção em vigor: a última da app depois da última troca; sem trocas na app, a do estado inicial
      const checks = mine.filter(e => e.kind === 'rollCheck' && (!last || byTime(e, last) > 0));
      let insp = checks[checks.length - 1] || null;
      if (!insp && !last && base.inspection) insp = { condition: base.inspection, prodDay: base.inspectionDate, week: weekOf(base.inspectionDate), note: base.note || '', baseline: true };
      const condition = insp ? insp.condition : null;
      const needsInspection = over || condition === 'due' || condition === 'critical';
      const checkedThisWeek = !!(insp && !insp.baseline && thisWeek && insp.week === thisWeek);
      const brushes = mine.filter(e => e.kind === 'brushCheck'), brush = brushes[brushes.length - 1] || null;
      const meas = mine.filter(e => e.kind === 'rollMeasure' || (e.kind === 'rollChange' && (num(e.diaFast) !== null || num(e.diaSlow) !== null)));
      const m = meas[meas.length - 1] || null;
      // registo de reestriagem: horas de marcha entre trocas consecutivas (sem valor se faltarem dias de horas)
      let prevStart = base.start || null;
      const register = changes.map(ch => {
        const hh = c.hours && prevStart ? lineHours(c.hours, p.lineId, prevStart, ch.date) : { hours: null, missing: [] };
        prevStart = addDays(ch.date, 1);
        return { date: ch.date, reason: ch.reason, refluted: !!ch.refluted, hours: hh.hours, missingDays: hh.missing.length };
      });
      const withH = register.filter(r => isNum(r.hours) && !r.missingDays);
      let status = 'ok';
      if (condition === 'critical') status = 'critical';
      else if (needsInspection && !checkedThisWeek) status = 'inspect';
      else if (condition === 'due') status = 'due';
      else if (over) status = 'over';
      return { passage: p, id: p.id, lineId: p.lineId, startDay, lastChangeDate, hours: lh.hours, missingDays: lh.missing, limit: isNum(limit) ? limit : null,
        pct: isNum(lh.hours) && isNum(limit) && limit > 0 ? Math.round(lh.hours / limit * 1000) / 10 : null, over,
        inspection: insp, condition, needsInspection, checkedThisWeek, status,
        brush: brush ? brush.state : null, brushNote: brush ? txt(brush.note) : '', brushAlert: !!(brush && (brush.state === 'critical' || brush.state === 'missing')),
        diaFast: m ? num(m.diaFast) : null, diaSlow: m ? num(m.diaSlow) : null, measuredOn: m ? (m.date || m.prodDay || null) : null,
        rollIds: rollIdsOf(p.id, entries), machine: base.machine || '',
        changes: changes.length, refluted: changes.filter(x => x.refluted).length, register,
        avgHoursBetween: withH.length ? Math.round(withH.reduce((s, r) => s + r.hours, 0) / withH.length) : null,
        fluteSpec: (last && txt(last.fluteSpec)) || p.fluteSpec || '' };
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
    return { shifts: eff.filter(e => e.kind === 'shift'), notes: eff.filter(e => e.kind === 'note'), stops, works, consumables: cons, stopMin: CATEGORIES.reduce((s, c) => s + byCat[c], 0), byCat,
      consumableTotals: consumableTotals(cons) };
  }
  // Avisos para a app e para o relatório: preventiva em atraso; rolos em estado crítico, para reestriar, ou sem inspecção
  // semanal depois das horas ideais; escovas em estado crítico ou em falta. level: 'bad' (vermelho) | 'warn' (âmbar)
  function warnings(entries, passages, today, ctx) {
    const w = [];
    pmState(entries, today).filter(s => s.overdue).forEach(s => w.push({ type: 'pm_overdue', level: 'bad', uid: s.uid, equipment: s.job.equipment, task: s.job.task,
      due: s.due, daysLate: s.daysLate, responsible: s.job.responsible, week: s.week }));
    rollState(passages, entries, today, ctx).forEach(r => {
      const x = { passageId: r.id, lineId: r.lineId, name: r.passage.name, hours: r.hours, limit: r.limit };
      if (r.status === 'critical') w.push(Object.assign({ type: 'roll_critical', level: 'bad', note: (r.inspection && r.inspection.note) || '' }, x));
      else if (r.status === 'inspect') w.push(Object.assign({ type: 'roll_inspect', level: 'warn' }, x));
      else if (r.status === 'due') w.push(Object.assign({ type: 'roll_due', level: 'warn', note: (r.inspection && r.inspection.note) || '' }, x));
      if (r.brushAlert) w.push(Object.assign({ type: 'brush_' + r.brush, level: 'bad', note: r.brushNote }, x));
    });
    return w;
  }

  const api = { KINDS, CATEGORIES, WORK_TYPES, PM_STATUS, PM_UPDATES, ROLL_COND, ROLL_REASONS, BRUSH_STATES, NOTE_TOPICS, UNITS,
    num, addDays, daysBetween, weekOf, weekRange, validWeek, catOfCode, codesFor, findCode, effective, cleanParts,
    validateShift, validateStop, validateWork, validatePmJob, validatePmUpdate, validateRollCheck, validateRollChange, validateRollMeasure,
    validateBrushCheck, validateRollConfig, validateNote, validateConsumable,
    pmState, pmWeek, lineHours, effectiveLimits, rollIdsOf, rollState, consumableTotals, shiftSummary, warnings, passageOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Maint = api;
})(typeof window !== 'undefined' ? window : this);
