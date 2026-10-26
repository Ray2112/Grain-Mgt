// Envio dos ficheiros diários de registos para o Dropbox (Grain-Mgt 0.7.0). Usa os módulos puros dropbox-auth.js,
// dropbox-upload.js e day-records.js; a rede e o armazenamento ficam aqui.
// Sessão própria (app de escrita Mill-App-Sync), separada da sessão de leitura do bins-status (feed-sync.js).
// Após cada gravação (com espera), ao abrir/voltar à app e a cada 15 min: envia os dias alterados e fecha o dia
// que terminou (reenvio após as 07:00; vazio se não houver registos). Falhas ficam pendentes e visíveis.
(function (root) {
  'use strict';
  const KEY = 'grain-mgt.recSync', STATE = 'grain-mgt.recState.v1', SENT = 'grain-mgt.recSent.v1', GEN = 'grain-mgt.recSentGen.v1', STATUS = 'grain-mgt.recStatus.v1';
  const SKEW = 60 * 1000;
  const cfg = () => root.RecConfig || {};
  const A = () => root.DropboxAuth, U = () => root.DropboxUpload, R = () => root.DayRecords, L = () => root.Logic;
  const ls = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('storage', e); } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignorar */ } }
  };
  const redirect = () => location.origin + location.pathname.replace(/index\.html$/i, '');
  const configured = () => !!(cfg().appKey && A() && U() && R() && L());
  const signedIn = () => { const s = ls.get(KEY, null); return !!(s && s.refreshToken); };
  let ctx = { deviceId: null, site: '' };

  async function signIn() {
    if (!configured()) throw new Error('envio para o Dropbox não configurado');
    const getRandom = b => crypto.getRandomValues(b);
    const verifier = A().randomToken(getRandom), state = A().randomToken(getRandom);
    sessionStorage.setItem(STATE, JSON.stringify({ verifier, state }));
    const challenge = await A().challengeOf(verifier, d => crypto.subtle.digest('SHA-256', d));
    location.href = A().buildAuthorizeUrl({ appKey: cfg().appKey, redirectUri: redirect(), challenge, state });
  }
  // Só trata o retorno se o "state" for o desta sessão (o retorno da app de leitura fica para feed-sync.js).
  async function handleReturn() {
    if (!configured()) return null;
    const p = new URLSearchParams(location.search);
    if (!p.get('code') && !p.get('error')) return null;
    let st = null;
    try { st = JSON.parse(sessionStorage.getItem(STATE) || 'null'); } catch (e) { st = null; }
    if (!st || st.state !== p.get('state')) return null;
    sessionStorage.removeItem(STATE);
    history.replaceState(null, '', location.pathname);
    if (p.get('error')) return { ok: false, msg: 'Dropbox (envio): ligação cancelada.' };
    try {
      const req = A().buildTokenRequest({ appKey: cfg().appKey, code: p.get('code'), verifier: st.verifier, redirectUri: redirect() });
      const r = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
      const json = await r.json().catch(() => null);
      if (!r.ok) return { ok: false, msg: 'Dropbox (envio) recusou o código (' + r.status + ').' };
      ls.set(KEY, A().parseTokenResponse(json, Date.now()));
      schedule();
      return { ok: true, msg: 'Envio para o Dropbox ligado.' };
    } catch (e) { return { ok: false, msg: 'Dropbox (envio): falha de rede.' }; }
  }
  function signOut() { ls.del(KEY); }
  async function token() {
    const s = ls.get(KEY, null);
    if (!s || !s.refreshToken) return null;
    if (s.accessToken && s.expiresAt - SKEW > Date.now()) return s.accessToken;
    const req = A().buildRefreshRequest({ appKey: cfg().appKey, refreshToken: s.refreshToken });
    const r = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
    if (!r.ok) throw new Error('renovação recusada (' + r.status + ')');
    const next = Object.assign({}, s, A().parseTokenResponse(await r.json(), Date.now()));
    if (!next.refreshToken) next.refreshToken = s.refreshToken;
    ls.set(KEY, next);
    return next.accessToken;
  }

  let timer = null, busy = false, again = false;
  function schedule() {
    if (!configured() || !signedIn()) return;
    clearTimeout(timer);
    timer = setTimeout(() => sync(false), cfg().debounceMs || 5000);
  }
  async function sync(manual) {
    if (!configured()) return { ok: 0, failed: 0 };
    if (!signedIn()) return { ok: 0, failed: 0, notSignedIn: true };
    if (busy) { again = true; return null; }
    busy = true;
    const sent = ls.get(SENT, {}), sentGen = ls.get(GEN, {}), prev = ls.get(STATUS, {});
    let ok = 0, failed = 0, lastErr = null, undated = 0;
    try {
      const data = await root.DB.exportAll();
      const tok = await token();
      if (!tok) throw new Error('sem sessão');
      const now = Date.now(), yd = new Date(now - 24 * 3600000);
      const yesterday = L().shiftOf(L().today(yd), L().nowTime(yd)).date;
      const fin = { now, dayEnd: R().dayEnd, sentGen };
      for (const test of [false, true]) {
        const dir = test ? cfg().recordsTestDir : cfg().recordsDir;
        const built = R().buildDayFiles(data, { shiftOf: L().shiftOf, test, now, writerVersion: L().APP_VERSION, masterVersion: L().MASTER_VERSION,
          deviceId: ctx.deviceId, site: ctx.site, ensureDays: test ? [] : [yesterday] });
        if (!test) undated = Object.keys(built.undated).reduce((s, k) => s + built.undated[k], 0);
        for (const day of R().pendingDays(built, dir, sent, fin)) {
          const path = R().dayPath(dir, day), f = built.files[day];
          try {
            const req = U().buildUploadRequest({ accessToken: tok, path, content: JSON.stringify(f.file) });
            const r = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            sent[path] = f.hash; sentGen[path] = Date.parse(f.file.generatedAt); ok++;
          } catch (e) { failed++; lastErr = day + ': ' + (e && e.message || e); }
        }
      }
    } catch (e) { failed++; lastErr = String(e && e.message || e); }
    ls.set(SENT, sent); ls.set(GEN, sentGen);
    const t0 = new Date().toISOString();
    ls.set(STATUS, { lastTryAt: t0, lastOkAt: failed ? (prev.lastOkAt || null) : t0, sentNow: ok, failed, lastError: failed ? lastErr : null, undated });
    busy = false;
    if (again) { again = false; schedule(); }
    return { ok, failed, lastErr };
  }
  function status() { return ls.get(STATUS, {}); }
  function setContext(c) { ctx = Object.assign({}, ctx, c || {}); }
  if (root.document) {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(); });
    setInterval(schedule, 15 * 60000);
  }
  root.RecSync = { configured, signedIn, signIn, signOut, handleReturn, schedule, sync, status, setContext };
})(typeof window !== 'undefined' ? window : this);
