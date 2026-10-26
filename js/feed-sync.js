// Início de sessão e leitura do bins-status na Mill-App (só leitura). Usa os módulos puros
// dropbox-auth.js, dropbox-read.js e bins-feed.js. A rede fica aqui.
(function (root) {
  'use strict';
  const KEY = 'mill-app.dropbox', STATE = 'mill-app.dbstate.v1', LAST = 'mill-app.binsFeed.v1';
  const cfg = () => root.FeedConfig || {};
  const auth = () => root.DropboxAuth, rd = () => root.DropboxRead, feed = () => root.BinsFeed;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('storage', e); } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignorar */ } }
  };
  // Endereço de retorno sem 'index.html' (v0.6.3): a app instalada abre em ./index.html, mas no Dropbox está registado
  // o endereço da pasta; assim o retorno é o mesmo seja qual for a forma como a app foi aberta.
  const redirect = () => location.origin + location.pathname.replace(/index\.html$/i, '');
  const configured = () => !!(cfg().appKey && auth() && rd() && feed());
  const signedIn = () => { const s = store.get(KEY); return !!(s && s.refreshToken); };

  async function signIn() {
    if (!configured()) throw new Error('app de leitura não configurada');
    const A = auth(), getRandom = b => crypto.getRandomValues(b);
    const verifier = A.randomToken(getRandom), state = A.randomToken(getRandom);
    sessionStorage.setItem(STATE, JSON.stringify({ verifier, state }));
    const challenge = await A.challengeOf(verifier, d => crypto.subtle.digest('SHA-256', d));
    location.href = A.buildAuthorizeUrl({ appKey: cfg().appKey, redirectUri: redirect(), challenge, state });
  }
  // Devolve {ok, msg} para mostrar ao operador
  async function handleReturn() {
    if (!configured()) return null;
    const p = new URLSearchParams(location.search);
    if (!p.get('code') && !p.get('error')) return null;
    const st = (() => { try { return JSON.parse(sessionStorage.getItem(STATE) || 'null'); } catch (e) { return null; } })();
    sessionStorage.removeItem(STATE);
    history.replaceState(null, '', location.pathname);
    if (p.get('error')) return { ok: false, msg: 'Dropbox: ligação cancelada.' };
    if (!st || st.state !== p.get('state')) return { ok: false, msg: 'Dropbox: resposta não confere.' };
    try {
      const req = auth().buildTokenRequest({ appKey: cfg().appKey, code: p.get('code'), verifier: st.verifier, redirectUri: redirect() });
      const r = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
      const json = await r.json().catch(() => null);
      if (!r.ok) return { ok: false, msg: 'Dropbox recusou o código (' + r.status + ').' };
      store.set(KEY, auth().parseTokenResponse(json, Date.now()));
      return { ok: true, msg: 'Dropbox ligado (leitura).' };
    } catch (e) { return { ok: false, msg: 'Dropbox: falha de rede.' }; }
  }
  function signOut() { store.del(KEY); store.del(LAST); }
  async function token() {
    const sess = store.get(KEY);
    if (!sess || !sess.refreshToken) return null;
    if (auth().isUsable(sess, Date.now())) return sess.accessToken;
    const req = auth().buildRefreshRequest({ appKey: cfg().appKey, refreshToken: sess.refreshToken });
    const r = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
    if (!r.ok) throw new Error('renovação recusada (' + r.status + ')');
    const next = Object.assign({}, sess, auth().parseTokenResponse(await r.json(), Date.now()));
    if (!next.refreshToken) next.refreshToken = sess.refreshToken;
    store.set(KEY, next);
    return next.accessToken;
  }
  // Lê e valida o ficheiro; guarda a última cópia válida (com generatedAt). Lança erro com motivo.
  async function fetchStatus() {
    if (!configured()) throw new Error('NOT_CONFIGURED');
    const tok = await token();
    if (!tok) throw new Error('NOT_SIGNED_IN');
    const req = rd().buildDownloadRequest({ accessToken: tok, path: cfg().binsStatusPath });
    const r = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
    if (r.status === 409) throw new Error('FILE_MISSING');
    if (!r.ok) throw new Error('HTTP_' + r.status);
    const status = feed().parseBinsStatus(await r.text());
    store.set(LAST, status);
    return status;
  }
  // Última cópia guardada neste dispositivo (pode estar antiga; a frescura é avaliada pelo generatedAt).
  const lastStatus = () => store.get(LAST);

  const api = { configured, signedIn, signIn, handleReturn, signOut, fetchStatus, lastStatus };
  root.FeedSync = api;
})(typeof window !== 'undefined' ? window : this);
