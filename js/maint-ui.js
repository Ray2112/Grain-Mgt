/* Manutenção — interface. Ficheiro igual na Prodn-Mgt e na Grain-Mgt; regras em js/maint.js (window.Maint).
 * Criada pela app com MaintUI(C):
 *   C.lang() 'pt'|'en' · C.esc(v) · C.toast(msg) · C.render() (redesenha a página)
 *   C.load() -> Promise<[registos da loja 'maint']> · C.add(rec) -> Promise (grava registo novo; a app carimba uid, dispositivo, teste)
 *   C.codes() lista de códigos FMO · C.codesSource() fonte da lista · C.lines() [{id, name}] · C.passages() [{id, lineId, name, fluteSpec, refluteEveryDays}]
 *   C.rolls e C.kpiNote (true só na Prodn-Mgt: rolos; nota sobre o diário de turno) · C.shiftNow() {day, period} · C.crewOf(day, period) · C.operator() · C.setOperator(nome)
 * Eventos próprios (data-mact, data-mf, data-mp); não usa os atributos das apps. */
window.MaintUI = function (C) {
  'use strict';
  const M = window.Maint;
  const esc = C.esc;
  const isNum = x => typeof x === 'number' && isFinite(x);
  const pad = n => String(n).padStart(2, '0');
  const st = { tab: 'shift', sh: null, week: null, form: null, act: null, entries: [], loaded: false };

  const T = {
    pt: {
      title: 'Manutenção', t_shift: 'Turno', t_stops: 'Paragens', t_work: 'Intervenções', t_pm: 'Preventiva', t_rolls: 'Rolos', t_cons: 'Consumíveis',
      prodDay: 'Dia de produção', period: 'Turno', p_D: 'Dia 07–19', p_N: 'Noite 19–07', crew: 'Turma', week: 'Semana',
      save: 'Gravar', cancel: 'Cancelar', saved: 'Gravado.', saveFailed: 'Não foi possível gravar.', fill: 'Falta ou inválido', none: 'Sem registos.',
      void: 'Anular', voidReason: 'Motivo da anulação', voided: 'Anulado.', name: 'Nome', by: 'Registado por', loading: 'A carregar…',
      technicians: 'Técnicos de serviço', notes: 'Notas de passagem de turno', newShift: 'Registar turno de manutenção',
      sumStops: 'Paragens', sumMin: 'min de paragem', sumWork: 'Intervenções', sumCons: 'Consumíveis',
      notInKpi: 'Registos de manutenção separados do diário de turno: estes minutos não entram no indicador de 72 min/dia.',
      newStop: 'Nova paragem', category: 'Categoria', c_Process: 'Processo', c_Breakdown: 'Avaria', c_Other: 'Outra', code: 'Código de paragem',
      line: 'Linha / área', equipment: 'Equipamento', startTime: 'Hora de início', durationMin: 'Duração (min)', description: 'Descrição da falha',
      newWork: 'Nova intervenção', stopLink: 'Paragem associada', noLink: '— nenhuma', workType: 'Tipo', w_corrective: 'Correctiva', w_preventive: 'Preventiva',
      w_inspection: 'Inspecção', w_other: 'Outra', workDesc: 'O que foi feito', parts: 'Material usado', item: 'Artigo', qty: 'Qtd.', unit: 'Unid.',
      addPart: '+ linha de material', doneBy: 'Executado por', endTime: 'Hora de fim', pmLink: 'Trabalho preventivo', endT: 'Hora de fim', time: 'Hora',
      newPm: 'Novo trabalho preventivo', dueDate: 'Data-limite', task: 'Trabalho', responsible: 'Responsável', compliance: 'Cumprimento',
      planned: 'planeados', done: 'feitos', overdueN: 'em atraso', carried: 'de semanas anteriores',
      s_planned: 'Planeado', s_in_progress: 'Em curso', s_done: 'Feito', s_postponed: 'Adiado', s_cancelled: 'Cancelado',
      update: 'Actualizar', status: 'Estado', progressPct: 'Progresso (%)', newDue: 'Nova data-limite', note: 'Nota / motivo', overdue: 'EM ATRASO',
      daysLate: '{n} dia(s) de atraso', due: 'limite',
      rollsMissing: 'Lista de passagens de rolos por carregar (a enviar por Zhax). As verificações e trocas ficam disponíveis quando a lista estiver na app.',
      passage: 'Passagem', condition: 'Estado', r_good: 'Bom', r_monitor: 'Vigiar', r_worn: 'Gasto', r_damaged: 'Danificado', notChecked: 'por verificar esta semana',
      plannedChange: 'Troca planeada', planCalc: 'calculada pelo intervalo de reestriagem', lastChange: 'Última troca', changes12m: 'trocas em 12 meses',
      avgDays: 'média entre trocas', days: 'dias', fluteSpec: 'Estriagem', refluted: 'Reestriado', check: 'Verificação semanal', change: 'Troca de rolos',
      date: 'Data', reason: 'Motivo', rr_scheduled: 'Planeada', rr_wear: 'Desgaste', rr_damage: 'Dano', rr_other: 'Outro', nextPlanned: 'Próxima troca planeada',
      register: 'Registo de reestriagem', pairsChecked: 'pares verificados esta semana', refluteEvery: 'intervalo', checkedWeek: 'verificado',
      newCons: 'Novo consumível', purpose: 'Para quê / onde', totShift: 'Total do turno', totDay: 'Total do dia',
      wPm: 'Preventiva em atraso: {eq} — {task} (limite {d}, {n} dia(s))', wRoll: 'Troca de rolos em atraso: {p} (linha {l}, planeada {d}, {n} dia(s))',
      u_un: 'un', u_kg: 'kg', u_l: 'l', u_m: 'm', u_par: 'par', u_cx: 'cx'
    },
    en: {
      title: 'Maintenance', t_shift: 'Shift', t_stops: 'Stoppages', t_work: 'Interventions', t_pm: 'Preventive', t_rolls: 'Rolls', t_cons: 'Consumables',
      prodDay: 'Production day', period: 'Shift', p_D: 'Day 07–19', p_N: 'Night 19–07', crew: 'Crew', week: 'Week',
      save: 'Save', cancel: 'Cancel', saved: 'Saved.', saveFailed: 'Could not save.', fill: 'Missing or invalid', none: 'No records.',
      void: 'Void', voidReason: 'Reason for voiding', voided: 'Voided.', name: 'Name', by: 'Recorded by', loading: 'Loading…',
      technicians: 'Technicians on duty', notes: 'Shift handover notes', newShift: 'Record maintenance shift',
      sumStops: 'Stoppages', sumMin: 'stop min', sumWork: 'Interventions', sumCons: 'Consumables',
      notInKpi: 'Maintenance records are separate from the shift log: these minutes do not count towards the 72 min/day KPI.',
      newStop: 'New stoppage', category: 'Category', c_Process: 'Process', c_Breakdown: 'Breakdown', c_Other: 'Other', code: 'Downtime code',
      line: 'Line / area', equipment: 'Equipment', startTime: 'Start time', durationMin: 'Duration (min)', description: 'Fault description',
      newWork: 'New intervention', stopLink: 'Linked stoppage', noLink: '— none', workType: 'Type', w_corrective: 'Corrective', w_preventive: 'Preventive',
      w_inspection: 'Inspection', w_other: 'Other', workDesc: 'Work done', parts: 'Material used', item: 'Item', qty: 'Qty', unit: 'Unit',
      addPart: '+ material line', doneBy: 'Done by', endTime: 'End time', pmLink: 'Preventive job', endT: 'End time', time: 'Time',
      newPm: 'New preventive job', dueDate: 'Due date', task: 'Job', responsible: 'Responsible', compliance: 'Compliance',
      planned: 'planned', done: 'done', overdueN: 'overdue', carried: 'from earlier weeks',
      s_planned: 'Planned', s_in_progress: 'In progress', s_done: 'Done', s_postponed: 'Postponed', s_cancelled: 'Cancelled',
      update: 'Update', status: 'Status', progressPct: 'Progress (%)', newDue: 'New due date', note: 'Note / reason', overdue: 'OVERDUE',
      daysLate: '{n} day(s) late', due: 'due',
      rollsMissing: 'Roll passage list not loaded yet (to be sent by Zhax). Checks and changes become available once the list is in the app.',
      passage: 'Passage', condition: 'Condition', r_good: 'Good', r_monitor: 'Monitor', r_worn: 'Worn', r_damaged: 'Damaged', notChecked: 'not checked this week',
      plannedChange: 'Planned change', planCalc: 'calculated from the re-fluting interval', lastChange: 'Last change', changes12m: 'changes in 12 months',
      avgDays: 'average between changes', days: 'days', fluteSpec: 'Fluting', refluted: 'Re-fluted', check: 'Weekly check', change: 'Roll change',
      date: 'Date', reason: 'Reason', rr_scheduled: 'Scheduled', rr_wear: 'Wear', rr_damage: 'Damage', rr_other: 'Other', nextPlanned: 'Next planned change',
      register: 'Re-fluting register', pairsChecked: 'pairs checked this week', refluteEvery: 'interval', checkedWeek: 'checked',
      newCons: 'New consumable', purpose: 'Purpose / where', totShift: 'Shift total', totDay: 'Day total',
      wPm: 'Preventive job overdue: {eq} — {task} (due {d}, {n} day(s))', wRoll: 'Roll change overdue: {p} (line {l}, planned {d}, {n} day(s))',
      u_un: 'pcs', u_kg: 'kg', u_l: 'l', u_m: 'm', u_par: 'pair', u_cx: 'box'
    }
  };
  function t(k, v) {
    let s = (T[C.lang()] || T.pt)[k] || T.pt[k] || k;
    if (v) Object.keys(v).forEach(x => { s = s.split('{' + x + '}').join(v[x]); });
    return s;
  }
  const ddmm = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '';
  const hhmm = ms => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const nf = v => { const n = M.num(v); return isNum(n) ? (C.lang() === 'pt' ? String(n).replace('.', ',') : String(n)) : '—'; };
  const lineName = id => { const l = C.lines().find(x => x.id === id); return l ? l.name : (id || ''); };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const opt = (v, cur, label) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
  const fld = (label, inner, req) => `<label class="mt-f${req ? ' mt-req' : ''}">${esc(label)}${inner}</label>`;
  const inp = (k, v, extra) => `<input data-mf="${k}" value="${esc(v)}" ${extra || ''}>`;
  const area = (k, v) => `<textarea rows="2" data-mf="${k}">${esc(v)}</textarea>`;
  const lineSel = cur => `<select data-mf="lineId"><option value="">—</option>${C.lines().map(l => opt(l.id, cur, l.name)).join('')}</select>`;

  // Hora de um turno → ms locais: no turno N, horas antes das 07:00 são do dia seguinte
  function shiftMs(day, period, hm) {
    if (!/^\d{2}:\d{2}$/.test(hm || '')) return null;
    let d = day;
    if (period === 'N' && hm < '07:00') d = M.addDays(day, 1);
    const [y, m, dd] = d.split('-').map(Number), [h, mi] = hm.split(':').map(Number);
    return new Date(y, m - 1, dd, h, mi).getTime();
  }
  function sh() { if (!st.sh) st.sh = Object.assign({}, C.shiftNow()); return st.sh; }
  function week() { if (!st.week) st.week = M.weekOf(sh().day); return st.week; }

  // ---------- dados ----------
  async function reload() {
    try { st.entries = (await C.load()) || []; st.loaded = true; } catch (e) { console.warn('maint load', e); }
  }
  async function save(rec, msgOk) {
    const s = sh(), now = Date.now();
    const full = Object.assign({ prodDay: s.day, period: s.period, shift: s.day + '/' + s.period, crew: C.crewOf(s.day, s.period),
      t: now, date: today(), time: hhmm(now) }, rec);
    try { await C.add(full); } catch (e) { C.toast(t('saveFailed')); return false; }
    if (rec.by) C.setOperator(rec.by);
    st.form = null; st.act = null;
    await reload(); C.toast(msgOk || t('saved')); C.render();
    return true;
  }
  function errs(list) { if (list.length) { C.toast(t('fill') + ': ' + list.map(x => t(x)).join(', ')); return true; } return false; }

  // ---------- avisos (app e cartão da página inicial) ----------
  function warnings() { return M.warnings(st.entries, C.passages(), today()); }
  function warnText(w) {
    return w.type === 'pm_overdue' ? t('wPm', { eq: w.equipment, task: w.task, d: ddmm(w.due), n: w.daysLate })
      : t('wRoll', { p: w.name || w.passageId, l: w.lineId, d: ddmm(w.due), n: w.daysLate });
  }
  function banners() {
    return warnings().map(w => `<div class="mt-bn mt-bad" data-mact="tab" data-v="${w.type === 'pm_overdue' ? 'pm' : 'rolls'}">⏰ ${esc(warnText(w))}</div>`).join('');
  }

  // ---------- vista ----------
  function view() {
    if (!st.loaded) { reload().then(C.render); return `<section class="card"><p>${esc(t('loading'))}</p></section>`; }
    const tabs = ['shift', 'stops', 'work', 'pm'].concat(C.rolls ? ['rolls'] : []).concat(['cons']);
    if (tabs.indexOf(st.tab) < 0) st.tab = 'shift';
    const s = sh();
    const head = `<section class="card"><h2>${esc(t('title'))}</h2>
      <div class="mt-tabs">${tabs.map(k => `<button type="button" class="btn small ${st.tab === k ? 'primary' : ''}" data-mact="tab" data-v="${k}">${esc(t('t_' + k))}</button>`).join('')}</div>
      ${st.tab === 'pm' || st.tab === 'rolls' ? '' : `<div class="grid2">${fld(t('prodDay'), `<input type="date" id="mDay" value="${esc(s.day)}">`)}
        ${fld(t('period'), `<select id="mPeriod">${opt('D', s.period, t('p_D'))}${opt('N', s.period, t('p_N'))}</select>`)}</div>
        <p class="mt-sub">${esc(t('crew'))} ${esc(C.crewOf(s.day, s.period) || '—')}</p>`}</section>`;
    const body = { shift: vShift, stops: vStops, work: vWork, pm: vPm, rolls: vRolls, cons: vCons }[st.tab]();
    return banners() + head + body;
  }
  function voidBox(uid) {
    if (!st.act || st.act.uid !== uid) return `<button type="button" class="btn small" data-mact="voidask" data-uid="${esc(uid)}">${esc(t('void'))}</button>`;
    return `<div class="mt-box">${fld(t('voidReason'), `<textarea rows="2" data-mf="vreason">${esc(st.act.reason || '')}</textarea>`, 1)}
      ${fld(t('name'), `<input data-mf="vby" value="${esc(st.act.by || C.operator())}">`, 1)}
      <button type="button" class="btn small primary" data-mact="voidsave">${esc(t('save'))}</button>
      <button type="button" class="btn small" data-mact="cancel">${esc(t('cancel'))}</button></div>`;
  }
  const meta = r => `<small class="mt-sub">${esc(hhmm(r.t))} · ${esc(t('crew'))} ${esc(r.crew || '—')} · ${esc(r.by || '')}</small>`;
  const saveBtns = act => `<div class="row"><button type="button" class="btn primary" data-mact="${act}">${esc(t('save'))}</button>
    <button type="button" class="btn" data-mact="cancel">${esc(t('cancel'))}</button></div>`;
  const newBtn = (form, label) => st.form ? '' : `<button type="button" class="btn primary" data-mact="new" data-v="${form}">＋ ${esc(label)}</button>`;
  const shiftSum = () => M.shiftSummary(st.entries, sh().day, sh().period);

  // ----- turno -----
  function vShift() {
    const sm = shiftSum(), f = st.form && st.form.kind === 'shift' ? st.form : null;
    return `<section class="card"><div class="mt-kpi"><div><b>${sm.stops.length}</b><span>${esc(t('sumStops'))}</span></div>
        <div><b>${sm.stopMin}</b><span>${esc(t('sumMin'))}</span></div><div><b>${sm.works.length}</b><span>${esc(t('sumWork'))}</span></div>
        <div><b>${sm.consumables.length}</b><span>${esc(t('sumCons'))}</span></div></div>
      <p class="mt-sub">${M.CATEGORIES.map(c => esc(t('c_' + c)) + ' ' + sm.byCat[c] + ' min').join(' · ')}</p>
      ${C.kpiNote ? `<p class="mt-sub">${esc(t('notInKpi'))}</p>` : ''}
      ${f ? `<div class="mt-box">${fld(t('technicians'), inp('technicians', f.technicians), 1)}${fld(t('notes'), area('notes', f.notes))}
        ${fld(t('by'), inp('by', f.by), 1)}${saveBtns('saveshift')}</div>` : newBtn('shift', t('newShift'))}</section>
      <section class="card">${sm.shifts.map(r => `<div class="mt-item"><b>${esc(t('technicians'))}:</b> ${esc(r.technicians)}
        ${r.notes ? `<div>${esc(r.notes)}</div>` : ''}${meta(r)}<div>${voidBox(r.uid)}</div></div>`).join('') || `<p class="mt-sub">${esc(t('none'))}</p>`}</section>`;
  }

  // ----- paragens -----
  function vStops() {
    const sm = shiftSum(), f = st.form && st.form.kind === 'stop' ? st.form : null;
    let form = '';
    if (f) {
      const codes = f.category ? M.codesFor(f.category, C.codes()) : [];
      form = `<div class="mt-box"><div class="grid2">
        ${fld(t('category'), `<select data-mf="category"><option value="">—</option>${M.CATEGORIES.map(c => opt(c, f.category, t('c_' + c))).join('')}</select>`, 1)}
        ${fld(t('code'), `<select data-mf="code" ${f.category ? '' : 'disabled'}><option value="">—</option>${codes.map(c => opt(c.code, f.code, c.code + ' ' + c.name)).join('')}</select>`, 1)}
        ${fld(t('line'), lineSel(f.lineId))}${fld(t('equipment'), inp('equipment', f.equipment))}
        ${fld(t('startTime'), inp('startTime', f.startTime, 'type="time"'))}${fld(t('durationMin'), inp('durationMin', f.durationMin, 'inputmode="decimal"'), 1)}</div>
        ${fld(t('description'), area('description', f.description), 1)}${fld(t('by'), inp('by', f.by), 1)}${saveBtns('savestop')}</div>`;
    }
    return `<section class="card">${C.kpiNote ? `<p class="mt-sub">${esc(t('notInKpi'))}</p>` : ''}${f ? form : newBtn('stop', t('newStop'))}</section>
      <section class="card"><h3>${esc(t('t_stops'))} · ${sm.stopMin} min</h3>${sm.stops.map(r => `<div class="mt-item">
        <div><b>${esc(r.code || '')} ${esc((r.codeInfo && r.codeInfo.name) || '')}</b> <span class="mt-c">${esc(t('c_' + (M.CATEGORIES.indexOf(r.category) >= 0 ? r.category : 'Other')))}</span>
        · <b>${esc(nf(r.durationMin))} min</b>${r.startT ? ' · ' + esc(hhmm(r.startT)) : ''}${r.lineId ? ' · ' + esc(lineName(r.lineId)) : ''}${r.equipment ? ' · ' + esc(r.equipment) : ''}</div>
        <div>${esc(r.description)}</div>${meta(r)}<div>${voidBox(r.uid)}</div></div>`).join('') || `<p class="mt-sub">${esc(t('none'))}</p>`}</section>`;
  }
  async function saveStop() {
    const f = st.form;
    const e = M.validateStop(f, C.codes());
    const startT = f.startTime ? shiftMs(sh().day, sh().period, f.startTime) : null;
    if (f.startTime && startT === null) e.push('startTime');
    if (errs(e)) return;
    const c = M.findCode(f.code, C.codes());
    await save({ kind: 'stop', category: f.category, code: f.code, codeInfo: { code: c.code, name: c.name, tier3: c.tier3 || null, oee: c.oee || null, source: C.codesSource ? C.codesSource() : null },
      lineId: f.lineId || null, equipment: f.equipment.trim(), startT, durationMin: M.num(f.durationMin), description: f.description.trim(), by: f.by.trim() });
  }

  // ----- intervenções -----
  function vWork() {
    const sm = shiftSum(), f = st.form && st.form.kind === 'work' ? st.form : null;
    let form = '';
    if (f) {
      const pmOpen = M.pmState(st.entries, today()).filter(s => s.open);
      form = `<div class="mt-box"><div class="grid2">
        ${fld(t('workType'), `<select data-mf="workType"><option value="">—</option>${M.WORK_TYPES.map(w => opt(w, f.workType, t('w_' + w))).join('')}</select>`, 1)}
        ${fld(t('stopLink'), `<select data-mf="stopUid"><option value="">${esc(t('noLink'))}</option>${sm.stops.map(s => opt(s.uid, f.stopUid, (s.code || '') + ' · ' + nf(s.durationMin) + ' min · ' + s.description.slice(0, 30))).join('')}</select>`)}
        ${f.workType === 'preventive' ? fld(t('pmLink'), `<select data-mf="pmJobUid"><option value="">${esc(t('noLink'))}</option>${pmOpen.map(s => opt(s.uid, f.pmJobUid, s.job.equipment + ' — ' + s.job.task)).join('')}</select>`) : ''}
        ${fld(t('line'), lineSel(f.lineId))}${fld(t('equipment'), inp('equipment', f.equipment), 1)}
        ${fld(t('startTime'), inp('startTime', f.startTime, 'type="time"'))}${fld(t('endTime'), inp('endTime', f.endTime, 'type="time"'))}</div>
        ${fld(t('workDesc'), area('description', f.description), 1)}
        <div class="mt-f">${esc(t('parts'))}${f.parts.map((p, i) => `<div class="mt-part"><input data-mp="${i}|item" value="${esc(p.item)}" placeholder="${esc(t('item'))}" list="mtItems">
          <input data-mp="${i}|qty" value="${esc(p.qty)}" inputmode="decimal" placeholder="${esc(t('qty'))}">
          <select data-mp="${i}|unit">${M.UNITS.map(u => opt(u, p.unit, t('u_' + u))).join('')}</select></div>`).join('')}
          <button type="button" class="btn small" data-mact="addpart">${esc(t('addPart'))}</button></div>${itemList()}
        ${fld(t('doneBy'), inp('doneBy', f.doneBy), 1)}${fld(t('by'), inp('by', f.by), 1)}${saveBtns('savework')}</div>`;
    }
    return `<section class="card">${f ? form : newBtn('work', t('newWork'))}</section>
      <section class="card"><h3>${esc(t('t_work'))}</h3>${sm.works.map(r => `<div class="mt-item">
        <div><b>${esc(r.equipment)}</b> <span class="mt-c">${esc(t('w_' + (M.WORK_TYPES.indexOf(r.workType) >= 0 ? r.workType : 'other')))}</span>
        ${r.startT ? ' · ' + esc(hhmm(r.startT)) + (r.endT ? '–' + esc(hhmm(r.endT)) : '') : ''}${isNum(r.durationMin) ? ' · ' + r.durationMin + ' min' : ''}${r.lineId ? ' · ' + esc(lineName(r.lineId)) : ''}</div>
        <div>${esc(r.description)}</div>
        ${(r.parts || []).length ? `<div class="mt-sub">${esc(t('parts'))}: ${r.parts.map(p => esc(p.item) + ' ' + esc(nf(p.qty)) + ' ' + esc(t('u_' + p.unit))).join('; ')}</div>` : ''}
        <div class="mt-sub">${esc(t('doneBy'))}: ${esc(r.doneBy)}</div>${meta(r)}<div>${voidBox(r.uid)}</div></div>`).join('') || `<p class="mt-sub">${esc(t('none'))}</p>`}</section>`;
  }
  async function saveWork() {
    const f = st.form, s = sh();
    const startT = f.startTime ? shiftMs(s.day, s.period, f.startTime) : null;
    let endT = f.endTime ? shiftMs(s.day, s.period, f.endTime) : null;
    if (isNum(startT) && isNum(endT) && endT <= startT && endT + 86400000 - startT <= 12 * 3600000) endT += 86400000;   // passa a meia-noite
    const o = Object.assign({}, f, { startT, endT });
    if (errs(M.validateWork(o))) return;
    const parts = M.cleanParts(f.parts).map(p => ({ item: p.item.trim(), qty: M.num(p.qty), unit: p.unit }));
    await save({ kind: 'work', workType: f.workType, stopUid: f.stopUid || null, pmJobUid: f.workType === 'preventive' ? (f.pmJobUid || null) : null,
      lineId: f.lineId || null, equipment: f.equipment.trim(), description: f.description.trim(), parts, doneBy: f.doneBy.trim(),
      startT, endT, durationMin: isNum(startT) && isNum(endT) ? Math.round((endT - startT) / 60000) : null, by: f.by.trim() });
  }
  // Artigos já usados (material e consumíveis) para escolher sem escrever de novo
  function itemList() {
    const items = new Set();
    M.effective(st.entries).forEach(r => { if (r.kind === 'consumable') items.add(r.item); if (r.kind === 'work') (r.parts || []).forEach(p => items.add(p.item)); });
    return `<datalist id="mtItems">${Array.from(items).sort().map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
  }

  // ----- preventiva -----
  const PM_CLS = { planned: '', in_progress: 'mt-warn', done: 'mt-ok', postponed: 'mt-warn', cancelled: '' };
  function vPm() {
    const w = week(), W = M.pmWeek(st.entries, w, today()), f = st.form;
    const r = M.weekRange(w);
    let form = '';
    if (f && f.kind === 'pmJob') form = `<div class="mt-box"><div class="grid2">${fld(t('week'), inp('week', f.week), 1)}${fld(t('dueDate'), inp('dueDate', f.dueDate, 'type="date"'), 1)}
        ${fld(t('line'), lineSel(f.lineId))}${fld(t('equipment'), inp('equipment', f.equipment), 1)}</div>
        ${fld(t('task'), area('task', f.task), 1)}<div class="grid2">${fld(t('responsible'), inp('responsible', f.responsible), 1)}${fld(t('by'), inp('by', f.by), 1)}</div>${saveBtns('savepm')}</div>`;
    const job = s => {
      const up = f && f.kind === 'pmUpdate' && f.jobUid === s.uid;
      return `<div class="mt-item ${s.overdue ? 'mt-late' : ''}"><div><b>${esc(s.job.equipment)}</b> — ${esc(s.job.task)}
          <span class="mt-c ${PM_CLS[s.status] || ''}">${esc(t('s_' + s.status))}${s.status === 'in_progress' ? ' ' + s.progress + ' %' : ''}</span>
          ${s.overdue ? `<span class="mt-c mt-bad">${esc(t('overdue'))} · ${esc(t('daysLate', { n: s.daysLate }))}</span>` : ''}</div>
        <div class="mt-sub">${esc(t('week'))} ${esc(s.week)} · ${esc(t('due'))} ${esc(ddmm(s.due))}${s.job.lineId ? ' · ' + esc(lineName(s.job.lineId)) : ''} · ${esc(t('responsible'))}: ${esc(s.job.responsible)}${s.doneBy ? ' · ' + esc(t('doneBy')) + ': ' + esc(s.doneBy) : ''}</div>
        ${s.updates.length ? `<div class="mt-sub">${s.updates.map(u => esc(ddmm(u.prodDay)) + ' ' + esc(t('s_' + u.status)) + (u.status === 'in_progress' ? ' ' + esc(nf(u.progressPct)) + ' %' : '') + (u.newDue ? ' → ' + esc(ddmm(u.newDue)) : '') + (u.note ? ': ' + esc(u.note) : '')).join(' · ')}</div>` : ''}
        ${up ? `<div class="mt-box"><div class="grid2">${fld(t('status'), `<select data-mf="status"><option value="">—</option>${M.PM_UPDATES.map(x => opt(x, f.status, t('s_' + x))).join('')}</select>`, 1)}
            ${f.status === 'in_progress' ? fld(t('progressPct'), inp('progressPct', f.progressPct, 'inputmode="decimal"'), 1) : ''}
            ${f.status === 'postponed' ? fld(t('newDue'), inp('newDue', f.newDue, 'type="date"'), 1) : ''}
            ${f.status === 'done' ? fld(t('doneBy'), inp('doneBy', f.doneBy), 1) : ''}</div>
            ${fld(t('note'), area('note', f.note), f.status === 'postponed' || f.status === 'cancelled')}${fld(t('by'), inp('by', f.by), 1)}${saveBtns('savepmup')}</div>`
          : (s.open && !f ? `<button type="button" class="btn small" data-mact="pmup" data-uid="${esc(s.uid)}">${esc(t('update'))}</button>` : '')}
        ${up ? '' : voidBox(s.uid)}</div>`;
    };
    return `<section class="card"><div class="row">${fld(t('week'), `<input id="mWeek" value="${esc(w)}" size="9">`)}
        <button type="button" class="btn small" data-mact="wk" data-v="-1">◀</button><button type="button" class="btn small" data-mact="wk" data-v="1">▶</button></div>
      <p class="mt-sub">${r ? esc(ddmm(r[0])) + ' – ' + esc(ddmm(r[1])) : ''}</p>
      <div class="mt-kpi"><div><b>${W.planned}</b><span>${esc(t('planned'))}</span></div><div><b>${W.done}</b><span>${esc(t('done'))}</span></div>
        <div><b>${W.compliancePct === null ? '—' : esc(nf(W.compliancePct)) + ' %'}</b><span>${esc(t('compliance'))}</span></div>
        <div class="${W.overdue ? 'mt-bad' : ''}"><b>${W.overdue}</b><span>${esc(t('overdueN'))}</span></div></div>
      ${W.carried ? `<p class="mt-sub">${W.carried} ${esc(t('carried'))}</p>` : ''}
      ${f && f.kind === 'pmJob' ? form : newBtn('pmJob', t('newPm'))}</section>
      <section class="card">${W.list.map(job).join('') || `<p class="mt-sub">${esc(t('none'))}</p>`}</section>`;
  }
  async function savePm() {
    const f = st.form;
    if (errs(M.validatePmJob(f))) return;
    await save({ kind: 'pmJob', week: f.week, dueDate: f.dueDate, lineId: f.lineId || null, equipment: f.equipment.trim(), task: f.task.trim(),
      responsible: f.responsible.trim(), by: f.by.trim() });
    st.week = f.week;
  }
  async function savePmUp() {
    const f = st.form, s = M.pmState(st.entries, today()).find(x => x.uid === f.jobUid);
    if (errs(M.validatePmUpdate(f, s && s.open ? s.job : null))) return;
    const sn = C.shiftNow();
    st.sh = Object.assign({}, sn);   // o progresso é do turno em que é registado
    await save({ kind: 'pmUpdate', jobUid: f.jobUid, status: f.status, progressPct: f.status === 'in_progress' ? M.num(f.progressPct) : null,
      newDue: f.status === 'postponed' ? f.newDue : null, doneBy: f.status === 'done' ? f.doneBy.trim() : null, note: f.note.trim(), by: f.by.trim() });
  }

  // ----- rolos (só Prodn-Mgt) -----
  const COND_CLS = { good: 'mt-ok', monitor: 'mt-warn', worn: 'mt-warn', damaged: 'mt-bad' };
  function vRolls() {
    const P = C.passages() || [];
    if (!P.length) return `<section class="card"><h3>${esc(t('t_rolls'))}</h3><p>${esc(t('rollsMissing'))}</p></section>`;
    const lines = Array.from(new Set(P.map(p => p.lineId)));
    if (lines.indexOf(st.rollLine) < 0) st.rollLine = lines[0];
    const f = st.form, all = M.rollState(P, st.entries, today()), R = all.filter(r => r.lineId === st.rollLine);
    const lateN = id => all.filter(r => r.lineId === id && r.overdue).length;
    let prev = null;
    const rows = R.map(r => {
      const grp = r.passage.passage && r.passage.passage !== prev ? `<h4 class="mt-grp">${esc(r.passage.passage)}</h4>` : '';
      prev = r.passage.passage || prev;
      const fc = f && f.kind === 'rollCheck' && f.passageId === r.id, fx = f && f.kind === 'rollChange' && f.passageId === r.id;
      return `${grp}<div class="mt-item ${r.overdue ? 'mt-late' : ''}"><div><b>${esc(r.passage.name || r.id)}</b> · ${esc(lineName(r.lineId))}
          ${r.condition ? `<span class="mt-c ${COND_CLS[r.condition] || ''}">${esc(t('r_' + r.condition))}</span>` : ''}
          ${r.checkedThisWeek ? `<span class="mt-c mt-ok">${esc(t('checkedWeek'))} ${esc(M.weekOf(today()))}</span>` : `<span class="mt-c mt-warn">${esc(t('notChecked'))}</span>`}
          ${r.overdue ? `<span class="mt-c mt-bad">${esc(t('overdue'))} · ${esc(t('daysLate', { n: r.daysLate }))}</span>` : ''}</div>
        <div class="mt-sub">${esc(t('plannedChange'))}: ${r.plan ? esc(ddmm(r.plan)) + (r.planCalc ? ' (' + esc(t('planCalc')) + ')' : '') : '—'}
          · ${esc(t('lastChange'))}: ${r.lastChange ? esc(ddmm(r.lastChange.date)) : '—'}</div>
        <div class="mt-sub">${esc(t('register'))}: ${r.changes12m} ${esc(t('changes12m'))} · ${esc(t('refluted'))} ${r.refluted}
          · ${esc(t('avgDays'))} ${r.avgDaysBetween === null ? '—' : r.avgDaysBetween + ' ' + esc(t('days'))}
          ${isNum(r.passage.refluteEveryDays) ? ' · ' + esc(t('refluteEvery')) + ' ' + r.passage.refluteEveryDays + ' ' + esc(t('days')) : ''}${r.fluteSpec ? ' · ' + esc(t('fluteSpec')) + ': ' + esc(r.fluteSpec) : ''}</div>
        ${fc ? `<div class="mt-box"><div class="grid2">${fld(t('week'), inp('week', f.week), 1)}
            ${fld(t('condition'), `<select data-mf="condition"><option value="">—</option>${M.ROLL_COND.map(c => opt(c, f.condition, t('r_' + c))).join('')}</select>`, 1)}
            ${fld(t('plannedChange'), inp('plannedChange', f.plannedChange, 'type="date"'))}</div>
            ${fld(t('note'), area('note', f.note), f.condition === 'worn' || f.condition === 'damaged')}${fld(t('by'), inp('by', f.by), 1)}${saveBtns('saverchk')}</div>` : ''}
        ${fx ? `<div class="mt-box"><div class="grid2">${fld(t('date'), inp('date', f.date, 'type="date"'), 1)}
            ${fld(t('reason'), `<select data-mf="reason"><option value="">—</option>${M.ROLL_REASONS.map(c => opt(c, f.reason, t('rr_' + c))).join('')}</select>`, 1)}
            ${fld(t('fluteSpec'), inp('fluteSpec', f.fluteSpec))}${fld(t('nextPlanned'), inp('nextPlanned', f.nextPlanned, 'type="date"'))}</div>
            <label class="mt-chk"><input type="checkbox" data-mf="refluted" ${f.refluted ? 'checked' : ''}> ${esc(t('refluted'))}</label>
            ${fld(t('note'), area('note', f.note))}${fld(t('doneBy'), inp('doneBy', f.doneBy), 1)}${fld(t('by'), inp('by', f.by), 1)}${saveBtns('saverchg')}</div>` : ''}
        ${f ? '' : `<div class="row"><button type="button" class="btn small" data-mact="rchk" data-uid="${esc(r.id)}">${esc(t('check'))}</button>
          <button type="button" class="btn small" data-mact="rchg" data-uid="${esc(r.id)}">${esc(t('change'))}</button></div>`}</div>`;
    });
    const done = R.filter(r => r.checkedThisWeek).length;
    return `<section class="card"><h3>${esc(t('t_rolls'))} · ${esc(t('week'))} ${esc(M.weekOf(today()))}</h3>
      <div class="mt-tabs">${lines.map(id => `<button type="button" class="btn small ${st.rollLine === id ? 'primary' : ''}" data-mact="rline" data-v="${esc(id)}">${esc(lineName(id))}${lateN(id) ? ' ⏰' + lateN(id) : ''}</button>`).join('')}</div>
      <p class="mt-sub">${done}/${R.length} ${esc(t('pairsChecked'))}</p>${rows.join('')}</section>`;
  }
  async function saveRollCheck() {
    const f = st.form;
    if (errs(M.validateRollCheck(f, C.passages()))) return;
    st.sh = Object.assign({}, C.shiftNow());
    const p = M.passageOf(f.passageId, C.passages()) || {};
    await save({ kind: 'rollCheck', passageId: f.passageId, lineId: p.lineId || null, passageName: p.name || null, week: f.week,
      condition: f.condition, plannedChange: f.plannedChange || null, note: f.note.trim(), by: f.by.trim() });
  }
  async function saveRollChange() {
    const f = st.form;
    if (errs(M.validateRollChange(f, C.passages()))) return;
    const p = M.passageOf(f.passageId, C.passages());
    st.sh = Object.assign({}, C.shiftNow());
    await save({ kind: 'rollChange', passageId: f.passageId, lineId: p.lineId || null, passageName: p.name || null, date: f.date, reason: f.reason,
      refluted: !!f.refluted, fluteSpec: f.fluteSpec.trim(), nextPlanned: f.nextPlanned || null, note: f.note.trim(), doneBy: f.doneBy.trim(),
      refluteEveryDays: isNum(p.refluteEveryDays) ? p.refluteEveryDays : null, by: f.by.trim() });
  }

  // ----- consumíveis -----
  function vCons() {
    const sm = shiftSum(), day = M.shiftSummary(st.entries, sh().day), f = st.form && st.form.kind === 'consumable' ? st.form : null;
    const tot = list => list.length ? `<table class="mt-t">${list.map(x => `<tr><td>${esc(x.item)}</td><td class="mt-n">${esc(nf(x.qty))}</td><td>${esc(t('u_' + x.unit))}</td></tr>`).join('')}</table>` : `<p class="mt-sub">—</p>`;
    return `<section class="card">${f ? `<div class="mt-box"><div class="grid2">${fld(t('item'), inp('item', f.item, 'list="mtItems"'), 1)}
        ${fld(t('qty'), inp('qty', f.qty, 'inputmode="decimal"'), 1)}${fld(t('unit'), `<select data-mf="unit">${M.UNITS.map(u => opt(u, f.unit, t('u_' + u))).join('')}</select>`, 1)}
        ${fld(t('line'), lineSel(f.lineId))}</div>${itemList()}${fld(t('purpose'), inp('purpose', f.purpose))}${fld(t('by'), inp('by', f.by), 1)}${saveBtns('savecons')}</div>`
        : newBtn('consumable', t('newCons'))}</section>
      <section class="card"><h3>${esc(t('totShift'))}</h3>${tot(sm.consumableTotals)}<h3>${esc(t('totDay'))} ${esc(ddmm(sh().day))}</h3>${tot(day.consumableTotals)}</section>
      <section class="card"><h3>${esc(t('t_cons'))}</h3>${sm.consumables.map(r => `<div class="mt-item"><div><b>${esc(r.item)}</b> · ${esc(nf(r.qty))} ${esc(t('u_' + r.unit))}${r.lineId ? ' · ' + esc(lineName(r.lineId)) : ''}${r.purpose ? ' · ' + esc(r.purpose) : ''}</div>
        ${meta(r)}<div>${voidBox(r.uid)}</div></div>`).join('') || `<p class="mt-sub">${esc(t('none'))}</p>`}</section>`;
  }
  async function saveCons() {
    const f = st.form;
    if (errs(M.validateConsumable(f))) return;
    await save({ kind: 'consumable', item: f.item.trim(), qty: M.num(f.qty), unit: f.unit, lineId: f.lineId || null, purpose: f.purpose.trim(), by: f.by.trim() });
  }

  // ---------- formulários novos ----------
  function newForm(kind, ref) {
    const by = C.operator() || '';
    const F = {
      shift: { technicians: '', notes: '' },
      stop: { category: '', code: '', lineId: '', equipment: '', startTime: '', durationMin: '', description: '' },
      work: { workType: '', stopUid: '', pmJobUid: '', lineId: '', equipment: '', startTime: '', endTime: '', description: '', parts: [{ item: '', qty: '', unit: 'un' }], doneBy: '' },
      pmJob: { week: week(), dueDate: (M.weekRange(week()) || [])[1] || '', lineId: '', equipment: '', task: '', responsible: '' },
      pmUpdate: { jobUid: ref, status: '', progressPct: '', newDue: '', doneBy: '', note: '' },
      rollCheck: { passageId: ref, week: M.weekOf(today()), condition: '', plannedChange: '', note: '' },
      rollChange: { passageId: ref, date: today(), reason: '', refluted: false, fluteSpec: '', nextPlanned: '', note: '', doneBy: '' },
      consumable: { item: '', qty: '', unit: 'un', lineId: '', purpose: '' }
    }[kind];
    st.form = Object.assign({ kind, by }, F); st.act = null;
  }

  // ---------- eventos ----------
  function keep() { const y = window.scrollY; C.render(); window.scrollTo(0, y); }
  const SAVE = { saveshift: () => save(Object.assign({ kind: 'shift', technicians: st.form.technicians.trim(), notes: st.form.notes.trim(), by: st.form.by.trim() })),
    savestop: saveStop, savework: saveWork, savepm: savePm, savepmup: savePmUp, saverchk: saveRollCheck, saverchg: saveRollChange, savecons: saveCons };
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-mact]');
    if (!el) return;
    const a = el.dataset.mact, v = el.dataset.v, uid = el.dataset.uid;
    if (a === 'tab') { st.tab = v; st.form = null; st.act = null; if (C.open) C.open(); keep(); return; }
    if (a === 'new') { newForm(v); keep(); return; }
    if (a === 'pmup') { newForm('pmUpdate', uid); keep(); return; }
    if (a === 'rchk') { newForm('rollCheck', uid); keep(); return; }
    if (a === 'rline') { st.rollLine = v; st.form = null; keep(); return; }
    if (a === 'rchg') { newForm('rollChange', uid); keep(); return; }
    if (a === 'cancel') { st.form = null; st.act = null; keep(); return; }
    if (a === 'addpart' && st.form && st.form.parts) { st.form.parts.push({ item: '', qty: '', unit: 'un' }); keep(); return; }
    if (a === 'wk') { const r = M.weekRange(week()); if (r) st.week = M.weekOf(M.addDays(r[0], 7 * Number(v))); keep(); return; }
    if (a === 'voidask') { st.act = { uid, reason: '', by: C.operator() || '' }; keep(); return; }
    if (a === 'voidsave') {
      const x = st.act;
      if (!x || !String(x.reason).trim() || !String(x.by).trim()) return C.toast(t('fill') + ': ' + t('voidReason') + ', ' + t('name'));
      const target = st.entries.find(r => r.uid === x.uid);
      const s0 = st.sh;
      if (target && target.prodDay) st.sh = { day: target.prodDay, period: target.period || 'D' };   // anulação vai para o dia do registo anulado
      await save({ kind: 'void', voids: x.uid, voidsKind: target ? target.kind : null, reason: String(x.reason).trim(), by: String(x.by).trim() }, t('voided'));
      st.sh = s0; C.render(); return;
    }
    if (SAVE[a] && st.form) { el.disabled = true; try { await SAVE[a](); } finally { el.disabled = false; } }
  });
  function onField(el, isChange) {
    if (el.dataset.mf === 'vreason' && st.act) { st.act.reason = el.value; return; }
    if (el.dataset.mf === 'vby' && st.act) { st.act.by = el.value; return; }
    if (el.dataset.mf && st.form) {
      const k = el.dataset.mf;
      st.form[k] = el.type === 'checkbox' ? el.checked : el.value;
      if (isChange && el.tagName === 'SELECT') {
        if (k === 'category') st.form.code = '';
        keep();
      }
      return;
    }
    if (el.dataset.mp && st.form && st.form.parts) { const [i, k] = el.dataset.mp.split('|'); if (st.form.parts[+i]) st.form.parts[+i][k] = el.value; return; }
    if (!isChange) return;
    if (el.id === 'mDay' && /^\d{4}-\d{2}-\d{2}$/.test(el.value)) { st.sh = Object.assign({}, sh(), { day: el.value }); st.form = null; keep(); }
    if (el.id === 'mPeriod') { st.sh = Object.assign({}, sh(), { period: el.value === 'N' ? 'N' : 'D' }); st.form = null; keep(); }
    if (el.id === 'mWeek' && M.validWeek(el.value.trim().toUpperCase())) { st.week = el.value.trim().toUpperCase(); keep(); }
  }
  document.addEventListener('input', e => { if (e.target.closest && e.target.closest('[data-mf],[data-mp]')) onField(e.target, false); });
  document.addEventListener('change', e => { if (e.target.dataset && (e.target.dataset.mf !== undefined || e.target.dataset.mp !== undefined || /^m(Day|Period|Week)$/.test(e.target.id))) onField(e.target, true); });

  // Estilos próprios (prefixo mt-), para ficar igual nas duas apps
  if (!document.getElementById('mt-css')) {
    const s = document.createElement('style'); s.id = 'mt-css';
    s.textContent = '.mt-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 8px}.mt-f{display:block;font-size:13px;color:#5b6a60;margin:6px 0}' +
      '.mt-f input,.mt-f select,.mt-f textarea,.mt-part input,.mt-part select{display:block;width:100%;min-width:0;margin-top:3px;font:inherit;font-size:16px;padding:9px 10px;border:1px solid #c9d2c8;border-radius:9px;background:#fff;color:#16211a;box-sizing:border-box}' +
      '.mt-req>:first-child{}.mt-req{font-weight:600}.mt-part{display:grid;grid-template-columns:3fr 1fr 1fr;gap:6px;margin:4px 0}' +
      '.mt-box{background:#f6f7f4;border:1px solid #dde3dc;border-radius:10px;padding:10px;margin:8px 0}.mt-item{border-bottom:1px solid #dde3dc;padding:9px 0}.mt-item:last-child{border-bottom:0}' +
      '.mt-sub{color:#5b6a60;font-size:13px;margin:3px 0}.mt-c{display:inline-block;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:600;background:#e2e8f0;color:#475569;margin:2px 2px}' +
      '.mt-ok{background:#dcfce7;color:#15803d}.mt-warn{background:#fef3c7;color:#b45309}.mt-bad{background:#fee2e2;color:#b91c1c}' +
      '.mt-late{border-left:4px solid #b91c1c;padding-left:8px}.mt-bn{border-radius:10px;padding:10px 12px;margin:0 0 10px;font-weight:600;cursor:pointer;background:#fee2e2;color:#b91c1c}' +
      '.mt-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;text-align:center;margin:6px 0}.mt-kpi div{background:#f6f7f4;border-radius:10px;padding:8px 4px}' +
      '.mt-kpi b{display:block;font-size:20px}.mt-kpi span{font-size:11px;color:#5b6a60}.mt-t{width:100%;border-collapse:collapse;font-size:14px}.mt-t td{border-bottom:1px solid #dde3dc;padding:5px 4px}' +
      '.mt-grp{margin:12px 0 2px;font-size:15px;border-bottom:2px solid #dde3dc}.mt-n{text-align:right;font-variant-numeric:tabular-nums}.mt-chk{display:flex;align-items:center;gap:8px;font-size:14px;margin:6px 0}.mt-chk input{width:20px;height:20px}';
    document.head.appendChild(s);
  }

  return { view, reload, warnings, warnText, banners, t, setTab: v => { st.tab = v; } };
};
