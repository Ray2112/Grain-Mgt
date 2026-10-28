/* Sensores de temperatura dos silos (Grain-Mgt 0.8.0) — regras puras, sem DOM nem rede.
 * Fonte: silo-temps.json que o pipeline FMIP escreve em /Apps/Mill-CD/ a partir dos relatórios RTF do sistema de
 * monitorização (pasta Dropbox /Temperature Readings/). Um relatório: {id 'AAAA-MM-DDTHH:MM', date, time, ambient,
 * silos: {S01: [cabo1: [sensor1 (topo) … sensor7 (base)], …]}}; cada sensor {t, z}: z 'g' no grão, 'a' no grão com
 * alarme do sistema (> 25 °C), 'o' fora do grão (ar / silo vazio), 'e' sem leitura ("-Error").
 * Avarias (não entram na avaliação SOP): 'error' (sem leitura), 'range' (fora de −10…70 °C), 'cable' (cabo todo sem leitura).
 * Suspeitos (entram na avaliação — um ponto quente real nunca fica escondido; verificar o sensor):
 * 'jump' (|ΔT| ≥ 10 °C entre relatórios seguidos no mesmo ponto, no grão), 'stuck' (mesmo valor em ≥ 4 relatórios seguidos,
 * no grão, quando os outros sensores do silo variaram). Limites assumidos (FMIP 28-10-2026), a confirmar por Zhax. */
(function (root) {
  'use strict';
  const RANGE = [-10, 70];
  const JUMP = 10;
  const STUCK_N = 4;
  const isNum = x => typeof x === 'number' && isFinite(x);
  const inGrain = c => c && (c.z === 'g' || c.z === 'a');

  function valid(T) {
    return !!(T && T.kind === 'silo-temps' && Array.isArray(T.reports) &&
      T.reports.every(r => r && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.id || '') && r.silos && typeof r.silos === 'object'));
  }
  const cell = (cables, c, s) => ((cables || [])[c] || [])[s] || null;
  const okVal = x => x && isNum(x.t) && x.z !== 'e' && x.t >= RANGE[0] && x.t <= RANGE[1];

  // Avaliação de um silo num relatório. prev = cabos do mesmo silo no relatório anterior (ΔT e saltos).
  function evalSilo(cables, prev) {
    const out = { faults: [], cableFaults: [], suspects: [], inGrain: [], levels: [], maxT: null, maxAt: null, avgT: null, minT: null, dtMax: null, dtAt: null, coverage: 0, sensors: 0 };
    const lv = {};
    (cables || []).forEach((sens, ci) => {
      if (!sens || !sens.length) return;
      if (sens.every(x => x.z === 'e')) { out.cableFaults.push(ci + 1); }
      sens.forEach((x, si) => {
        out.sensors++;
        const at = { c: ci + 1, s: si + 1 };
        if (x.z === 'e') { if (!sens.every(y => y.z === 'e')) out.faults.push(Object.assign({ type: 'error' }, at)); return; }
        if (!isNum(x.t) || x.t < RANGE[0] || x.t > RANGE[1]) { out.faults.push(Object.assign({ type: 'range', t: x.t }, at)); return; }
        const L = lv[si] || (lv[si] = { level: si + 1, sum: 0, n: 0, air: 0 });
        if (!inGrain(x)) { L.air++; return; }
        L.sum += x.t; L.n++;
        out.inGrain.push(Object.assign({ t: x.t, alarm: x.z === 'a' }, at));
        if (out.maxT === null || x.t > out.maxT) { out.maxT = x.t; out.maxAt = at; }
        if (out.minT === null || x.t < out.minT) out.minT = x.t;
        const p = cell(prev, ci, si);
        if (okVal(p) && inGrain(p)) {
          const d = Math.round((x.t - p.t) * 10) / 10;
          if (out.dtMax === null || d > out.dtMax) { out.dtMax = d; out.dtAt = at; }
          if (Math.abs(d) >= JUMP) out.suspects.push(Object.assign({ type: 'jump', d, t: x.t, prev: p.t }, at));
        }
      });
    });
    if (out.inGrain.length) out.avgT = Math.round(out.inGrain.reduce((s, x) => s + x.t, 0) / out.inGrain.length * 10) / 10;
    // perfil vertical: sensor 1 = topo … sensor 7 = base; média no grão por nível (só dos cabos com esse sensor no grão)
    out.levels = Object.keys(lv).map(Number).sort((a, b) => a - b).map(k => {
      const L = lv[k];
      return { level: L.level, avg: L.n ? Math.round(L.sum / L.n * 10) / 10 : null, n: L.n, air: L.air };
    });
    out.coverage = out.levels.filter(L => L.n > 0).length;
    return out;
  }
  // Valores parados: o mesmo valor em ≥ STUCK_N relatórios seguidos, no grão, quando a média dos outros sensores do silo mudou.
  function stuck(reports, siloId) {
    const R = (reports || []).slice(-STUCK_N).map(r => (r.silos || {})[siloId]);
    if (R.length < STUCK_N || R.some(x => !x)) return [];
    const avgs = R.map(c => { const e = evalSilo(c); return e.avgT; });
    if (avgs.some(a => a === null) || Math.max.apply(null, avgs) - Math.min.apply(null, avgs) < 0.3) return [];   // o silo todo estável: não é sinal
    const out = [];
    R[R.length - 1].forEach((sens, ci) => (sens || []).forEach((x, si) => {
      if (!inGrain(x) || !okVal(x)) return;
      const seq = R.map(c => cell(c, ci, si));
      if (seq.every(y => okVal(y) && inGrain(y) && y.t === x.t)) out.push({ type: 'stuck', c: ci + 1, s: si + 1, t: x.t, n: STUCK_N });
    }));
    return out;
  }
  // Estado de todos os silos no relatório mais recente (ou no relatório 'id'); acks = defeitos já conhecidos (manutenção)
  function report(T, id) {
    if (!valid(T) || !T.reports.length) return null;
    const i = id ? T.reports.findIndex(r => r.id === id) : T.reports.length - 1;
    if (i < 0) return null;
    const r = T.reports[i], p = T.reports[i - 1] || null;
    const silos = {};
    Object.keys(r.silos).sort().forEach(sid => {
      const e = evalSilo(r.silos[sid], p ? p.silos[sid] : null);
      e.suspects = e.suspects.concat(stuck(T.reports.slice(0, i + 1), sid));
      silos[sid] = e;
    });
    return { id: r.id, date: r.date, time: r.time, ambient: r.ambient, silos };
  }
  // Chave de um defeito (para reconhecer: o aviso deixa de aparecer no topo, mas continua na lista de Sensores)
  const faultKey = (sid, f) => sid + '|' + (f.type === 'cable' ? 'cable|' + f.c : f.type + '|' + f.c + '|' + f.s);
  // Avisos de avaria/suspeita para a app. acks: Set de chaves reconhecidas.
  function warnings(rep, acks) {
    const w = [];
    if (!rep) return w;
    const A = acks || new Set();
    Object.keys(rep.silos).forEach(sid => {
      const e = rep.silos[sid];
      e.cableFaults.forEach(c => { const f = { type: 'cable', c }; w.push(Object.assign({ silo: sid, key: faultKey(sid, f), ack: A.has(faultKey(sid, f)) }, f)); });
      e.faults.concat(e.suspects).forEach(f => w.push(Object.assign({ silo: sid, key: faultKey(sid, f), ack: A.has(faultKey(sid, f)), suspect: f.type === 'jump' || f.type === 'stuck' }, f)));
    });
    return w;
  }
  // Pontos para o registo SENSOR do monitor (avaliação SOP): uma posição fixa por cabo×sensor (8 por cabo) para que o ΔT
  // compare o mesmo ponto; fora do grão e avarias ficam sem valor (não contam nem como avaria SOP).
  function sopPoints(cables) {
    const pts = [];
    (cables || []).forEach((sens, ci) => {
      for (let si = 0; si < 8; si++) {
        const x = (sens || [])[si];
        pts[ci * 8 + si] = x && inGrain(x) && okVal(x) ? { t: x.t } : { t: null };
      }
    });
    return pts;
  }

  const api = { RANGE, JUMP, STUCK_N, valid, evalSilo, stuck, report, warnings, faultKey, sopPoints, inGrain };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SiloSensors = api;
})(typeof window !== 'undefined' ? window : this);
