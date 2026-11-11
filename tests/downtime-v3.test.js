// node tests/downtime-v3.test.js — códigos de paragem v3 (decisões D-16 a D-18, D-21; 5-6 Nov 2026)
const assert = require('assert');
const { CODES: C } = require('../js/maint-codes.js');
const by = Object.fromEntries(C.map(c => [c.code, c]));
let n = 0;
function t(name, fn) { try { fn(); n++; } catch (e) { console.error('FALHOU:', name); throw e; } }

t('60 códigos activos (v3 com P25 removido)', () => {
  assert.strictEqual(C.length, 60);
  assert.strictEqual(new Set(C.map(c => c.code)).size, 60, 'códigos duplicados');
});
t('P25 removido (D-16)', () => { assert.strictEqual(by.P25, undefined); });
t('tier Processo: P16, P19, P24 (D-17)', () => {
  for (const k of ['P16', 'P19', 'P24']) assert.strictEqual(by[k].tier3, 'Process', k);
});
t('O04 = Outra, nome POWER FAILURE (D-17, D-18)', () => {
  assert.strictEqual(by.O04.tier3, 'Other');
  assert.strictEqual(by.O04.name, 'POWER FAILURE');
});
t('O11 = Outra, excluída externa (decisão 6 Nov)', () => {
  assert.strictEqual(by.O11.tier3, 'Other');
  assert.strictEqual(by.O11.oee, 'Excluded - External');
});
t('P06 = ROLLER CHANGE, planeada (D-18)', () => {
  assert.strictEqual(by.P06.name, 'ROLLER CHANGE');
  assert.strictEqual(by.P06.oee, 'Excluded - Planned');
});
t('P17 mantém FUBA BIN FULL (D-15)', () => { assert.strictEqual(by.P17.name, 'FUBA BIN FULL'); });
t('P18 planeado e excluído do OEE (v3)', () => { assert.strictEqual(by.P18.oee, 'Excluded - Planned'); });

console.log(`downtime-v3: ${n} testes OK`);
