// Leitor do bins-status.json (escrito pela Mill-QC). Regras puras, sem rede nem interface — testáveis em Node.
// Regra de frescura: P1 aprovado = 2 h. Falta de ficheiro, formato errado ou ficheiro antigo => parar e perguntar.
(function (root) {
  'use strict';
  const MAX_AGE_H = 2;               // P1 aprovado
  const FUTURE_SKEW_MS = 5 * 60000;  // relógios desalinhados: aceita até 5 min à frente
  const BIN_STATES = ['OK', 'EMPTY', 'NEG', 'OVER'];

  // Lê e valida o texto do ficheiro. Lança Error com motivo; nunca devolve dados parciais.
  function parseBinsStatus(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { throw new Error('ficheiro não é JSON válido'); }
    if (!o || o.schemaVersion !== 1) throw new Error('schemaVersion não suportada');
    if (o.writer !== 'mill-qc') throw new Error('escritor desconhecido');
    if (typeof o.generatedAt !== 'string' || isNaN(Date.parse(o.generatedAt))) throw new Error('generatedAt inválido');
    if (!Array.isArray(o.bins)) throw new Error('bins em falta');
    o.bins.forEach(function (b) {
      if (!b || typeof b.id !== 'string') throw new Error('bin sem id');
      if (!Number.isFinite(b.kg) || !Number.isFinite(b.capKg)) throw new Error(b.id + ': kg/capKg inválidos');
      if (BIN_STATES.indexOf(b.state) < 0) throw new Error(b.id + ': estado desconhecido');
      if (!Array.isArray(b.transfers)) throw new Error(b.id + ': transferências em falta');
      b.transfers.forEach(function (tr) {
        if (!Array.isArray(tr.parts)) throw new Error(b.id + ': partes em falta');
        tr.parts.forEach(function (p) {
          if (!p || typeof p.silo !== 'string' || !Number.isFinite(p.kg)) throw new Error(b.id + ': parte inválida');
        });
      });
    });
    return o;
  }

  // Frescura: ok | stale | future | invalid. ageMin para mostrar ao operador.
  function freshness(status, nowMs) {
    const gen = Date.parse(status && status.generatedAt);
    if (isNaN(gen)) return { ok: false, reason: 'invalid', ageMin: null };
    const age = nowMs - gen;
    if (age < -FUTURE_SKEW_MS) return { ok: false, reason: 'future', ageMin: Math.round(age / 60000) };
    if (age > MAX_AGE_H * 3600000) return { ok: false, reason: 'stale', ageMin: Math.round(age / 60000) };
    return { ok: true, reason: 'ok', ageMin: Math.round(age / 60000) };
  }

  // Pode o silo X (cereal, cor, grau) alimentar a bin? Regra da Mill-QC: mesmo cereal, cor e grau
  // do que já está na bin neste ciclo. Qualquer diferença => parar e perguntar (não bloquear em silêncio).
  // silo: {id, cereal, colour, grade}. Devolve {ok, reasons[]}.
  function feedCheck(status, binId, silo, nowMs, requestKg) {
    const reasons = [];
    const fr = freshness(status, nowMs);
    if (!fr.ok) reasons.push({ code: 'FRESHNESS_' + fr.reason.toUpperCase(), ageMin: fr.ageMin });
    const bin = status && status.bins ? status.bins.find(function (b) { return b.id === binId; }) : null;
    if (!bin) return { ok: false, reasons: reasons.concat([{ code: 'BIN_MISSING' }]), bin: null, freshness: fr };
    if (bin.state === 'NEG' || bin.state === 'OVER') reasons.push({ code: 'BIN_' + bin.state });
    if (!silo || !silo.cereal || !silo.grade) reasons.push({ code: 'SILO_NOT_DESIGNATED' });
    const seen = {};
    (bin.transfers || []).forEach(function (tr) {
      tr.parts.forEach(function (p) { seen[p.silo + '|' + p.cereal + '|' + p.colour + '|' + p.grade] = p; });
    });
    Object.keys(seen).forEach(function (k) {
      const p = seen[k];
      if (!silo) return;
      if (p.cereal !== silo.cereal) reasons.push({ code: 'OTHER_CEREAL', with: p.cereal });
      else if (p.colour !== silo.colour) reasons.push({ code: 'OTHER_COLOUR', with: p.colour });
      else if (p.grade !== silo.grade) reasons.push({ code: 'GRADE_MISMATCH', with: p.grade });
    });
    const free = bin.capKg - bin.kg;
    if (requestKg !== undefined && requestKg > free) reasons.push({ code: 'NO_SPACE', free: free });
    return { ok: reasons.length === 0, reasons: reasons, bin: bin, freshness: fr, freeKg: free };
  }

  // Conciliação: saída de silos (Mill-App) vs receção nas bins (Mill-QC). Tolerância 0 kg (P4 aprovado).
  function reconcile(siloOutKg, binReceivedKg, tolKg) {
    const tol = tolKg === undefined ? 0 : tolKg;
    const diff = Math.round((siloOutKg - binReceivedKg) * 1000) / 1000;
    return { diffKg: diff, ok: Math.abs(diff) <= tol };
  }

  const api = { parseBinsStatus, freshness, feedCheck, reconcile, MAX_AGE_H, BIN_STATES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BinsFeed = api;
})(typeof window !== 'undefined' ? window : this);
