/* Conformidade FSSC 22000 — regras puras (sem DOM nem base de dados). Ficheiro igual na Prodn-Mgt e na Grain-Mgt.
 * Loja 'fssc' (chave uid), registos que nunca se alteram (corrige-se com 'void'), com o campo kind:
 *   doc        — versão de um documento do SGSA: code, title, reqIds, version, owner, approvedOn, reviewMonths, location, status
 *   grade      — avaliação mensal de um requisito: month 'AAAA-MM', reqId, grade C|MI|MA|CR|NA, evidence, action, owner, due
 *   actionDone — acção de uma avaliação concluída: gradeUid, note
 *   close      — fecho do mês pelo supervisor de CQ com PIN (guarda a pontuação e as contagens)
 *   reopen     — reabertura de um mês fechado (PIN e motivo)
 *   void       — anulação de um registo
 * Classificação (Zhax, 28-10-2026: como na auditoria FSSC, Parte 3 §6.2): Conforme, NC Menor, NC Maior, NC Crítica, N/A.
 * Pontuação (proposta FMIP, a confirmar): C = 1, Menor = 0,7, Maior = 0,3, Crítica = 0; média × 100 dos requisitos aplicáveis.
 * Qualquer Crítica limita o mês a 49 % (estado crítico); qualquer Maior limita a 89 %. N/A exige justificação e não conta.
 * Prodn-Mgt e Grain-Mgt avaliam a sua área; as pontuações ficam separadas (Zhax, 28-10-2026). */
(function (root) {
  'use strict';
  const KINDS = ['doc', 'grade', 'actionDone', 'close', 'reopen', 'void'];
  const GRADES = ['C', 'MI', 'MA', 'CR', 'NA'];
  const POINTS = { C: 1, MI: 0.7, MA: 0.3, CR: 0 };
  const CAP = { CR: 49, MA: 89 };
  const BANDS = [[90, 'good'], [75, 'fair'], [0, 'poor']];
  const DOC_STATUS = ['approved', 'draft', 'withdrawn'];
  const CLOSE_BY_DAY = 10;   // o mês tem de estar fechado até ao dia 10 do mês seguinte (proposta FMIP)
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/, MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  const txt = v => String(v === null || v === undefined ? '' : v).trim();
  const byTime = (a, b) => (a.t || 0) - (b.t || 0) || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0);

  const monthOf = d => String(d).slice(0, 7);
  function addMonths(m, n) { const y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1 + n; const d = new Date(Date.UTC(y, mo, 1)); return d.toISOString().slice(0, 7); }
  function addMonthsDay(d, n) {   // data + n meses (dia limitado ao fim do mês)
    const y = +d.slice(0, 4), m = +d.slice(5, 7) - 1 + n, day = +d.slice(8, 10);
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(day, last))).toISOString().slice(0, 10);
  }

  function effective(entries) {
    const voided = new Set((entries || []).filter(e => e && e.kind === 'void').map(e => e.voids));
    return (entries || []).filter(e => e && e.kind !== 'void' && !voided.has(e.uid)).sort(byTime);
  }
  const applicable = (reqs, area) => (reqs || []).filter(r => r.area === 'both' || r.area === area);

  // ---------- validação ----------
  function validateGrade(o, req) {
    const e = [];
    if (!req) e.push('reqId');
    if (!MONTH_RE.test(o.month || '')) e.push('month');
    if (GRADES.indexOf(o.grade) < 0) e.push('grade');
    if ((o.grade === 'NA' || o.grade === 'MI' || o.grade === 'MA' || o.grade === 'CR') && !txt(o.evidence)) e.push('evidence');
    if (o.grade === 'MI' || o.grade === 'MA' || o.grade === 'CR') {
      if (!txt(o.action)) e.push('action');
      if (!txt(o.owner)) e.push('owner');
      if (!DAY_RE.test(o.due || '')) e.push('due');
    }
    if (!txt(o.by)) e.push('by');
    return e;
  }
  function validateDoc(o, reqs) {
    const e = [];
    if (!txt(o.code)) e.push('code');
    if (!txt(o.title)) e.push('title');
    const ids = (reqs || []).map(r => r.id);
    if (!Array.isArray(o.reqIds) || !o.reqIds.length || o.reqIds.some(x => ids.indexOf(x) < 0)) e.push('reqIds');
    if (DOC_STATUS.indexOf(o.status) < 0) e.push('status');
    if (o.status === 'approved') {
      if (!txt(o.version)) e.push('version');
      if (!DAY_RE.test(o.approvedOn || '')) e.push('approvedOn');
      const m = Number(o.reviewMonths);
      if (!Number.isInteger(m) || m < 1 || m > 60) e.push('reviewMonths');
    }
    if (!txt(o.owner)) e.push('owner');
    if (!txt(o.by)) e.push('by');
    return e;
  }

  // ---------- documentos ----------
  // Versão em vigor de cada documento (último registo por código) e o seu estado em 'today'
  function docs(entries, today) {
    const last = {};
    effective(entries).filter(e => e.kind === 'doc').forEach(d => { last[txt(d.code).toUpperCase()] = d; });
    return Object.keys(last).sort().map(k => {
      const d = last[k];
      const next = d.status === 'approved' && DAY_RE.test(d.approvedOn || '') && d.reviewMonths ? addMonthsDay(d.approvedOn, Number(d.reviewMonths)) : null;
      const state = d.status !== 'approved' ? d.status : (next && today > next ? 'overdue' : 'ok');
      return { doc: d, code: k, nextReview: next, state };
    });
  }
  // Cobertura documental dos requisitos aplicáveis que exigem informação documentada
  function docCoverage(reqs, area, entries, today) {
    const D = docs(entries, today).filter(x => x.state !== 'withdrawn');
    const rows = applicable(reqs, area).filter(r => r.doc).map(r => {
      const mine = D.filter(x => (x.doc.reqIds || []).indexOf(r.id) >= 0);
      const state = mine.some(x => x.state === 'ok') ? 'ok' : mine.some(x => x.state === 'overdue') ? 'overdue' : mine.some(x => x.state === 'draft') ? 'draft' : 'missing';
      return { req: r, docs: mine, state };
    });
    const ok = rows.filter(x => x.state === 'ok').length;
    return { rows, ok, total: rows.length, pct: rows.length ? Math.round(ok / rows.length * 1000) / 10 : null };
  }

  // ---------- avaliação mensal ----------
  // Última avaliação de cada requisito no mês
  function grades(entries, month) {
    const g = {};
    effective(entries).filter(e => e.kind === 'grade' && e.month === month).forEach(e => { g[e.reqId] = e; });
    return g;
  }
  const bandOf = s => s === null ? null : BANDS.find(b => s >= b[0])[1];
  function score(reqs, area, G) {
    const A = applicable(reqs, area);
    const counts = { C: 0, MI: 0, MA: 0, CR: 0, NA: 0, open: 0 };
    let pts = 0, n = 0;
    const bySec = {};
    A.forEach(r => {
      const g = G[r.id];
      const S = bySec[r.sec] || (bySec[r.sec] = { pts: 0, n: 0, graded: 0, total: 0 });
      S.total++;
      if (!g) { counts.open++; return; }
      counts[g.grade]++; S.graded++;
      if (g.grade === 'NA') return;
      pts += POINTS[g.grade]; n++; S.pts += POINTS[g.grade]; S.n++;
    });
    let raw = n ? Math.round(pts / n * 1000) / 10 : null, s = raw;
    if (s !== null && counts.CR) s = Math.min(s, CAP.CR);
    else if (s !== null && counts.MA) s = Math.min(s, CAP.MA);
    Object.keys(bySec).forEach(k => { const S = bySec[k]; S.score = S.n ? Math.round(S.pts / S.n * 1000) / 10 : null; });
    return { score: s, raw, band: counts.CR ? 'critical' : bandOf(s), counts, applicable: A.length, graded: A.length - counts.open, complete: counts.open === 0, bySec };
  }
  // Mês fechado? (último fecho depois da última reabertura)
  function monthState(entries, month) {
    const E = effective(entries).filter(e => e.month === month && (e.kind === 'close' || e.kind === 'reopen'));
    const last = E[E.length - 1] || null;
    return { closed: !!(last && last.kind === 'close'), close: last && last.kind === 'close' ? last : null, history: E };
  }
  // Acções das avaliações Menor/Maior/Crítica (de todos os meses): aberta, concluída, em atraso
  function actions(entries, today) {
    const E = effective(entries);
    const done = {};
    E.filter(e => e.kind === 'actionDone').forEach(e => { done[e.gradeUid] = e; });
    const latest = {};
    E.filter(e => e.kind === 'grade').forEach(e => { latest[e.month + '|' + e.reqId] = e; });
    return Object.keys(latest).map(k => latest[k]).filter(g => g.grade === 'MI' || g.grade === 'MA' || g.grade === 'CR').map(g => {
      const d = done[g.uid] || null;
      return { grade: g, done: d, overdue: !d && DAY_RE.test(g.due || '') && today > g.due, daysLate: !d && today > g.due ? Math.round((Date.parse(today) - Date.parse(g.due)) / 86400000) : 0 };
    }).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || (a.grade.due < b.grade.due ? -1 : 1));
  }
  // Avisos: mês anterior por fechar depois do dia 10; acções em atraso; documentos com revisão em atraso; Crítica no último mês fechado
  function warnings(entries, reqs, area, today) {
    const w = [];
    const prev = addMonths(monthOf(today), -1);
    if (+today.slice(8, 10) > CLOSE_BY_DAY && !monthState(entries, prev).closed) w.push({ type: 'month_open', month: prev, level: 'warn' });
    actions(entries, today).filter(a => a.overdue).forEach(a => w.push({ type: 'action_overdue', level: a.grade.grade === 'CR' || a.grade.grade === 'MA' ? 'bad' : 'warn',
      reqId: a.grade.reqId, month: a.grade.month, grade: a.grade.grade, due: a.grade.due, daysLate: a.daysLate, owner: a.grade.owner }));
    docs(entries, today).filter(d => d.state === 'overdue').forEach(d => w.push({ type: 'doc_review', level: 'warn', code: d.code, title: d.doc.title, nextReview: d.nextReview }));
    const S = monthState(entries, prev);
    if (S.closed && S.close.counts && S.close.counts.CR) w.push({ type: 'month_critical', level: 'bad', month: prev, n: S.close.counts.CR });
    return w;
  }

  const api = { KINDS, GRADES, POINTS, CAP, DOC_STATUS, CLOSE_BY_DAY, monthOf, addMonths, addMonthsDay, effective, applicable,
    validateGrade, validateDoc, docs, docCoverage, grades, score, bandOf, monthState, actions, warnings };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Fssc = api;
})(typeof window !== 'undefined' ? window : this);
