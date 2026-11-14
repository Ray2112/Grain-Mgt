// 0.15.0: FIFO por designação, silo pela primeira entrada desde o último vazio (Zhax, 14-11-2026)
const assert = require('assert');
const F = require('../js/fifo.js');
const silos = [{ id: 'S01', cereal: 'Milho', colour: 'Amarelo', grade: 'G1' }, { id: 'S02', cereal: 'Milho', colour: 'Amarelo', grade: 'G1' },
  { id: 'S03', cereal: 'Milho', colour: 'Amarelo', grade: 'G2' }, { id: 'S04', cereal: 'Milho', colour: 'Amarelo', grade: 'G1' }, { id: 'S05', cereal: 'Milho', colour: 'Branco', grade: 'G1' }];
const ev = [
  { type: 'IN', silo: 'S01', date: '2026-11-01', time: '08:00', kg: 30000, lot: 'A' },
  { type: 'IN', silo: 'S02', date: '2026-10-20', time: '08:00', kg: 30000, lot: 'B' },
  { type: 'EMPTY', silo: 'S02', date: '2026-10-30', time: '08:00' },            // S02 esvaziado: conta a entrada seguinte
  { type: 'IN', silo: 'S02', date: '2026-11-03', time: '09:00', kg: 20000, lot: 'C' },
  { type: 'TRANSFER', silo: 'S01', toSilo: 'S04', date: '2026-10-31', time: '10:00', kg: 5000, lots: ['Z'] },
  { type: 'IN', silo: 'S03', date: '2026-11-02', time: '08:00', kg: 10000, lot: 'D' },
  { type: 'IN', silo: 'S05', date: '2026-11-02', time: '08:00', kg: 10000, lot: 'E' }];
const kg = { S01: 25000, S02: 20000, S03: 10000, S04: 5000, S05: 0 };
const q = F.queues(silos, ev, id => kg[id]);
assert.deepStrictEqual(q.map(g => g.key), ['Milho|Amarelo|G1', 'Milho|Amarelo|G2'], 'G1 antes de G2; S05 vazio fora');
assert.deepStrictEqual(q[0].silos.map(s => s.id + ':' + s.pos), ['S04:1', 'S01:2', 'S02:3'], 'pela primeira entrada; S02 conta só depois do vazio');
assert.strictEqual(q[0].silos[0].entries[0].from, 'S01', 'transferência mostra a origem');
assert.strictEqual(F.outOfOrder('S01', ['S01'], silos, ev, id => kg[id]), 'S04', 'S04 devia sair primeiro');
assert.strictEqual(F.outOfOrder('S01', ['S01', 'S04'], silos, ev, id => kg[id]), null, 'S04 na mesma fila: sem aviso');
assert.strictEqual(F.outOfOrder('S04', ['S04'], silos, ev, id => kg[id]), null, 'o primeiro: sem aviso');
assert.strictEqual(F.outOfOrder('S03', ['S03'], silos, ev, id => kg[id]), null, 'único da sua designação');
// silo com stock sem entrada registada (abertura antiga) = mais antigo
const q2 = F.queues(silos.slice(0, 2), [ev[0]], id => (id === 'S02' ? 1000 : 25000));
assert.deepStrictEqual(q2[0].silos.map(s => s.id), ['S02', 'S01']);
console.log('fifo.test: OK');
