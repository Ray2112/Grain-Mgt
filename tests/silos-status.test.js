// 0.11.0: estado dos silos para a Prodn-Mgt (Zhax, 13-11-2026)
const assert = require('assert');
const root = require('../js/rec-sync.js');
root.Logic = require('../js/logic.js');
const S = root.RecSync;
const data = { app: 'moagem-app', format: 4, exportedAt: 'x',
  settings: [{ key: 'main', value: { silos: [{ id: 'S03', cereal: 'Milho', colour: 'Amarelo', grade: '1', cap: 1000000 }] } }, { key: 'other', value: 1 }],
  events: [{ uid: 'a', silo: 'S03', type: 'IN', kg: 500000, date: '2026-11-13', time: '08:00' },
           { uid: 'b', silo: 'S03', type: 'OUT', kg: 20000, bin: 'B01', place: 'C', date: '2026-11-13', time: '09:00' },
           { uid: 'c', silo: 'S03', type: 'OUT', kg: 1, bin: 'B01', date: '2026-11-13', time: '09:30', test: true }],
  sevents: [], lots: [{ id: 'L1' }], maint: [{}], fssc: [{}] };
const o = S.silosStatus(data, '2026-11-13T09:00:00.000Z');
assert.strictEqual(o.kind, 'silos-status'); assert.strictEqual(o.app, 'moagem-app'); assert.strictEqual(o.writer, 'grain-mgt');
assert.deepStrictEqual(o.settings.map(s => s.key), ['main'], 'só a configuração dos silos');
assert.deepStrictEqual(o.events.map(e => e.uid), ['a', 'b'], 'registos de teste ficam de fora');
assert.ok(!('lots' in o) && !('maint' in o), 'só o necessário para o stock');
console.log('silos-status: OK');
