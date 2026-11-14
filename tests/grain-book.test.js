// 0.14.0: registos do dia da Grain-Mgt (Zhax, 14-11-2026)
const assert = require('assert');
const B = require('../js/grain-book.js');
const L = require('../js/logic.js');
const d = { lots: [{ id: 'L1', code: 'REC1', date: '2026-11-14', time: '08:00', kg: 30000, dest: [{ silo: 'S03' }], cereal: 'Milho', colour: 'Amarelo' }, { id: 'L2', date: '2026-11-14', time: '06:00', kg: 1 }],
  events: [{ type: 'IN', silo: 'S03', date: '2026-11-14', time: '08:00', kg: 30000 }, { type: 'OUT', silo: 'S03', place: 'SG01', date: '2026-11-15', time: '05:00', kg: 1000 },
    { type: 'OUT', silo: 'S05', place: 'C', bin: 'B01', date: '2026-11-14', time: '09:00', kg: 20000, test: true }],
  mon: [{ kind: 'WEEKLY', silo: 'S07', date: '2026-11-14', time: '10:00' }],
  maint: [{ uid: 'a', kind: 'shiftIn', date: '2026-11-14', time: '07:05', leader: 'Rui' }, { uid: 'b', kind: 'stop', date: '2026-11-14', time: '11:00', code: 'A01', durationMin: 40 }, { uid: 'v', kind: 'void', voids: 'b', date: '2026-11-14', time: '12:00' }] };
const it = B.items(d, '2026-11-14', L.shiftOf);
assert.deepStrictEqual(it.map(x => x.kind), ['shiftIn', 'lot', 'WEEKLY', 'OUT'], '06:00 é do dia anterior; teste e anulados fora; IN aparece pelo lote; 05:00 do dia 15 é deste dia');
assert.strictEqual(B.text(it[3], 'en', v => v + ' kg'), 'S03 → SG01 · 1000 kg', 'SG01 sem bin');
assert.strictEqual(B.text(it[1], 'pt', v => v + ' kg'), 'Lote REC1 · S03 · 30000 kg · Milho Amarelo');
assert.strictEqual(B.catName('discharge', 'en'), 'Discharge to line');
console.log('grain-book: OK');
