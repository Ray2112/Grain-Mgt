// Relatório da Grain-Mgt (0.15.0, Zhax 14-11-2026): um dia de produção (07:00 → 07:00) ou um turno (D 07–19, N 19–07).
// Totais a partir dos registos do dia (GrainBook.items): recepções, descargas para a linha, transferências, monitorização,
// paragens e turno. O stock dos silos é o registado no logout do turno (sem logout = «—», nunca estimado).
// Regras puras. Browser: window.GrainReport · Node: module.exports.
(function (root) {
  'use strict';
  const r3 = x => Math.round(x * 1000) / 1000;
  const kgOf = v => (typeof v === 'number' && isFinite(v)) ? v : null;
  // items = GrainBook.items(d, day, shiftOf); win = '' | 'D' | 'N'
  function summary(items, win, shiftOf) {
    const its = (items || []).filter(x => !win || shiftOf(x.rec.date, x.rec.time).window === win);
    const of = k => its.filter(x => x.kind === k).map(x => x.rec);
    const sum = (a, f) => r3(a.reduce((s, x) => s + (kgOf(f(x)) || 0), 0));
    const lots = of('lot'), outs = of('OUT'), trs = of('TRANSFER'), stops = of('stop');
    const byCereal = {};
    lots.forEach(l => { const k = (l.cereal || '—') + (l.colour ? ' ' + l.colour : ''); (byCereal[k] = byCereal[k] || { trucks: 0, kg: 0 }); byCereal[k].trucks++; byCereal[k].kg = r3(byCereal[k].kg + (kgOf(l.kg) || 0)); });
    const byLine = {};
    outs.forEach(e => { const k = e.place || '—'; byLine[k] = r3((byLine[k] || 0) + (kgOf(e.kg) || 0)); });
    const ins = of('shiftIn'), outsSh = of('shiftOut');
    const lastOut = outsSh.slice().sort((a, b) => (a.t || 0) - (b.t || 0)).pop() || null;
    return {
      count: its.length,
      intake: { trucks: lots.length, kg: sum(lots, l => l.kg), byCereal },
      discharge: { n: outs.length, kg: sum(outs, e => e.kg), byLine, warned: outs.filter(e => (e.warnings || []).length).length },
      transfer: { n: trs.length, kg: sum(trs, e => e.kg) },
      monit: { n: its.filter(x => x.cat === 'monit').length },
      stops: { n: stops.length, min: stops.reduce((s, x) => s + (kgOf(x.durationMin) || 0), 0) },
      shifts: ins.map(i => ({ period: i.period, leader: i.leader, pin: i.leaderPin || '', at: i.date + ' ' + i.time, out: outsSh.find(o => o.inUid === i.uid) || null })),
      stockEnd: lastOut && lastOut.stockEnd ? lastOut.stockEnd : null,
      items: its
    };
  }
  const api = { summary };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GrainReport = api;
})(typeof window !== 'undefined' ? window : this);
