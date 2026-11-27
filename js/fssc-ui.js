/* Conformidade FSSC 22000 — interface. Ficheiro igual na Prodn-Mgt e na Grain-Mgt; regras em js/fssc.js, requisitos em js/fssc-reqs.js.
 * Criada pela app com FsscUI(C):
 *   C.lang() · C.esc(v) · C.toast(msg) · C.render() · C.load() -> Promise<[registos 'fssc']> · C.add(rec) -> Promise
 *   C.area 'mill' (Prodn-Mgt) | 'grain' (Grain-Mgt) · C.operator() · C.pin(pin) -> Promise<{ok, msg}> (PIN de supervisor da app)
 *   C.complaints (reclamações de clientes) · C.products() nomes dos produtos (sugestões) · C.lots() lotes da app (sugestões)
 *   C.customers [{id, label}] clientes internos (Grain-Mgt: FMO, FRA); sem lista = cliente escrito à mão (externo)
 *   C.who(pin) (opcional; Moagem de Milho 2.17.0): sem nomes — só o PIN; grava o título da função. C.roleTitles(): responsáveis possíveis
 * Eventos próprios (data-fact, data-ff); não usa os atributos das apps. */
window.FsscUI = function (C) {
  'use strict';
  const F = window.Fssc, Q = window.FsscReqs, esc = C.esc;
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const st = { tab: 'mtd', month: null, entries: [], loaded: false, form: null, open: {} };
  const T = {
    pt: {
      t_training: 'Formação', trTitle: 'Formação e competências', trNew: 'Nova formação prevista', trDate: 'Data', trTime: 'Hora', trTopic: 'Tema', trTrainer: 'Formador', trAudience: 'Para quem (função, turma, secção)', trExpected: 'N.º de participantes previsto', trNotes: 'Notas', trUpcoming: 'Próximas formações', trOverdue: 'Previstas e ainda sem presenças', trHeld: 'Formações feitas', trAtt: 'Registar presenças', trHeldOn: 'Feita em', trAttendees: 'Presentes (um nome por linha)', trPresent: '{n} presente(s)', trOf: 'de {n} previstos', trMonth: 'Este mês: {p} prevista(s) · {h} feita(s) · {n} presença(s){a}', trPct: ' · presença {p} %', w_training_overdue: 'Formação sem presenças registadas — {t} ({d})', 
      // v2.21.0 (Zhax, 26-11-2026)
      planned: 'Planeado', done: 'Feito', t_mtd: 'MTD', t_actions: 'Acções em aberto', t_complaints: 'Reclamações de clientes', t_training: 'Formação', ytdTitle: 'Ano até à data', ytdAvg: 'Média dos meses fechados', monthsClosed: 'Meses fechados', monthNow: 'Mês actual',
      planDone: 'Planeado e feito no mês', pd_reqs: 'Requisitos avaliados', pd_actions: 'Acções com prazo no mês', pd_training: 'Formações', pd_daily: '% feito (logouts do dia)', partial: 'parcial',
      oaLogin: 'Login do dia', oaLogout: 'Logout do dia', oaLoginBtn: 'Fazer login', oaLogoutBtn: 'Fazer logout', oaPlanned: 'Planeado para o dia', oaAddItem: 'Mais uma tarefa', oaPickActions: 'Acções em aberto a tratar hoje',
      oaNeeds: 'Necessidades', manpower: 'Mão-de-obra (n.º de pessoas)', supSupport: 'Apoio do supervisor', supYes: 'Sim', supNo: 'Não', consumables: 'Consumíveis',
      cleanMat: 'Materiais de limpeza em stock', material: 'Material', unit: 'Unidade', inStock: 'Em stock', minStock: 'Mínimo', adequacy: '% adequação', matAdd: 'Mais um material',
      pctDone: '% feito', comments: 'Comentários', readOnly: 'Só leitura.', noItems: 'Nada planeado no login.', loginSaved: 'Login gravado', logoutSaved: 'Logout gravado',
      kOpen: 'Em aberto', kOverdue: 'Em atraso', kFs: 'Segurança alimentar', kClosedM: 'Fechadas no mês', trPlannedM: 'Planeadas no mês', trHeldM: 'Dadas no mês', trPeople: 'Pessoas formadas', trAttPct: 'Presença',
      docsMore: 'Documentos (revisão e cobertura)',
      title: 'Conformidade FSSC 22000', t_month: 'Avaliação mensal', t_docs: 'Documentos', t_hist: 'Histórico',
      month: 'Mês', score: 'Pontuação', docs: 'Documentação', graded: 'avaliados', closed: 'Mês fechado', open: 'Mês aberto', closeMonth: 'Fechar mês',
      reopen: 'Reabrir mês', needAll: 'Avalie todos os requisitos aplicáveis antes de fechar o mês.', pin: 'PIN de supervisor', name: 'Nome', reason: 'Motivo',
      save: 'Gravar', cancel: 'Cancelar', saved: 'Gravado.', fail: 'Não foi possível gravar.', fill: 'Falta ou inválido', loading: 'A carregar…', none: 'Sem registos.',
      g_C: 'Conforme', g_MI: 'NC menor', g_MA: 'NC maior', g_CR: 'NC crítica', g_NA: 'N/A', notGraded: 'por avaliar',
      evidence: 'Evidência / justificação', action: 'Acção correctiva', owner: 'Responsável', due: 'Prazo', by: 'Avaliado por',
      b_good: 'Bom (≥ 90 %)', b_fair: 'Atenção (75–89 %)', b_poor: 'Insuficiente (< 75 %)', b_critical: 'NC crítica — limitado a 49 %',
      rules: 'Uma NC maior limita a pontuação a 89 %; uma NC crítica a 49 %. N/A não conta. Fecho com PIN de supervisor até ao dia 10 do mês seguinte.',
      area_mill: 'Área: moagem (Moagem de Milho)', area_grain: 'Área: recepção e silos (Silo Cereais)', closedBy: 'Fechado por', reopenedBy: 'Reaberto por',
      newDoc: 'Novo documento / nova versão', code: 'Código', docTitle: 'Título', version: 'Versão', status: 'Estado', s_approved: 'Aprovado', s_draft: 'Em elaboração', s_withdrawn: 'Retirado',
      approvedOn: 'Data de aprovação', reviewMonths: 'Revisão a cada (meses)', location: 'Onde está (pasta, ficheiro, arquivo)', reqIds: 'Requisitos que cumpre', nextReview: 'Próxima revisão',
      d_ok: 'Em dia', d_overdue: 'Revisão em atraso', d_draft: 'Em elaboração', d_missing: 'Sem documento', d_withdrawn: 'Retirado', coverage: 'Cobertura documental', edit: 'Nova versão',
      openActions: 'Acções em aberto', doneActions: 'Concluídas', complete: 'Concluir', note: 'Nota', overdue: 'em atraso', daysLate: '{n} dia(s)',
      histNone: 'Ainda não há meses fechados.', counts: 'C {c} · menor {mi} · maior {ma} · crítica {cr} · N/A {na}',
      w_month_open: 'FSSC: avaliação de {m} por fechar', w_action_overdue: 'FSSC: acção em atraso — {r} ({g}, prazo {d})', w_doc_review: 'FSSC: revisão em atraso — {c} {t}', w_month_critical: 'FSSC: {n} NC crítica(s) em {m}',
      reqDoc: 'exige documento', naHint: 'Pode ser N/A',
      newComplaint: 'Nova reclamação de cliente', received: 'Recebida em', customer: 'Cliente', ref: 'Referência do cliente / contacto', product: 'Produto', lot: 'Lote nº',
      reason: 'Motivo', description: 'Descrição da reclamação', foodSafety: 'Afecta a segurança alimentar', remedy: 'Correcção (remédio ao cliente)', further: 'Acção adicional (investigação, causa)',
      prevention: 'Prevenção da repetição', verification: 'Verificação da eficácia', followUp: 'Seguimento', closeIt: 'Fechar a reclamação', c_open: 'Aberta', c_closed: 'Fechada',
      daysOpen: '{n} dia(s)', fOpen: 'Abertas', fAll: 'Todas', fsChip: 'Segurança alimentar', voidIt: 'Anular registo', voidReason: 'Motivo da anulação', closedOn: 'Fechada em', recBy: 'Registada por',
      cr_foreign: 'Corpo estranho', cr_infestation: 'Infestação / insectos', cr_quality: 'Qualidade (cor, granulometria)', cr_moisture: 'Humidade / bolor', cr_weight: 'Peso / quantidade',
      cr_mixed: 'Cereal, cor ou grau errado', custType: 'Cliente', ct_internal: 'Interno', ct_external: 'Externo', extName: 'Nome do cliente externo (outra moagem)', extOpt: 'Externo — outra moagem',
      cr_packaging: 'Embalagem', cr_labelling: 'Rotulagem', cr_allergen: 'Alergénio', cr_taste: 'Sabor / cheiro', cr_other: 'Outro',
      w_complaint_fs: 'Reclamação {id} ({c}) afecta a segurança alimentar — em aberto', w_complaint_overdue: 'Reclamação {id} ({c}) em atraso (prazo {d})'
    },
    en: {
      t_training: 'Training', trTitle: 'Training and skills', trNew: 'New planned training', trDate: 'Date', trTime: 'Time', trTopic: 'Topic', trTrainer: 'Trainer', trAudience: 'For whom (role, crew, section)', trExpected: 'Expected number of participants', trNotes: 'Notes', trUpcoming: 'Upcoming trainings', trOverdue: 'Planned, no attendance yet', trHeld: 'Trainings held', trAtt: 'Record attendance', trHeldOn: 'Held on', trAttendees: 'Present (one name per line)', trPresent: '{n} present', trOf: 'of {n} expected', trMonth: 'This month: {p} planned · {h} held · {n} attendance(s){a}', trPct: ' · attendance {p} %', w_training_overdue: 'Training with no attendance recorded — {t} ({d})', 
      // v2.21.0 (Zhax, 26-11-2026)
      planned: 'Planned', done: 'Done', t_mtd: 'MTD', t_actions: 'Open Actions', t_complaints: 'Customer Complaints', t_training: 'Training', ytdTitle: 'Year to date', ytdAvg: 'Average of closed months', monthsClosed: 'Months closed', monthNow: 'Current month',
      planDone: 'Planned and done this month', pd_reqs: 'Requirements graded', pd_actions: 'Actions due this month', pd_training: 'Trainings', pd_daily: '% done (daily logouts)', partial: 'partial',
      oaLogin: 'Day login', oaLogout: 'Day logout', oaLoginBtn: 'Log in', oaLogoutBtn: 'Log out', oaPlanned: 'Planned for the day', oaAddItem: 'One more task', oaPickActions: 'Open actions to work on today',
      oaNeeds: 'Requirements', manpower: 'Manpower (no. of people)', supSupport: 'Supervisor support', supYes: 'Yes', supNo: 'No', consumables: 'Consumables',
      cleanMat: 'Cleaning materials in stock', material: 'Material', unit: 'Unit', inStock: 'In stock', minStock: 'Minimum', adequacy: '% adequacy', matAdd: 'One more material',
      pctDone: '% done', comments: 'Comments', readOnly: 'Read only.', noItems: 'Nothing planned at login.', loginSaved: 'Login saved', logoutSaved: 'Logout saved',
      kOpen: 'Open', kOverdue: 'Overdue', kFs: 'Food safety', kClosedM: 'Closed this month', trPlannedM: 'Planned this month', trHeldM: 'Held this month', trPeople: 'People trained', trAttPct: 'Attendance',
      docsMore: 'Documents (review and coverage)',
      title: 'FSSC 22000 compliance', t_month: 'Monthly check', t_docs: 'Documents', t_hist: 'History',
      month: 'Month', score: 'Score', docs: 'Documentation', graded: 'graded', closed: 'Month closed', open: 'Month open', closeMonth: 'Close month',
      reopen: 'Reopen month', needAll: 'Grade every applicable requirement before closing the month.', pin: 'Supervisor PIN', name: 'Name', reason: 'Reason',
      save: 'Save', cancel: 'Cancel', saved: 'Saved.', fail: 'Could not save.', fill: 'Missing or invalid', loading: 'Loading…', none: 'No records.',
      g_C: 'Compliant', g_MI: 'Minor NC', g_MA: 'Major NC', g_CR: 'Critical NC', g_NA: 'N/A', notGraded: 'not graded',
      evidence: 'Evidence / justification', action: 'Corrective action', owner: 'Owner', due: 'Due date', by: 'Graded by',
      b_good: 'Good (≥ 90 %)', b_fair: 'Attention (75–89 %)', b_poor: 'Insufficient (< 75 %)', b_critical: 'Critical NC — capped at 49 %',
      rules: 'A major NC caps the score at 89 %; a critical NC at 49 %. N/A is not counted. Closed with the supervisor PIN by the 10th of the next month.',
      area_mill: 'Area: mill (Maize Mill)', area_grain: 'Area: intake and silos (Grain Silos)', closedBy: 'Closed by', reopenedBy: 'Reopened by',
      newDoc: 'New document / new version', code: 'Code', docTitle: 'Title', version: 'Version', status: 'Status', s_approved: 'Approved', s_draft: 'Draft', s_withdrawn: 'Withdrawn',
      approvedOn: 'Approval date', reviewMonths: 'Review every (months)', location: 'Where it is (folder, file, archive)', reqIds: 'Requirements it covers', nextReview: 'Next review',
      d_ok: 'In date', d_overdue: 'Review overdue', d_draft: 'Draft', d_missing: 'No document', d_withdrawn: 'Withdrawn', coverage: 'Document coverage', edit: 'New version',
      openActions: 'Open actions', doneActions: 'Completed', complete: 'Complete', note: 'Note', overdue: 'overdue', daysLate: '{n} day(s)',
      histNone: 'No closed months yet.', counts: 'C {c} · minor {mi} · major {ma} · critical {cr} · N/A {na}',
      w_month_open: 'FSSC: {m} check not closed', w_action_overdue: 'FSSC: action overdue — {r} ({g}, due {d})', w_doc_review: 'FSSC: review overdue — {c} {t}', w_month_critical: 'FSSC: {n} critical NC(s) in {m}',
      reqDoc: 'needs a document', naHint: 'May be N/A',
      newComplaint: 'New customer complaint', received: 'Received on', customer: 'Customer', ref: 'Customer reference / contact', product: 'Product', lot: 'Lot no.',
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
  // v2.17.0 / v0.20.0: com C.who pede-se só o PIN (nome = título da função); responsável escolhido da lista de funções
  const byF = (f, lab) => C.who ? fld(t('pin'), `<input type="password" maxlength="4" autocomplete="off" data-ff="whopin" value="">`, 1) : fld(t(lab || 'by'), inp('by', f.by), 1);
  const ownerF = f => C.roleTitles ? fld(t('owner'), `<select data-ff="owner"><option value="">—</option>${C.roleTitles().map(x => `<option ${x === f.owner ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`, 1) : ownerF(f);
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
    if (w.type === 'training_overdue') return t('w_training_overdue', { t: w.topic, d: ddmm(w.date) });
    return t('w_month_critical', { n: w.n, m: w.month });
  }

  // ---------- vista ----------
  function view() {
    if (!st.loaded) { reload().then(C.render); return `<section class="card"><p>${esc(t('loading'))}</p></section>`; }
    // v2.21.0 (Zhax, 26-11-2026): MTD | Acções em aberto | Reclamações de clientes | Formação (documentos e histórico dentro do MTD)
    if (['month', 'docs', 'hist'].indexOf(st.tab) >= 0) st.tab = 'mtd';
    const tabs = ['mtd', 'actions'].concat(C.complaints ? ['complaints'] : []).concat(C.training ? ['training'] : []);
    // v2.25.0 (Zhax, 26-11-2026): sem a descrição da certificação no topo
    const head = `<section class="card"><h2>${esc(t('title'))}</h2>
      <div class="fs-tabs">${tabs.map(k => `<button type="button" class="btn small ${st.tab === k ? 'primary' : ''}" data-fact="tab" data-v="${k}">${esc(t('t_' + k))}</button>`).join('')}</div></section>`;
    const bn = warnings().map(w => `<div class="fs-bn ${w.level === 'bad' ? 'fs-bad' : 'fs-warn'}">✔ ${esc(warnText(w))}</div>`).join('');
    return bn + head + ({ mtd: vMtd, actions: () => vOpen() + vActions(), complaints: vComplaints, training: vTraining }[st.tab] || vMtd)();
  }

  // ===== v2.21.0: layout igual nos quatro separadores — cartão com título, 4 indicadores e o botão (ou formulário), depois as listas =====
  const kpi4 = list => `<div class="fs-kpi">${list.map(([v, lab, cls]) => `<div class="${cls || ''}"><b>${v === null || v === undefined ? '—' : esc(String(v))}</b><span>${esc(lab)}</span></div>`).join('')}</div>`;
  const pc = v => v === null || v === undefined ? '—' : nf(v) + ' %';
  const headCard = (title, kpis, body) => `<section class="card"><h3>${esc(title)}</h3>${kpi4(kpis)}${body || ''}</section>`;
  // ----- MTD -----
  function vMtd() {
    const Y = F.ytd(st.entries, Q.REQS, C.area, today()), m = F.monthOf(today()), S = F.score(Q.REQS, C.area, F.grades(st.entries, m)), MS = F.monthState(st.entries, m);
    const PD = F.monthPlan(st.entries, Q.REQS, C.area, m, today());
    const ytd = `<section class="card"><h3>${esc(t('ytdTitle'))} · ${esc(m.slice(0, 4))}</h3>${kpi4([[pc(Y.avgClosed), t('ytdAvg')], [Y.nClosed + '/' + Y.months.length, t('monthsClosed')], [pc(S.score), t('monthNow')], [MS.closed ? '✔' : '…', MS.closed ? t('closed') : t('open')]])}
      ${Y.months.map(x => `<div class="fs-hist"><b>${esc(x.month)}</b><div class="fs-bar"><div style="width:${Math.max(0, Math.min(100, x.score || 0))}%"></div></div><b>${pc(x.score)}${x.closed ? '' : ' *'}</b></div>`).join('')}
      <p class="fs-sub">* ${esc(t('partial'))}</p></section>`;
    const plan = `<section class="card"><h3>${esc(t('planDone'))} · ${esc(m)}</h3><table class="mt-t" style="width:100%"><tr><td></td><td><b>${esc(t('planned'))}</b></td><td><b>${esc(t('done'))}</b></td><td><b>%</b></td></tr>
      ${[['pd_reqs', PD.reqs], ['pd_actions', PD.actions], ['pd_training', PD.training]].map(([k, x]) => `<tr><td>${esc(t(k))}</td><td>${x.planned}</td><td>${x.done}</td><td><b>${pc(x.pct)}</b></td></tr>`).join('')}
      <tr><td>${esc(t('pd_daily'))}</td><td colspan="2">${PD.daily.days}</td><td><b>${pc(PD.daily.pct)}</b></td></tr></table></section>`;
    return ytd + plan + vMonth() + `<details class="card"><summary><b>${esc(t('docsMore'))}</b></summary>${vDocs()}</details>`;
  }
  // ----- Acções em aberto: login / logout do dia -----
  function vOpen() {
    const d = today(), D = F.oaDay(st.entries, d), f = st.form, A = F.actions(st.entries, d).filter(a => !a.done);
    const items = li => (li.items || []).map(x => x.label);
    const matTbl = (rows, edit) => `<table class="mt-t" style="width:100%"><tr><td><b>${esc(t('material'))}</b></td><td><b>${esc(t('unit'))}</b></td><td><b>${esc(t('inStock'))}</b></td><td><b>${esc(t('minStock'))}</b></td><td><b>${esc(t('adequacy'))}</b></td></tr>
      ${rows.map((r, i) => { const ad = F.adequacy(r.stock, r.min); return edit ? `<tr><td><input data-fmat="${i}|name" value="${esc(r.name)}"></td><td><input data-fmat="${i}|unit" value="${esc(r.unit)}" style="max-width:60px"></td>
        <td><input data-fmat="${i}|stock" inputmode="decimal" value="${esc(r.stock)}" style="max-width:70px"></td><td><input data-fmat="${i}|min" inputmode="decimal" value="${esc(r.min)}" style="max-width:70px"></td><td id="fsad_${i}">${pc(ad)}</td></tr>`
        : `<tr><td>${esc(r.name)}</td><td>${esc(r.unit || '')}</td><td>${esc(nf(r.stock))}</td><td>${esc(nf(r.min))}</td><td class="${ad !== null && ad < 100 ? 'fs-warn' : ''}"><b>${pc(ad)}</b></td></tr>`; }).join('') || `<tr><td colspan="5">—</td></tr>`}</table>`;
    let body;
    if (!D.login) {
      body = f && f.kind === 'oaLogin' ? `<div class="fs-box"><h4>${esc(t('oaLogin'))}</h4><div class="fs-req">${esc(t('oaPlanned'))}</div>
          ${f.items.map((x, i) => `<input data-fitem="${i}" value="${esc(x)}" style="width:100%;margin:3px 0">`).join('')}<button type="button" class="btn small" data-fact="oaitem">＋ ${esc(t('oaAddItem'))}</button>
          ${A.length ? `<div class="fs-req">${esc(t('oaPickActions'))}</div>${A.map(a => `<label class="fs-chk"><input type="checkbox" data-fpick="${esc(a.grade.uid)}" ${f.acts.indexOf(a.grade.uid) >= 0 ? 'checked' : ''}> ${esc(a.grade.ref || a.grade.reqId)} → ${esc(a.grade.action)}</label>`).join('')}` : ''}
          <h4>${esc(t('oaNeeds'))}</h4><div class="grid2">${fld(t('manpower'), inp('manpower', f.manpower, 'inputmode="numeric"'))}
          ${fld(t('supSupport'), `<select data-ff="sup"><option value="">—</option>${opt('yes', f.sup, t('supYes'))}${opt('no', f.sup, t('supNo'))}</select>`)}</div>
          ${fld(t('consumables'), area('consumables', f.consumables))}
          <h4>${esc(t('cleanMat'))}</h4><div style="overflow-x:auto">${matTbl(f.mats, true)}</div><button type="button" class="btn small" data-fact="oamat">＋ ${esc(t('matAdd'))}</button>
          ${byF(f)}<div class="row"><button type="button" class="btn primary" data-fact="oainsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`
        : (st.form ? '' : `<button type="button" class="btn primary" data-fact="oain">${esc(t('oaLoginBtn'))}</button>`);
    } else {
      const li = D.login, lo = D.logout;
      body = `<div class="fs-box"><h4>${esc(t('oaLogin'))} · ${esc(li.time || '')} · ${esc(li.by || '')}</h4><div><b>${esc(t('oaPlanned'))}:</b> ${esc(items(li).join(' | ') || '—')}</div>
          <div class="fs-sub">${esc(t('manpower'))}: ${esc(nf(li.manpower))} · ${esc(t('supSupport'))}: ${esc(li.sup === 'yes' ? t('supYes') : li.sup === 'no' ? t('supNo') : '—')}${li.consumables ? ' · ' + esc(t('consumables')) + ': ' + esc(li.consumables) : ''}</div>
          <h4>${esc(t('cleanMat'))}</h4><div style="overflow-x:auto">${matTbl(li.mats || [], false)}</div></div>` +
        (lo ? `<div class="fs-box"><h4>${esc(t('oaLogout'))} · ${esc(lo.time || '')} · ${esc(lo.by || '')}</h4>${(lo.items || []).map(x => `<div>${esc(x.label)}: <b>${esc(nf(x.pct))} %</b></div>`).join('') || `<p class="fs-sub">${esc(t('noItems'))}</p>`}${lo.comments ? `<div>${esc(lo.comments)}</div>` : ''}<p class="fs-sub">${esc(t('readOnly'))}</p></div>`
          : f && f.kind === 'oaLogout' ? `<div class="fs-box"><h4>${esc(t('oaLogout'))}</h4>${items(li).map((x, i) => `<div class="row" style="justify-content:space-between"><span>${esc(x)}</span><input data-fpct="${i}" inputmode="decimal" placeholder="0–100" style="max-width:80px" value="${esc(f.pcts[i] || '')}"></div>`).join('') || `<p class="fs-sub">${esc(t('noItems'))}</p>`}
              ${fld(t('comments'), area('comments', f.comments))}${byF(f)}<div class="row"><button type="button" class="btn primary" data-fact="oaoutsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`
          : (st.form ? '' : `<button type="button" class="btn" data-fact="oaout">${esc(t('oaLogoutBtn'))}</button>`));
    }
    const ov = A.filter(a => a.overdue).length;
    return headCard(t('t_actions') + ' · ' + ddmm(d), [[A.length, t('kOpen')], [ov, t('kOverdue'), ov ? 'fs-bad' : ''], [D.login ? '✔' : '…', t('oaLogin')], [D.logout ? '✔' : '…', t('oaLogout')]], body);
  }
  async function oaInSave() {
    const f = st.form, A = F.actions(st.entries, today());
    const picked = A.filter(a => f.acts.indexOf(a.grade.uid) >= 0).map(a => ({ label: (a.grade.ref || a.grade.reqId) + ' → ' + a.grade.action, gradeUid: a.grade.uid }));
    const items = f.items.map(x => String(x || '').trim()).filter(Boolean).map(x => ({ label: x })).concat(picked);
    const mp = String(f.manpower || '').trim() === '' ? null : Number(f.manpower);
    if (mp !== null && (!isFinite(mp) || mp < 0 || Math.round(mp) !== mp)) return errs(['manpower']);
    const mats = f.mats.filter(r => String(r.name || '').trim()).map(r => ({ name: String(r.name).trim(), unit: String(r.unit || '').trim(), stock: r.stock, min: r.min, pct: F.adequacy(r.stock, r.min) }));
    return save({ kind: 'oaLogin', day: today(), items, manpower: mp, sup: f.sup || '', consumables: String(f.consumables || '').trim(), mats, by: f.by }, t('loginSaved'));
  }
  async function oaOutSave() {
    const f = st.form, D = F.oaDay(st.entries, today());
    if (!D.login) return;
    const L0 = D.login.items || [], pcts = L0.map((x, i) => f.pcts[i]);
    if (pcts.some(p => { const v = Number(String(p || '').replace(',', '.')); return String(p || '').trim() === '' || !isFinite(v) || v < 0 || v > 100; })) return errs(['pctDone']);
    return save({ kind: 'oaLogout', day: today(), loginUid: D.login.uid, items: L0.map((x, i) => ({ label: x.label, pct: Number(String(pcts[i]).replace(',', '.')) })), comments: String(f.comments || '').trim(), by: f.by }, t('logoutSaved'));
  }

  // ----- avaliação mensal -----
  function vMonth() {
    const m = month(), G = F.grades(st.entries, m), S = F.score(Q.REQS, C.area, G), MS = F.monthState(st.entries, m);
    const cov = F.docCoverage(Q.REQS, C.area, st.entries, today());
    const f = st.form;
    const closeBox = f && (f.kind === 'close' || f.kind === 'reopen') ? `<div class="fs-box">${f.kind === 'reopen' ? fld(t('reason'), area('reason', f.reason), 1) : ''}
        ${C.who ? '' : byF(f, 'name')}${fld(t('pin'), `<input type="password" maxlength="4" data-ff="pin" value="">`, 1)}
        <div class="row"><button type="button" class="btn primary" data-fact="${f.kind === 'close' ? 'closesave' : 'reopensave'}">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>` : '';
    const last = MS.history[MS.history.length - 1];
    let h = `<section class="card"><div class="row">${fld(t('month'), `<input type="month" id="fsMonth" value="${esc(m)}">`)}</div>
      <div class="fs-kpi"><div class="${BAND_CLS[S.band] || ''}"><b>${S.score === null ? '—' : esc(nf(S.score)) + ' %'}</b><span>${esc(t('score'))}</span></div>
        <div><b>${S.graded}/${S.applicable}</b><span>${esc(t('graded'))}</span></div>
        <div class="${cov.pct !== null && cov.pct < 100 ? 'fs-warn' : 'fs-ok'}"><b>${cov.pct === null ? '—' : esc(nf(cov.pct)) + ' %'}</b><span>${esc(t('docs'))}</span></div>
        <div class="${MS.closed ? 'fs-ok' : ''}"><b>${MS.closed ? '✔' : '…'}</b><span>${esc(MS.closed ? t('closed') : t('open'))}</span></div></div>
      ${S.band ? `<p class="fs-sub"><span class="fs-c ${BAND_CLS[S.band]}">${esc(t('b_' + S.band))}</span> ${esc(t('counts', { c: S.counts.C, mi: S.counts.MI, ma: S.counts.MA, cr: S.counts.CR, na: S.counts.NA }))}</p>` : ''}
      ${last ? `<p class="fs-sub">${esc(last.kind === 'close' ? t('closedBy') : t('reopenedBy'))} ${esc(last.by)} · ${esc(ddmm(last.date))} ${esc(last.time || '')}${last.reason ? ' — ' + esc(last.reason) : ''}</p>` : ''}
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
        ${nc ? `${fld(t('action'), area('action', f.action), 1)}<div class="grid2">${ownerF(f)}${fld(t('due'), inp('due', f.due, 'type="date"'), 1)}</div>` : ''}
        ${byF(f, 'by')}<div class="row"><button type="button" class="btn primary" data-fact="gradesave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`;
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
        <div class="grid2">${fld(t('status'), `<select data-ff="status">${F.DOC_STATUS.map(s => opt(s, f.status, t('s_' + s))).join('')}</select>`, 1)}${ownerF(f)}
        ${fld(t('approvedOn'), inp('approvedOn', f.approvedOn, 'type="date"'))}${fld(t('reviewMonths'), inp('reviewMonths', f.reviewMonths, 'inputmode="numeric"'))}</div>
        ${fld(t('location'), inp('location', f.location))}
        <details open><summary class="fs-sub">${esc(t('reqIds'))} (${f.reqIds.length})</summary><div class="fs-reqs">${docReqs.map(r => `<label class="fs-chk"><input type="checkbox" data-freq="${esc(r.id)}" ${f.reqIds.indexOf(r.id) >= 0 ? 'checked' : ''}> <b>${esc(r.ref)}</b> ${esc(reqTitle(r))}</label>`).join('')}</div></details>
        ${byF(f, 'by')}<div class="row"><button type="button" class="btn primary" data-fact="docsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`
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
        ${a.done ? '' : (f && f.gradeUid === g.uid ? `<div class="fs-box">${fld(t('note'), area('note', f.note), 1)}${byF(f, 'name')}<div class="row"><button type="button" class="btn primary" data-fact="donesave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`
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
        <div class="grid2">${ownerF(nf_)}${fld(t('due'), inp('due', nf_.due, 'type="date"'), 1)}</div>${byF(nf_)}
        <datalist id="fsLots">${lots.map(x => `<option value="${esc(x)}">`).join('')}</datalist><datalist id="fsProds">${prods.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
        <div class="row"><button type="button" class="btn primary" data-fact="ccsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`
      : (st.form ? '' : `<button type="button" class="btn primary" data-fact="ccnew">＋ ${esc(t('newComplaint'))}</button>`);
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
            ${byF(f, 'by')}<div class="row"><button type="button" class="btn primary" data-fact="ccupsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>` : ''}
        ${vd ? `<div class="fs-box">${fld(t('voidReason'), area('reason', f.reason), 1)}${byF(f, 'name')}<div class="row"><button type="button" class="btn primary" data-fact="ccvoidsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>` : ''}
        ${st.form ? '' : `<div class="row">${x.open ? `<button type="button" class="btn small primary" data-fact="ccup" data-v="${esc(x.uid)}">${esc(t('followUp'))}</button>` : ''}<button type="button" class="btn small" data-fact="ccvoid" data-v="${esc(x.uid)}">${esc(t('voidIt'))}</button></div>`}</div>`;
    };
    const mo = today().slice(0, 7), op = L.filter(x => x.open);
    return headCard(t('t_complaints'), [[op.length, t('kOpen')], [op.filter(x => x.overdue).length, t('kOverdue'), op.some(x => x.overdue) ? 'fs-bad' : ''], [op.filter(x => x.complaint.foodSafety).length, t('kFs'), op.some(x => x.complaint.foodSafety) ? 'fs-bad' : ''],
        [L.filter(x => !x.open && String(x.closedOn || '').slice(0, 7) === mo).length, t('kClosedM')]], form) + `
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

  // ----- formação (C.training) -----
  function vTraining() {
    const L = F.trainings(st.entries, today()), f = st.form, mo = today().slice(0, 7), M = F.trainingMonth(L, mo);
    const newForm = f && f.kind === 'training' ? `<div class="fs-box"><div class="grid2">${fld(t('trDate'), inp('date', f.date, 'type="date"'), 1)}${fld(t('trTime'), inp('time', f.time, 'type="time"'))}</div>
        ${fld(t('trTopic'), inp('topic', f.topic), 1)}${fld(t('trTrainer'), inp('trainer', f.trainer))}${fld(t('trAudience'), inp('audience', f.audience))}
        ${fld(t('trExpected'), inp('expected', f.expected, 'inputmode="numeric"'))}${fld(t('trNotes'), area('notes', f.notes))}${byF(f, 'name')}
        <div class="row"><button type="button" class="btn primary" data-fact="trsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`
      : (st.form ? '' : `<button type="button" class="btn primary" data-fact="trnew">＋ ${esc(t('trNew'))}</button>`);
    const head = x => `<b>${esc(ddmm(x.training.date))}${x.training.time ? ' ' + esc(x.training.time) : ''} · ${esc(x.training.topic)}</b>
      <div class="fs-sub">${[x.training.trainer, x.training.audience].filter(Boolean).map(esc).join(' · ')}${x.training.expected ? ' · ' + esc(t('trExpected')) + ' ' + esc(x.training.expected) : ''}</div>${x.training.notes ? `<div class="fs-sub">${esc(x.training.notes)}</div>` : ''}`;
    const attForm = x => f && f.kind === 'trainingAtt' && f.trainingUid === x.training.uid ? `<div class="fs-box">${fld(t('trHeldOn'), inp('heldOn', f.heldOn, 'type="date"'), 1)}
        ${fld(t('trAttendees'), `<textarea rows="4" data-ff="attendees">${esc(f.attendees)}</textarea>`, 1)}${fld(t('trNotes'), area('notes', f.notes))}${byF(f, 'name')}
        <div class="row"><button type="button" class="btn primary" data-fact="trattsave">${esc(t('save'))}</button><button type="button" class="btn" data-fact="cancel">${esc(t('cancel'))}</button></div></div>`
      : (st.form ? '' : `<button type="button" class="btn small" data-fact="tratt" data-v="${esc(x.training.uid)}">${esc(t('trAtt'))}</button>`);
    const sec = (ttl, xs, body) => xs.length ? `<section class="card"><h3>${esc(ttl)}</h3>${xs.map(x => `<div class="fs-item">${head(x)}${body(x)}</div>`).join('')}</section>` : '';
    const up = L.filter(x => x.state === 'upcoming'), od = L.filter(x => x.state === 'overdue'), held = L.filter(x => x.state === 'held').reverse();
    return headCard(t('t_training'), [[M.planned, t('trPlannedM')], [M.held, t('trHeldM')], [M.people, t('trPeople')], [pc(M.attendancePct), t('trAttPct')]], newForm) + `
      ${sec(t('trOverdue'), od, attForm)}${sec(t('trUpcoming'), up, attForm)}
      ${sec(t('trHeld'), held, x => `<div class="fs-sub">${esc(t('trHeldOn'))} ${esc(ddmm(x.att.heldOn))} · ${esc(t('trPresent', { n: x.present }))}${x.training.expected ? ' ' + esc(t('trOf', { n: x.training.expected })) : ''}${x.attendancePct == null ? '' : ' (' + esc(nf(x.attendancePct)) + ' %)'} · ${esc(x.att.by)}</div>
        <div class="fs-sub">${(x.att.attendees || []).map(esc).join(', ')}</div>${x.att.notes ? `<div class="fs-sub">${esc(x.att.notes)}</div>` : ''}`)}
      ${L.length ? '' : `<section class="card"><p class="fs-sub">${esc(t('none'))}</p></section>`}`;
  }
  async function trSave() {
    const f = st.form; if (errs(F.validateTraining(f))) return;
    await save({ kind: 'training', date: f.date, time: String(f.time || '').trim(), topic: f.topic.trim(), trainer: String(f.trainer || '').trim(), audience: String(f.audience || '').trim(),
      expected: String(f.expected || '').trim() ? Number(f.expected) : null, notes: String(f.notes || '').trim(), by: f.by.trim() });
  }
  async function trAttSave() {
    const f = st.form; if (errs(F.validateAttendance(f))) return;
    await save({ kind: 'trainingAtt', trainingUid: f.trainingUid, heldOn: f.heldOn, attendees: F.namesOf(f.attendees), notes: String(f.notes || '').trim(), by: f.by.trim() });
  }

  // ---------- eventos ----------
  const op = () => C.operator() || '';
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-fact]'); if (!el) return;
    const a = el.dataset.fact, v = el.dataset.v;
    if (C.who && st.form && /save$/.test(a)) {   // v2.17.0: PIN → título da função
      const w = await C.who(st.form.whopin !== undefined ? st.form.whopin : st.form.pin); if (w.err) return C.toast(w.err); st.form.by = w.title;
    }
    if (a === 'tab') { st.tab = v; st.form = null; keep(); return; }
    if (a === 'cancel') { st.form = null; keep(); return; }
    if (a === 'oain') { const D = F.effective(st.entries).filter(e => e.kind === 'oaLogin').sort((x, y) => y.t - x.t)[0];
      st.form = { kind: 'oaLogin', items: [''], acts: [], manpower: '', sup: '', consumables: '', mats: D && (D.mats || []).length ? D.mats.map(r => ({ name: r.name, unit: r.unit, stock: '', min: r.min })) : [{ name: '', unit: '', stock: '', min: '' }], by: op() }; keep(); return; }
    if (a === 'oaitem' && st.form && st.form.items) { st.form.items.push(''); keep(); return; }
    if (a === 'oamat' && st.form && st.form.mats) { st.form.mats.push({ name: '', unit: '', stock: '', min: '' }); keep(); return; }
    if (a === 'oainsave') return oaInSave();
    if (a === 'oaout') { st.form = { kind: 'oaLogout', pcts: [], comments: '', by: op() }; keep(); return; }
    if (a === 'oaoutsave') return oaOutSave();
    if (a === 'trnew') { st.form = { kind: 'training', date: today(), time: '', topic: '', trainer: '', audience: '', expected: '', notes: '', by: op() }; keep(); return; }
    if (a === 'trsave') return trSave();
    if (a === 'tratt') { st.form = { kind: 'trainingAtt', trainingUid: v, heldOn: today(), attendees: '', notes: '', by: op() }; keep(); return; }
    if (a === 'trattsave') return trAttSave();
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
  document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.ff !== undefined && st.form && el.type !== 'checkbox') st.form[el.dataset.ff] = el.value;
    if (el.dataset && el.dataset.fitem !== undefined && st.form && st.form.items) st.form.items[+el.dataset.fitem] = el.value;
    if (el.dataset && el.dataset.fpct !== undefined && st.form && st.form.pcts) st.form.pcts[+el.dataset.fpct] = el.value;
    if (el.dataset && el.dataset.fmat && st.form && st.form.mats) { const [i, k] = el.dataset.fmat.split('|'); if (st.form.mats[+i]) { st.form.mats[+i][k] = el.value; const o = document.getElementById('fsad_' + i), r = st.form.mats[+i]; if (o) o.textContent = pc(F.adequacy(r.stock, r.min)); } } });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset && el.dataset.ff !== undefined && st.form) { st.form[el.dataset.ff] = el.type === 'checkbox' ? el.checked : el.value; if (el.tagName === 'SELECT' || el.dataset.ff === 'close') keep(); return; }
    if (el.dataset && el.dataset.fpick && st.form && st.form.acts) { const id = el.dataset.fpick, i = st.form.acts.indexOf(id); if (el.checked && i < 0) st.form.acts.push(id); if (!el.checked && i >= 0) st.form.acts.splice(i, 1); return; }
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
  return { view, reload, warnings, warnText, t, entries: () => st.entries };
};
