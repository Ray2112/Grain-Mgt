// node tests/dropbox-upload.test.js — só monta o pedido; não contacta o Dropbox
const assert = require('assert');
const U = require('../js/dropbox-upload.js');
const r = U.buildUploadRequest({ accessToken: 't0k', path: '/bins-status.json', content: '{"a":1}' });
assert.strictEqual(r.url, 'https://content.dropboxapi.com/2/files/upload');
assert.strictEqual(r.method, 'POST');
assert.strictEqual(r.headers['Authorization'], 'Bearer t0k');
assert.strictEqual(JSON.parse(r.headers['Dropbox-API-Arg']).path, '/bins-status.json');
assert.strictEqual(JSON.parse(r.headers['Dropbox-API-Arg']).mode, 'overwrite');
assert.strictEqual(r.body, '{"a":1}');
assert.throws(() => U.buildUploadRequest({ path: '/x', content: 'y' }), /accessToken/);
assert.throws(() => U.buildUploadRequest({ accessToken: 't', path: 'sem-barra', content: 'y' }), /caminho/);
assert.throws(() => U.buildUploadRequest({ accessToken: 't', path: '/x', content: { a: 1 } }), /texto/);
console.log('OK — pedido de envio (não verificado contra o Dropbox)');
