// Produção → Paragens da FMO - Silo Cereais (v0.21.0, Zhax 27-11-2026): como as Paragens da Moagem de Milho v2.27.0.
// Tipo (mecânica, eléctrica, processo, planeada, outra) → lista de códigos do Downtime Codes v3 → início, fim e duração →
// intervenção, consumíveis e comentários → PIN do chefe de turno (ou dos quatro de cima). Gravado na loja 'maint' como kind 'stop'
// com src 'prod' (o mesmo registo que o pipeline já lê); aparece também em Manutenção → Avarias.
// C: {lang, esc, toast, render, DB, L, who(pin) → Promise<{role,title}|null>, codes(), codesSource(), shiftNow(), crewOf(day, period), lines()}
(function (root) {
  'use strict';
  const T = {
    pt: { title: 'Paragens', newStop: 'Nova paragem', kind: 'Tipo', code: 'Código (Downtime Codes v3)', line: 'Linha / local', equipment: 'Equipamento',
      start: 'Início', end: 'Fim', dur: 'Duração (min)', desc: 'O que aconteceu', action: 'Intervenção feita', cons: 'Consumíveis usados', comments: 'Comentários',
      pin: 'PIN', save: 'Gravar', cancel: 'Cancelar', none: 'Sem paragens neste turno.', list: 'Paragens do turno', saved: 'Gravado.', fail: 'Erro ao gravar',
      need: 'Preencha: tipo, código, início, fim e o que aconteceu', badTime: 'Hora inválida', day: 'Dia de produção', period: 'Turno', pD: 'Dia 07–19', pN: 'Noite 19–07', crew: 'Turma',
      k_mechanical: 'Mecânica', k_electrical: 'Eléctrica', k_process: 'Processo', k_planned: 'Planeada', k_other: 'Outra', fromMaint: 'registada na Manutenção' },
    en: { title: 'Stoppages', newStop: 'New stoppage', kind: 'Type', code: 'Code (Downtime Codes v3)', line: 'Line / place', equipment: 'Equipment',
      start: 'Start', end: 'Finish', dur: 'Duration (min)', desc: 'What happened', action: 'Intervention done', cons: 'Consumables used', comments: 'Comments',
      pin: 'PIN', save: 'Save', cancel: 'Cancel', none: 'No stoppages this shift.', list: 'Shift stoppages', saved: 'Saved.', fail: 'Save failed',
      need: 'Fill in: type, code, start, finish and what happened', badTime: 'Invalid time', day: 'Production day', period: 'Shift', pD: 'Day 07–19', pN: 'Night 19–07', crew: 'Crew',
      k_mechanical: 'Mechanical', k_electrical: 'Electrical', k_process: 'Process', k_planned: 'Planned', k_other: 'Other', fromMaint: 'recorded in Maintenance' }
  };
  root.ProdStops = function (C) {
    const M = root.Maint;
    const st = { form: null, recs: [], sh: null };
    const t = k => (T[C.lang()] || T.pt)[k] || T.pt[k] || k;
    const esc = C.esc, $ = s => document.querySelector(s);
    const sh = () => st.sh || (st.sh = C.shiftNow());
    async function reload() { try { st.recs = await C.DB.all('maint'); } catch (e) { st.recs = []; } }
    const opt = (v, cur, lab) => '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(lab) + '</option>';
    // hora dentro do turno escolhido (07–19 ou 19–07) → ms locais
    function shiftMs(day, period, hm) {
      if (!/^\d{2}:\d{2}$/.test(hm || '')) return null;
      const h = Number(hm.slice(0, 2)), d = new Date(day + 'T' + hm + ':00');
      if (isNaN(d)) return null;
      if (period === 'N' && h < 7) d.setDate(d.getDate() + 1);
      return d.getTime();
    }
    function view() {
      const s = sh(), f = st.form;
      const list = M.effective(st.recs).filter(r => r.kind === 'stop' && r.prodDay === s.day && r.period === s.period).sort((a, b) => (a.startT || a.t) - (b.startT || b.t));
      let h = '<div class="card stack"><h2>' + esc(t('title')) + '</h2><div class="grid2"><label>' + esc(t('day')) + '<input type="date" id="ps_day" value="' + esc(s.day) + '"></label>' +
        '<label>' + esc(t('period')) + '<select id="ps_per">' + opt('D', s.period, t('pD')) + opt('N', s.period, t('pN')) + '</select></label></div>' +
        '<p class="small muted">' + esc(t('crew')) + ' ' + esc(C.crewOf(s.day, s.period) || '—') + '</p></div>';
      if (f) {
        const codes = f.stopKind ? M.codesForKind(f.stopKind, C.codes()) : [];
        const dur = M.minsBetween(f.startTime, f.endTime);
        h += '<div class="card stack"><h2>' + esc(t('newStop')) + '</h2><div class="grid2">' +
          '<label>' + esc(t('kind')) + ' *<select data-pf="stopKind"><option value="">—</option>' + M.STOP_KINDS.map(k => opt(k, f.stopKind, t('k_' + k))).join('') + '</select></label>' +
          '<label>' + esc(t('code')) + ' *<select data-pf="code"' + (f.stopKind ? '' : ' disabled') + '><option value="">—</option>' + codes.map(c => opt(c.code, f.code, c.code + ' ' + c.name)).join('') + '</select></label>' +
          '<label>' + esc(t('line')) + '<select data-pf="lineId"><option value="">—</option>' + C.lines().map(l => opt(l.id, f.lineId, l.name)).join('') + '</select></label>' +
          '<label>' + esc(t('equipment')) + '<input data-pf="equipment" value="' + esc(f.equipment) + '"></label>' +
          '<label>' + esc(t('start')) + ' *<input type="time" data-pf="startTime" value="' + esc(f.startTime) + '"></label>' +
          '<label>' + esc(t('end')) + ' *<input type="time" data-pf="endTime" value="' + esc(f.endTime) + '"></label>' +
          '<label>' + esc(t('dur')) + '<input id="ps_dur" readonly tabindex="-1" value="' + esc(dur === null ? '—' : String(dur)) + '"></label></div>' +
          '<label>' + esc(t('desc')) + ' *<textarea rows="2" data-pf="description">' + esc(f.description) + '</textarea></label>' +
          '<label>' + esc(t('action')) + '<textarea rows="2" data-pf="action">' + esc(f.action) + '</textarea></label>' +
          '<label>' + esc(t('cons')) + '<textarea rows="2" data-pf="consumables">' + esc(f.consumables) + '</textarea></label>' +
          '<label>' + esc(t('comments')) + '<textarea rows="2" data-pf="comments">' + esc(f.comments) + '</textarea></label>' +
          '<label>' + esc(t('pin')) + ' *<input type="password" maxlength="4" autocomplete="off" id="ps_pin"></label>' +
          '<div class="grid2"><button type="button" class="btn" data-psact="cancel">' + esc(t('cancel')) + '</button><button type="button" class="btn primary" data-psact="save">' + esc(t('save')) + '</button></div></div>';
      } else h += '<button type="button" class="btn primary block" data-psact="new">＋ ' + esc(t('newStop')) + '</button>';
      const tot = list.reduce((a, r) => a + (Number(r.durationMin) || 0), 0);
      h += '<div class="card stack"><h2>' + esc(t('list')) + ' · ' + tot + ' min</h2>' + (list.length ? list.map(r =>
        '<div class="small"><b>' + esc((r.code || '') + ' ' + ((r.codeInfo && r.codeInfo.name) || '')) + '</b> · ' + esc(String(r.durationMin === null || r.durationMin === undefined ? '—' : r.durationMin)) + ' min' +
        (r.stopKind ? ' · ' + esc(t('k_' + r.stopKind)) : '') + (r.equipment ? ' · ' + esc(r.equipment) : '') + '<br>' + esc(r.description || '') +
        (r.action ? '<br><span class="muted">' + esc(t('action')) + ': ' + esc(r.action) + '</span>' : '') + (r.consumables ? '<br><span class="muted">' + esc(t('cons')) + ': ' + esc(r.consumables) + '</span>' : '') +
        '<br><span class="muted">' + esc(C.L.nowTime(new Date(r.t))) + ' · ' + esc(r.by || '') + (r.src === 'prod' ? '' : ' · ' + esc(t('fromMaint'))) + '</span></div>').join('<hr>') : '<p class="small muted">' + esc(t('none')) + '</p>') + '</div>';
      return h;
    }
    async function save() {
      const f = st.form, s = sh();
      const dur = M.minsBetween(f.startTime, f.endTime);
      if (!f.stopKind || !f.code || !f.startTime || !f.endTime || !String(f.description || '').trim()) { C.toast(t('need')); return; }
      const e = M.validateStop(Object.assign({}, f, { by: 'x' }), C.codes());
      if (e.length) { C.toast(t('need')); return; }
      const startT = shiftMs(s.day, s.period, f.startTime);
      if (startT === null || dur === null) { C.toast(t('badTime')); return; }
      const w = await C.who(($('#ps_pin') || {}).value); if (!w) return;
      const c = M.findCode(f.code, C.codes()), now = Date.now();
      const rec = { uid: (root.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'ps' + now.toString(36) + Math.random().toString(36).slice(2, 8),
        kind: 'stop', src: 'prod', prodDay: s.day, period: s.period, shift: s.day + '/' + s.period, crew: C.crewOf(s.day, s.period), t: now, date: C.L.today(new Date(now)), time: C.L.nowTime(new Date(now)),
        stopKind: f.stopKind, category: M.catOfCode(f.code), code: f.code, codeInfo: { code: c.code, name: c.name, tier3: c.tier3 || null, oee: c.oee || null, source: C.codesSource() },
        lineId: f.lineId || null, equipment: String(f.equipment || '').trim(), startT, endT: startT + dur * 60000, durationMin: dur,
        description: String(f.description).trim(), action: String(f.action || '').trim(), consumables: String(f.consumables || '').trim(), comments: String(f.comments || '').trim(), by: w.title, role: w.role };
      try { await C.DB.add('maint', rec); } catch (err) { C.toast(t('fail')); return; }
      st.form = null; await reload(); C.toast(t('saved')); C.render();
    }
    document.addEventListener('click', ev => {
      const el = ev.target.closest('[data-psact]'); if (!el) return;
      const a = el.dataset.psact;
      if (a === 'new') { st.form = { stopKind: '', code: '', lineId: '', equipment: '', startTime: '', endTime: '', description: '', action: '', consumables: '', comments: '' }; C.render(); }
      else if (a === 'cancel') { st.form = null; C.render(); }
      else if (a === 'save') save();
    });
    document.addEventListener('input', ev => {
      const k = ev.target.dataset && ev.target.dataset.pf; if (!k || !st.form) return;
      st.form[k] = ev.target.value;
      if (k === 'startTime' || k === 'endTime') { const d = M.minsBetween(st.form.startTime, st.form.endTime), o = $('#ps_dur'); if (o) o.value = d === null ? '—' : String(d); }
    });
    document.addEventListener('change', ev => {
      const k = ev.target.dataset && ev.target.dataset.pf;
      if (k && st.form) { st.form[k] = ev.target.value; if (k === 'stopKind') { st.form.code = ''; C.render(); } return; }
      if (ev.target.id === 'ps_day' && ev.target.value) { sh().day = ev.target.value; C.render(); }
      if (ev.target.id === 'ps_per') { sh().period = ev.target.value === 'N' ? 'N' : 'D'; C.render(); }
    });
    return { view, reload, t };
  };
})(typeof window !== 'undefined' ? window : this);
