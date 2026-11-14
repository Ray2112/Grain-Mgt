// Login e logout de turno da secção de silos (Grain-Mgt 0.12.0, Zhax 13-11-2026). Regras puras, testáveis em Node.
// Balanças: BA01 Recepção 1, BA02 Recepção 2, BA03 e BA04 Alimentação da moagem (totalizadores em kg).
// Objectivos no logout: toneladas enviadas para a moagem contra o plano do dia (OEE THROUGHPUT, TARGET) e camiões recebidos
// contra os esperados. A ponte-báscula não entra (sem acesso). Leituras em branco ficam null, nunca 0.
(function (root) {
  'use strict';
  const SCALES = ['BA01', 'BA02', 'BA03', 'BA04'];
  const RECEPTION = ['BA01', 'BA02'], FEED = ['BA03', 'BA04'];
  const DIRTY_BINS = ['B01', 'B02', 'B03', 'B04'];
  // 0.12.1: cada trabalho em português e em inglês (a lista edita-se em Definições, com PIN de supervisor)
  const DEFAULT_JOBS = [{ pt: 'Limpeza das fossas de recepção', en: 'Cleaning of the reception pits' }, { pt: 'Recolha de pó (filtros)', en: 'Dust collection (filters)' },
    { pt: 'Controlo de pragas', en: 'Pest control' }];
  // Trabalho guardado: {pt, en}; listas antigas (texto) valem para as duas línguas
  const jobText = (j, lang) => typeof j === 'string' ? j : (j && (j[lang] || j.pt || j.en)) || '';
  // listas da 0.12.0 (texto em português): os trabalhos de origem passam a ter as duas línguas; os outros ficam como foram escritos
  const normJobs = list => (Array.isArray(list) ? list : DEFAULT_JOBS).map(j => typeof j === 'string' ? (DEFAULT_JOBS.find(d => d.pt === j) || { pt: j, en: j }) : { pt: j.pt || j.en || '', en: j.en || j.pt || '' }).filter(j => j.pt || j.en);
  const r3 = v => Math.round(v * 1000) / 1000;
  const isNum = v => typeof v === 'number' && isFinite(v);
  function num(v) {
    if (v === null || v === undefined) return null;
    let s = String(v).trim().replace(/\s/g, '');
    if (s === '') return null;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');   // 1.234.567,8
    else s = s.replace(',', '.');
    const n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function readScales(o) {
    const values = {}, bad = [];
    SCALES.forEach(k => {
      const v = num(o && o[k]);
      if (v === null) values[k] = null;
      else if (isNaN(v) || v < 0) bad.push(k);
      else values[k] = r3(v);
    });
    return { values, bad };
  }
  function scaleKg(start, end) {
    const kg = {}, negative = [];
    SCALES.forEach(k => {
      const a = start && start[k], b = end && end[k];
      if (!isNum(a) || !isNum(b)) { kg[k] = null; return; }
      if (b < a) { kg[k] = null; negative.push(k); return; }
      kg[k] = r3(b - a);
    });
    return { kg, negative };
  }
  // Soma de um grupo de balanças; null se faltar alguma
  const groupKg = (kg, group) => group.every(k => isNum(kg[k])) ? r3(group.reduce((s, k) => s + kg[k], 0)) : null;
  // Registos do turno (id 'AAAA-MM-DD/D|N'): recepções (lotes), descargas para a linha, transferências, esvaziamentos
  function shiftRecords(id, d, shiftOf) {
    const inShift = x => x && x.date && shiftOf(x.date, x.time).id === id;
    const real = x => x && !x.test;
    const lots = (d.lots || []).filter(l => real(l) && inShift(l) && !l.cancelled);
    const ev = (d.events || []).filter(e => real(e) && inShift(e));
    const outs = ev.filter(e => e.type === 'OUT'), toBins = outs.filter(e => DIRTY_BINS.indexOf(e.bin) >= 0);
    const sum = (a, f) => r3(a.reduce((s, x) => s + (Number(f(x)) || 0), 0));
    return { lots, outs, toBins, transfers: ev.filter(e => e.type === 'TRANSFER'), empties: ev.filter(e => e.type === 'EMPTY'),
      receivedKg: sum(lots, l => l.kg), sentKg: sum(toBins, e => e.kg), trucks: lots.length };
  }
  const pct = (a, b) => isNum(a) && isNum(b) && b > 0 ? Math.round(a / b * 1000) / 10 : null;
  // Comparação balanças × registos (só aviso): diferença em kg, null se faltar a leitura
  function scaleChecks(kg, rec) {
    const r = groupKg(kg, RECEPTION), f = groupKg(kg, FEED);
    return { reception: { scaleKg: r, recordsKg: rec.receivedKg, diffKg: isNum(r) ? r3(r - rec.receivedKg) : null },
      feed: { scaleKg: f, recordsKg: rec.sentKg, diffKg: isNum(f) ? r3(f - rec.sentKg) : null } };
  }
  // Plano do dia para a moagem (production-plan.json): soma dos objectivos da linha C
  function planKg(plan, day) {
    const rows = ((plan && plan.days && plan.days[day]) || []).filter(r => isNum(r.targetKg));
    return rows.length ? r3(rows.reduce((s, r) => s + r.targetKg, 0)) : null;
  }
  const api = { jobText, normJobs, SCALES, RECEPTION, FEED, DIRTY_BINS, DEFAULT_JOBS, num, readScales, scaleKg, groupKg, shiftRecords, scaleChecks, planKg, pct };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShiftRules = api;
})(typeof window !== 'undefined' ? window : this);
