// node tests/roles.test.js — PIN por função (js/roles.js, v0.21.0)
const assert = require('assert');
const crypto = require('crypto');
const R = require('../js/roles.js');
const sha = async s => crypto.createHash('sha256').update(s).digest('hex');
(async () => {
  let lock = { fails: 0, until: 0 }, now = 1e12;
  const pins = {};
  const P = R.make({ sha, pins: () => pins, lock: () => lock, setLock: l => { lock = l; }, lang: () => 'en', now: () => now });
  // sem PIN definido
  assert.ok(/No PIN set/.test((await P.who('1234', 'prod')).err));
  pins.sup = await P.makePin('S1S1', 'aa');
  pins.A = await P.makePin('1111', 'bb');
  pins.MA = await P.makePin('2222', 'cc');
  pins.F1 = await P.makePin('3333', 'dd');
  // vazio → «Enter PIN»
  assert.strictEqual((await P.who('', 'prod')).err, 'Enter PIN');
  assert.strictEqual((await P.who('12', 'prod')).err, 'Enter PIN');
  // direitos por secção
  assert.strictEqual((await P.who('1111', 'prod')).role, 'A');
  assert.strictEqual((await P.who('1111', 'qc')).role, 'A');
  assert.ok(/cannot change/.test((await P.who('1111', 'maint')).err));
  assert.strictEqual((await P.who('2222', 'maint')).role, 'MA');
  assert.ok(/cannot change/.test((await P.who('2222', 'prod')).err));
  assert.strictEqual((await P.who('3333', 'fssc')).role, 'F1');
  for (const s of ['prod', 'qc', 'maint', 'fssc', 'settings']) assert.strictEqual((await P.who('S1S1', s)).role, 'sup');
  assert.ok(/cannot change/.test((await P.who('1111', 'settings')).err));
  assert.ok((await P.who('S1S1', 'report')).err, 'Reports: ninguém altera');
  assert.strictEqual(lock.fails, 0, 'PIN certo sem direito não conta como tentativa');
  // título gravado em português, sem nomes
  const w = await P.who('1111', 'prod');
  assert.strictEqual(w.title, 'Chefe de turno A'); assert.strictEqual(w.titleEn, 'Shift leader A');
  assert.strictEqual(R.title('MB', 'pt'), 'Chefe de turno da manutenção B');
  // 5 erradas = bloqueio de 5 min
  for (let i = 0; i < 4; i++) assert.ok(/Wrong PIN/.test((await P.who('9999', 'prod')).err));
  assert.ok(/locked/.test((await P.who('9999', 'prod')).err));
  assert.ok(/locked/.test((await P.who('1111', 'prod')).err));
  now += 5 * 60000 + 1;
  assert.strictEqual((await P.who('1111', 'prod')).role, 'A');
  console.log('roles: OK');
})().catch(e => { console.error(e); process.exit(1); });
