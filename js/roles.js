/* PIN por função (v0.21.0, Zhax 27-11-2026): o mesmo modelo da FMO - Moagem de Milho v2.27.0.
 * Sem PIN é só leitura. PM, Head Miller, Chief Miller e Supervisor alteram tudo; chefes de turno A–D (secção de silos) só Produção e
 * Controlo de Qualidade; chefes de turno da manutenção A–D só Manutenção; FSSC 1 e 2 só FSSC; Definições só os quatro de cima;
 * Relatórios ninguém. Os registos gravam o título da função (sem nomes). PIN de 4 caracteres (letras ou algarismos), em resumo
 * SHA-256 com sal, só neste telemóvel. 5 tentativas erradas = bloqueio de 5 minutos.
 * Lógica pura (testável em node); o resumo SHA-256 é passado de fora (C.sha). */
(function (root) {
  'use strict';
  const TOP = ['pm', 'head', 'chief', 'sup'];
  const LEAD = ['A', 'B', 'C', 'D'], MLEAD = ['MA', 'MB', 'MC', 'MD'], FSSC = ['F1', 'F2'];
  const ALL = TOP.concat(LEAD, MLEAD, FSSC);
  const SCOPES = { prod: TOP.concat(LEAD), qc: TOP.concat(LEAD), maint: TOP.concat(MLEAD), fssc: TOP.concat(FSSC), settings: TOP, top: TOP, report: [] };
  const PIN_RE = /^[A-Za-z0-9]{4}$/;
  const T = {
    pt: { pm: 'Production Manager', head: 'Head Miller', chief: 'Chief Miller', sup: 'Supervisor', leader: 'Chefe de turno {c}', mleader: 'Chefe de turno da manutenção {c}', fssc: 'FSSC {c}',
      need: 'Introduza o PIN', wrong: 'PIN errado ({n} tentativa(s) restante(s))', locked: 'PIN bloqueado: tente daqui a {m} min', notSet: 'Ainda não há PIN definido (Definições → PIN)', noRight: 'O PIN de {r} não altera esta secção', nocrypto: 'Este navegador não permite verificar o PIN' },
    en: { pm: 'Production Manager', head: 'Head Miller', chief: 'Chief Miller', sup: 'Supervisor', leader: 'Shift leader {c}', mleader: 'Maintenance leader {c}', fssc: 'FSSC {c}',
      need: 'Enter PIN', wrong: 'Wrong PIN ({n} attempt(s) left)', locked: 'PIN locked: try again in {m} min', notSet: 'No PIN set yet (Settings → PIN)', noRight: 'The {r} PIN cannot change this section', nocrypto: 'This browser cannot check the PIN' }
  };
  const fill = (s, v) => { Object.keys(v || {}).forEach(k => { s = s.split('{' + k + '}').join(v[k]); }); return s; };
  const tx = (lang, k, v) => fill((T[lang] || T.pt)[k] || T.pt[k] || k, v);
  function title(k, lang) {
    if (LEAD.indexOf(k) >= 0) return tx(lang, 'leader', { c: k });
    if (MLEAD.indexOf(k) >= 0) return tx(lang, 'mleader', { c: k.slice(1) });
    if (FSSC.indexOf(k) >= 0) return tx(lang, 'fssc', { c: k.slice(1) });
    return tx(lang, k);
  }
  const allowed = scope => scope && SCOPES[scope] ? SCOPES[scope] : ALL;
  const can = (role, scope) => allowed(scope).indexOf(role) >= 0;

  // C: { sha(str) → Promise<hex>, pins() → {role: {salt, hash}}, lock() → {fails, until}, setLock(l), lang(), now() }
  function make(C) {
    const now = () => (C.now ? C.now() : Date.now());
    const ok = async (p, pin) => !!p && (await C.sha(p.salt + String(pin || ''))) === p.hash;
    async function makePin(pin, salt) {
      return { salt, hash: await C.sha(salt + pin), setAt: new Date(now()).toISOString() };
    }
    // → { role, title } ou { err }
    async function who(pin, scope) {
      const l = C.lock() || { fails: 0, until: 0 }, n = now(), lang = C.lang();
      if (l.until > n) return { err: tx(lang, 'locked', { m: Math.ceil((l.until - n) / 60000) }) };
      if (!String(pin || '').trim() || !PIN_RE.test(String(pin))) return { err: tx(lang, 'need') };
      const pins = C.pins() || {};
      if (!ALL.some(k => pins[k])) return { err: tx(lang, 'notSet') };
      let a;
      try {
        for (const k of allowed(scope)) if (await ok(pins[k], pin)) { await C.setLock({ fails: 0, until: 0 }); return { role: k, title: title(k, 'pt'), titleEn: title(k, 'en') }; }
        // PIN certo de uma função sem direito aqui: não conta como tentativa falhada
        for (const k of ALL) if (!can(k, scope) && await ok(pins[k], pin)) return { err: tx(lang, 'noRight', { r: title(k, lang) }) };
      } catch (e) { return { err: tx(lang, 'nocrypto') }; }
      a = { fails: (l.fails || 0) + 1, until: 0 };
      if (a.fails >= 5) a = { fails: 0, until: n + 5 * 60000 };
      await C.setLock(a);
      return { err: a.until ? tx(lang, 'locked', { m: 5 }) : tx(lang, 'wrong', { n: 5 - a.fails }) };
    }
    return { who, makePin, ok };
  }
  const api = { TOP, LEAD, MLEAD, FSSC, ALL, SCOPES, PIN_RE, title, can, allowed, make, tx };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Roles = api;
})(typeof window !== 'undefined' ? window : this);
