// Registos do dia da Grain-Mgt (0.14.0, Zhax 14-11-2026): tudo o que foi registado num dia de produção (07:00 → 07:00), por
// categoria e hora — recepções, descargas para a linha, transferências, silos (vazio, abertura, acerto), monitorização, turno,
// paragens e manutenção. Regras puras: items(d, day, shiftOf) e texto(item, lang). Browser: window.GrainBook · Node: module.exports.
(function (root) {
  'use strict';
  const CATS = ['intake', 'discharge', 'transfer', 'silo', 'monit', 'shift', 'stops', 'maint'];
  const T = {
    pt: { c_intake: 'Recepção', c_discharge: 'Descarga para a linha', c_transfer: 'Transferência', c_silo: 'Silos', c_monit: 'Monitorização', c_shift: 'Turno', c_stops: 'Paragens', c_maint: 'Manutenção',
      lot: 'Lote {c} · {s} · {kg} · {cer} {col}', out: '{s} → {line}{bin} · {kg}', tr: '{s} → {to} · {kg}', empty: '{s} marcado vazio', opening: '{s} abertura {kg}', adjust: '{s} acerto {kg}',
      ROUND: '{s} leitura de temperatura', WEEKLY: '{s} inspecção semanal', TREAT: '{s} tratamento', DISP: '{s} disposição do CQ', OVERRIDE: '{s} correcção de estado', SENSOR: '{s} sensores',
      shiftIn: 'Login de turno — {by}', shiftOut: 'Logout de turno — {by}', stop: 'Paragem {c} · {m} min · {d}', work: 'Intervenção · {d}', other: '{k}' },
    en: { c_intake: 'Intake', c_discharge: 'Discharge to line', c_transfer: 'Transfer', c_silo: 'Silos', c_monit: 'Monitoring', c_shift: 'Shift', c_stops: 'Stoppages', c_maint: 'Maintenance',
      lot: 'Lot {c} · {s} · {kg} · {cer} {col}', out: '{s} → {line}{bin} · {kg}', tr: '{s} → {to} · {kg}', empty: '{s} marked empty', opening: '{s} opening {kg}', adjust: '{s} adjustment {kg}',
      ROUND: '{s} temperature reading', WEEKLY: '{s} weekly inspection', TREAT: '{s} treatment', DISP: '{s} QC disposition', OVERRIDE: '{s} status correction', SENSOR: '{s} sensors',
      shiftIn: 'Shift login — {by}', shiftOut: 'Shift logout — {by}', stop: 'Stoppage {c} · {m} min · {d}', work: 'Intervention · {d}', other: '{k}' }
  };
  const real = x => x && !x.test;
  const ms = (date, time) => new Date(String(date) + 'T' + (time || '00:00')).getTime();
  function items(d, day, shiftOf) {
    const out = [], inDay = x => x && x.date && shiftOf(x.date, x.time).date === day;
    const add = (x, cat, kind) => { if (real(x) && inDay(x)) out.push({ t: ms(x.date, x.time), cat, kind, rec: x }); };
    (d.lots || []).filter(l => !l.cancelled).forEach(l => add(l, 'intake', 'lot'));
    (d.events || []).forEach(e => {
      if (e.type === 'IN') return;                               // a recepção já aparece pelo lote
      add(e, e.type === 'OUT' ? 'discharge' : e.type === 'TRANSFER' ? 'transfer' : 'silo', e.type);
    });
    (d.mon || []).forEach(m => add(m, 'monit', m.kind));
    const voided = new Set((d.maint || []).filter(m => m.kind === 'void').map(m => m.voids));
    (d.maint || []).filter(m => !voided.has(m.uid)).forEach(m => {
      if (m.kind === 'shiftIn' || m.kind === 'shiftOut') add(m, 'shift', m.kind);
      else if (m.kind === 'stop') add(m, 'stops', 'stop');
      else if (['work', 'pmUpdate', 'consumable', 'note', 'shift'].indexOf(m.kind) >= 0) add(m, 'maint', m.kind);
    });
    return out.sort((a, b) => a.t - b.t);
  }
  function text(x, lang, fmtKg) {
    const L = T[lang] || T.pt, r = x.rec, kg = v => (typeof v === 'number' && isFinite(v)) ? fmtKg(v) : '—';
    const f = (k, v) => { let s = L[k] || L.other; Object.keys(v || {}).forEach(n => { s = s.split('{' + n + '}').join(v[n] == null ? '' : v[n]); }); return s; };
    switch (x.kind) {
      case 'lot': return f('lot', { c: r.code || r.id, s: (r.dest || []).map(p => p.silo).join(', '), kg: kg(r.kg), cer: r.cereal || '', col: r.colour || '' });
      case 'OUT': return f('out', { s: r.silo, line: r.place || '', bin: r.bin ? ' / ' + r.bin : '', kg: kg(r.kg) });
      case 'TRANSFER': return f('tr', { s: r.silo, to: r.toSilo, kg: kg(r.kg) });
      case 'EMPTY': return f('empty', { s: r.silo });
      case 'OPENING': return f('opening', { s: r.silo, kg: kg(r.kg) });
      case 'ADJUST': return f('adjust', { s: r.silo, kg: kg(r.kg) });
      case 'shiftIn': case 'shiftOut': return f(x.kind, { by: r.leader || r.by || '' });
      case 'stop': return f('stop', { c: r.code || '', m: r.durationMin == null ? '—' : r.durationMin, d: r.description || '' });
      case 'work': return f('work', { d: (r.equipment ? r.equipment + ' — ' : '') + (r.description || '') });
      default: return L[x.kind] ? f(x.kind, { s: r.silo || '' }) : String(r.notes || r.text || x.kind);
    }
  }
  const catName = (c, lang) => (T[lang] || T.pt)['c_' + c] || c;
  const api = { CATS, items, text, catName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GrainBook = api;
})(typeof window !== 'undefined' ? window : this);
