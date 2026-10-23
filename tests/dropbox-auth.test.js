// node tests/dropbox-auth.test.js — só monta pedidos; não contacta o Dropbox
const assert = require('assert');
const crypto = require('crypto');
const A = require('../js/dropbox-auth.js');
const sha = u8 => Promise.resolve(crypto.createHash('sha256').update(u8).digest());
(async () => {
  // Vetor de teste do RFC 7636, apêndice B
  const ch = await A.challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', sha);
  assert.strictEqual(ch, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  const v = A.randomToken(b => crypto.randomFillSync(b));
  assert.ok(/^[A-Za-z0-9_-]{43}$/.test(v));
  const url = new URL(A.buildAuthorizeUrl({ appKey: 'k', redirectUri: 'http://localhost:8770/', challenge: 'c', state: 's' }));
  assert.strictEqual(url.origin + url.pathname, 'https://www.dropbox.com/oauth2/authorize');
  assert.strictEqual(url.searchParams.get('code_challenge_method'), 'S256');
  assert.strictEqual(url.searchParams.get('token_access_type'), 'offline');
  assert.strictEqual(url.searchParams.get('redirect_uri'), 'http://localhost:8770/');
  const t = A.buildTokenRequest({ appKey: 'k', code: 'C', verifier: 'V', redirectUri: 'http://localhost:8770/' });
  const tb = new URLSearchParams(t.body);
  assert.strictEqual(tb.get('grant_type'), 'authorization_code');
  assert.strictEqual(tb.get('code_verifier'), 'V');
  assert.strictEqual(tb.has('client_secret'), false);
  const r = A.buildRefreshRequest({ appKey: 'k', refreshToken: 'R' });
  const rb = new URLSearchParams(r.body);
  assert.strictEqual(rb.get('grant_type'), 'refresh_token');
  assert.strictEqual(rb.get('client_id'), 'k');
  assert.strictEqual(rb.has('client_secret'), false);
  const s1 = A.parseTokenResponse({ access_token: 'a', expires_in: 14400, refresh_token: 'r' }, 1000);
  assert.deepStrictEqual(s1, { accessToken: 'a', expiresAt: 1000 + 14400000, refreshToken: 'r' });
  const s2 = A.parseTokenResponse({ access_token: 'b', expires_in: 60 }, 0);
  assert.strictEqual(s2.refreshToken, undefined);
  assert.throws(() => A.parseTokenResponse({}, 0), /access_token/);
  assert.strictEqual(A.isUsable({ accessToken: 'a', expiresAt: 10 * A.SKEW_MS }, 0), true);
  assert.strictEqual(A.isUsable({ accessToken: 'a', expiresAt: A.SKEW_MS }, 0), false);
  assert.strictEqual(A.isUsable(null, 0), false);
  console.log('OK — PKCE, pedidos de token e renovação (sem verificação contra o Dropbox)');
})().catch(e => { console.error(e); process.exit(1); });
