// node tests/silo-sensors.test.js — sensores de temperatura dos silos (js/silo-sensors.js)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const X = require('../js/silo-sensors.js');
let n = 0;
function t(name, fn) { try { fn(); n++; } catch (e) { console.error('FALHOU:', name); throw e; } }
const g = v => ({ t: v, z: 'g' }), a = v => ({ t: v, z: 'a' }), o = v => ({ t: v, z: 'o' }), e = () => ({ t: null, z: 'e' });
const rep = (id, silos) => ({ id, date: id.slice(0, 10), time: id.slice(11), ambient: 25, silos });

t('avaliação: só sensores no grão; perfil do topo à base; máximo e média', () => {
  const E = X.evalSilo([[o(31), g(24), g(26), a(30)], [o(30), g(22), g(24), g(28)]]);
  assert.deepStrictEqual([E.maxT, E.avgT, E.minT, E.coverage, E.sensors], [30, 25.7, 22, 3, 8]);
  assert.deepStrictEqual(E.maxAt, { c: 1, s: 4 });
  assert.deepStrictEqual(E.levels.map(L => [L.level, L.avg, L.n, L.air]), [[1, null, 0, 2], [2, 23, 2, 0], [3, 25, 2, 0], [4, 29, 2, 0]]);
  assert.strictEqual(E.inGrain.find(x => x.t === 30).alarm, true);
});

t('avarias: sem leitura, fora de escala, cabo todo sem leitura — não entram na média', () => {
  const E = X.evalSilo([[g(24), e(), g(80)], [e(), e(), e()], [g(26)]]);
  assert.deepStrictEqual(E.faults.map(f => [f.type, f.c, f.s]), [['error', 1, 2], ['range', 1, 3]]);
  assert.deepStrictEqual(E.cableFaults, [2]);
  assert.deepStrictEqual([E.avgT, E.maxT], [25, 26]);
});

t('salto ≥ 10 °C entre relatórios no mesmo ponto: suspeito, mas conta (ponto quente nunca escondido)', () => {
  const E = X.evalSilo([[g(24), g(41)]], [[g(23.5), g(30)]]);
  assert.deepStrictEqual(E.suspects.map(s => [s.type, s.c, s.s, s.d]), [['jump', 1, 2, 11]]);
  assert.deepStrictEqual([E.maxT, E.dtMax], [41, 11]);
  assert.strictEqual(X.evalSilo([[g(24), g(39.9)]], [[g(24), g(30)]]).suspects.length, 0);
});

t('valor parado em 4 relatórios quando o resto do silo variou', () => {
  const R = [24, 25, 26, 27].map((v, i) => rep('2026-10-1' + i + 'T07:57', { S01: [[g(v), g(33.3)], [g(v + 1)]] }));
  assert.deepStrictEqual(X.stuck(R, 'S01').map(s => [s.type, s.c, s.s, s.t]), [['stuck', 1, 2, 33.3]]);
  const still = [1, 2, 3, 4].map(i => rep('2026-10-1' + i + 'T07:57', { S01: [[g(24), g(33.3)]] }));
  assert.deepStrictEqual(X.stuck(still, 'S01'), [], 'silo todo parado: não é sinal de avaria');
  assert.deepStrictEqual(X.stuck(R.slice(1), 'S01'), [], 'menos de 4 relatórios');
});

t('relatório, avisos e reconhecimento de defeitos', () => {
  const T = { kind: 'silo-temps', reports: [rep('2026-10-16T19:57', { S01: [[g(24)], [e(), e()]] }), rep('2026-10-17T07:57', { S01: [[g(24.5), e()], [e(), e()]], S02: [[o(27)]] })] };
  assert.ok(X.valid(T));
  const r = X.report(T);
  assert.deepStrictEqual([r.id, r.silos.S01.dtMax, r.silos.S02.coverage], ['2026-10-17T07:57', 0.5, 0]);
  const w = X.warnings(r, new Set(['S01|cable|2']));
  assert.deepStrictEqual(w.map(x => [x.key, x.ack, x.suspect || false]), [['S01|cable|2', true, false], ['S01|error|1|2', false, false]]);
  assert.ok(!X.valid({ kind: 'x', reports: [] }));
});

t('pontos SOP: posição fixa por cabo×sensor; fora do grão e avarias sem valor', () => {
  const P = X.sopPoints([[o(31), g(24), e()], [g(22)]]);
  assert.strictEqual(P.length, 16);
  assert.deepStrictEqual([P[0].t, P[1].t, P[2].t, P[8].t, P[9].t], [null, 24, null, 22, null]);
});

const real = path.join(__dirname, '..', '..', '..', 'data', 'silo-temps', 'silo-temps.json');
if (fs.existsSync(real)) t('relatórios reais (Dropbox /Temperature Readings/, 15–17/10/2026)', () => {
  const T = JSON.parse(fs.readFileSync(real, 'utf8'));
  assert.ok(X.valid(T));
  const r = X.report(T);
  assert.strictEqual(r.id, '2026-10-17T07:57');
  assert.strictEqual(Object.keys(r.silos).length, 21);
  // cabo 10 sem leitura em S01–S12
  assert.deepStrictEqual(Object.keys(r.silos).filter(s => r.silos[s].cableFaults.indexOf(10) >= 0), ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10', 'S11', 'S12']);
  // S13 cabo 1: 49–52 °C no grão (sensores 5–7) — é o máximo do silo e não é tratado como avaria
  assert.deepStrictEqual([r.silos.S13.maxT, r.silos.S13.maxAt], [52.1, { c: 1, s: 6 }]);
  assert.ok(!r.silos.S13.faults.length);
  // S02: tudo fora do grão (cinzento) → sem cobertura
  assert.strictEqual(r.silos.S02.coverage, 0);
});

console.log('silo-sensors: ' + n + ' testes OK');
