// Ficheiros diários de registos para o Dropbox (Grain-Mgt 0.7.0) — mesmo contrato que a Prodn-Mgt
// (docs/2026-10-23_Day-File_Contract_v1.md do pipeline FMIP): um ficheiro por dia de produção (07:00–07:00),
// com os registos desse dia de todas as lojas e um manifesto (contagens por loja, incluindo zeros, e por turno).
// Só regras puras: não lê a base de dados nem contacta a rede. O envio fica em rec-sync.js.
(function (root) {
  'use strict';
  const FILE_SCHEMA = 1;
  const STORES = ['lots', 'events', 'monitor', 'sevents'];   // chave no pipeline: uid (todas)
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{2}:\d{2}$/;
  const keyOf = rec => String(rec.uid);

  // Dia de produção de um registo: turno gravado (AAAA-MM-DD/D|N), senão data+hora pelo turno da app, senão a data.
  // shiftOf(date, time) -> {date} (Logic.shiftOf). null = sem data.
  function dayOf(rec, shiftOf) {
    if (!rec) return null;
    if (typeof rec.shift === 'string' && DAY_RE.test(rec.shift.slice(0, 10))) return rec.shift.slice(0, 10);
    if (typeof rec.date === 'string' && DAY_RE.test(rec.date)) {
      if (typeof rec.time === 'string' && TIME_RE.test(rec.time)) return shiftOf(rec.date, rec.time).date;
      return rec.date;
    }
    return null;
  }
  function hashOf(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function dayPath(dir, day) {
    if (!DAY_RE.test(day)) throw new Error('dia inválido');
    return dir.replace(/\/+$/, '') + '/' + day + '_FMO_GrainMgt.json';
  }
  // data: {loja: [registos]} (DB.exportAll). opts: {shiftOf, test, now, writerVersion, deviceId, site, masterVersion, ensureDays}
  function buildDayFiles(data, opts) {
    const o = opts || {};
    if (typeof o.shiftOf !== 'function') throw new Error('shiftOf em falta');
    const wantTest = !!o.test;
    const byDay = {}, undated = {};
    STORES.forEach(store => {
      (data && Array.isArray(data[store]) ? data[store] : []).forEach(rec => {
        if (!rec || !!rec.test !== wantTest) return;
        const day = dayOf(rec, o.shiftOf);
        if (!day || !rec.uid) { undated[store] = (undated[store] || 0) + 1; return; }
        const d = byDay[day] || (byDay[day] = {});
        (d[store] || (d[store] = [])).push(rec);
      });
    });
    (o.ensureDays || []).forEach(day => { if (DAY_RE.test(day) && !byDay[day]) byDay[day] = {}; });
    const files = {};
    Object.keys(byDay).sort().forEach(day => {
      const records = {}, counts = {}, shifts = { D: 0, N: 0, none: 0 };
      STORES.forEach(store => {
        const list = (byDay[day][store] || []).slice().sort((a, b) => keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0);
        records[store] = list;
        counts[store] = list.length;
        list.forEach(r => {
          const p = typeof r.shift === 'string' ? r.shift.slice(-1) : null;
          if (p === 'D' || p === 'N') shifts[p]++; else shifts.none++;
        });
      });
      const hash = hashOf(JSON.stringify(records));
      const total = STORES.reduce((s, k) => s + counts[k], 0);
      files[day] = {
        hash,
        file: {
          schemaVersion: FILE_SCHEMA, kind: 'grain-mgt-day', prodDay: day, test: wantTest,
          generatedAt: new Date(typeof o.now === 'number' ? o.now : Date.now()).toISOString(),
          writer: 'grain-mgt', writerVersion: o.writerVersion || null, deviceId: o.deviceId || null, site: o.site || '',
          masterVersion: o.masterVersion || null,
          manifest: { counts, total, shifts, contentHash: hash },
          records
        }
      };
    });
    return { files, undated };
  }
  // Dias a enviar: conteúdo alterado desde o último envio confirmado, ou dia terminado cujo último envio foi gerado
  // antes do fim (fecho do dia). sent: {caminho: hash}; fin: {now, dayEnd(dia) -> ms, sentGen: {caminho: ms}}
  function pendingDays(built, dir, sent, fin) {
    const s = sent || {};
    return Object.keys(built.files).sort().filter(day => {
      const path = dayPath(dir, day);
      if (s[path] !== built.files[day].hash) return true;
      if (!fin || typeof fin.dayEnd !== 'function') return false;
      const end = fin.dayEnd(day), g = (fin.sentGen || {})[path];
      return fin.now >= end && !(typeof g === 'number' && g >= end);
    });
  }
  // Fim do dia de produção (07:00 do dia seguinte, hora local) em ms
  function dayEnd(day) {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d + 1, 7, 0, 0, 0).getTime();
  }
  const api = { FILE_SCHEMA, STORES, dayOf, hashOf, dayPath, buildDayFiles, pendingDays, dayEnd };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DayRecords = api;
})(typeof window !== 'undefined' ? window : this);
