/* Conformidade FSSC 22000 — interface. Ficheiro igual na Prodn-Mgt e na Grain-Mgt; regras em js/fssc.js, requisitos em js/fssc-reqs.js.
 * Criada pela app com FsscUI(C):
 *   C.lang() · C.esc(v) · C.toast(msg) · C.render() · C.load() -> Promise<[registos 'fssc']> · C.add(rec) -> Promise
 *   C.area 'mill' (Prodn-Mgt) | 'grain' (Grain-Mgt) · C.operator() · C.pin(pin) -> Promise<{ok, msg}> (PIN de supervisor da app)
 *   C.complaints (reclamações de clientes) · C.products() nomes dos produtos (sugestões) · C.lots() lotes da app (sugestões)
 *   C.customers [{id, label}] clientes internos (Grain-Mgt: FMO, FRA); sem lista = cliente escrito à mão (externo)
 * Eventos próprios (data-fact, data-ff); não usa os atributos das apps. */
window.FsscUI = function (C) {
  'use strict';
  const F = window.Fssc, Q = window.FsscReqs, esc = C.esc;
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const st = { tab: 'month', month: null, entries: [], loaded: false, form: null, open: {} };
  const T = {
    pt: {
      title: 'Conformidade FSSC 22000', t_month: 'Avaliação mensal', t_docs: 'Documentos', t_actions: 'Acções', t_hist: 'Histórico',
      month: 'Mês', score: 'Pontuação', docs: 'Documentação', graded: 'avaliados', closed: 'Mês fechado', open: 'Mês aberto', closeMonth: 'Fechar mês',
      reopen: 'Reabrir mês', needAll: 'Avalie todos os requisitos aplicáveis antes de fechar o mês.', pin: 'PIN de supervisor', name: 'Nome', reason: 'Motivo',
      save: 'Gravar', cancel: 'Cancelar', saved: 'Gravado.', fail: 'Não foi possível gravar.', fill: 'Falta ou inválido', loading: 'A carregar…', none: 'Sem registos.',
      g_C: 'Conforme', g_MI: 'NC menor', g_MA: 'NC maior', g_CR: 'NC crítica', g_NA: 'N/A', notGraded: 'por avaliar',
      evidence: 'Evidência / justificação', action: 'Acção correctiva', owner: 'Responsável', due: 'Prazo', by: 'Avaliado por',
      b_good: 'Bom (≥ 90 %)', b_fair: 'Atenção (75–89 %)', b_poor: 'Insuficiente (< 75 %)', b_critical: 'NC crítica — limitado a 49 %',
      rules: 'Conforme 1 · NC menor 0,7 · NC maior 0,3 · NC crítica 0. Pontuação = média × 100 dos requisitos aplicáveis (N/A não conta). Uma NC maior limita a 89 %; uma NC crítica limita a 49 %. Fecho com PIN de supervisor até ao dia 10 do mês seguinte.',
      area_mill: 'Área: moagem (Prodn-Mgt)', area_grain: 'Área: recepção e silos (Grain-Mgt)', closedBy: 'Fechado por', reopenedBy: 'Reaberto por',
      newDoc: 'Novo documento / nova versão', code: 'Código', docTitle: 'Título', version: 'Versão', status: 'Estado', s_approved: 'Aprovado', s_draft: 'Em elaboração', s_withdrawn: 'Retirado',
      approvedOn: 'Data de aprovação', reviewMonths: 'Revisão a cada (meses)', location: 'Onde está (pasta, ficheiro, arquivo)', reqIds: 'Requisitos que cumpre', nextReview: 'Próxima revisão',
      d_ok: 'Em dia', d_overdue: 'Revisão em atraso', d_draft: 'Em elaboração', d_missing: 'Sem documento', d_withdrawn: 'Retirado', coverage: 'Cobertura documental', edit: 'Nova versão',
      openActions: 'Acções em aberto', doneActions: 'Concluídas', complete: 'Concluir', note: 'Nota', overdue: 'em atraso', daysLate: '{n} dia(s)',
      histNone: 'Ainda não há meses fechados.', counts: 'C {c} · menor {mi} · maior {ma} · crítica {cr} · N/A {na}',
      w_month_open: 'FSSC: avaliação de {m} por fechar', w_action_overdue: 'FSSC: acção em atraso — {r} ({g}, prazo {d})', w_doc_review: 'FSSC: revisão em atraso — {c} {t}', w_month_critical: 'FSSC: {n} NC crítica(s) em {m}',
      reqDoc: 'exige documento', naHint: 'Pode ser N/A',
      t_complaints: 'Reclamações', newComplaint: 'Nova reclamação de cliente', received: 'Recebida em', customer: 'Cliente', ref: 'Referência do cliente / contacto', product: 'Produto', lot: 'Lote nº',
      reason: 'Motivo', description: 'Descrição da reclamação', foodSafety: 'Afecta a segurança alimentar', remedy: 'Correcção (remédio ao cliente)', further: 'Acção adicional (investigação, causa)',
      prevention: 'Prevenção da repetição', verification: 'Verificação da eficácia', followUp: 'Seguimento', closeIt: 'Fechar a reclamação', c_open: 'Aberta', c_closed: 'Fechada',
      daysOpen: '{n} dia(s)', fOpen: 'Abertas', fAll: 'Todas', fsChip: 'Segurança alimentar', voidIt: 'Anular registo', voidReason: 'Motivo da anulação', closedOn: 'Fechada em', recBy: 'Registada por',
      cr_foreign: 'Corpo estranho', cr_infestation: 'Infestação / insectos', cr_quality: 'Qualidade (cor, granulometria)', cr_moisture: 'Humidade / bolor', cr_weight: 'Peso / quantidade',
      cr_mixed: 'Cereal, cor ou grau errado', custType: 'Cliente', ct_internal: 'Interno', ct_external: 'Externo', extName: 'Nome do cliente externo (outra moagem)', extOpt: 'Externo — outra moagem',
      cr_packaging: 'Embalagem', cr_labelling: 'Rotulagem', cr_allergen: 'Alergénio', cr_taste: 'Sabor / cheiro', cr_other: 'Outro',
      w_complaint_fs: 'Reclamação {id} ({c}) afecta a segurança alimentar — em aberto', w_complaint_overdue: 'Reclamação {id} ({c}) em atraso (prazo {d})'
    },
    en: {
      title: 'FSSC 22000 compliance', t_month: 'Monthly check', t_docs: 'Documents', t_actions: 'Actions', t_hist: 'History',
      month: 'Month', score: 'Score', docs: 'Documentation', graded: 'graded', closed: 'Month closed', open: 'Month open', closeMonth: 'Close month',
      reopen: 'Reopen month', needAll: 'Grade every applicable requirement before closing the month.', pin: 'Supervisor PIN', name: 'Name', reason: 'Reason',
      save: 'Save', cancel: 'Cancel', saved: 'Saved.', fail: 'Could not save.', fill: 'Missing or invalid', loading: 'Loading…', none: 'No records.',
      g_C: 'Compliant', g_MI: 'Minor NC', g_MA: 'Major NC', g_CR: 'Critical NC', g_NA: 'N/A', notGraded: 'not graded',
      evidence: 'Evidence / justification', action: 'Corrective action', owner: 'Owner', due: 'Due date', by: 'Graded by',
      b_good: 'Good (≥ 90 %)', b_fair: 'Attention (75–89 %)', b_poor: 'Insufficient (< 75 %)', b_critical: 'Critical NC — capped at 49 %',
      rules: 'Compliant 1 · minor NC 0.7 · major NC 0.3 · critical NC 0. Score = average × 100 of applicable requirements (N/A not counted). A major NC caps at 89 %; a critical NC caps at 49 %. Closed with the supervisor PIN by the 10th of the next month.',
      area_mill: 'Area: mill (Prodn-Mgt)', area_grain: 'Area: intake and silos (Grain-Mgt)', closedBy: 'Closed by', reopenedBy: 'Reopened by',
      newDoc: 'New document / new version', code: 'Code', docTitle: 'Title', version: 'Version', status: 'Status', s_approved: 'Approved', s_draft: 'Draft', s_withdrawn: 'Withdrawn',
      approvedOn: 'Approval date', reviewMonths: 'Review every (months)', location: 'Where it is (folder, file, archive)', reqIds: 'Requirements it covers', nextReview: 'Next review',
      d_ok: 'In date', d_overdue: 'Review overdue', d_draft: 'Draft', d_missing: 'No document', d_withdrawn: 'Withdrawn', coverage: 'Document coverage', edit: 'New version',
      openActions: 'Open actions', doneActions: 'Completed', complete: 'Complete', note: 'Note', overdue: 'overdue', daysLate: '{n} day(s)',
      histNone: 'No closed months yet.', counts: 'C {c} · minor {mi} · major {ma} · critical {cr} · N/A {na}',
      w_month_open: 'FSSC: {m} check not closed', w_action_overdue: 'FSSC: action overdue — {r} ({g}, due {d})', w_doc_review: 'FSSC: review overdue — {c} {t}', w_month_critical: 'FSSC: {n} critical NC(s) in {m}',
      reqDoc: 'needs a document', naHint: 'May be N/A',
      t_complaints: 'Complaints', newComplaint: 'New customer complaint', received: 'Received on', customer: 'Customer', ref: 'Customer reference / contact', product: 'Product', lot: 'Lot no.',
      reason: 'Reason', description: 'Complaint description', foodSafety: 'Affects food safety', remedy: 'Remedy (to the customer)', further: 'Further action (investigation, cause)',
      prevention: 'Prevention of recurrence', verification: 'Verification of effectiveness', followUp: 'Follow-up', closeIt: 'Close the complaint', c_open: 'Open', c_closed: 'Closed',
      daysOpen: '{n} day(s)', fOpen: 'Open', fAll: 'All', fsChip: 'Food safety', voidIt: 'Void record', voidReason: 'Reason for voiding', closedOn: 'Closed on', recBy: 'Recorded by',
      cr_foreign: 'Foreign body', cr_infestation: 'Infestation / insects', cr_quality: 'Quality (colour, particle size)', cr_moisture: 'Moisture / mould', cr_weight: 'Weight / quantity',
      cr_mixed: 'Wrong cereal, colour or grade', custType: 'Customer', ct_internal: 'Internal', ct_external: 'External', extName: 'External customer name (other mill)', extOpt: 'External — other mill',
      cr_packaging: 'Packaging', cr_labelling: 'Labelling', cr_allergen: 'Allergen', cr_taste: 'Taste / smell', cr_other: 'Other',
      w_complaint_fs: 'Complaint {id} ({c}) affects food safety — open', w_complaint_overdue: 'Complaint {id} ({c}) overdue (due {d})'
    }
  };
  function t(k, v) { let s = (T[C.lang()] || T.pt)[k] || T.pt[k] || k; if (v) Object.keys(v).forEach(x => { s = s.split('{' + x + '}').join(v[x]); }); return s; }
  const L = () => (C.lang() === 'en' ? 'en' : 'pt');
  const reqTitle = r => r[L()] || r.pt;
  const secName = id => { const s = Q.SECTIONS.find(x => x[0] === id); return s ? (L() === 'en' ? s[2] : s[1]) : id; };
  const ddmm = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '—';
  const nf = v => v === null || v === undefined ? '—' : (C.lang() === 'pt' ? String(v).replace('.', ',') : String(v));
  const opt = (v, cur, label) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
  const fld = (label, inner, req) => `<label class="fs-f${req ? ' fs-req' : ''}">${esc(label)}${inner}</label>`;
  const inp = (k, v, extra) => `<input data-ff="${k}" value="${esc(v)}" ${extra || ''}>`;
  const area = (k, v) => `<textarea rows="2" data-ff="${k}">${esc(v)}</textarea>`;
  const reqs = () => F.applicable(Q.REQS, C.area);
  const month = () => st.month || (st.month = F.monthOf(today()));
  const BAND_CLS = { good: 'fs-ok', fair: 'fs-warn', poor: 'fs-bad', critical: 'fs-bad' };
  const GRADE_CLS = { C: 'fs-ok', MI: 'fs-warn', MA: 'fs-bad', CR: 'fs-bad', NA: '' };

  async function reload() { try { st.entries = (await C.load()) || []; st.loaded = true; } catch (e) { console.warn('fssc load', e); } }
  async function save(rec, msg) {
    const now = Date.now();
    try { await C.add(Object.assign({ t: now, date: today(), time: new Date(now).toTimeString().slice(0, 5) }, rec)); } catch (e) { C.toast(t('fail')); return false; }
    st.form = null; await reload(); C.toast(msg || t('saved')); keep(); return true;
  }
  function errs(list) { if (list.length) { C.toast(t('fill') + ': ' + list.map(x => t(x)).join(', ')); return true; } return false; }
  function keep() { const y = window.scrollY; C.render(); window.scrollTo(0, y); }

  // ---------- avisos ----------
  function warnings() { return st.loaded ? F.warnings(st.entries, Q.REQS, C.area, today()) : []; }
  function warnText(w) {
    if (w.type === 'month_open') return t('w_month_open', { m: w.month });
    if (w.type === 'action_overdue') return t('w_action_overdue', { r: w.reqId, g: t('g_' + w.grade), d: ddmm(w.due) });
    if (w.type === 'doc_review') return t('w_doc_review', { c: w.code, t: w.title });
    if (w.type === 'complaint_fs' || w.type === 'complaint_overdue') return t('w_' + w.type, { id: w.id, c: w.customer, d: ddmm(w.due) });
    return t('w_month_critical', { n: w.n, m: w.month });
  }

  // ---------- vista ----------
  function view() {
    if (!st.loaded) { reload().then(C.render); return `<section class="card"><p>${esc(t('loading'))}</p></section>`; }
    const tabs = ['month', 'docs', 'actions'].concat(C.complaints ? ['complaints'] : []).concat(['hist']);
    const head = `<section class="card"><h2>${esc(t('title'))}</h2><p class="fs-sub">${esc(t('area_' + C.area))} · ${esc(Q.SOURCE)}</p>
      <div class="fs-tabs">${tabs.map(k => `<button type="button" class="btn small ${st.tab === k ? 'primary' : ''}" data-fact="tab" data-v="${k}">${esc(t('t_' + k))}</button>`).join('')}</div></section>`;
    const bn = warnings().map(w => `<div class="fs-bn ${w.level === 'bad' ? 'fs-bad' : 'fs-warn'}">✔ ${esc(warnText(w))}</div>`).join('');
    return bn + head + ({ month: vMonth, docs: vDocs, actions: vActions, complaints: vComplaints, hist: vHist }[st.tab] || vMonth)();
  }

  // ----- avaliação mensal -----
  function vMonth() {
    const m = month(), G = F.grades(st.entries, m), S = F.score(Q.REQS, C.area, G), MS = F.monthState(st.entries, m);
    const cov = F.docCoverage(Q.REQS, C.area, st.entries, today());
    const f = st.form;
    const closeBox = f && (f.kind === 'close' || f.kind === 'reopen') ? `<div class="fs-box">${f.kind === 'reopen' ? fld(t('reason'), area('reason', f.reason), 1) : ''}
        ${fld(t('name'), inp('by', f.by), 1)}${fld(t('pin'), `<input type="password" inputmode="numeric" data-ff="pin" value="">`, 1)}
        <div class="row"><button type="button" class="btn primary" data-fact="${f.kind === 'close' ? 'closesave' : 'reopensave'}">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>` : '';
    const last = MS.history[MS.history.length - 1];
    let h = `<section class="card"><div class="row">${fld(t('month'), `<input type="month" id="fsMonth" value="${esc(m)}">`)}</div>
      <div class="fs-kpi"><div class="${BAND_CLS[S.band] || ''}"><b>${S.score === null ? '—' : esc(nf(S.score)) + ' %'}</b><span>${esc(t('score'))}</span></div>
        <div><b>${S.graded}/${S.applicable}</b><span>${esc(t('graded'))}</span></div>
        <div class="${cov.pct !== null && cov.pct < 100 ? 'fs-warn' : 'fs-ok'}"><b>${cov.pct === null ? '—' : esc(nf(cov.pct)) + ' %'}</b><span>${esc(t('docs'))}</span></div>
        <div class="${MS.closed ? 'fs-ok' : ''}"><b>${MS.closed ? '✔' : '…'}</b><span>${esc(MS.closed ? t('closed') : t('open'))}</span></div></div>
      ${S.band ? `<p class="fs-sub"><span class="fs-c ${BAND_CLS[S.band]}">${esc(t('b_' + S.band))}</span> ${esc(t('counts', { c: S.counts.C, mi: S.counts.MI, ma: S.counts.MA, cr: S.counts.CR, na: S.counts.NA }))}</p>` : ''}
      ${last ? `<p class="fs-sub">${esc(last.kind === 'close' ? t('closedBy') : t('reopenedBy'))} ${esc(last.by)} · ${esc(ddmm(last.date))} ${esc(last.time || '')}${last.reason ? ' — ' + esc(last.reason) : ''}</p>` : ''}
      <p class="fs-sub">${esc(t('rules'))}</p>
      ${closeBox || (MS.closed ? `<button type="button" class="btn" data-fact="reopen">${esc(t('reopen'))}</button>`
        : `<button type="button" class="btn primary" data-fact="close" ${S.complete ? '' : 'disabled'}>${esc(t('closeMonth'))}</button>${S.complete ? '' : `<p class="fs-sub">${esc(t('needAll'))}</p>`}`)}</section>`;
    Q.SECTIONS.forEach(([sid]) => {
      const R = reqs().filter(r => r.sec === sid);
      if (!R.length) return;
      const B = S.bySec[sid] || {};
      h += `<details class="card" ${st.open[sid] ? 'open' : ''} data-fsec="${esc(sid)}"><summary><b>${esc(secName(sid))}</b> <span class="fs-sub">${B.graded || 0}/${R.length}${B.score !== null && B.score !== undefined ? ' · ' + esc(nf(B.score)) + ' %' : ''}</span></summary>
        ${R.map(r => reqRow(r, G[r.id], MS.closed)).join('')}</details>`;
    });
    return h;
  }
  function reqRow(r, g, locked) {
    const f = st.form && st.form.kind === 'grade' && st.form.reqId === r.id ? st.form : null;
    const chip = g ? `<span class="fs-c ${GRADE_CLS[g.grade]}">${esc(t('g_' + g.grade))}</span>` : `<span class="fs-c">${esc(t('notGraded'))}</span>`;
    let form = '';
    if (f) {
      const nc = f.grade === 'MI' || f.grade === 'MA' || f.grade === 'CR';
      form = `<div class="fs-box"><b>${esc(t('g_' + f.grade))}</b>${fld(t('evidence'), area('evidence', f.evidence), f.grade !== 'C')}
        ${nc ? `${fld(t('action'), area('action', f.action), 1)}<div class="grid2">${fld(t('owner'), inp('owner', f.owner), 1)}${fld(t('due'), inp('due', f.due, 'type="date"'), 1)}</div>` : ''}
        ${fld(t('by'), inp('by', f.by), 1)}<div class="row"><button type="button" class="btn primary" data-fact="gradesave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`;
    }
    return `<div class="fs-item"><div><b>${esc(r.ref)}</b> ${esc(reqTitle(r))} ${chip}${r.doc ? ` <small class="fs-sub">· ${esc(t('reqDoc'))}</small>` : ''}${r.na ? ` <small class="fs-sub">· ${esc(t('naHint'))}: ${esc(r.na)}</small>` : ''}</div>
      ${g && g.evidence ? `<div class="fs-sub">${esc(g.evidence)}</div>` : ''}${g && g.action ? `<div class="fs-sub">→ ${esc(g.action)} · ${esc(g.owner || '')} · ${esc(ddmm(g.due))}</div>` : ''}
      ${form || (locked ? '' : `<div class="fs-grades">${F.GRADES.map(x => `<button type="button" class="btn small ${g && g.grade === x ? 'primary' : ''}" data-fact="grade" data-req="${esc(r.id)}" data-v="${x}">${esc(t('g_' + x))}</button>`).join('')}</div>`)}</div>`;
  }
  async function gradeSave() {
    const f = st.form, r = Q.REQS.find(x => x.id === f.reqId);
    if (errs(F.validateGrade(f, r))) return;
    const nc = f.grade === 'MI' || f.grade === 'MA' || f.grade === 'CR';
    await save({ kind: 'grade', month: f.month, reqId: f.reqId, ref: r.ref, grade: f.grade, evidence: f.evidence.trim(),
      action: nc ? f.action.trim() : '', owner: nc ? f.owner.trim() : '', due: nc ? f.due : '', by: f.by.trim() });
  }
  async function closeSave(reopen) {
    const f = st.form, m = month();
    if (!String(f.by || '').trim() || (reopen && !String(f.reason || '').trim())) return C.toast(t('fill') + ': ' + t('name') + (reopen ? ', ' + t('reason') : ''));
    const r = await C.pin(f.pin || '');
    if (!r || !r.ok) { f.pin = ''; return C.toast(r && r.msg ? r.msg : t('pin')); }
    if (reopen) return save({ kind: 'reopen', month: m, reason: f.reason.trim(), by: f.by.trim() });
    const S = F.score(Q.REQS, C.area, F.grades(st.entries, m));
    if (!S.complete) return C.toast(t('needAll'));
    const cov = F.docCoverage(Q.REQS, C.area, st.entries, today());
    return save({ kind: 'close', month: m, area: C.area, score: S.score, raw: S.raw, band: S.band, counts: S.counts, applicable: S.applicable, docPct: cov.pct,
      openActions: F.actions(st.entries, today()).filter(a => !a.done).length, by: f.by.trim() });
  }

  // ----- documentos -----
  const DOC_CLS = { ok: 'fs-ok', overdue: 'fs-bad', draft: 'fs-warn', missing: 'fs-bad', withdrawn: '' };
  function vDocs() {
    const D = F.docs(st.entries, today()), cov = F.docCoverage(Q.REQS, C.area, st.entries, today()), f = st.form && st.form.kind === 'doc' ? st.form : null;
    const docReqs = reqs().filter(r => r.doc);
    const form = f ? `<div class="fs-box"><div class="grid2">${fld(t('code'), inp('code', f.code), 1)}${fld(t('version'), inp('version', f.version))}</div>
        ${fld(t('docTitle'), inp('title', f.title), 1)}
        <div class="grid2">${fld(t('status'), `<select data-ff="status">${F.DOC_STATUS.map(s => opt(s, f.status, t('s_' + s))).join('')}</select>`, 1)}${fld(t('owner'), inp('owner', f.owner), 1)}
        ${fld(t('approvedOn'), inp('approvedOn', f.approvedOn, 'type="date"'))}${fld(t('reviewMonths'), inp('reviewMonths', f.reviewMonths, 'inputmode="numeric"'))}</div>
        ${fld(t('location'), inp('location', f.location))}
        <details open><summary class="fs-sub">${esc(t('reqIds'))} (${f.reqIds.length})</summary><div class="fs-reqs">${docReqs.map(r => `<label class="fs-chk"><input type="checkbox" data-freq="${esc(r.id)}" ${f.reqIds.indexOf(r.id) >= 0 ? 'checked' : ''}> <b>${esc(r.ref)}</b> ${esc(reqTitle(r))}</label>`).join('')}</div></details>
        ${fld(t('by'), inp('by', f.by), 1)}<div class="row"><button type="button" class="btn primary" data-fact="docsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`
      : `<button type="button" class="btn primary" data-fact="newdoc">＋ ${esc(t('newDoc'))}</button>`;
    return `<section class="card">${form}</section>
      <section class="card"><h3>${esc(t('t_docs'))} (${D.length})</h3>${D.map(d => `<div class="fs-item"><div><b>${esc(d.code)}</b> ${esc(d.doc.title)} <span class="fs-c ${DOC_CLS[d.state]}">${esc(t('d_' + d.state))}</span></div>
        <div class="fs-sub">${esc(t('version'))} ${esc(d.doc.version || '—')} · ${esc(t('approvedOn'))} ${esc(ddmm(d.doc.approvedOn))} · ${esc(t('nextReview'))} ${esc(ddmm(d.nextReview))} · ${esc(d.doc.owner || '')}${d.doc.location ? ' · ' + esc(d.doc.location) : ''}</div>
        <div class="fs-sub">${(d.doc.reqIds || []).map(esc).join(', ')}</div>${st.form ? '' : `<button type="button" class="btn small" data-fact="docver" data-v="${esc(d.code)}">${esc(t('edit'))}</button>`}</div>`).join('') || `<p class="fs-sub">${esc(t('none'))}</p>`}</section>
      <section class="card"><h3>${esc(t('coverage'))} · ${cov.ok}/${cov.total}${cov.pct === null ? '' : ' (' + esc(nf(cov.pct)) + ' %)'}</h3>
        ${cov.rows.map(x => `<div class="fs-item"><b>${esc(x.req.ref)}</b> ${esc(reqTitle(x.req))} <span class="fs-c ${DOC_CLS[x.state]}">${esc(t('d_' + x.state))}</span>${x.docs.length ? ' <small class="fs-sub">' + x.docs.map(d => esc(d.code)).join(', ') + '</small>' : ''}</div>`).join('')}</section>`;
  }
  async function docSave() {
    const f = st.form;
    const o = Object.assign({}, f, { reviewMonths: f.reviewMonths === '' ? null : Number(f.reviewMonths) });
    if (errs(F.validateDoc(o, Q.REQS))) return;
    await save({ kind: 'doc', code: f.code.trim().toUpperCase(), title: f.title.trim(), reqIds: f.reqIds.slice(), version: f.version.trim(), status: f.status,
      approvedOn: f.status === 'approved' ? f.approvedOn : '', reviewMonths: f.status === 'approved' ? Number(f.reviewMonths) : null, owner: f.owner.trim(), location: f.location.trim(), by: f.by.trim() });
  }

  // ----- acções -----
  function vActions() {
    const A = F.actions(st.entries, today()), f = st.form && st.form.kind === 'actionDone' ? st.form : null;
    const item = a => { const g = a.grade, r = Q.REQS.find(x => x.id === g.reqId) || { ref: g.reqId, pt: '', en: '' };
      return `<div class="fs-item ${a.overdue ? 'fs-late' : ''}"><div><span class="fs-c ${GRADE_CLS[g.grade]}">${esc(t('g_' + g.grade))}</span> <b>${esc(r.ref)}</b> ${esc(reqTitle(r))} · ${esc(g.month)}</div>
        <div>→ ${esc(g.action)}</div><div class="fs-sub">${esc(t('owner'))}: ${esc(g.owner)} · ${esc(t('due'))} ${esc(ddmm(g.due))}${a.overdue ? ' · <b>' + esc(t('overdue')) + ' ' + esc(t('daysLate', { n: a.daysLate })) + '</b>' : ''}${a.done ? ' · ✔ ' + esc(ddmm(a.done.date)) + ' ' + esc(a.done.by) + (a.done.note ? ': ' + esc(a.done.note) : '') : ''}</div>
        ${a.done ? '' : (f && f.gradeUid === g.uid ? `<div class="fs-box">${fld(t('note'), area('note', f.note), 1)}${fld(t('name'), inp('by', f.by), 1)}<div class="row"><button type="button" class="btn primary" data-fact="donesave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`
          : (st.form ? '' : `<button type="button" class="btn small" data-fact="done" data-v="${esc(g.uid)}">${esc(t('complete'))}</button>`))}</div>`; };
    const open = A.filter(a => !a.done), done = A.filter(a => a.done);
    return `<section class="card"><h3>${esc(t('openActions'))} (${open.length})</h3>${open.map(item).join('') || `<p class="fs-sub">${esc(t('none'))}</p>`}</section>
      ${done.length ? `<details class="card"><summary>${esc(t('doneActions'))} (${done.length})</summary>${done.map(item).join('')}</details>` : ''}`;
  }

  // ----- reclamações de clientes (só Prodn-Mgt) -----
  function vComplaints() {
    const L = F.complaints(st.entries, today()), f = st.form;
    const lots = Array.from(new Set((C.lots ? C.lots() : []).concat(L.map(x => x.complaint.lot)).filter(Boolean))).sort();
    const prods = Array.from(new Set((C.products ? C.products() : []).concat(L.map(x => x.complaint.product)).filter(Boolean)));
    const nf_ = f && f.kind === 'complaint' ? f : null;
    const form = nf_ ? `<div class="fs-box"><div class="grid2">${fld(t('received'), inp('received', nf_.received, 'type="date"'), 1)}${C.customers ? fld(t('custType'), `<select data-ff="custSel"><option value="">—</option>${C.customers.map(x => opt(x.id, nf_.custSel, x.label)).join('')}${opt('EXT', nf_.custSel, t('extOpt'))}</select>`, 1) : fld(t('customer'), inp('customer', nf_.customer), 1)}
        ${C.customers && nf_.custSel === 'EXT' ? fld(t('extName'), inp('customer', nf_.customer), 1) : ''}
        ${fld(t('product'), inp('product', nf_.product, 'list="fsProds"'), 1)}${fld(t('lot'), inp('lot', nf_.lot, 'list="fsLots"'), 1)}
        ${fld(t('reason'), `<select data-ff="reason"><option value="">—</option>${F.COMPLAINT_REASONS.map(r => opt(r, nf_.reason, t('cr_' + r))).join('')}</select>`, 1)}${fld(t('ref'), inp('ref', nf_.ref))}</div>
        ${fld(t('description'), area('description', nf_.description), 1)}
        <label class="fs-chk"><input type="checkbox" data-ff="foodSafety" ${nf_.foodSafety ? 'checked' : ''}> ${esc(t('foodSafety'))}</label>
        <div class="grid2">${fld(t('owner'), inp('owner', nf_.owner), 1)}${fld(t('due'), inp('due', nf_.due, 'type="date"'), 1)}</div>${fld(t('by'), inp('by', nf_.by), 1)}
        <datalist id="fsLots">${lots.map(x => `<option value="${esc(x)}">`).join('')}</datalist><datalist id="fsProds">${prods.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
        <div class="row"><button type="button" class="btn primary" data-fact="ccsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`
      : `<button type="button" class="btn primary" data-fact="ccnew">＋ ${esc(t('newComplaint'))}</button>`;
    const show = st.ccFilter === 'all' ? L : L.filter(x => x.open);
    const item = x => {
      const c = x.complaint, up = f && f.kind === 'complaintUpd' && f.complaintUid === x.uid, vd = f && f.kind === 'ccvoid' && f.uid === x.uid;
      return `<div class="fs-item ${x.open && (x.overdue || c.foodSafety) ? 'fs-late' : ''}"><div><b>${esc(x.id)}</b> · ${esc(c.customer)}${c.customerType ? ` <span class="fs-c">${esc(t('ct_' + c.customerType))}</span>` : ''} <span class="fs-c ${x.open ? 'fs-warn' : 'fs-ok'}">${esc(t(x.open ? 'c_open' : 'c_closed'))}</span>
          ${c.foodSafety ? `<span class="fs-c fs-bad">${esc(t('fsChip'))}</span>` : ''}${x.overdue ? `<span class="fs-c fs-bad">${esc(t('overdue'))}</span>` : ''}</div>
        <div class="fs-sub">${esc(t('received'))} ${esc(ddmm(c.received))} · ${esc(c.product)} · ${esc(t('lot'))} <b>${esc(c.lot)}</b> · ${esc(t('cr_' + (F.COMPLAINT_REASONS.indexOf(c.reason) >= 0 ? c.reason : 'other')))}${c.ref ? ' · ' + esc(c.ref) : ''} · ${esc(t('daysOpen', { n: x.daysOpen }))}</div>
        <div>${esc(c.description)}</div>
        <div class="fs-sub">${esc(t('owner'))}: ${esc(c.owner)} · ${esc(t('due'))} ${esc(ddmm(c.due))} · ${esc(t('recBy'))} ${esc(c.by)}</div>
        <div class="fs-cc"><div><b>${esc(t('remedy'))}</b><span>${esc(x.remedy || '—')}</span></div><div><b>${esc(t('further'))}</b><span>${esc(x.further || '—')}</span></div>
          <div><b>${esc(t('prevention'))}</b><span>${esc(x.prevention || '—')}</span></div>${x.open ? '' : `<div><b>${esc(t('verification'))}</b><span>${esc(x.verification)} · ${esc(t('closedOn'))} ${esc(ddmm(x.closedOn))} · ${esc(x.closedBy)}</span></div>`}</div>
        ${up ? `<div class="fs-box">${fld(t('remedy'), area('remedy', f.remedy))}${fld(t('further'), area('further', f.further))}${fld(t('prevention'), area('prevention', f.prevention))}
            <label class="fs-chk"><input type="checkbox" data-ff="close" ${f.close ? 'checked' : ''}> ${esc(t('closeIt'))}</label>${f.close ? fld(t('verification'), area('verification', f.verification), 1) : ''}
            ${fld(t('by'), inp('by', f.by), 1)}<div class="row"><button type="button" class="btn primary" data-fact="ccupsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>` : ''}
        ${vd ? `<div class="fs-box">${fld(t('voidReason'), area('reason', f.reason), 1)}${fld(t('name'), inp('by', f.by), 1)}<div class="row"><button type="button" class="btn primary" data-fact="ccvoidsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>` : ''}
        ${st.form ? '' : `<div class="row">${x.open ? `<button type="button" class="btn small primary" data-fact="ccup" data-v="${esc(x.uid)}">${esc(t('followUp'))}</button>` : ''}<button type="button" class="btn small" data-fact="ccvoid" data-v="${esc(x.uid)}">${esc(t('voidIt'))}</button></div>`}</div>`;
    };
    return `<section class="card">${form}</section>
      <section class="card"><div class="fs-tabs"><button type="button" class="btn small ${st.ccFilter !== 'all' ? 'primary' : ''}" data-fact="ccfilter" data-v="open">${esc(t('fOpen'))} (${L.filter(x => x.open).length})</button>
        <button type="button" class="btn small ${st.ccFilter === 'all' ? 'primary' : ''}" data-fact="ccfilter" data-v="all">${esc(t('fAll'))} (${L.length})</button></div>
        ${show.map(item).join('') || `<p class="fs-sub">${esc(t('none'))}</p>`}</section>`;
  }
  async function ccSave() {
    const f = st.form;
    // Cliente: lista interna (FMO, FRA) ou externo com nome; sem lista, o nome escrito
    let customer = String(f.customer || '').trim(), customerType = null;
    if (C.customers) {
      const ic = C.customers.find(x => x.id === f.custSel);
      if (ic) { customer = ic.label; customerType = 'internal'; } else if (f.custSel === 'EXT') customerType = 'external'; else customer = '';
    }
    const o = Object.assign({}, f, { customer, customerType });
    if (errs(F.validateComplaint(o))) return;
    await save({ kind: 'complaint', received: f.received, customer, customerType, customerId: C.customers && f.custSel !== 'EXT' ? f.custSel : null, ref: f.ref.trim(), product: f.product.trim(), lot: f.lot.trim().toUpperCase(),
      reason: f.reason, description: f.description.trim(), foodSafety: !!f.foodSafety, owner: f.owner.trim(), due: f.due, by: f.by.trim() });
  }
  async function ccUpSave() {
    const f = st.form, x = F.complaints(st.entries, today()).find(y => y.uid === f.complaintUid);
    const o = { remedy: f.remedy, further: f.further, prevention: f.prevention, status: f.close ? 'closed' : undefined, verification: f.verification, by: f.by };
    if (errs(F.validateComplaintUpd(o, x))) return;
    await save({ kind: 'complaintUpd', complaintUid: f.complaintUid, complaintId: x.id, remedy: String(f.remedy).trim(), further: String(f.further).trim(),
      prevention: String(f.prevention).trim(), status: f.close ? 'closed' : null, verification: f.close ? String(f.verification).trim() : '', by: String(f.by).trim() });
  }

  // ----- histórico -----
  function vHist() {
    const closes = {};
    F.effective(st.entries).filter(e => e.kind === 'close' || e.kind === 'reopen').forEach(e => { closes[e.month] = e; });
    const M = Object.keys(closes).sort().reverse().filter(m => closes[m].kind === 'close').slice(0, 12);
    if (!M.length) return `<section class="card"><p class="fs-sub">${esc(t('histNone'))}</p></section>`;
    return `<section class="card"><h3>${esc(t('t_hist'))}</h3>${M.map(m => { const c = closes[m], k = c.counts || {};
      return `<div class="fs-hist"><b>${esc(m)}</b><div class="fs-bar"><div class="${BAND_CLS[c.band] || ''}" style="width:${Math.max(0, Math.min(100, c.score || 0))}%"></div></div><b>${esc(nf(c.score))} %</b></div>
        <div class="fs-sub">${esc(t('counts', { c: k.C || 0, mi: k.MI || 0, ma: k.MA || 0, cr: k.CR || 0, na: k.NA || 0 }))} · ${esc(t('docs'))} ${esc(nf(c.docPct))} % · ${esc(c.by)}</div>`; }).join('')}</section>`;
  }

  // ---------- eventos ----------
  const op = () => C.operator() || '';
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-fact]'); if (!el) return;
    const a = el.dataset.fact, v = el.dataset.v;
    if (a === 'tab') { st.tab = v; st.form = null; keep(); return; }
    if (a === 'cancel') { st.form = null; keep(); return; }
    if (a === 'grade') {
      const g = F.grades(st.entries, month())[el.dataset.req];
      if (v === 'C' && !(g && g.grade === 'C')) return save({ kind: 'grade', month: month(), reqId: el.dataset.req, ref: (Q.REQS.find(x => x.id === el.dataset.req) || {}).ref, grade: 'C', evidence: '', action: '', owner: '', due: '', by: op() || '—' });
      st.form = { kind: 'grade', month: month(), reqId: el.dataset.req, grade: v, evidence: g && g.grade === v ? g.evidence || '' : '', action: '', owner: '', due: '', by: op() };
      keep(); return;
    }
    if (a === 'gradesave') return gradeSave();
    if (a === 'close') { st.form = { kind: 'close', by: op(), pin: '' }; keep(); return; }
    if (a === 'reopen') { st.form = { kind: 'reopen', by: op(), pin: '', reason: '' }; keep(); return; }
    if (a === 'closesave') return closeSave(false);
    if (a === 'reopensave') return closeSave(true);
    if (a === 'newdoc') { st.form = { kind: 'doc', code: '', title: '', version: '1', status: 'approved', owner: '', approvedOn: today(), reviewMonths: '12', location: '', reqIds: [], by: op() }; keep(); return; }
    if (a === 'docver') { const d = F.docs(st.entries, today()).find(x => x.code === v); if (d) { const o = d.doc; st.form = { kind: 'doc', code: d.code, title: o.title, version: '', status: 'approved', owner: o.owner || '', approvedOn: today(), reviewMonths: String(o.reviewMonths || 12), location: o.location || '', reqIds: (o.reqIds || []).slice(), by: op() }; keep(); } return; }
    if (a === 'docsave') return docSave();
    if (a === 'done') { st.form = { kind: 'actionDone', gradeUid: v, note: '', by: op() }; keep(); return; }
    if (a === 'ccnew') { const d = today(); st.form = { kind: 'complaint', received: d, custSel: '', customer: '', ref: '', product: '', lot: '', reason: '', description: '', foodSafety: false, owner: op(), due: new Date(Date.parse(d) + 7 * 86400000).toISOString().slice(0, 10), by: op() }; keep(); return; }   // prazo por defeito: 7 dias (proposta FMIP)
    if (a === 'ccsave') return ccSave();
    if (a === 'ccup') { st.form = { kind: 'complaintUpd', complaintUid: v, remedy: '', further: '', prevention: '', close: false, verification: '', by: op() }; keep(); return; }
    if (a === 'ccupsave') return ccUpSave();
    if (a === 'ccfilter') { st.ccFilter = v; keep(); return; }
    if (a === 'ccvoid') { st.form = { kind: 'ccvoid', uid: v, reason: '', by: op() }; keep(); return; }
    if (a === 'ccvoidsave') { const f = st.form; if (!String(f.reason).trim() || !String(f.by).trim()) return C.toast(t('fill') + ': ' + t('voidReason') + ', ' + t('name')); return save({ kind: 'void', voids: f.uid, reason: f.reason.trim(), by: f.by.trim() }); }
    if (a === 'donesave') { const f = st.form; if (!String(f.note).trim() || !String(f.by).trim()) return C.toast(t('fill') + ': ' + t('note') + ', ' + t('name')); return save({ kind: 'actionDone', gradeUid: f.gradeUid, note: f.note.trim(), by: f.by.trim() }); }
  });
  document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.ff !== undefined && st.form && el.type !== 'checkbox') st.form[el.dataset.ff] = el.value; });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset && el.dataset.ff !== undefined && st.form) { st.form[el.dataset.ff] = el.type === 'checkbox' ? el.checked : el.value; if (el.tagName === 'SELECT' || el.dataset.ff === 'close') keep(); return; }
    if (el.dataset && el.dataset.freq && st.form && st.form.reqIds) { const id = el.dataset.freq, i = st.form.reqIds.indexOf(id); if (el.checked && i < 0) st.form.reqIds.push(id); if (!el.checked && i >= 0) st.form.reqIds.splice(i, 1); return; }
    if (el.id === 'fsMonth' && /^\d{4}-\d{2}$/.test(el.value)) { st.month = el.value; st.form = null; keep(); }
  });
  document.addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.fsec) st.open[d.dataset.fsec] = d.open; }, true);

  if (!document.getElementById('fs-css')) {
    const s = document.createElement('style'); s.id = 'fs-css';
    s.textContent = '.fs-tabs,.fs-grades{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.fs-f{display:block;font-size:13px;color:#5b6a60;margin:6px 0}.fs-req{font-weight:600}' +
      '.fs-f input,.fs-f select,.fs-f textarea{display:block;width:100%;min-width:0;margin-top:3px;font:inherit;font-size:16px;padding:9px 10px;border:1px solid #c9d2c8;border-radius:9px;background:#fff;color:#16211a;box-sizing:border-box}' +
      '.fs-box{background:#f6f7f4;border:1px solid #dde3dc;border-radius:10px;padding:10px;margin:8px 0}.fs-item{border-bottom:1px solid #dde3dc;padding:9px 0}.fs-item:last-child{border-bottom:0}' +
      '.fs-sub{color:#5b6a60;font-size:13px;margin:3px 0}.fs-c{display:inline-block;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:600;background:#e2e8f0;color:#475569;margin:2px}' +
      '.fs-ok{background:#dcfce7;color:#15803d}.fs-warn{background:#fef3c7;color:#b45309}.fs-bad{background:#fee2e2;color:#b91c1c}.fs-late{border-left:4px solid #b91c1c;padding-left:8px}' +
      '.fs-bn{border-radius:10px;padding:10px 12px;margin:0 0 10px;font-weight:600}.fs-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;text-align:center;margin:6px 0}' +
      '.fs-kpi div{background:#f6f7f4;border-radius:10px;padding:8px 4px}.fs-kpi b{display:block;font-size:20px}.fs-kpi span{font-size:11px;color:#5b6a60}' +
      '.fs-reqs{max-height:260px;overflow:auto;border:1px solid #dde3dc;border-radius:8px;padding:4px}.fs-chk{display:flex;gap:6px;align-items:flex-start;font-size:13px;padding:4px 2px}.fs-chk input{margin-top:2px}' +
      '.fs-hist{display:grid;grid-template-columns:70px 1fr 64px;gap:8px;align-items:center;margin-top:8px}.fs-bar{height:12px;background:#eef1ec;border-radius:6px;overflow:hidden}.fs-bar div{height:100%;background:#15803d}' +
      '.fs-bar div.fs-warn{background:#d97706}.fs-bar div.fs-bad{background:#b91c1c}' +
      '.fs-cc{display:grid;gap:4px;margin:6px 0}.fs-cc div{background:#f6f7f4;border-radius:8px;padding:6px 8px;font-size:13px}.fs-cc b{display:block;font-size:12px;color:#5b6a60}';
    document.head.appendChild(s);
  }
  return { view, reload, warnings, warnText, t };
};
