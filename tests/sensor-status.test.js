// node tests/sensor-status.test.js — leituras dos sensores (registos SENSOR) no estado SOP-OPS-002 do silo (Logic.siloStatus)
const assert = require('assert');
const L = require('../js/logic.js');
const X = require('../js/silo-sensors.js');
let n = 0;
function t(name, fn) { try { fn(); n++; } catch (e) { console.error('FALHOU:', name); throw e; } }
const st = { moist: ['13.00', '13.50', '14.00', '15.00'], temp: ['25.0', '30.0', '35.0', '40.0'], dt: ['2.0', '3.0'], weeklyDays: '7' };
const g = v => ({ t: v, z: 'g' }), o = v => ({ t: v, z: 'o' });
let seq = 0;
const sensor = (date, time, reportId, cables) => ({ kind: 'SENSOR', silo: 'S03', date, time, seq: ++seq, reportId, points: X.sopPoints(cables) });
const status = recs => L.siloStatus({ siloId: 'S03', recs, sevents: [], lots: [], st, now: { date: '2026-10-17', time: '12:00' }, kg: 1000 });

t('sensor no grão a 45 °C: nível máximo, silo retido; fora do grão não conta', () => {
  const s = status([sensor('2026-10-17', '07:57', '2026-10-17T07:57', [[o(60), g(24), g(45)]])]);
  const temp = s.drivers.find(d => d.p === 'temp');
  assert.deepStrictEqual([temp.v, temp.level, s.held, s.lastEval.maxPoint], [45, 5, true, 3]);
});

t('ΔT entre relatórios dos sensores no mesmo ponto; inspecção manual não se mistura', () => {
  const recs = [
    sensor('2026-10-16', '19:57', '2026-10-16T19:57', [[g(24), g(26)]]),
    { kind: 'WEEKLY', silo: 'S03', date: '2026-10-17', time: '06:00', seq: ++seq, points: [{ t: '24' }, { t: '24' }, { t: '24' }], moist: '13.0', insects: '0' },
    sensor('2026-10-17', '07:57', '2026-10-17T07:57', [[g(24.5), g(29.5)]])
  ];
  const s = status(recs);
  assert.deepStrictEqual([s.lastEval.maxDT, s.lastEval.dtPoint], [3.5, 2], 'ΔT com o relatório anterior, não com a inspecção semanal');
  assert.strictEqual(s.drivers.find(d => d.p === 'dt').level, 4);
});

t('mesmo relatório importado por dois telemóveis conta uma vez', () => {
  const a = sensor('2026-10-17', '07:57', '2026-10-17T07:57', [[g(24)]]), b = Object.assign({}, a, { seq: ++seq });
  const s = status([a, b]);
  assert.deepStrictEqual([s.level, s.held], [0, false]);
});

t('correcção de estado (supervisor de CQ / Director de Produção) liberta o silo retido pelos sensores', () => {
  const red = sensor('2026-10-17', '07:57', '2026-10-17T07:57', [[g(44)]]);
  const ov = { kind: 'OVERRIDE', silo: 'S03', date: '2026-10-17', time: '09:00', seq: ++seq, status: 'CLEAR', reason: 'sensor S3-1 avariado', role: 'QC_SUP' };
  assert.strictEqual(status([red]).held, true);
  assert.strictEqual(status([red, ov]).held, false);
  // nova leitura Vermelha depois da correcção volta a reter
  assert.strictEqual(status([red, ov, sensor('2026-10-17', '19:57', '2026-10-17T19:57', [[g(44.5)]])]).held, true);
});

t('cópia de segurança aceita SENSOR e OVERRIDE no monitor', () => {
  const base = { app: 'moagem-app', format: 4, lots: [], events: [], settings: [] };
  assert.ok(L.validBackup(Object.assign({ monitor: [{ kind: 'SENSOR', silo: 'S03' }, { kind: 'OVERRIDE', silo: 'S03' }] }, base)));
  assert.ok(!L.validBackup(Object.assign({ monitor: [{ kind: 'HACK', silo: 'S03' }] }, base)));
});

console.log('sensor-status: ' + n + ' testes OK');
