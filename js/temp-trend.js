// Tendências da temperatura dos silos (Grain-Mgt 0.13.0, Zhax 13-11-2026). Lê o resumo do mês que o pipeline FMIP põe em
// silo-temps.json ("trend": média diária por silo e nível — Topo = sensores 1–2, Meio = 3–4, Base = 5–7; todos os sensores válidos).
// O registo mensal completo (Excel) fica no Dropbox /Temperature Readings/AAAA-MM_Silos-Temperature-Log.xlsx, escrito pelo pipeline.
// C: {esc, lang, xlsx}. Eventos próprios: data-tt (silo escolhido), data-ttx (Excel).
(function (root) {
  'use strict';
  const T = {
    pt: { title: 'Tendência da temperatura — {m}', none: 'Ainda sem tendência do mês (o pipeline envia-a com as leituras dos sensores).', silo: 'Silo', site: 'Todos os silos (média)',
      date: 'Dia', top: 'Topo', mid: 'Meio', base: 'Base', amb: 'Ambiente', hot: 'Mais quente', note: 'Média diária de todos os sensores válidos (°C). Topo = sensores 1–2, Meio = 3–4, Base = 5–7. Cores: verde fresco → amarelo → vermelho quente (20–50 °C).',
      file: 'Registo mensal completo no Dropbox: /Temperature Readings/{f}', rise: 'Subida desde o início do mês', xlsx: 'Excel do mês (esta tendência)' },
    en: { title: 'Temperature trend — {m}', none: 'No trend for the month yet (the pipeline sends it with the sensor readings).', silo: 'Silo', site: 'All silos (average)',
      date: 'Day', top: 'Top', mid: 'Middle', base: 'Base', amb: 'Ambient', hot: 'Hottest', note: 'Daily average of all valid sensors (°C). Top = sensors 1–2, Middle = 3–4, Base = 5–7. Colours: green cool → yellow → red hot (20–50 °C).',
      file: 'Full monthly record in Dropbox: /Temperature Readings/{f}', rise: 'Change since the start of the month', xlsx: 'Month Excel (this trend)' }
  };
  const isNum = v => typeof v === 'number' && isFinite(v);
  // média do "site" por dia e nível
  function siteRow(day) {
    const out = [0, 1, 2].map(i => { const v = Object.values(day.silos || {}).map(x => x[i]).filter(isNum); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; });
    return out;
  }
  function seriesOf(trend, silo) {
    // todos os silos: a média de todas as leituras do dia enviada pelo pipeline (igual à folha Summary do Excel); sem ela, a média dos silos
    return Object.keys(trend.days || {}).sort().map(d => ({ d, v: silo ? ((trend.days[d].silos || {})[silo] || [null, null, null]) : (trend.days[d].site || siteRow(trend.days[d])), amb: trend.days[d].ambient, hot: trend.days[d].hot }));
  }
  // variação do primeiro ao último dia com valor, por nível
  function change(series) {
    return [0, 1, 2].map(i => { const v = series.map(x => x.v[i]).filter(isNum); return v.length > 1 ? Math.round((v[v.length - 1] - v[0]) * 10) / 10 : null; });
  }
  function heat(v) {
    if (!isNum(v)) return '';
    const x = Math.max(0, Math.min(1, (v - 20) / 30));
    const r = x < 0.5 ? Math.round(99 + 156 * x * 2) : 255, g = x < 0.5 ? Math.round(190 + 45 * x * 2) : Math.round(235 - 130 * (x - 0.5) * 2);
    return 'background:rgb(' + r + ',' + g + ',' + (x < 0.5 ? 105 : 97) + ')';
  }
  root.TempTrend = function (C) {
    const st = { silo: '' };
    const t = (k, v) => { let s = (T[C.lang()] || T.pt)[k] || T.pt[k] || k; Object.keys(v || {}).forEach(x => { s = s.split('{' + x + '}').join(v[x]); }); return s; };
    const n1 = v => isNum(v) ? String(v.toFixed(1)).replace('.', C.lang() === 'en' ? '.' : ',') : '—';
    function card(temps) {
      const tr = temps && temps.trend;
      if (!tr || !tr.days || !Object.keys(tr.days).length) return '<details class="card stack"><summary class="strong">' + C.esc(t('title', { m: '' })) + '</summary><p class="small muted">' + C.esc(t('none')) + '</p></details>';
      const silos = Array.from(new Set([].concat(...Object.values(tr.days).map(d => Object.keys(d.silos || {}))))).sort();
      const ser = seriesOf(tr, st.silo), ch = change(ser);
      let h = '<details class="card stack" open><summary class="strong">' + C.esc(t('title', { m: tr.month })) + '</summary>' +
        '<label>' + C.esc(t('silo')) + '<select data-tt="1"><option value="">' + C.esc(t('site')) + '</option>' + silos.map(s => '<option value="' + C.esc(s) + '"' + (s === st.silo ? ' selected' : '') + '>' + C.esc(s) + '</option>').join('') + '</select></label>' +
        '<div style="overflow-x:auto"><table class="tbl small"><tr><th>' + C.esc(t('date')) + '</th><th>' + C.esc(t('top')) + '</th><th>' + C.esc(t('mid')) + '</th><th>' + C.esc(t('base')) + '</th><th>' + C.esc(t('amb')) + '</th>' + (st.silo ? '' : '<th>' + C.esc(t('hot')) + '</th>') + '</tr>' +
        ser.map(x => '<tr><td>' + C.esc(x.d.slice(8, 10) + '/' + x.d.slice(5, 7)) + '</td>' + x.v.map(v => '<td style="' + heat(v) + '">' + n1(v) + '</td>').join('') + '<td>' + n1(x.amb) + '</td>' +
          (st.silo ? '' : '<td>' + (x.hot ? C.esc(x.hot[1] + ' ' + n1(x.hot[0])) : '—') + '</td>') + '</tr>').join('') + '</table></div>' +
        '<p class="small">' + C.esc(t('rise')) + ': ' + C.esc([t('top') + ' ' + (isNum(ch[0]) ? (ch[0] > 0 ? '+' : '') + n1(ch[0]) : '—'), t('mid') + ' ' + (isNum(ch[1]) ? (ch[1] > 0 ? '+' : '') + n1(ch[1]) : '—'), t('base') + ' ' + (isNum(ch[2]) ? (ch[2] > 0 ? '+' : '') + n1(ch[2]) : '—')].join(' · ')) + ' °C</p>' +
        '<p class="small muted">' + C.esc(t('note')) + '</p><p class="small muted">' + C.esc(t('file', { f: tr.month + '_Silos-Temperature-Log.xlsx' })) + '</p>' +
        '<button type="button" class="btn small" data-ttx="1">' + C.esc(t('xlsx')) + '</button></details>';
      return h;
    }
    function xlsx(temps) {
      const X = root.XLSX, tr = temps && temps.trend; if (!X || !tr) return;
      const rows = [[t('date'), t('silo'), t('top') + ' (°C)', t('mid') + ' (°C)', t('base') + ' (°C)', t('amb') + ' (°C)']];
      Object.keys(tr.days).sort().forEach(d => Object.keys(tr.days[d].silos).sort().forEach(s => { const v = tr.days[d].silos[s]; rows.push([d, s, v[0], v[1], v[2], tr.days[d].ambient]); }));
      const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(rows), 'Trend');
      X.writeFile(wb, tr.month + (C.lang() === 'en' ? '_Silo-Temperature-Trend.xlsx' : '_Tendencia-Temperatura-Silos.xlsx'));
    }
    document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.tt) { st.silo = e.target.value; C.render(); } });
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-ttx]')) xlsx(C.temps()); });
    return { card };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = { seriesOf, change, siteRow };
})(typeof window !== 'undefined' ? window : this);
