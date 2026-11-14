// 0.13.0: tendência da temperatura (Zhax, 13-11-2026)
const assert = require('assert');
const TT = require('../js/temp-trend.js');
const tr = { month: '2026-11', days: { '2026-11-01': { ambient: 38.4, silos: { S01: [32.4, 30.6, 25.5], S02: [30, 30, null] } }, '2026-11-13': { ambient: 35.3, silos: { S01: [28, 27.3, 26.3] } } } };
assert.deepStrictEqual(TT.siteRow(tr.days['2026-11-01']), [31.2, 30.3, 25.5], 'média de todos os silos por nível; sem valor fica de fora');
const s = TT.seriesOf(tr, 'S01');
assert.deepStrictEqual(s.map(x => x.d), ['2026-11-01', '2026-11-13']);
assert.deepStrictEqual(TT.change(s), [-4.4, -3.3, 0.8]);
assert.deepStrictEqual(TT.seriesOf(tr, 'S02')[1].v, [null, null, null], 'silo sem leitura no dia: vazio, nunca zero');
console.log('temp-trend: OK');
