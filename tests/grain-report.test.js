// 0.15.0: relatório do dia / turno da Grain-Mgt (Zhax, 14-11-2026)
const assert = require('assert');
const B = require('../js/grain-book.js'), L = require('../js/logic.js'), R = require('../js/grain-report.js');
const d = { lots: [{ id: 'L1', code: 'R1', date: '2026-11-14', time: '08:00', kg: 30000, cereal: 'Milho', colour: 'Amarelo', dest: [{ silo: 'S03' }] },
    { id: 'L2', code: 'R2', date: '2026-11-14', time: '20:00', kg: 25000, cereal: 'Milho', colour: 'Amarelo', dest: [{ silo: 'S03' }] }],
  events: [{ type: 'OUT', silo: 'S03', place: 'C', bin: 'B01', date: '2026-11-14', time: '09:00', kg: 20000, warnings: ['FIFO'] },
    { type: 'OUT', silo: 'S03', place: 'SG01', date: '2026-11-15', time: '02:00', kg: 5000 }, { type: 'TRANSFER', silo: 'S03', toSilo: 'S04', date: '2026-11-14', time: '10:00', kg: 1000 }],
  mon: [], maint: [{ uid: 'i', kind: 'shiftIn', period: 'D', date: '2026-11-14', time: '07:05', leader: 'Rui', leaderPin: 'ok' },
    { uid: 'o', kind: 'shiftOut', inUid: 'i', t: 5, date: '2026-11-14', time: '18:55', stockEnd: [{ silo: 'S03', kg: 9000 }] },
    { uid: 's', kind: 'stop', date: '2026-11-14', time: '11:00', durationMin: 40 }] };
const it = B.items(d, '2026-11-14', L.shiftOf);
const day = R.summary(it, '', L.shiftOf), dd = R.summary(it, 'D', L.shiftOf), nn = R.summary(it, 'N', L.shiftOf);
assert.deepStrictEqual([day.intake.trucks, day.intake.kg, day.discharge.kg, day.discharge.byLine.SG01, day.transfer.kg, day.stops.min], [2, 55000, 25000, 5000, 1000, 40]);
assert.deepStrictEqual([dd.intake.kg, dd.discharge.kg, dd.discharge.warned, dd.shifts[0].pin, dd.stockEnd[0].kg], [30000, 20000, 1, 'ok', 9000]);
assert.deepStrictEqual([nn.intake.kg, nn.discharge.kg, nn.stockEnd], [25000, 5000, null], 'noite sem logout: stock «—»');
console.log('grain-report.test: OK');
