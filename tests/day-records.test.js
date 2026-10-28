// node tests/day-records.test.js — ficheiros diários de registos da Grain-Mgt (0.7.0); não contacta o Dropbox
const assert = require('assert');
const R = require('../js/day-records.js');
const L = require('../js/logic.js');
const at = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi || 0).getTime();

// ---- dia de produção ----
assert.strictEqual(R.dayOf({ uid: 'a', shift: '2026-10-24/N', date: '2026-10-25', time: '02:00' }, L.shiftOf), '2026-10-24', 'turno gravado manda');
assert.strictEqual(R.dayOf({ uid: 'a', date: '2026-10-25', time: '06:59' }, L.shiftOf), '2026-10-24', '06:59 pertence ao dia anterior');
assert.strictEqual(R.dayOf({ uid: 'a', date: '2026-10-25', time: '07:00' }, L.shiftOf), '2026-10-25');
assert.strictEqual(R.dayOf({ uid: 'a', date: '2026-10-25' }, L.shiftOf), '2026-10-25', 'sem hora: a data');
assert.strictEqual(R.dayOf({ uid: 'a' }, L.shiftOf), null);

// ---- ficheiros ----
const data = {
  lots: [{ uid: 'l1', id: 'l1', date: '2026-10-24', time: '09:10', shift: '2026-10-24/D', kg: 30000, test: false }],
  events: [
    { uid: 'e2', seq: 2, type: 'OUT', silo: 'S05', kg: 125000, date: '2026-10-25', time: '01:30', shift: '2026-10-24/N', test: false },
    { uid: 'e1', seq: 1, type: 'IN', silo: 'S05', kg: 30000, lot: 'l1', date: '2026-10-24', time: '09:20', shift: '2026-10-24/D', test: false },
    { seq: 3, type: 'IN', date: '2026-10-24', time: '10:00', test: false },                 // sem uid: fora (contado)
    { uid: 't1', type: 'IN', date: '2026-10-24', time: '10:00', test: true }
  ],
  monitor: [{ uid: 'm1', kind: 'ROUND', silo: 'S05', date: '2026-10-24', time: '20:00', shift: '2026-10-24/N', test: false }],
  sevents: [],
  settings: [{ key: 'pin', value: 'segredo' }]
};
const opts = { shiftOf: L.shiftOf, test: false, now: Date.UTC(2026, 9, 25, 8), writerVersion: '0.7.0', deviceId: 'd1', site: 'FMO', masterVersion: L.MASTER_VERSION, ensureDays: ['2026-10-25'] };
const b = R.buildDayFiles(data, opts);
assert.deepStrictEqual(Object.keys(b.files), ['2026-10-24', '2026-10-25']);
const f = b.files['2026-10-24'].file;
assert.strictEqual(f.kind, 'grain-mgt-day');
assert.strictEqual(f.writer, 'grain-mgt');
assert.deepStrictEqual(Object.keys(f.records), ['lots', 'events', 'monitor', 'sevents', 'maint']);   // 0.8.0: + maint (ficheiro schema 2)
assert.deepStrictEqual(f.records.events.map(e => e.uid), ['e1', 'e2'], 'ordenado por uid; OUT de madrugada fica no dia');
assert.deepStrictEqual(f.manifest.counts, { lots: 1, events: 2, monitor: 1, sevents: 0, maint: 0 });
assert.deepStrictEqual(f.manifest.shifts, { D: 2, N: 2, none: 0 });
assert.ok(!('settings' in f.records), 'definições (PIN) nunca vão no ficheiro');
assert.deepStrictEqual(b.undated, { events: 1 });
assert.strictEqual(b.files['2026-10-25'].file.manifest.total, 0, 'dia pedido sem registos: ficheiro vazio');
assert.strictEqual(R.dayPath('/records', '2026-10-24'), '/records/2026-10-24_FMO_GrainMgt.json');
// teste separado
assert.deepStrictEqual(R.buildDayFiles(data, Object.assign({}, opts, { test: true, ensureDays: [] })).files['2026-10-24'].file.records.events.map(e => e.uid), ['t1']);
// hash estável; pendentes e fecho do dia
const b2 = R.buildDayFiles(data, Object.assign({}, opts, { now: opts.now + 3600000 }));
assert.strictEqual(b2.files['2026-10-24'].hash, b.files['2026-10-24'].hash);
const p24 = R.dayPath('/records', '2026-10-24'), p25 = R.dayPath('/records', '2026-10-25');
const sent = { [p24]: b.files['2026-10-24'].hash, [p25]: b.files['2026-10-25'].hash };
assert.deepStrictEqual(R.pendingDays(b, '/records', {}), ['2026-10-24', '2026-10-25']);
assert.deepStrictEqual(R.pendingDays(b, '/records', sent), []);
const fin = { now: at(2026, 10, 25, 8), dayEnd: R.dayEnd, sentGen: { [p24]: at(2026, 10, 24, 22), [p25]: at(2026, 10, 25, 8) } };
assert.deepStrictEqual(R.pendingDays(b, '/records', sent, fin), ['2026-10-24'], 'dia 24 terminou após o último envio: fecha');
assert.strictEqual(R.dayEnd('2026-10-24'), at(2026, 10, 25, 7));
console.log('OK — ficheiros diários da Grain-Mgt');
