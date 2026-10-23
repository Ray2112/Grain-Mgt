// Início de sessão Dropbox (PKCE, sem app secret) para a Mill-QC. Só monta pedidos e lê respostas;
// não contacta a rede. A rede e o armazenamento ficam em prod-ui.js.
// Endpoints e parâmetros verificados nesta sessão: troca de código com PKCE e renovação com client_id apenas.
(function (root) {
  const AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
  const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
  const SKEW_MS = 60 * 1000;

  function b64url(bytes) {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  // getRandom(u8) preenche o array com valores aleatórios (crypto.getRandomValues no browser)
  function randomToken(getRandom) {
    const b = new Uint8Array(32);
    getRandom(b);
    return b64url(b); // 43 caracteres, dentro do intervalo PKCE (43–128)
  }
  // digest(u8) -> Promise<ArrayBuffer> (SHA-256)
  async function challengeOf(verifier, digest) {
    return b64url(new Uint8Array(await digest(new TextEncoder().encode(verifier))));
  }
  function form(obj) {
    return Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
  }
  function buildAuthorizeUrl(o) {
    return AUTH_URL + '?' + form({
      client_id: o.appKey, response_type: 'code', code_challenge: o.challenge,
      code_challenge_method: 'S256', token_access_type: 'offline',
      redirect_uri: o.redirectUri, state: o.state
    });
  }
  function buildTokenRequest(o) {
    return {
      url: TOKEN_URL, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({ grant_type: 'authorization_code', code: o.code, code_verifier: o.verifier, client_id: o.appKey, redirect_uri: o.redirectUri })
    };
  }
  function buildRefreshRequest(o) {
    return {
      url: TOKEN_URL, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({ grant_type: 'refresh_token', refresh_token: o.refreshToken, client_id: o.appKey })
    };
  }
  // Resposta do Dropbox -> sessão. refresh_token só vem na troca do código.
  function parseTokenResponse(json, now) {
    if (!json || typeof json.access_token !== 'string' || !json.access_token) throw new Error('resposta sem access_token');
    const out = { accessToken: json.access_token, expiresAt: now + (Number(json.expires_in) || 0) * 1000 };
    if (typeof json.refresh_token === 'string' && json.refresh_token) out.refreshToken = json.refresh_token;
    return out;
  }
  function isUsable(sess, now) {
    return !!(sess && sess.accessToken && sess.expiresAt - SKEW_MS > now);
  }
  const api = { randomToken, challengeOf, buildAuthorizeUrl, buildTokenRequest, buildRefreshRequest, parseTokenResponse, isUsable, SKEW_MS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DropboxAuth = api;
})(typeof window !== 'undefined' ? window : this);
