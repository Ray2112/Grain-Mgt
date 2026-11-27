// Separador Turno da Grain-Mgt (0.12.0, Zhax 13-11-2026): login no início do turno e logout no fim, pelo chefe de turno da
// secção de silos. Registos na loja 'maint' (kind 'shiftIn' / 'shiftOut'), por isso o ficheiro diário do Dropbox não muda.
// C: {S, L, DB, esc, fmtKg, toast, render, saveSettings, siloSt, lang}. Eventos próprios: data-sact.
(function (root) {
  'use strict';
  const R = () => root.ShiftRules;
  const T = {
    pt: {
      title: 'Turno — login e logout (secção de silos)', day: 'Dia', shift: 'Turno', sD: 'Dia 07–19', sN: 'Noite 19–07',
      login: 'Login de turno', loginHelp: 'Início do turno: trabalhos a fazer, estado e comentários; grava com o PIN do chefe de turno. Depois de gravado, o login fica só de leitura. O stock dos silos é registado sozinho.',
      leaderPin: 'PIN do chefe de turno', leaderPinBad: 'PIN do chefe de turno errado', leaderPinNone: 'aviso: este chefe ainda não tem PIN (o supervisor define-o em Definições)', ldTitle: 'Chefes de turno (secção de silos)', ldNote: 'Um por turma. Cada chefe entra e sai do turno com o seu PIN. Escreva um PIN só para o criar ou mudar; vazio = fica como está. Mudar o nome apaga o PIN. Fica só neste telemóvel.', ldPin: 'PIN (4 a 8 algarismos)', ldSet: '(definido)', ldNotSet: '(sem PIN)', ldSave: 'Gravar chefes de turno', ldSaved: 'Chefes de turno gravados', ldFormat: 'O PIN tem 4 a 8 algarismos', 
      outMissing: 'Turno de {s} de {d} ({l}) com login e sem logout: faça o logout no separador Turno.', outGo: 'Ir para esse turno',
      leader: 'Chefe de turno (secção de silos)', ops: 'Operadores de serviço', jobs: 'Trabalhos a fazer', jobsAuto: 'Da app (hoje)', jobsList: 'Lista (editável)',
      jobAdd: 'Acrescentar à lista', jobRm: 'Retirar', jobExtra: 'Outro trabalho (só neste turno)', trucks: 'Camiões esperados',
      state: 'Estado', rec1: 'Recepção 1', rec2: 'Recepção 2', feed: 'Alimentação da moagem', on: 'Ligada', off: 'Desligada',
      scalesStart: 'Leituras iniciais das balanças (kg)', scalesEnd: 'Leituras finais das balanças (kg)', scalesHelp: 'Totalizador de cada balança. Em branco fica sem leitura (nunca zero).',
      BA01: 'BA01 Recepção 1', BA02: 'BA02 Recepção 2', BA03: 'BA03 Alimentação moagem', BA04: 'BA04 Alimentação moagem',
      comments: 'Comentários', saveLogin: 'Gravar login', logout: 'Logout de turno', acts: 'Actividades feitas', saveLogout: 'Gravar logout', name: 'Nome',
      report: 'Relatório do turno (Excel)', start: 'Início', end: 'Fim', qty: 'Quantidade (kg)', checks: 'Balanças e registos (aviso)',
      totTitle: 'Totais do turno', totRec: 'Recebido (camiões)', totTr: 'Transferido entre silos', totOut: 'Descarregado', totTo: 'para {p}',
      chkRec: 'BA01 + BA02 contra as recepções registadas', chkFeed: 'BA03 + BA04 contra as descargas para a linha', diff: 'diferença',
      targets: 'Objectivos', tFeed: 'Enviado para a moagem contra o plano do dia', tTrucks: 'Camiões recebidos contra os esperados',
      planNone: 'sem plano do OEE para o dia', planOff: 'plano não lido (ligue a leitura do Dropbox em Definições)',
      stockStart: 'Stock dos silos no início', stockEnd: 'Stock dos silos no fim', saved: 'Gravado.', need: 'Preencha', bad: 'Valor inválido',
      missing: 'Turno de {s} sem login: registe-o no separador Turno.', notDone: 'não feito',
      a_red: 'Silos com leitura Vermelha / disposição pendente: {s}', a_weekly: 'Inspecção semanal devida: {s}', a_treat: 'Tratamento pendente de verificação: {s}',
      a_plan: 'Descarga para a moagem: plano do dia {kg}', a_pm: 'Preventiva em atraso ou devida esta semana: {n} tarefa(s)',
      trucksRec: 'Camiões recebidos', sentKg: 'Enviado para B01–B04', recKg: 'Recebido', transfers: 'Transferências entre silos', empties: 'Silos esvaziados',
      stops: 'Paragens (Manut.)', monit: 'Registos de monitorização',
      crew: 'Turma', saveFail: 'Erro ao gravar', xDate: 'Data', xTime: 'Hora', xLot: 'Lote', xGuia: 'Guia', xSupplier: 'Fornecedor', xPlate: 'Matrícula', xCereal: 'Cereal', xColour: 'Cor', xBin: 'Bin', xLine: 'Linha', xOperator: 'Operador', xWarnings: 'Avisos', xFrom: 'De', xTo: 'Para', xKind: 'Tipo', xSilo: 'Silo', xBy: 'Por', xType: 'Tipo', xCode: 'Código', xDur: 'Duração (min)', xFault: 'Falha', xAction: 'Acção', xStock: 'Stock dos silos',
      pin: 'PIN', pct: '% feito', pctHelp: 'Para cada trabalho do login, quanto ficou feito (0–100 %).', pctNeed: 'Indique o % feito de cada trabalho (0–100)', handover: 'Notas de passagem de turno', pctAvg: 'Média feita',
      jobsEdit: 'A lista edita-se em Definições (PIN dos quatro de cima).', jobPick: 'Escolha o trabalho', jobOther: 'Outro', jobOtherText: 'Texto (para «Outro»)', jobPickAdd: 'Juntar trabalho', jobOtherNeed: 'Escreva o trabalho «Outro»'
    },
    en: {
      title: 'Shift — login and logout (silo section)', day: 'Day', shift: 'Shift', sD: 'Day 07–19', sN: 'Night 19–07',
      login: 'Shift login', loginHelp: 'Start of the shift: jobs to be done, state and comments; saved with the shift leader PIN. Once saved, the login is read-only. The silo stock is recorded automatically.',
      leaderPin: 'Shift leader PIN', leaderPinBad: 'Wrong shift leader PIN', leaderPinNone: 'warning: this leader has no PIN yet (the supervisor sets it in Settings)', ldTitle: 'Shift leaders (silo section)', ldNote: 'One per crew. Each leader logs in and out of the shift with their own PIN. Type a PIN only to create or change it; blank = unchanged. Changing the name clears the PIN. Stays on this phone only.', ldPin: 'PIN (4 to 8 digits)', ldSet: '(set)', ldNotSet: '(no PIN)', ldSave: 'Save shift leaders', ldSaved: 'Shift leaders saved', ldFormat: 'The PIN has 4 to 8 digits', 
      outMissing: '{s} shift of {d} ({l}) has a login and no logout: log it out in the Shift tab.', outGo: 'Go to that shift',
      leader: 'Shift leader (silo section)', ops: 'Operators on duty', jobs: 'Jobs to be done', jobsAuto: 'From the app (today)', jobsList: 'List (editable)',
      jobAdd: 'Add to the list', jobRm: 'Remove', jobExtra: 'Other job (this shift only)', trucks: 'Trucks expected',
      state: 'State', rec1: 'Reception 1', rec2: 'Reception 2', feed: 'Feed to the mill', on: 'On', off: 'Off',
      scalesStart: 'Initial scale readings (kg)', scalesEnd: 'Final scale readings (kg)', scalesHelp: 'Each scale totaliser. Left blank = no reading (never zero).',
      BA01: 'BA01 Reception 1', BA02: 'BA02 Reception 2', BA03: 'BA03 Feed to mill', BA04: 'BA04 Feed to mill',
      comments: 'Comments', saveLogin: 'Save login', logout: 'Shift logout', acts: 'Activities done', saveLogout: 'Save logout', name: 'Name',
      report: 'Shift report (Excel)', start: 'Start', end: 'End', qty: 'Quantity (kg)', checks: 'Scales and records (warning)',
      totTitle: 'Shift totals', totRec: 'Received (trucks)', totTr: 'Transferred between silos', totOut: 'Discharged', totTo: 'to {p}',
      chkRec: 'BA01 + BA02 against the recorded intakes', chkFeed: 'BA03 + BA04 against the discharges to the line', diff: 'difference',
      targets: 'Targets', tFeed: 'Sent to the mill against the day plan', tTrucks: 'Trucks received against expected',
      planNone: 'no OEE plan for the day', planOff: 'plan not read (connect Dropbox reading in Settings)',
      stockStart: 'Silo stock at the start', stockEnd: 'Silo stock at the end', saved: 'Saved.', need: 'Fill in', bad: 'Invalid value',
      missing: '{s} shift has no login: record it in the Shift tab.', notDone: 'not done',
      a_red: 'Silos with a Red reading / disposition pending: {s}', a_weekly: 'Weekly inspection due: {s}', a_treat: 'Treatment pending verification: {s}',
      a_plan: 'Discharge to the mill: day plan {kg}', a_pm: 'Preventive overdue or due this week: {n} task(s)',
      trucksRec: 'Trucks received', sentKg: 'Sent to B01–B04', recKg: 'Received', transfers: 'Silo transfers', empties: 'Silos emptied',
      stops: 'Stoppages (Maint.)', monit: 'Monitoring records',
      crew: 'Crew', saveFail: 'Save failed', xDate: 'Date', xTime: 'Time', xLot: 'Lot', xGuia: 'Waybill', xSupplier: 'Supplier', xPlate: 'Plate', xCereal: 'Cereal', xColour: 'Colour', xBin: 'Bin', xLine: 'Line', xOperator: 'Operator', xWarnings: 'Warnings', xFrom: 'From', xTo: 'To', xKind: 'Kind', xSilo: 'Silo', xBy: 'By', xType: 'Type', xCode: 'Code', xDur: 'Duration (min)', xFault: 'Fault', xAction: 'Action', xStock: 'Silo stock',
      pin: 'PIN', pct: '% done', pctHelp: 'For each login job, how much was done (0–100 %).', pctNeed: 'Enter the % done of each job (0–100)', handover: 'Shift handover notes', pctAvg: 'Average done',
      jobsEdit: 'The list is edited in Settings (top-four PIN).', jobPick: 'Pick the job', jobOther: 'Other', jobOtherText: 'Text (for "Other")', jobPickAdd: 'Add job', jobOtherNeed: 'Write the "Other" job'
    }
  };
  root.ShiftUI = function (C) {
    const st = { sel: null, recs: [], plan: null, planErr: null };
    const tl = (lang, k, v) => { let s = (T[lang] || T.pt)[k] || T.pt[k] || k; if (v) Object.keys(v).forEach(x => { s = s.split('{' + x + '}').join(v[x]); }); return s; };
    const t = (k, v) => tl(C.lang(), k, v);
    const both = (k, v) => ({ pt: tl('pt', k, v), en: tl('en', k, v) });   // 0.12.1: textos gravados nas duas línguas
    const jt = j => R().jobText(j, C.lang());
    const esc = C.esc, fmtKg = v => (typeof v === 'number' && isFinite(v)) ? C.fmtKg(v) : '—';
    const $ = s => document.querySelector(s);
    const cur = () => { const sh = C.L.shiftOf(C.L.today(), C.L.nowTime()); return { day: sh.date, win: sh.window }; };
    // 0.17.0 (Zhax, 14-11-2026): turno com login e sem logout não desaparece — o separador abre nele e há um alerta até ao logout
    function openShift() {
      const c = cur(), from = Date.now() - 3 * 24 * 3600000;
      const ins = st.recs.filter(r => r.kind === 'shiftIn' && (r.t || 0) >= from && r.shift !== c.day + '/' + c.win).sort((a, b) => b.t - a.t);
      return ins.find(r => !st.recs.some(o => o.kind === 'shiftOut' && o.shift === r.shift)) || null;
    }
    const sel = () => st.sel || (st.sel = (o => o ? { day: o.prodDay, win: o.period } : cur())(openShift()));
    const outMsg = o => t('outMissing', { s: o.period === 'N' ? t('sN') : t('sD'), d: String(o.date || '').split('-').reverse().join('/'), l: o.leader || '' });
    function issueOut() { const o = openShift(); return o ? outMsg(o) : null; }
    const sid = s => s.day + '/' + s.win;
    const rec = (kind, s) => st.recs.filter(r => r.kind === kind && r.shift === sid(s)).sort((a, b) => b.t - a.t)[0] || null;
    async function reload() { try { st.recs = await C.DB.all('maint'); } catch (e) { st.recs = []; } }
    async function refreshPlan() {
      st.planErr = null;
      try { if (root.FeedSync && root.FeedSync.signedIn()) st.plan = await root.FeedSync.fetchJson('/Apps/Mill-CD/production-plan.json'); else st.planErr = 'off'; }
      catch (e) { st.planErr = String(e && e.message || e); }
    }
    const jobsList = () => (C.S.settings.shiftJobs = R().normJobs(C.S.settings.shiftJobs));
    // Trabalhos sugeridos pela própria app (estado dos silos, monitorização, plano, preventiva)
    function autoJobs(day) {
      const out = [], sil = C.S.settings.silos || [];
      const ss = sil.map(s => ({ s, q: C.siloSt(s) }));
      const red = ss.filter(x => x.q.holdWarn || x.q.rejectWarn).map(x => x.s.id); if (red.length) out.push(both('a_red', { s: red.join(', ') }));
      const wk = ss.filter(x => x.q.weeklyDue).map(x => x.s.id); if (wk.length) out.push(both('a_weekly', { s: wk.join(', ') }));
      const tr = ss.filter(x => (x.q.drivers || []).some(d => d.code === 'treat_pending')).map(x => x.s.id); if (tr.length) out.push(both('a_treat', { s: tr.join(', ') }));
      const pk = R().planKg(st.plan, day); if (pk !== null) out.push(both('a_plan', { kg: fmtKg(pk) + ' kg' }));
      const pm = C.pmDue ? C.pmDue() : 0; if (pm) out.push(both('a_pm', { n: pm }));
      return out;
    }
    // v0.21.0 (Zhax, 27-11-2026): sem nomes nem PIN por chefe guardado aqui — o PIN é o da função (js/roles.js), como na Moagem de Milho
    const pinField = id => '<label>' + esc(t('pin')) + ' *<input type="password" maxlength="4" autocomplete="off" id="' + id + '"></label>';
    const stock = () => (C.S.settings.silos || []).map(s => ({ silo: s.id, kg: C.L.siloContents(s.id, C.S.events).kg }));
    const chips = () => (st.picked || []).map((j, i) => '<span class="chip on">' + esc(jt(j)) + ' <button type="button" class="btn small" data-sact="unpick" data-i="' + i + '">✕</button></span>').join(' ');
    function pickJob() {
      const v = ($('#sh_jobsel') || {}).value, txt = (($('#sh_extra') || {}).value || '').trim();
      if (!v) { C.toast(t('jobPick')); return; }
      const j = v === 'other' ? (txt ? txt : null) : (st.offer || [])[Number(v)];
      if (!j) { C.toast(t('jobOtherNeed')); return; }
      st.picked = (st.picked || []).concat([j]);
      $('#sh_jobs').innerHTML = chips(); $('#sh_jobsel').value = ''; $('#sh_extra').value = '';
    }
    function scaleInputs(prefix, vals) {
      return '<p class="small muted">' + esc(t('scalesHelp')) + '</p><div class="grid2">' + R().SCALES.map(k =>
        '<label>' + esc(t(k)) + '<input inputmode="numeric" data-scale="1" id="' + prefix + k + '" placeholder="1,234,567" value="' + esc(vals && vals[k] != null ? R().fmtScale(vals[k]) : '') + '"></label>').join('') + '</div>';
    }
    const scaleVals = p => { const o = {}; R().SCALES.forEach(k => { const e = $('#' + p + k); o[k] = e ? e.value : ''; }); return o; };
    const onOff = (id, v) => '<label>' + esc(t(id)) + '<select id="sh_' + id + '"><option value="on"' + (v === 'on' ? ' selected' : '') + '>' + esc(t('on')) + '</option><option value="off"' + (v === 'off' ? ' selected' : '') + '>' + esc(t('off')) + '</option></select></label>';
    function view() {
      const s = sel(), li = rec('shiftIn', s), lo = rec('shiftOut', s), op = openShift();
      let h = (op ? '<div class="banner b-warn" role="status">⚠ ' + esc(outMsg(op)) + (op.shift === sid(s) ? '' : ' <button type="button" class="btn small" data-sact="goopen">' + esc(t('outGo')) + '</button>') + '</div>' : '') +
        '<div class="card stack"><h2>' + esc(t('title')) + '</h2><div class="grid2"><label>' + esc(t('day')) + '<input type="date" id="sh_day" value="' + esc(s.day) + '"></label>' +
        '<label>' + esc(t('shift')) + '<select id="sh_win"><option value="D"' + (s.win === 'D' ? ' selected' : '') + '>' + esc(t('sD')) + '</option><option value="N"' + (s.win === 'N' ? ' selected' : '') + '>' + esc(t('sN')) + '</option></select></label></div></div>';
      if (!li) {
        const auto = autoJobs(s.day);
        st.offer = auto.concat(jobsList());
        h += '<div class="card stack"><h2>' + esc(t('login')) + '</h2><p class="small muted">' + esc(t('loginHelp')) + '</p>' +
          '<div class="lbl strong">' + esc(t('jobs')) + '</div>' +
          (auto.length ? '<div class="small muted">' + esc(t('jobsAuto')) + '</div>' + auto.map((j, i) => '<label class="check"><input type="checkbox" class="sh_job" data-i="' + i + '" checked> ' + esc(jt(j)) + '</label>').join('') : '') +
          // 0.14.1: como na Prodn-Mgt — escolher na lista e juntar (fica como etiqueta, retira-se com ✕); «Outro» leva texto
          '<div class="grid2"><label>' + esc(t('jobPick')) + '<select id="sh_jobsel"><option value="">—</option>' + jobsList().map((j, i) => '<option value="' + (auto.length + i) + '">' + esc(jt(j)) + '</option>').join('') +
            '<option value="other">' + esc(t('jobOther')) + '</option></select></label><label>' + esc(t('jobOtherText')) + '<input id="sh_extra"></label></div>' +
          '<button type="button" class="btn small" data-sact="pickjob">＋ ' + esc(t('jobPickAdd')) + '</button><div id="sh_jobs" class="chips">' + chips() + '</div>' +
          '<p class="small muted">' + esc(t('jobsEdit')) + '</p>' +
          '<label>' + esc(t('trucks')) + '<input inputmode="numeric" id="sh_trucks"></label>' +
          '<div class="lbl strong">' + esc(t('state')) + '</div><div class="grid2">' + onOff('rec1', 'on') + onOff('rec2', 'on') + onOff('feed', 'on') + '</div>' +
          '<label>' + esc(t('comments')) + '<textarea id="sh_comments" rows="2"></textarea></label>' + pinField('sh_pin') +
          '<button type="button" class="btn primary block" data-sact="login">' + esc(t('saveLogin')) + '</button></div>';
        return h;
      }
      h += '<div class="card stack"><h2>' + esc(t('login')) + ' · ' + esc(li.date + ' ' + li.time) + '</h2>' +
        '<p><b>' + esc(t('leader')) + ':</b> ' + esc(li.leader) + ' · ' + esc(li.crew ? t('crew') + ' ' + li.crew : '') + (li.operators ? '<br><b>' + esc(t('ops')) + ':</b> ' + esc(li.operators) : '') + '</p>' +
        '<p><b>' + esc(t('jobs')) + ':</b> ' + esc((li.jobs || []).map(jt).join(' | ') || '—') + '</p>' +
        '<p class="small">' + esc(t('rec1')) + ' ' + esc(t(li.state.rec1)) + ' · ' + esc(t('rec2')) + ' ' + esc(t(li.state.rec2)) + ' · ' + esc(t('feed')) + ' ' + esc(t(li.state.feed)) + '</p>' +
        (li.comments ? '<p class="small">' + esc(li.comments) + '</p>' : '') + '</div>';
      const r = R().shiftRecords(sid(s), C.S, C.L.shiftOf);
      if (!lo) {
        const pre = [];   // 0.20.0: os totais estão no cartão acima (sem repetir aqui)
        const stops = st.recs.filter(x => x.kind === 'stop' && x.shift === sid(s)); if (stops.length) pre.push(t('stops') + ': ' + stops.map(x => (x.code || '') + ' ' + (x.durationMin || '') + ' min').join(', '));
        h += totalsCard(r) + '<div class="card stack"><h2>' + esc(t('logout')) + '</h2><div class="grid2">' + onOff('rec1', li.state.rec1) + onOff('rec2', li.state.rec2) + onOff('feed', li.state.feed) + '</div>' +
          '<div class="lbl strong">' + esc(t('pct')) + ' *</div><p class="small muted">' + esc(t('pctHelp')) + '</p>' +
          ((li.jobs || []).length ? '<table class="tbl">' + li.jobs.map((j, i) => '<tr><td>' + esc(jt(j)) + '</td><td class="n"><input class="sh_pct" data-i="' + i + '" inputmode="numeric" maxlength="3" style="width:4.5em;display:inline-block"> %</td></tr>').join('') + '</table>' : '<p class="small muted">—</p>') +
          '<label>' + esc(t('acts')) + '<textarea id="sh_acts" rows="3">' + esc(pre.join('\n')) + '</textarea></label>' +
          '<label>' + esc(t('handover')) + '<textarea id="sh_handover" rows="2"></textarea></label>' +
          '<label>' + esc(t('comments')) + '<textarea id="sh_comments" rows="2"></textarea></label>' + pinField('sh_pin') +
          '<button type="button" class="btn primary block" data-sact="logout">' + esc(t('saveLogout')) + '</button></div>';
        return h;
      }
      const tg = lo.targets;
      h += totalsCard(r) + '<div class="card stack"><h2>' + esc(t('logout')) + ' · ' + esc(lo.date + ' ' + lo.time) + '</h2>' +
        '<div class="lbl strong">' + esc(t('targets')) + '</div><p class="small">' + esc(t('tFeed')) + ': ' + (tg.feed.planKg === null ? esc(tg.feed.note === 'off' ? t('planOff') : tg.feed.note === 'none' ? t('planNone') : tg.feed.note) : fmtKg(tg.feed.daySentKg) + ' / ' + fmtKg(tg.feed.planKg) + ' kg = ' + (tg.feed.pct === null ? '—' : String(tg.feed.pct).replace('.', ',') + ' %')) + '</p>' +
        '<p class="small">' + esc(t('tTrucks')) + ': ' + tg.trucks.received + ' / ' + (tg.trucks.expected === null ? '—' : tg.trucks.expected) + (tg.trucks.pct === null ? '' : ' = ' + String(tg.trucks.pct).replace('.', ',') + ' %') + '</p>' +
        (lo.jobPct && lo.jobPct.length ? '<table class="tbl small">' + lo.jobPct.map(x => '<tr><td>' + esc(jt(x.job)) + '</td><td class="n">' + x.pct + ' %</td></tr>').join('') + '<tr><td><b>' + esc(t('pctAvg')) + '</b></td><td class="n"><b>' + (lo.pctDone === null || lo.pctDone === undefined ? '—' : String(lo.pctDone).replace('.', ',') + ' %') + '</b></td></tr></table>' : '') +
        '<p class="small"><b>' + esc(t('acts')) + ':</b><br>' + esc(lo.activities || '—').replace(/\n/g, '<br>') + '</p>' + (lo.handover ? '<p class="small"><b>' + esc(t('handover')) + ':</b> ' + esc(lo.handover) + '</p>' : '') + (lo.comments ? '<p class="small">' + esc(lo.comments) + '</p>' : '') +
        '<p class="small muted">' + esc(lo.by || '') + '</p>' +
        '<button type="button" class="btn block" data-sact="xlsx">' + esc(t('report')) + '</button></div>';
      return h;
    }
    // 0.19.0 (Zhax, 17-11-2026): sem leituras de balança; totais do turno pelos registos
    function totalsCard(r) {
      const row = (lab, n, kg) => '<tr><td>' + esc(lab) + '</td><td class="n">' + n + '</td><td class="n">' + fmtKg(kg) + '</td></tr>';
      return '<div class="card stack"><h2>' + esc(t('totTitle')) + '</h2><table class="tbl"><tr><th></th><th>n</th><th>kg</th></tr>' +
        row(t('totRec'), r.trucks, r.receivedKg) + row(t('totTr'), r.transfers.length, r.transferKg) + row(t('totOut'), r.outs.length, r.outKg) +
        Object.keys(r.byPlace).sort().map(k => row('  ' + t('totTo', { p: k }), r.byPlace[k].n, r.byPlace[k].kg)).join('') +
        '<tr><td>' + esc(t('empties')) + '</td><td class="n">' + r.empties.length + '</td><td>' + esc(r.empties.map(e => e.silo).join(', ')) + '</td></tr></table></div>';
    }
    function scalesOrToast(p) {
      const r = R().readScales(scaleVals(p));
      if (r.bad.length) { C.toast(t('bad') + ': ' + r.bad.join(', ')); return null; }
      return r.values;
    }
    async function add(rec) { try { await C.DB.add('maint', rec); } catch (e) { C.toast(t('saveFail')); return false; } await reload(); C.toast(t('saved')); C.render(); return true; }
    async function login() {
      const s = sel();
      const tr = R().num($('#sh_trucks').value);
      if (tr !== null && (isNaN(tr) || tr < 0)) { C.toast(t('bad') + ': ' + t('trucks')); return; }
      const w = await C.who(($('#sh_pin') || {}).value); if (!w) return;   // v0.21.0: PIN do chefe de turno (ou dos quatro de cima); grava o título da função
      const leader = w.title;
      const jobs = [...document.querySelectorAll('.sh_job')].filter(x => x.checked).map(x => (st.offer || [])[Number(x.dataset.i)]).filter(Boolean)
        .concat(st.picked || []);   // escolhidos na lista ({pt, en}) e «Outro» escrito à mão (fica como foi escrito)
      const now = new Date(); st.picked = [];
      await add({ kind: 'shiftIn', shift: sid(s), prodDay: s.day, period: s.win, crew: C.L.crewOf(s.day, s.win === 'N' ? '20:00' : '08:00'), date: C.L.today(now), time: C.L.nowTime(now), t: now.getTime(),
        leader, role: w.role, leaderPin: 'ok', jobs, trucksExpected: tr, planKg: R().planKg(st.plan, s.day),
        state: { rec1: $('#sh_rec1').value, rec2: $('#sh_rec2').value, feed: $('#sh_feed').value }, stockStart: stock(), comments: $('#sh_comments').value.trim(), by: leader });
    }
    async function logout() {
      const s = sel(), li = rec('shiftIn', s); if (!li) return;
      const acts = $('#sh_acts').value.trim(), handover = (($('#sh_handover') || {}).value || '').trim();
      // v0.21.0 (Zhax, 27-11-2026): % feito de cada trabalho do login, como na Moagem de Milho
      const jobPct = [...document.querySelectorAll('.sh_pct')].map(x => ({ job: (li.jobs || [])[Number(x.dataset.i)], pct: String(x.value || '').trim() === '' ? null : Number(String(x.value).replace(',', '.')) }));
      if (jobPct.some(x => x.pct === null || !isFinite(x.pct) || x.pct < 0 || x.pct > 100)) { C.toast(t('pctNeed')); return; }
      const pctDone = jobPct.length ? Math.round(jobPct.reduce((a, x) => a + x.pct, 0) / jobPct.length * 10) / 10 : null;
      const w = await C.who(($('#sh_pin') || {}).value); if (!w) return;
      const by = w.title;
      const actsTxt = jobPct.map(x => jt(x.job) + ': ' + x.pct + ' %').concat(acts ? [acts] : []).join('\n');
      const r = R().shiftRecords(sid(s), C.S, C.L.shiftOf);
      // enviado no dia de produção até agora: turno de dia + (no turno da noite) este turno, pelos registos de descarga
      const daySent = s.win === 'N' ? Math.round((R().shiftRecords(s.day + '/D', C.S, C.L.shiftOf).sentKg + r.sentKg) * 1000) / 1000 : r.sentKg;
      const plan = R().planKg(st.plan, s.day) !== null ? R().planKg(st.plan, s.day) : li.planKg;
      const now = new Date();
      await add({ kind: 'shiftOut', shift: sid(s), prodDay: s.day, period: s.win, crew: li.crew, date: C.L.today(now), time: C.L.nowTime(now), t: now.getTime(), inUid: li.uid,
        state: { rec1: $('#sh_rec1').value, rec2: $('#sh_rec2').value, feed: $('#sh_feed').value }, activities: actsTxt, jobPct, pctDone, handover, role: w.role,
        receivedKg: r.receivedKg, sentKg: r.sentKg, trucks: r.trucks, transferKg: r.transferKg, outKg: r.outKg, byPlace: r.byPlace,
        targets: { feed: { planKg: plan, daySentKg: daySent, pct: R().pct(daySent, plan), note: plan === null ? (st.planErr === 'off' ? 'off' : 'none') : '' },   // código; o texto sai na língua de quem lê
          trucks: { expected: li.trucksExpected, received: r.trucks, pct: R().pct(r.trucks, li.trucksExpected) } },
        stockEnd: stock(), comments: $('#sh_comments').value.trim(), by, leaderPin: 'ok' });
    }
    function xlsx() {
      const X = root.XLSX, s = sel(), li = rec('shiftIn', s), lo = rec('shiftOut', s), r = R().shiftRecords(sid(s), C.S, C.L.shiftOf);
      if (!X || !li) return;
      const wb = X.utils.book_new(), add = (n, rows) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(rows), n.slice(0, 31));
      add('Turno', [[(C.lang() === 'en' ? 'FMO - Grain Silos — ' : 'FMO - Silo Cereais — ') + t('title'), sid(s)], [], [t('leader'), li.leader], [t('crew'), li.crew], [t('jobs'), (li.jobs || []).map(jt).join(' | ')],
        [t('state') + ' (' + t('login') + ')', [t('rec1') + ' ' + t(li.state.rec1), t('rec2') + ' ' + t(li.state.rec2), t('feed') + ' ' + t(li.state.feed)].join(', ')], [t('comments'), li.comments], [],
        ['', 'n', 'kg'], [t('totRec'), r.trucks, r.receivedKg], [t('totTr'), r.transfers.length, r.transferKg], [t('totOut'), r.outs.length, r.outKg],
        ...Object.keys(r.byPlace).sort().map(k => [t('totTo', { p: k }), r.byPlace[k].n, r.byPlace[k].kg]), [],
        [t('logout'), lo ? lo.date + ' ' + lo.time : t('notDone')], [],
        [t('tFeed'), lo ? lo.targets.feed.daySentKg : '', lo ? lo.targets.feed.planKg : '', lo ? lo.targets.feed.pct : ''], [t('tTrucks'), lo ? lo.targets.trucks.received : '', lo ? lo.targets.trucks.expected : '', lo ? lo.targets.trucks.pct : ''],
        [t('acts'), lo ? lo.activities : ''], [t('comments'), lo ? lo.comments : '']]);
      add(t('recKg'), [[t('xDate'), t('xTime'), t('xLot'), t('xGuia'), t('xSupplier'), t('xPlate'), t('xCereal'), t('xColour'), 'kg'], ...r.lots.map(l => [l.date, l.time, l.code || l.id, l.guia, l.supplier, l.plate, l.cereal, l.colour, l.kg])]);
      add(t('sentKg'), [[t('xDate'), t('xTime'), t('xSilo'), t('xBin'), t('xLine'), 'kg', t('xOperator'), t('xWarnings')], ...r.outs.map(e => [e.date, e.time, e.silo, e.bin, e.place, e.kg, e.operator, (e.warnings || []).join(' · ')])]);
      add(t('transfers'), [[t('xDate'), t('xTime'), t('xFrom'), t('xTo'), 'kg', t('xOperator')], ...r.transfers.map(e => [e.date, e.time, e.silo, e.toSilo, e.kg, e.operator])]);
      add(t('monit'), [[t('xDate'), t('xTime'), t('xKind'), t('xSilo'), t('xBy')], ...C.S.mon.filter(m => m.date && C.L.shiftOf(m.date, m.time).id === sid(s)).map(m => [m.date, m.time, m.kind, m.silo, m.by])]);
      add(t('stops'), [[t('xTime'), t('xType'), t('xCode'), t('xDur'), t('xFault'), t('xAction'), t('xBy')], ...st.recs.filter(x => x.kind === 'stop' && x.shift === sid(s)).map(x => [x.time, x.stopKind || x.category, x.code, x.durationMin, x.description, x.action || '', x.by])]);
      const end = lo ? lo.stockEnd : [];
      add(t('xStock'), [[t('xSilo'), t('stockStart') + ' (kg)', t('stockEnd') + ' (kg)'], ...(li.stockStart || []).map(x => [x.silo, x.kg, (end.find(y => y.silo === x.silo) || {}).kg])]);
      X.writeFile(wb, s.day + '_' + (C.lang() === 'en' ? (s.win === 'D' ? 'Day' : 'Night') + '_Silos_Shift-Report' : (s.win === 'D' ? 'Dia' : 'Noite') + '_Silos_Relatorio-Turno') + '.xlsx');
    }
    function issue() {
      const c = cur(), now = new Date(), [h, m] = C.L.nowTime(now).split(':').map(Number);
      const since = c.win === 'D' ? (h - 7) * 60 + m : ((h >= 19 ? h - 19 : h + 5) * 60 + m);
      if (since < 30 || rec('shiftIn', c)) return null;
      return t('missing', { s: c.win === 'D' ? t('sD') : t('sN') });
    }
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-sact]'); if (!el) return;
      const a = el.dataset.sact;
      if (a === 'login') login(); else if (a === 'logout') logout(); else if (a === 'xlsx') xlsx();
      else if (a === 'pickjob') pickJob();
      else if (a === 'goopen') { const o = openShift(); if (o) { st.sel = { day: o.prodDay, win: o.period }; C.render(); } }
      else if (a === 'unpick') { (st.picked || []).splice(Number(el.dataset.i), 1); const c = $('#sh_jobs'); if (c) c.innerHTML = chips(); }
      else if (a === 'jobadd' && C.unlocked()) {
        const pt = (($('#sj_pt') || {}).value || '').trim(), en = (($('#sj_en') || {}).value || '').trim();
        if (!pt || !en) { C.toast(C.t('sj_need')); return; }
        jobsList().push({ pt, en }); C.saveSettings(); C.render();
      } else if (a === 'jobrm' && C.unlocked()) { jobsList().splice(Number(el.dataset.i), 1); C.saveSettings(); C.render(); }
    });
    document.addEventListener('change', e => {
      if (e.target.dataset && e.target.dataset.scale) { const v = R().num(e.target.value); if (typeof v === 'number' && isFinite(v) && v >= 0) e.target.value = R().fmtScale(v); }   // 0.14.0: 1,234,567
      if (e.target.id === 'sh_day' && e.target.value) { sel().day = e.target.value; C.render(); }
      if (e.target.id === 'sh_win') { sel().win = e.target.value === 'N' ? 'N' : 'D'; C.render(); }
    });
    // Definições (só desbloqueado com o PIN de supervisor): lista dos trabalhos do turno, em português e em inglês
    function jobsEditor() {
      return '<div class="card stack"><h2>' + esc(C.t('sj_title')) + '</h2><p class="small muted">' + esc(C.t('sj_note')) + '</p>' +
        jobsList().map((j, i) => '<div class="row"><span class="grow small">' + esc(j.pt) + '<br><span class="muted">' + esc(j.en) + '</span></span>' +
          '<button type="button" class="btn small" data-sact="jobrm" data-i="' + i + '">' + esc(C.t('sj_rm')) + '</button></div>').join('') +
        '<div class="grid2"><label>' + esc(C.t('sj_pt')) + '<input id="sj_pt"></label><label>' + esc(C.t('sj_en')) + '<input id="sj_en"></label></div>' +
        '<button type="button" class="btn small" data-sact="jobadd">' + esc(C.t('sj_add')) + '</button></div>';
    }
    return { view, issue, issueOut, reload, refreshPlan, jobsEditor, recs: () => st.recs };
  };
})(typeof window !== 'undefined' ? window : this);
