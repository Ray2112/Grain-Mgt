// FIFO dos silos (0.15.0, Zhax 14-11-2026): «a sequence of each grade's entry & queue for transfer».
// Para cada designação (cereal · cor · grau) os silos com grão aparecem pela ordem da primeira entrada desde o último vazio
// (Zhax: silo pela primeira entrada); a fila de saída (transferência / descarga) segue essa ordem. Por baixo de cada silo, as
// entradas (data, hora, lote, kg). Sair de outro silo que não o primeiro é só aviso (D34: registos, não controlo).
// Regras puras. Browser: window.Fifo · Node: module.exports.
(function (root) {
  'use strict';
  const GRADE_ORDER = ['G1', 'G2', 'PRI', 'OFF', 'REJ'];
  const stamp = e => (e.date || '') + 'T' + (e.time || '00:00') + '#' + String(e.seq || 0).padStart(8, '0');
  const r3 = x => Math.round(x * 1000) / 1000;
  const keyOf = s => [s.cereal || '', s.colour || '', s.grade || ''].join('|');
  // Entradas de um silo desde o último vazio (IN, OPENING, TRANSFER de outro silo para este)
  function entries(siloId, events) {
    const evs = (events || []).filter(e => e.silo === siloId || (e.type === 'TRANSFER' && e.toSilo === siloId)).slice().sort((a, b) => stamp(a) < stamp(b) ? -1 : stamp(a) > stamp(b) ? 1 : 0);
    let out = [];
    evs.forEach(e => {
      if (e.type === 'EMPTY' && e.silo === siloId) { out = []; return; }
      const inbound = e.type === 'IN' || e.type === 'OPENING' || (e.type === 'TRANSFER' && e.toSilo === siloId && e.silo !== siloId);
      if (inbound) out.push({ date: e.date, time: e.time, type: e.type, from: e.type === 'TRANSFER' ? e.silo : null, lots: e.lots || (e.lot ? [e.lot] : []), kg: typeof e.kg === 'number' ? e.kg : Number(e.kg) || 0, st: stamp(e) });
    });
    return out;
  }
  // silos: [{id, cereal, colour, grade}]; kgOf(id) = stock actual (kg). Devolve grupos por designação, com a fila.
  function queues(silos, events, kgOf) {
    const groups = {};
    (silos || []).forEach(s => {
      const kg = kgOf(s.id);
      if (!(kg > 0.0005)) return;   // vazio (ou negativo, a corrigir pela contagem): fora da fila
      const en = entries(s.id, events);
      const k = keyOf(s);
      (groups[k] = groups[k] || { key: k, cereal: s.cereal || '', colour: s.colour || '', grade: s.grade || '', silos: [] })
        .silos.push({ id: s.id, kg: r3(kg), firstIn: en.length ? en[0] : null, entries: en });
    });
    const list = Object.keys(groups).map(k => groups[k]);
    list.forEach(g => {
      // sem entrada registada (stock antes dos registos) = mais antigo; depois pela primeira entrada; empate pelo id do silo
      g.silos.sort((a, b) => { const x = a.firstIn ? a.firstIn.st : '', y = b.firstIn ? b.firstIn.st : ''; return x < y ? -1 : x > y ? 1 : (a.id < b.id ? -1 : 1); });
      g.silos.forEach((s, i) => { s.pos = i + 1; });
    });
    const gi = g => { const i = GRADE_ORDER.indexOf(g.grade); return i < 0 ? 99 : i; };
    return list.sort((a, b) => gi(a) - gi(b) || (a.key < b.key ? -1 : 1));
  }
  // Silo que devia sair primeiro na mesma designação, se não for este nem um dos outros silos usados na mesma operação.
  function outOfOrder(siloId, used, silos, events, kgOf) {
    const s = (silos || []).find(x => x.id === siloId); if (!s) return null;
    const g = queues(silos, events, kgOf).find(x => x.key === keyOf(s)); if (!g || !g.silos.length) return null;
    const first = g.silos[0].id;
    return first === siloId || (used || []).indexOf(first) >= 0 ? null : first;
  }
  const api = { GRADE_ORDER, entries, queues, outOfOrder };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Fifo = api;
})(typeof window !== 'undefined' ? window : this);
