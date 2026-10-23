// node tests/bins-feed.test.js — regras puras do leitor
const assert = require('assert');
const F = require('../js/bins-feed.js');
const D = require('../js/dropbox-read.js');
const NOW = Date.parse('2026-10-23T12:00:00Z');
const base = (over) => Object.assign({ schemaVersion: 1, generatedAt: '2026-10-23T11:30:00Z', writer: 'mill-qc', writerVersion: '1.9.1', site: 'x', bins: [
  { id: 'B01', capKg: 130000, kg: 40000, state: 'OK', since: '2026-10-23T07:00:00Z',
    transfers: [{ t: '2026-10-23T08:10:00Z', kg: 40000, parts: [{ silo: 'S05', kg: 40000, cereal: 'Milho', colour: 'Amarelo', grade: '1' }] }], runningJobs: [] }
] }, over || {});
const st = base();
// parse
assert.strictEqual(F.parseBinsStatus(JSON.stringify(st)).bins[0].id, 'B01');
assert.throws(() => F.parseBinsStatus('não é json'), /JSON/);
assert.throws(() => F.parseBinsStatus(JSON.stringify(base({ schemaVersion: 2 }))), /schemaVersion/);
assert.throws(() => F.parseBinsStatus(JSON.stringify(base({ writer: 'outro' }))), /escritor/);
assert.throws(() => F.parseBinsStatus(JSON.stringify(base({ generatedAt: 'ontem' }))), /generatedAt/);
assert.throws(() => F.parseBinsStatus(JSON.stringify(base({ bins: [{ id: 'B01', kg: '40', capKg: 130000, state: 'OK', transfers: [] }] }))), /kg/);
assert.throws(() => F.parseBinsStatus(JSON.stringify(base({ bins: [{ id: 'B01', kg: 1, capKg: 1, state: 'XX', transfers: [] }] }))), /estado/);
// frescura (limites exatos)
assert.deepStrictEqual(F.freshness(st, NOW).reason, 'ok');
assert.strictEqual(F.freshness(base({ generatedAt: '2026-10-23T10:00:00Z' }), NOW).ok, true);          // exatamente 2 h
assert.strictEqual(F.freshness(base({ generatedAt: '2026-10-23T09:59:59Z' }), NOW).reason, 'stale');   // 2 h + 1 s
assert.strictEqual(F.freshness(base({ generatedAt: '2026-10-23T12:04:00Z' }), NOW).ok, true);          // 4 min à frente: tolerado
assert.strictEqual(F.freshness(base({ generatedAt: '2026-10-23T12:06:00Z' }), NOW).reason, 'future');
// feedCheck
const silo = { id: 'S07', cereal: 'Milho', colour: 'Amarelo', grade: '1' };
assert.strictEqual(F.feedCheck(st, 'B01', silo, NOW, 10000).ok, true);
assert.strictEqual(F.feedCheck(st, 'B01', { ...silo, grade: '2' }, NOW).reasons[0].code, 'GRADE_MISMATCH');
assert.strictEqual(F.feedCheck(st, 'B01', { ...silo, colour: 'Branco' }, NOW).reasons[0].code, 'OTHER_COLOUR');
assert.strictEqual(F.feedCheck(st, 'B01', { ...silo, cereal: 'Trigo' }, NOW).reasons[0].code, 'OTHER_CEREAL');
assert.strictEqual(F.feedCheck(base({ generatedAt: '2026-10-23T09:00:00Z' }), 'B01', silo, NOW).reasons[0].code, 'FRESHNESS_STALE');
assert.strictEqual(F.feedCheck(st, 'B09', silo, NOW).reasons[0].code, 'BIN_MISSING');
assert.strictEqual(F.feedCheck(st, 'B01', silo, NOW, 95000).reasons[0].code, 'NO_SPACE');
assert.strictEqual(F.feedCheck(st, 'B01', silo, NOW, 90000).ok, true);
assert.strictEqual(F.feedCheck(st, 'B01', { id: 'S07', cereal: 'Milho', colour: 'Amarelo' }, NOW).reasons[0].code, 'SILO_NOT_DESIGNATED');
// conciliação, tolerância 0 kg
assert.deepStrictEqual(F.reconcile(40000, 40000), { diffKg: 0, ok: true });
assert.strictEqual(F.reconcile(40000, 39999.5).ok, false);
assert.strictEqual(F.reconcile(40000, 39999.5, 1).ok, true);
// capacidade não definida na Mill-QC: ficheiro válido, sem verificação de espaço
const noCap = base({ bins: [Object.assign({}, st.bins[0], { capKg: null })] });
assert.strictEqual(F.parseBinsStatus(JSON.stringify(noCap)).bins[0].capKg, null);
assert.strictEqual(F.feedCheck(noCap, 'B01', silo, NOW, 999999).ok, true);
assert.strictEqual(F.feedCheck(noCap, 'B01', silo, NOW).freeKg, null);
// conciliação por bin e silo (ciclo atual, até generatedAt)
const evMs = e => Date.parse(e.at);
const out = (at, silo, kg, bin) => ({ type: 'OUT', bin: bin || 'B01', silo, kg, at });
const rc = (evs, s) => F.reconcileBins(s || st, evs, evMs)[0];
let x = rc([out('2026-10-23T08:10:00Z', 'S05', 40000)]);
assert.deepStrictEqual([x.ok, x.appKg, x.qcKg, x.diffKg, x.silos.length], [true, 40000, 40000, 0, 1]);
x = rc([out('2026-10-23T08:10:00Z', 'S05', 39999.5)]);                       // 0,5 kg a menos: tolerância 0
assert.deepStrictEqual([x.ok, x.diffKg, x.silos[0].diffKg], [false, -0.5, -0.5]);
x = rc([out('2026-10-23T08:10:00Z', 'S05', 30000), out('2026-10-23T08:12:00Z', 'S06', 10000)]);   // total igual, silos trocados
assert.deepStrictEqual([x.ok, x.diffKg, x.silos.map(s => s.silo + ':' + s.diffKg).join(' ')], [false, 0, 'S05:-10000 S06:10000']);
x = rc([out('2026-10-23T06:00:00Z', 'S05', 5000), out('2026-10-23T08:10:00Z', 'S05', 40000)]);     // antes do último vazio: não conta
assert.deepStrictEqual([x.ok, x.appKg], [true, 40000]);
x = rc([out('2026-10-23T08:10:00Z', 'S05', 40000), out('2026-10-23T11:45:00Z', 'S05', 8000)]);     // depois do ficheiro: por chegar
assert.deepStrictEqual([x.ok, x.pendingN, x.pendingKg], [true, 1, 8000]);
x = rc([out('2026-10-23T08:10:00Z', 'S05', 40000), out('2026-10-23T08:20:00Z', 'S05', 1000, 'B02'), { type: 'IN', silo: 'S05', kg: 9 }]);   // outra bin / outro tipo
assert.deepStrictEqual([x.ok, x.appKg], [true, 40000]);
x = rc([out('2026-10-23T08:10:00Z', 'S05', 40000), out('sem hora', 'S05', 100)]);                 // hora inválida: não conciliado
assert.deepStrictEqual([x.ok, x.badN], [false, 1]);
x = rc([], base({ bins: [Object.assign({}, st.bins[0], { since: null, transfers: [] })] }));        // bin sem movimentos
assert.deepStrictEqual([x.ok, x.empty, x.diffKg], [true, true, 0]);
x = rc([out('2026-10-23T08:10:00Z', 'S05', 40000)], base({ bins: [Object.assign({}, st.bins[0], { transfers: [] })] }));   // receção em falta na Mill-QC
assert.deepStrictEqual([x.ok, x.diffKg], [false, 40000]);
// download
const r = D.buildDownloadRequest({ accessToken: 't', path: '/bins-status.json' });
assert.strictEqual(r.url, 'https://content.dropboxapi.com/2/files/download');
assert.strictEqual(JSON.parse(r.headers['Dropbox-API-Arg']).path, '/bins-status.json');
assert.throws(() => D.buildDownloadRequest({ accessToken: 't', path: 'sem-barra' }), /caminho/);
console.log('OK — leitor: parse, frescura (limites), compatibilidade, conciliação, pedido de leitura');
