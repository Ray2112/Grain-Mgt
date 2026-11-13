// 0.12.0: login / logout de turno da secção de silos (Zhax, 13-11-2026)
const assert = require('assert');
const R = require('../js/shift-rules.js');
const L = require('../js/logic.js');
assert.deepStrictEqual(R.SCALES, ['BA01', 'BA02', 'BA03', 'BA04']);
const a = R.readScales({ BA01: '1.000.000', BA02: '', BA03: 'x' });
assert.deepStrictEqual([a.values.BA01, a.values.BA02, a.bad], [1000000, null, ['BA03']]);
const q = R.scaleKg({ BA01: 1000, BA02: 500, BA03: 10000, BA04: 20000 }, { BA01: 31000, BA02: 500, BA03: 70000, BA04: 19000 });
assert.deepStrictEqual([q.kg.BA01, q.kg.BA02, q.kg.BA03, q.kg.BA04, q.negative], [30000, 0, 60000, null, ['BA04']]);
const d = { lots: [{ date: '2026-11-13', time: '08:00', kg: 30000 }, { date: '2026-11-13', time: '20:00', kg: 1 }, { date: '2026-11-13', time: '09:00', kg: 5, test: true }],
  events: [{ type: 'OUT', bin: 'B01', kg: 40000, date: '2026-11-13', time: '10:00' }, { type: 'OUT', bin: 'B02', kg: 20000, date: '2026-11-14', time: '06:00' }, { type: 'TRANSFER', date: '2026-11-13', time: '11:00' }] };
const r = R.shiftRecords('2026-11-13/D', d, L.shiftOf);
assert.deepStrictEqual([r.trucks, r.receivedKg, r.sentKg, r.transfers.length], [1, 30000, 40000, 1], 'só o turno de dia; teste fora');
assert.strictEqual(R.shiftRecords('2026-11-13/N', d, L.shiftOf).sentKg, 20000, '06:00 do dia seguinte é turno da noite');
const ck = R.scaleChecks({ BA01: 30000, BA02: 0, BA03: 60000, BA04: null }, r);
assert.deepStrictEqual([ck.reception.diffKg, ck.feed.scaleKg, ck.feed.diffKg], [0, null, null]);
assert.strictEqual(R.planKg({ days: { '2026-11-13': [{ targetKg: 200000 }] } }, '2026-11-13'), 200000);
assert.strictEqual(R.planKg(null, '2026-11-13'), null);
assert.strictEqual(R.pct(190000, 200000), 95); assert.strictEqual(R.pct(3, 0), null);
console.log('shift (silos): OK');
