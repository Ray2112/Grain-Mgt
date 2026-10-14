/* Regras de negócio puras (sem interface) — testáveis em Node.
   Business rules with no UI — testable in Node.
   v0.3.0: códigos provisórios e versão do mestre; v0.2.0: classificação por graus (SOP-OPS-001 §7), capacidade dos silos, descarga em sequência, inspecções. */
(function (root) {
  'use strict';

  // ---------- datas / dates ----------
  function pad(n) { return String(n).padStart(2, '0'); }
  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function nowTime(d) { d = d || new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
  function r3(n) { return Math.round(n * 1000) / 1000; }

  // ---------- números / numbers ----------
  // Devolve null (vazio), NaN (inválido) ou o número.
  // Aceita vírgula ou ponto decimal e separadores de milhares (espaço, ponto, vírgula).
  // mode 'kg': "30.000" = 30 000 (uso angolano: ponto = milhares). Nos restantes campos "13.000" = 13.
  function num(v, mode) {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    let s = String(v).trim().replace(/[\s  ']/g, '');
    if (s === '') return null;
    if (!/^-?[0-9.,]+$/.test(s)) return NaN;
    const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
    function groups(parts) { return parts.slice(1).every(function (p) { return p.length === 3; }) && parts[0].replace('-', '').length >= 1 && parts[0].replace('-', '').length <= 3; }
    if (lastDot >= 0 && lastComma >= 0) {
      const dec = lastDot > lastComma ? '.' : ',', th = dec === '.' ? ',' : '.';
      const ip = s.slice(0, s.lastIndexOf(dec)), fp = s.slice(s.lastIndexOf(dec) + 1);
      if (fp.indexOf(th) >= 0 || !groups(ip.split(th))) return NaN;
      s = ip.split(th).join('') + '.' + fp;
    } else if (lastComma >= 0) {
      const parts = s.split(',');
      if (parts.length > 2) { if (!groups(parts)) return NaN; s = parts.join(''); } else s = s.replace(',', '.');
    } else if (lastDot >= 0) {
      const parts = s.split('.');
      if (parts.length > 2) { if (!groups(parts)) return NaN; s = parts.join(''); }
      else if (mode === 'kg' && parts[1].length === 3 && groups(parts)) s = parts.join('');
    }
    if (s === '' || s === '-' || s === '.') return NaN;
    const n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function bad(v, mode) { const n = num(v, mode); return n !== null && isNaN(n); }

  // ---------- código do lote / lot code: REC-AAMMDD-NN ----------
  function lotCode(dateStr, existingLots) {
    const prefix = 'REC-' + dateStr.replace(/-/g, '').slice(2) + '-';
    let max = 0;
    (existingLots || []).forEach(function (l) {
      const id = typeof l === 'string' ? l : (l && (l.code || l.id));
      if (id && id.indexOf(prefix) === 0) { const n = parseInt(id.slice(prefix.length), 10); if (n > max) max = n; }
    });
    return prefix + pad(max + 1);
  }
  // Código provisório (lote criado sem numeração central): REC-AAMMDD-P<6 hex do dispositivo>-NN.
  // A sequência NN é por dispositivo e por dia, por isso dois telemóveis nunca geram o mesmo código.
  function deviceTag(deviceId) {
    const hex = String(deviceId || '').replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
    return hex || 'NODEV';
  }
  function provisionalCode(dateStr, deviceId, existingLots) {
    const prefix = 'REC-' + dateStr.replace(/-/g, '').slice(2) + '-P' + deviceTag(deviceId) + '-';
    let max = 0;
    (existingLots || []).forEach(function (l) {
      const id = typeof l === 'string' ? l : (l && (l.code || l.id));
      if (id && id.indexOf(prefix) === 0) { const n = parseInt(id.slice(prefix.length), 10); if (n > max) max = n; }
    });
    return prefix + pad(max + 1);
  }
  // Lote novo. Sem serviço central, todo o lote novo fica provisório.
  function newLotCode(dateStr, existingLots, deviceId) {
    return { code: provisionalCode(dateStr, deviceId, existingLots), codeState: 'provisional' };
  }
  // Sincronização: troca o código provisório pelo central (REC-AAMMDD-NN). As referências usam o UUID, por isso não mudam.
  // O código provisório fica em provisionalCode. Recusa códigos centrais inválidos, já usados ou em lotes já centrais.
  const CENTRAL_CODE_RE = /^REC-\d{6}-\d{2,}$/;
  function applyCentralCode(lot, centralCode, lots) {
    if (lot.codeState !== 'provisional') throw new Error('not-provisional');
    if (!CENTRAL_CODE_RE.test(String(centralCode || ''))) throw new Error('bad-central-code');
    if ((lots || []).some(function (l) { return l.id !== lot.id && (l.code || l.id) === centralCode; })) throw new Error('central-code-taken');
    return Object.assign({}, lot, { provisionalCode: lot.code, code: centralCode, codeState: 'central' });
  }
  // Ordem dos lotes (mais recente primeiro): data, hora, depois código. Comparador válido (0 quando empatam).
  function lotOrder(a, b) {
    const ka = [a.date || '', a.time || '', a.code || a.id || ''], kb = [b.date || '', b.time || '', b.code || b.id || ''];
    for (let i = 0; i < 3; i++) { if (ka[i] !== kb[i]) return ka[i] < kb[i] ? 1 : -1; }
    return 0;
  }

  // ---------- classificação / grading (SOP-OPS-001 §7) ----------
  // grading: { hum:[g1,g2,off], brk:[...], fm:[...], dis:[...], sw:[g1,g2,off], humLow }
  //   hum/brk/fm/dis: máximos (≤). sw (peso específico): mínimos (≥).
  //   Valor acima do limite de "Fora de grau" = Rejeitar. Valor entre graus = grau inferior (upper bounds only).
  // myco: { afla, don, fum, aflaRequired, ... } — acima do limite = Rejeitar.
  const GRADES = ['G1', 'G2', 'OFF', 'REJ'];
  const LOT_GRADES = ['G1', 'G2', 'OFF', 'REJ', 'PRI']; // PRI = prioridade de moagem (humidade 14,01–15,00 %, resto Grau 1/2)
  const PARAMS = [['hum', 'max'], ['brk', 'max'], ['fm', 'max'], ['dis', 'max'], ['sw', 'min']];
  const MYCO = ['afla', 'don', 'fum'];
  function thresholds(arr) {
    if (!arr || arr.length !== 3) return null;
    const n = arr.map(function (x) { return num(x); });
    return n.every(function (x) { return x !== null && !isNaN(x); }) ? n : null;
  }
  function paramLevel(v, th, dir) {
    if (dir === 'max') return v <= th[0] ? 0 : v <= th[1] ? 1 : v <= th[2] ? 2 : 3;
    return v >= th[0] ? 0 : v >= th[1] ? 1 : v >= th[2] ? 2 : 3;
  }
  function gradeLot(lot, grading, myco) {
    grading = grading || {}; myco = myco || {};
    const res = { code: null, matrix: null, level: 0, reasons: [], missing: [], invalid: [], hold: [], notes: [], notAssessed: [] };
    let configured = 0, level = 0;
    PARAMS.forEach(function (p) {
      const k = p[0], th = thresholds(grading[k]), v = num(lot[k]);
      if (v !== null && isNaN(v)) { res.invalid.push(k); return; }
      if (!th) { if (v !== null) res.notAssessed.push(k); return; }
      configured++;
      if (v === null) { res.missing.push(k); return; }
      const lv = paramLevel(v, th, p[1]);
      if (lv > 0) res.reasons.push({ k: k, level: lv, v: v });
      if (lv > level) level = lv;
    });
    if (bad(lot.fat)) res.invalid.push('fat');
    MYCO.forEach(function (k) {
      const v = num(lot[k]), lim = num(myco[k]);
      if (v !== null && isNaN(v)) { res.invalid.push(k); return; }
      if (v !== null && (lim === null || isNaN(lim))) { res.notAssessed.push(k); return; }
      if (v !== null && v > lim) { res.reasons.push({ k: k, level: 3, v: v }); level = 3; }
      if (v === null && lim !== null && !isNaN(lim) && myco[k + 'Required']) res.hold.push('missing_' + k);
    });
    const hl = num(grading.humLow), hv = num(lot.hum);
    if (hl !== null && !isNaN(hl) && hv !== null && !isNaN(hv) && hv < hl) res.notes.push('low_moisture');
    if (lot.ins === 'S') res.hold.push('insects');
    if (lot.odor === 'Anormal') res.hold.push('odour');
    res.level = level;
    if (res.invalid.length) res.code = 'INVALID';
    else if (res.missing.length) res.code = 'INCOMPLETE';
    else {
      res.matrix = configured ? GRADES[level] : (level === 3 ? 'REJ' : null);
      if (res.matrix === 'REJ') res.code = 'REJ';
      else if (res.hold.length) res.code = 'HOLD';
      else if (!res.matrix) res.code = 'NONE';
      else res.code = res.matrix;
    }
    return res;
  }
  // Graus que o CQ pode atribuir ao libertar um lote retido: o grau da matriz ou inferior (nunca superior).
  function releaseOptions(matrix, priority) {
    const o = !matrix ? GRADES.slice() : GRADES.slice(GRADES.indexOf(matrix));
    if (priority || !matrix) o.splice(o.indexOf('REJ'), 0, 'PRI');
    return o;
  }

  // ---------- silos ----------
  // events: [{silo, type:'IN'|'OUT'|'TRANSFER'|'EMPTY', lots, kg, toSilo, date, time, seq}]
  // Lotes presentes = todas as entradas desde o último "vazio" (regra conservadora PR-12).
  // Quantidade = entradas − saídas (registos). EMPTY põe a zero (diferença fica registada no evento).
  function stamp(e) { return (e.date || '') + 'T' + (e.time || '00:00') + '#' + String(e.seq || 0).padStart(8, '0'); }
  function sortEvents(evs) { return evs.slice().sort(function (a, b) { return stamp(a) < stamp(b) ? -1 : stamp(a) > stamp(b) ? 1 : 0; }); }
  function siloContents(siloId, events) {
    const evs = sortEvents((events || []).filter(function (e) { return e.silo === siloId || (e.type === 'TRANSFER' && e.toSilo === siloId); }));
    let lots = {}, kg = 0, lastEmpty = null;
    evs.forEach(function (e) {
      if (e.type === 'EMPTY' && e.silo === siloId) { lots = {}; kg = 0; lastEmpty = e; return; }
      const inbound = e.type === 'IN' || (e.type === 'TRANSFER' && e.toSilo === siloId && e.silo !== siloId);
      const outbound = e.type === 'OUT' || (e.type === 'TRANSFER' && e.silo === siloId && e.toSilo !== siloId);
      if (inbound) { (e.lots || (e.lot ? [e.lot] : [])).forEach(function (l) { lots[l] = true; }); kg += num(e.kg) || 0; }
      else if (outbound) kg -= num(e.kg) || 0;
    });
    return { lots: Object.keys(lots), kg: r3(kg), lastEmpty: lastEmpty };
  }
  function lotsCarried(fromSilo, events) { return siloContents(fromSilo, events).lots; }
  // Espaço livre; null se a capacidade não estiver definida.
  function freeSpace(silo, events) {
    const cap = num(silo.cap, 'kg');
    if (cap === null || isNaN(cap) || cap <= 0) return null;
    return r3(Math.max(0, cap - siloContents(silo.id, events).kg));
  }
  // Repartir kg pelos silos, pela ordem dada: enche/esvazia o primeiro, depois o seguinte.
  // slots: [{id, avail}] → { parts:[{silo, kg}], short }
  function allocate(kg, slots) {
    let rest = kg; const parts = [];
    (slots || []).forEach(function (s) {
      if (rest <= 0) return;
      const take = r3(Math.min(rest, Math.max(0, s.avail || 0)));
      if (take > 0) { parts.push({ silo: s.id, kg: take }); rest = r3(rest - take); }
    });
    return { parts: parts, short: r3(Math.max(0, rest)) };
  }
  // Compatibilidade de um lote (cereal, cor, grau) com a designação de um silo.
  // ok=false: proibido (outro cereal, Amarelo/Branco, silo não designado). mismatch=true: grau diferente → autorização.
  function siloFit(item, silo) {
    if (!silo || !silo.cereal || !silo.grade) return { ok: false, why: 'not_designated' };
    if (silo.cereal !== item.cereal) return { ok: false, why: 'other_cereal' };
    if (silo.cereal === 'Milho') {
      if (!silo.colour) return { ok: false, why: 'not_designated' };
      if (silo.colour !== item.colour) return { ok: false, why: 'other_colour' };
    }
    return { ok: true, mismatch: silo.grade !== item.grade };
  }


  // ---------- armazenagem / storage (SOP-OPS-002) ----------
  // Níveis / levels: 0 Verde, 1 Verde-vigiar, 2 Âmbar, 3 Laranja, 4 Vermelho, 5 Emergência
  const LEVELS = ['GREEN', 'GREEN_M', 'AMBER', 'ORANGE', 'RED', 'EMERG'];
  function nums(arr, n) {
    if (!arr || arr.length !== n) return null;
    const v = arr.map(function (x) { return num(x); });
    return v.every(function (x) { return x !== null && !isNaN(x); }) ? v : null;
  }
  // Tabela 5.1: ≤a Verde · ≤b Verde-vigiar · ≤c Âmbar · ≤d Laranja · >d Vermelho
  function bandMoist(v, th) { return v <= th[0] ? 0 : v <= th[1] ? 1 : v <= th[2] ? 2 : v <= th[3] ? 3 : 4; }
  // Tabela 5.2: ≤a Verde · ≤b Verde-vigiar · ≤c Âmbar · ≤d Vermelho · >d Emergência
  function bandTemp(v, th) { return v <= th[0] ? 0 : v <= th[1] ? 1 : v <= th[2] ? 2 : v <= th[3] ? 4 : 5; }
  // Tabela 5.3: ΔT = leitura actual − anterior no mesmo ponto. <a Verde · <b Âmbar · ≥b Vermelho
  function bandDT(d, th) { return d < th[0] ? 0 : d < th[1] ? 2 : 4; }
  // Tabela 5.4 (+ erro 6: entupimento/ponte = Vermelho)
  const ODOUR_LV = { N: 0, MUSTY: 2, SOUR: 4, VISIBLE: 4, BRIDGE: 4 };
  function storeTh(st) { st = st || {}; return { m: nums(st.moist, 4), t: nums(st.temp, 4), d: nums(st.dt, 2) }; }
  function moistBand(v, st) { const th = storeTh(st).m, n = num(v); return th && n !== null && !isNaN(n) ? bandMoist(n, th) : null; }

  // Classificação de recepção com regra de prioridade: humidade em Laranja e restantes parâmetros ≤ Grau 2 → PRI
  function intakeClass(lot, grading, myco, st) {
    const r = gradeLot(lot, grading, myco);
    r.moistBand = moistBand(lot.hum, st);
    if (r.code === 'INVALID' || r.code === 'INCOMPLETE') return r;
    if (r.moistBand === 3 && r.matrix !== 'REJ') {
      const base = r.reasons.filter(function (x) { return x.k !== 'hum'; }).reduce(function (m, x) { return Math.max(m, x.level); }, 0);
      if (base <= 1) {
        r.priority = true; r.baseGrade = GRADES[base];
        if (r.code !== 'HOLD') r.code = 'PRI';
      }
    }
    return r;
  }

  // Turnos / shifts: starts = ['07:00','19:00']
  function mins(s) { const p = String(s || '0:0').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); }
  function addDays(d, n) { const x = new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000); return x.toISOString().slice(0, 10); }
  function shiftOf(date, time, starts) {
    const st = (starts || ['00:00']).slice().sort(function (a, b) { return mins(a) - mins(b); });
    const t = mins(time || '00:00');
    let idx = -1; st.forEach(function (s, i) { if (t >= mins(s)) idx = i; });
    let d = date; if (idx < 0) { d = addDays(date, -1); idx = st.length - 1; }
    return { id: d + '/' + (idx + 1), date: d, idx: idx, start: st[idx], end: st[(idx + 1) % st.length], n: st.length };
  }
  function prevShift(sh, starts) {
    const n = (starts || ['00:00']).length;
    if (sh.idx > 0) return shiftOf(sh.date, (starts.slice().sort(function (a, b) { return mins(a) - mins(b); }))[sh.idx - 1], starts);
    return shiftOf(addDays(sh.date, -1), (starts.slice().sort(function (a, b) { return mins(a) - mins(b); }))[n - 1], starts);
  }

  // Avaliação de uma ronda de turno / evaluate a shift round
  // round: { points:[{t, fault}], odour }
  function roundEval(r, prev, st) {
    const th = storeTh(st);
    let maxT = null, maxP = null, maxD = null, dP = null, fault = false;
    (r.points || []).forEach(function (p, i) {
      if (p.fault) { fault = true; return; }
      const v = num(p.t); if (v === null || isNaN(v)) return;
      if (maxT === null || v > maxT) { maxT = v; maxP = i + 1; }
      const pp = prev && prev.points && prev.points[i];
      if (pp && !pp.fault) {
        const pv = num(pp.t);
        if (pv !== null && !isNaN(pv)) { const d = r3(v - pv); if (maxD === null || d > maxD) { maxD = d; dP = i + 1; } }
      }
    });
    const lv = {
      temp: th.t && maxT !== null ? bandTemp(maxT, th.t) : null,
      dt: th.d && maxD !== null ? bandDT(maxD, th.d) : null,
      odour: ODOUR_LV[r.odour] !== undefined ? ODOUR_LV[r.odour] : null,
      fault: fault ? 2 : null
    };
    const level = Object.keys(lv).reduce(function (m, k) { return lv[k] !== null && lv[k] > m ? lv[k] : m; }, 0);
    return { maxT: maxT, maxPoint: maxP, maxDT: maxD, dtPoint: dP, fault: fault, lv: lv, level: level };
  }
  function recStamp(r) { return (r.date || '') + 'T' + (r.time || '00:00') + '#' + String(r.seq || 0).padStart(8, '0'); }

  // Estado do silo / silo storage status (SOP-OPS-002 Step 9: o pior parâmetro)
  // o: { siloId, recs (monitor: kind ROUND|WEEKLY|TREAT|DISP), sevents (eventos de armazenagem), lots (lotes presentes), emptyStamp, st, now:{date,time}, kg }
  function siloStatus(o) {
    const st = o.st || {}, th = storeTh(st);
    const recs = (o.recs || []).filter(function (r) { return r.silo === o.siloId && (!o.emptyStamp || recStamp(r) > o.emptyStamp); })
      .sort(function (a, b) { return recStamp(a) < recStamp(b) ? -1 : 1; });
    const rounds = recs.filter(function (r) { return r.kind === 'ROUND'; });
    const weeks = recs.filter(function (r) { return r.kind === 'WEEKLY'; });
    const treats = recs.filter(function (r) { return r.kind === 'TREAT'; });
    const disps = recs.filter(function (r) { return r.kind === 'DISP'; });
    const drivers = [];
    const add = function (p, level, v) { if (level !== null && level !== undefined) drivers.push({ p: p, level: level, v: v }); };
    const lastRound = rounds[rounds.length - 1] || null;
    let ev = null;
    if (lastRound) {
      ev = roundEval(lastRound, rounds[rounds.length - 2], st);
      add('temp', ev.lv.temp, ev.maxT); add('dt', ev.lv.dt, ev.maxDT); add('odour', ev.lv.odour, lastRound.odour); add('fault', ev.lv.fault, null);
    }
    const lastW = weeks[weeks.length - 1] || null, prevW = weeks[weeks.length - 2] || null;
    const closed = (o.sevents || []).filter(function (e) { return e.status === 'CLOSED'; });
    const explained = function (key) { return closed.some(function (e) { return (e.triggers || []).indexOf(key) >= 0; }); };
    if (lastW && th.m && num(lastW.moist) !== null) {
      add('moist', bandMoist(num(lastW.moist), th.m), num(lastW.moist));
      if (prevW && num(prevW.moist) !== null && num(lastW.moist) > num(prevW.moist) && !explained('moist_rise@' + lastW.seq)) add('moist_rise', 2, r3(num(lastW.moist) - num(prevW.moist)));
    } else if (th.m) {
      const hs = (o.lots || []).map(function (l) { return num(l.hum); }).filter(function (x) { return x !== null && !isNaN(x); });
      if (hs.length) add('moist_entry', bandMoist(Math.max.apply(null, hs), th.m), Math.max.apply(null, hs));
    }
    if (lastW && num(lastW.insects) > 0) add('insects', 2, num(lastW.insects));
    const lastT = treats[treats.length - 1];
    if (lastT && (!lastW || recStamp(lastW) < recStamp(lastT))) add('treat_pending', 2, lastT.date);
    const level = drivers.reduce(function (m, d) { return Math.max(m, d.level); }, 0);
    const noData = !lastRound && !lastW && !drivers.length;
    // Retenção: leitura Vermelha/Emergência depois da última disposição do CQ
    let lastRed = null;
    rounds.forEach(function (r, i) { if (roundEval(r, rounds[i - 1], st).level >= 4) lastRed = recStamp(r); });
    weeks.forEach(function (w) { if (th.m && num(w.moist) !== null && bandMoist(num(w.moist), th.m) >= 4) lastRed = recStamp(w); });
    const lastD = disps[disps.length - 1] || null;
    const dispValid = lastD && lastRed && recStamp(lastD) > lastRed;
    const held = !!lastRed && !dispValid;
    const rejected = !!(dispValid && lastD.decision === 'REJECT');
    // Idade de armazenagem: lote mais antigo presente
    const dates = (o.lots || []).map(function (l) { return l.date; }).filter(Boolean).sort();
    const ageDays = dates.length ? daysBetween(dates[0], o.now.date) : null;
    // Rondas: 1 por turno; 2 se Âmbar ou pior agora ou num dos últimos N turnos
    const starts = st.shifts && st.shifts.length ? st.shifts : ['07:00', '19:00'];
    const cur = shiftOf(o.now.date, o.now.time, starts);
    const shiftLevel = function (sh) { let m = -1; rounds.forEach(function (r, i) { if (shiftOf(r.date, r.time, starts).id === sh.id) m = Math.max(m, roundEval(r, rounds[i - 1], st).level); }); return m; };
    let elevated = level >= 2, sh = cur;
    const clearN = num(st.clearShifts) || 3;
    for (let k = 0; k < clearN && !elevated; k++) { sh = prevShift(sh, starts); if (shiftLevel(sh) >= 2) elevated = true; }
    const done = rounds.filter(function (r) { return shiftOf(r.date, r.time, starts).id === cur.id; }).length;
    const need = (o.kg > 0 || (o.lots || []).length) ? (elevated ? (num(st.amberRounds) || 2) : 1) : 0;
    const wDays = num(st.weeklyDays) || 7;
    const weeklyDue = (o.kg > 0) && (lastW ? daysBetween(lastW.date, o.now.date) >= wDays : (ageDays === null || ageDays >= wDays));
    return { level: level, drivers: drivers, noData: noData, held: held, rejected: rejected, lastDisp: lastD, lastRound: lastRound, lastEval: ev, lastWeekly: lastW, prevWeekly: prevW,
      ageDays: ageDays, unknownAge: (o.kg > 0 && !dates.length), shift: cur, roundsDone: done, roundsNeed: need, weeklyDue: weeklyDue };
  }

  // ---------- cópia de segurança / backup validation ----------
  const STATUS = ['ACCEPTED', 'HELD', 'REJECTED'];
  const EVT = ['IN', 'OUT', 'TRANSFER', 'EMPTY'];
  function validBackup(d) {
    if (!d || d.app !== 'moagem-app' || (d.format !== 1 && d.format !== 3 && d.format !== 4)) return false;
    if (!Array.isArray(d.lots) || !Array.isArray(d.events) || !Array.isArray(d.settings)) return false;
    if (d.monitor !== undefined && !Array.isArray(d.monitor)) return false;
    if (d.sevents !== undefined && !Array.isArray(d.sevents)) return false;
    const okMon = (d.monitor || []).every(function (r) { return r && ['ROUND', 'WEEKLY', 'TREAT', 'DISP'].indexOf(r.kind) >= 0 && typeof r.silo === 'string'; });
    const okSev = (d.sevents || []).every(function (e) { return e && typeof e.id === 'string' && /^[A-Za-z0-9-]{1,40}$/.test(e.id) && ['OPEN', 'CLOSED'].indexOf(e.status) >= 0; });
    if (!okMon || !okSev) return false;
    const okLots = d.lots.every(function (l) { return l && typeof l.id === 'string' && /^[A-Za-z0-9-]{1,40}$/.test(l.id) && STATUS.indexOf(l.status) >= 0 && (l.grade == null || LOT_GRADES.indexOf(l.grade) >= 0); });
    const okEv = d.events.every(function (e) { return e && EVT.indexOf(e.type) >= 0 && typeof e.silo === 'string'; });
    const okSet = d.settings.every(function (s) { return s && typeof s.key === 'string'; });
    return okLots && okEv && okSet;
  }

  // ---------- silos: IDs canónicos S01–S21 e capacidade (confirmado pelo cliente, Out-2026) ----------
  // Capacidade em toneladas no mestre; a app guarda kg. S01–S12 = 6 000 t; S13–S21 = 3 000 t.
  const SILO_IDS = Array.from({ length: 21 }, function (_, i) { return 'S' + pad(i + 1); });
  function siloCapT(id) { const n = parseInt(String(id).slice(1), 10); return n >= 1 && n <= 12 ? 6000 : (n >= 13 && n <= 21 ? 3000 : null); }
  function siloCapKg(id) { const t = siloCapT(id); return t === null ? null : t * 1000; }
  // Normaliza S1 → S01 (também aceita s1, S 1). Devolve null se não for S1–S21.
  function normalizeSiloId(raw) {
    const m = /^\s*[Ss]\s*0*(\d{1,2})\s*$/.exec(String(raw == null ? '' : raw));
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return n >= 1 && n <= 21 ? 'S' + pad(n) : null;
  }

  // Normaliza a lista de silos: renomeia (S1→S01), acrescenta os 21 silos do mestre, preenche capacidades vazias.
  // Silos inválidos são mantidos e assinalados (podem ter grão). Devolve { silos, idMap, changes, warnings }.
  function normalizeSilos(list) {
    const out = [], idMap = {}, changes = [], warnings = [];
    (list || []).forEach(function (x) {
      const nid = normalizeSiloId(x.id);
      if (nid === null) { warnings.push('invalid:' + x.id); out.push(Object.assign({}, x)); return; }
      if (nid !== x.id) { idMap[x.id] = nid; changes.push('renamed:' + x.id + '->' + nid); }
      if (out.some(function (o) { return o.id === nid; })) { warnings.push('duplicate:' + nid); return; }
      out.push(Object.assign({}, x, { id: nid }));
    });
    SILO_IDS.forEach(function (id) {
      const cur = out.find(function (o) { return o.id === id; });
      const master = String(siloCapKg(id));
      if (!cur) { out.push({ id: id, cap: master, cereal: '', colour: '', grade: '', points: '1' }); changes.push('added:' + id); return; }
      if (!cur.cap) { cur.cap = master; changes.push('cap:' + id); }
      else if (String(cur.cap).replace(/\D/g, '') !== master) warnings.push('cap-differs:' + id);
    });
    out.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    return { silos: out, idMap: idMap, changes: changes, warnings: warnings };
  }
  // Aplica o mapa de renomeação a registos que referenciam silos (eventos, rondas, eventos de armazenagem).
  function remapSiloRefs(records, idMap) {
    const changed = [];
    (records || []).forEach(function (r) {
      const n = Object.assign({}, r), fields = ['silo', 'toSilo'];
      let dirty = false;
      fields.forEach(function (f) { if (n[f] && idMap[n[f]]) { n[f] = idMap[n[f]]; dirty = true; } });
      if (dirty) changed.push(n);
    });
    return changed;
  }

  // ---------- identificadores de registo (sincronização futura) ----------
  // Cada registo tem um uid global (UUID v4) e o deviceId de origem. A chave local (IndexedDB) não é partilhada.
  const UID_STORES = ['lots', 'events', 'monitor', 'sevents'];
  const APP_VERSION = '0.3.0';
  // Versão do mestre partilhado (silos e capacidades). Muda sempre que SILO_IDS ou as capacidades mudarem.
  const MASTER_VERSION = '2026-10-14.1';
  // Compara a versão do mestre gravada num registo/cópia com a desta app: 'same' | 'older' | 'newer' | 'missing'.
  function masterStatus(v) {
    if (!v) return 'missing';
    if (v === MASTER_VERSION) return 'same';
    return v < MASTER_VERSION ? 'older' : 'newer';
  }
  function newUid(rnd) {
    rnd = rnd || Math.random;
    let h = ''; for (let i = 0; i < 32; i++) h += Math.floor(rnd() * 16).toString(16);
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-8' + h.slice(17, 20) + '-' + h.slice(20, 32);
  }
  // Acrescenta uid/deviceId/appVersion a registos novos (não altera os existentes). Devolve cópia.
  // Contrato de dados v1 (Stage 0): cada registo novo leva schemaVersion, appVersion, masterVersion, deviceId,
  // operatorId, shift (derivado de date/time), createdAt (hora do dispositivo, ISO), uploadedAt (null até ao envio) e test.
  // Actualizações (noVersion) não acrescentam campos novos: mantêm o que já tinham.
  const CONTRACT_VERSION = 1;
  function stampRecord(store, obj, ctx) {
    if (UID_STORES.indexOf(store) < 0) return obj;
    const out = Object.assign({}, obj);
    if (!out.uid) out.uid = (ctx && ctx.uid) || newUid();
    if (!out.deviceId && ctx && ctx.deviceId) out.deviceId = ctx.deviceId;
    if (ctx && ctx.noVersion) return out;
    if (!out.schemaVersion) out.schemaVersion = CONTRACT_VERSION;
    if (!out.appVersion) out.appVersion = APP_VERSION;
    if (!out.masterVersion) out.masterVersion = MASTER_VERSION;
    if (!out.createdAt) out.createdAt = (ctx && ctx.now) || new Date().toISOString();
    if (out.operatorId === undefined) out.operatorId = (ctx && ctx.operatorId) || null;
    if (out.test === undefined) out.test = !!(ctx && ctx.test);
    if (out.uploadedAt === undefined) out.uploadedAt = null;
    if (out.shift === undefined) out.shift = (typeof out.date === 'string' && typeof out.time === 'string') ? shiftOf(out.date, out.time, ctx && ctx.starts).id : null;
    return out;
  }
  // Resumo da versão do mestre nos registos de uma cópia: quantos são iguais, anteriores, posteriores ou sem versão.
  function backupMasterSummary(data) {
    const out = { same: 0, older: 0, newer: 0, missing: 0 };
    UID_STORES.forEach(function (s) { (data && data[s] || []).forEach(function (r) { out[masterStatus(r.masterVersion)]++; }); });
    return out;
  }
  // Migração por registo: renomeia silos e atribui uid/deviceId a registos antigos. Devolve { rec, changed }.
  function upgradeRecord(store, rec, idMap, deviceId, rnd, lotMap) {
    const out = Object.assign({}, rec); let changed = false;
    if (store === 'events' && lotMap) {
      if (out.lot && lotMap[out.lot]) { out.lot = lotMap[out.lot]; changed = true; }
      if (Array.isArray(out.lots)) { const nl = out.lots.map(function (x) { return lotMap[x] || x; }); if (nl.some(function (x, i) { return x !== out.lots[i]; })) { out.lots = nl; changed = true; } }
    }
    if (store !== 'lots') ['silo', 'toSilo'].forEach(function (f) { if (out[f] && idMap && idMap[out[f]]) { out[f] = idMap[out[f]]; changed = true; } });
    if (UID_STORES.indexOf(store) >= 0) {
      if (!out.uid) { out.uid = newUid(rnd); changed = true; }
      if (!out.deviceId && deviceId) { out.deviceId = deviceId; changed = true; }
    }
    return { rec: out, changed: changed };
  }

  // ---------- lotes: chave = uid (UUID); código = REC-AAMMDD-NN (apresentação) ----------
  // Rótulo para ecrãs e exportações: código do lote; se não existir, devolve o identificador tal como está.
  function lotLabel(lots, id) {
    const l = (lots || []).find(function (x) { return x.id === id; });
    return (l && (l.code || l.id)) || String(id);
  }
  function codeExists(lots, code) { return (lots || []).some(function (l) { return (l.code || l.id) === code; }); }
  // Novo lote: chave e uid iguais; código calculado a partir dos lotes existentes.
  function newLotRecord(lot, existingLots, uid) {
    const out = Object.assign({}, lot, { id: uid, uid: uid });
    out.code = lotCode(lot.date, existingLots);
    return out;
  }
  // Lote antigo (chave = código REC): passa a chave = uid e guarda o código antigo.
  function lotUpgrade(lot, fallbackUid) {
    const nid = lot.uid || fallbackUid;
    return { oldId: lot.id, newId: nid, lot: Object.assign({}, lot, { id: nid, uid: nid, code: lot.code || lot.id, codeState: lot.codeState || 'legacy' }) };
  }

  const api = { today: today, nowTime: nowTime, daysBetween: daysBetween, num: num, bad: bad, lotCode: lotCode,
    GRADES: GRADES, LOT_GRADES: LOT_GRADES, LEVELS: LEVELS, bandMoist: bandMoist, bandTemp: bandTemp, bandDT: bandDT, moistBand: moistBand, storeTh: storeTh, intakeClass: intakeClass, shiftOf: shiftOf, prevShift: prevShift, roundEval: roundEval, siloStatus: siloStatus, recStamp: recStamp, addDays: addDays, ODOUR_LV: ODOUR_LV, PARAMS: PARAMS, MYCO: MYCO, thresholds: thresholds, gradeLot: gradeLot, releaseOptions: releaseOptions,
    siloContents: siloContents, lotsCarried: lotsCarried, freeSpace: freeSpace, allocate: allocate, siloFit: siloFit, sortEvents: sortEvents,
    validBackup: validBackup, STATUS: STATUS, SILO_IDS: SILO_IDS, siloCapT: siloCapT, siloCapKg: siloCapKg, normalizeSiloId: normalizeSiloId, normalizeSilos: normalizeSilos, remapSiloRefs: remapSiloRefs, newUid: newUid, stampRecord: stampRecord, upgradeRecord: upgradeRecord, UID_STORES: UID_STORES, APP_VERSION: APP_VERSION, lotLabel: lotLabel, codeExists: codeExists, newLotRecord: newLotRecord, lotUpgrade: lotUpgrade,
    deviceTag: deviceTag, provisionalCode: provisionalCode, newLotCode: newLotCode, applyCentralCode: applyCentralCode, lotOrder: lotOrder,
    MASTER_VERSION: MASTER_VERSION, masterStatus: masterStatus, backupMasterSummary: backupMasterSummary, CONTRACT_VERSION: CONTRACT_VERSION };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Logic = api;
})(this);
