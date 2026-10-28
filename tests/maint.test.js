// node tests/maint.test.js — regras de manutenção (js/maint.js, igual nas duas apps)
const assert = require('assert');
const M = require('../js/maint.js');
let n = 0;
function t(name, fn) { try { fn(); n++; } catch (e) { console.error('FALHOU:', name); throw e; } }

const CODES = [
  { code: 'P04', name: 'LOOSE BELTS', tier3: 'Process', active: true },
  { code: 'P16', name: 'NO GRAIN AVAILABLE FOR MILLING', tier3: 'Other', active: true },
  { code: 'A07', name: 'MILLS', tier3: 'Breakdown', active: true },
  { code: 'A99', name: 'OFF', tier3: 'Breakdown', active: false },
  { code: 'O03', name: 'SCHEDULED MAINTENANCE', tier3: 'Other', active: true }
];
let seq = 0;
const rec = (kind, o) => Object.assign({ uid: 'u' + (++seq), kind, t: 1000 + seq, by: 'Zhax' }, o);

t('semanas ISO', () => {
  assert.strictEqual(M.weekOf('2026-10-05'), '2026-W41');
  assert.strictEqual(M.weekOf('2026-10-11'), '2026-W41');
  assert.strictEqual(M.weekOf('2026-10-12'), '2026-W42');
  assert.strictEqual(M.weekOf('2027-01-01'), '2026-W53');
  assert.deepStrictEqual(M.weekRange('2026-W43'), ['2026-10-19', '2026-10-25']);
  assert.ok(M.validWeek('2026-W53'));
  assert.ok(!M.validWeek('2027-W53'));
  assert.ok(!M.validWeek('2026-43'));
});

t('categorias pela letra do código (P/A/O), só códigos activos', () => {
  assert.deepStrictEqual(M.codesFor('Process', CODES).map(c => c.code), ['P04', 'P16']);
  assert.deepStrictEqual(M.codesFor('Breakdown', CODES).map(c => c.code), ['A07']);
  assert.deepStrictEqual(M.codesFor('Other', CODES).map(c => c.code), ['O03']);
});

t('paragem: categoria, código da categoria, duração 1–1440 min', () => {
  const ok = { category: 'Breakdown', code: 'A07', durationMin: '45', description: 'rolo B2', by: 'X' };
  assert.deepStrictEqual(M.validateStop(ok, CODES), []);
  assert.deepStrictEqual(M.validateStop(Object.assign({}, ok, { code: 'P04' }), CODES), ['code']);
  assert.deepStrictEqual(M.validateStop(Object.assign({}, ok, { code: 'A99' }), CODES), ['code']);
  assert.deepStrictEqual(M.validateStop(Object.assign({}, ok, { durationMin: '0' }), CODES), ['durationMin']);
  assert.deepStrictEqual(M.validateStop(Object.assign({}, ok, { durationMin: '1441' }), CODES), ['durationMin']);
  assert.deepStrictEqual(M.validateStop(Object.assign({}, ok, { durationMin: '1440' }), CODES), []);
  assert.deepStrictEqual(M.validateStop(Object.assign({}, ok, { durationMin: '12,5' }), CODES), []);
  assert.deepStrictEqual(M.validateStop(Object.assign({}, ok, { durationMin: 'x' }), CODES), ['durationMin']);
  assert.deepStrictEqual(M.validateStop({}, CODES), ['category', 'code', 'durationMin', 'description', 'by']);
});

t('intervenção: material com quantidade e unidade; fim depois do início', () => {
  const ok = { workType: 'corrective', equipment: 'Moinho B2', description: 'troca de correia', doneBy: 'Ana, Rui', by: 'X',
    parts: [{ item: 'Correia SPB 2000', qty: '2', unit: 'un' }, { item: '', qty: '', unit: 'un' }] };
  assert.deepStrictEqual(M.validateWork(ok), []);
  assert.strictEqual(M.cleanParts(ok.parts).length, 1);
  assert.deepStrictEqual(M.validateWork(Object.assign({}, ok, { parts: [{ item: 'Correia', qty: '0', unit: 'un' }] })), ['parts']);
  assert.deepStrictEqual(M.validateWork(Object.assign({}, ok, { parts: [{ item: '', qty: '1', unit: 'un' }] })), ['parts']);
  assert.deepStrictEqual(M.validateWork(Object.assign({}, ok, { parts: [{ item: 'Óleo', qty: '1', unit: 'gal' }] })), ['parts']);
  assert.deepStrictEqual(M.validateWork(Object.assign({}, ok, { startT: 2000, endT: 2000 })), ['endT']);
  assert.deepStrictEqual(M.validateWork(Object.assign({}, ok, { startT: NaN })), ['time']);
  assert.deepStrictEqual(M.validateWork(Object.assign({}, ok, { doneBy: ' ' })), ['doneBy']);
});

t('turno de manutenção e consumível', () => {
  assert.deepStrictEqual(M.validateShift({ prodDay: '2026-10-27', period: 'N', technicians: 'Ana', by: 'X' }), []);
  assert.deepStrictEqual(M.validateShift({ prodDay: '27/10', period: 'X', technicians: '', by: '' }), ['prodDay', 'period', 'technicians', 'by']);
  assert.deepStrictEqual(M.validateConsumable({ item: 'Massa', qty: '0,5', unit: 'kg', by: 'X' }), []);
  assert.deepStrictEqual(M.validateConsumable({ item: 'Massa', qty: '-1', unit: 'kg', by: 'X' }), ['qty']);
  assert.deepStrictEqual(M.validateConsumable({ item: 'Massa', qty: '1', unit: 'ton', by: 'X' }), ['unit']);
});

t('anulação retira o registo e a própria anulação', () => {
  const a = rec('stop', {}), v = rec('void', { voids: a.uid });
  const b = rec('stop', {});
  assert.deepStrictEqual(M.effective([a, v, b]).map(x => x.uid), [b.uid]);
});

t('preventiva: atraso só depois da data-limite; adiar muda a data; feito/cancelado fecha', () => {
  const j1 = rec('pmJob', { week: '2026-W44', dueDate: '2026-11-01', equipment: 'Compressor', task: 'Troca de óleo', responsible: 'Rui', prodDay: '2026-10-26' });
  const j2 = rec('pmJob', { week: '2026-W44', dueDate: '2026-10-28', equipment: 'Elevador EC2', task: 'Inspecção', responsible: 'Ana', prodDay: '2026-10-26' });
  const j3 = rec('pmJob', { week: '2026-W44', dueDate: '2026-10-28', equipment: 'Filtro', task: 'Mangas', responsible: 'Ana', prodDay: '2026-10-26' });
  let E = [j1, j2, j3];
  let s = M.pmState(E, '2026-10-28');
  assert.deepStrictEqual(s.map(x => x.overdue), [false, false, false]);
  s = M.pmState(E, '2026-10-29');
  assert.deepStrictEqual(s.map(x => [x.status, x.overdue, x.daysLate]), [['planned', false, 0], ['planned', true, 1], ['planned', true, 1]]);
  E = E.concat([rec('pmUpdate', { jobUid: j2.uid, status: 'in_progress', progressPct: '50' }),
    rec('pmUpdate', { jobUid: j2.uid, status: 'postponed', newDue: '2026-11-04', note: 'sem peça' }),
    rec('pmUpdate', { jobUid: j3.uid, status: 'done', doneBy: 'Ana', prodDay: '2026-10-29' })]);
  s = M.pmState(E, '2026-10-30');
  assert.deepStrictEqual(s.map(x => [x.status, x.due, x.overdue]), [['planned', '2026-11-01', false], ['postponed', '2026-11-04', false], ['done', '2026-10-28', false]]);
  assert.strictEqual(s[1].progress, 50);
  assert.strictEqual(s[1].postponed, 1);
  assert.strictEqual(s[2].progress, 100);
  const w = M.pmWeek(E, '2026-W44', '2026-10-30');
  assert.deepStrictEqual([w.planned, w.done, w.compliancePct, w.overdue], [3, 1, 33.3, 0]);
  // semana seguinte: trabalhos ainda em aberto passam para a lista (carried)
  const w45 = M.pmWeek(E, '2026-W45', '2026-11-05');
  assert.deepStrictEqual([w45.planned, w45.carried, w45.overdue, w45.compliancePct], [0, 2, 2, null]);
});

t('lista de preventiva: devida, em atraso, planeada, bloqueada até voltar a vencer', () => {
  const TK = [{ id: 'FMO0124-M', code: 'FMO0124', asset: 'Moinho de Martelos - P0', task: 'Moinho Martelo', freq: 'mensal', months: 1 },
    { id: 'FMO0096-T', code: 'FMO0096', asset: 'Moinho de Rolos - P1', task: 'Moinho Rolos', freq: 'trimestral', months: 3 }];
  let c = M.pmCatalog(TK, [], '2026-10-28', '2026-W44');
  assert.deepStrictEqual(c.map(x => [x.status, x.pickable, x.overdue]), [['never', true, false], ['never', true, false]], 'sem registo: devida, mas não em atraso');
  const j = rec('pmJob', { week: '2026-W44', dueDate: '2026-11-01', taskId: 'FMO0124-M', equipment: 'FMO0124', task: 'Moinho Martelo', responsible: 'Rui', prodDay: '2026-10-28' });
  c = M.pmCatalog(TK, [j], '2026-10-28', '2026-W44');
  assert.deepStrictEqual([c[0].status, c[0].pickable], ['planned', false], 'já planeada: não se escolhe outra vez');
  const done = rec('pmUpdate', { jobUid: j.uid, status: 'done', doneBy: 'Rui', prodDay: '2026-10-29' });
  c = M.pmCatalog(TK, [j, done], '2026-10-30', '2026-W45');
  assert.deepStrictEqual([c[0].status, c[0].lastDone, c[0].nextDue, c[0].pickable], ['ok', '2026-10-29', '2026-11-29', false], 'feita: bloqueada até vencer');
  assert.deepStrictEqual([M.pmCatalog(TK, [j, done], '2026-11-25', '2026-W48')[0].status, M.pmCatalog(TK, [j, done], '2026-11-25', '2026-W48')[0].pickable], ['due', true], 'vence na semana planeada');
  c = M.pmCatalog(TK, [j, done], '2026-12-02', '2026-W49');
  assert.deepStrictEqual([c[0].status, c[0].overdue, c[0].daysLate, c[0].pickable], ['overdue', true, 3, true]);
  assert.deepStrictEqual(M.warnings([j, done], [], '2026-12-02', { pmTasks: TK }).map(w => [w.type, w.n]), [['pm_tasks_overdue', 1]]);
  assert.strictEqual(M.addMonthsDate('2026-01-31', 1), '2026-02-28');
  assert.deepStrictEqual(M.validatePmJob({ week: '2026-W49', dueDate: '2026-12-06', taskId: 'FMO0124-M', equipment: 'a', task: 'b', responsible: 'c', by: 'd' }, c), []);
  assert.deepStrictEqual(M.validatePmJob({ week: '2026-W49', dueDate: '2026-12-06', taskId: 'FMO0096-T', equipment: 'a', task: 'b', responsible: 'c', by: 'd' }, M.pmCatalog(TK, [j, done, rec('pmJob', { week: '2026-W49', taskId: 'FMO0096-T', dueDate: '2026-12-06', equipment: 'x', task: 'y', responsible: 'z' })], '2026-12-02', '2026-W49')), ['taskId']);
});

t('preventiva: validação do progresso', () => {
  const job = { uid: 'j' };
  assert.deepStrictEqual(M.validatePmUpdate({ status: 'in_progress', progressPct: '40', by: 'X' }, job), []);
  assert.deepStrictEqual(M.validatePmUpdate({ status: 'in_progress', progressPct: '140', by: 'X' }, job), ['progressPct']);
  assert.deepStrictEqual(M.validatePmUpdate({ status: 'postponed', by: 'X' }, job), ['newDue', 'note']);
  assert.deepStrictEqual(M.validatePmUpdate({ status: 'done', by: 'X' }, job), ['doneBy']);
  assert.deepStrictEqual(M.validatePmUpdate({ status: 'cancelled', by: 'X' }, null), ['job', 'note']);
  assert.deepStrictEqual(M.validatePmJob({ week: '2026-W44', dueDate: '2026-11-01', equipment: 'a', task: 'b', responsible: 'c', by: 'd' }), []);
  assert.deepStrictEqual(M.validatePmJob({ week: '2026-W60', dueDate: '', equipment: '', task: '', responsible: '', by: '' }),
    ['week', 'dueDate', 'equipment', 'task', 'responsible', 'by']);
});


// Horas de marcha de teste (formato roll-hours.json): 10 h/dia de 01-08 a 10-08, 31-08 em falta; linha D sem horas
const H = { start: '2026-08-01', lastDay: '2026-09-02', lines: {
  C: { days: Object.assign({}, ...Array.from({ length: 10 }, (_, i) => ({ ['2026-08-' + String(i + 1).padStart(2, '0')]: 10 })), { '2026-09-01': 5, '2026-09-02': 5 }), missing: ['2026-08-31'] },
  D: { days: {}, missing: [] } } };
const P = [
  { id: 'C-B1-1', lineId: 'C', passage: 'B1', hoursGroup: 'B1', name: 'B1 · par 1/3', baseline: { start: '2026-08-01' } },
  { id: 'C-R3-3', lineId: 'C', passage: 'R3', hoursGroup: 'R', name: 'R3 · par 3/3', baseline: { start: '2026-08-01', lastChange: '2026-08-05' } },
  { id: 'C-B3-1', lineId: 'C', passage: 'B3', hoursGroup: 'B3', name: 'B3 · par 1/2', baseline: { start: '2026-08-01', inspection: 'due', inspectionDate: '2026-08-10', note: 'gasto' } }
];
const LIM = { B1: 100, B3: 2400, R: 3000 };

t('horas da linha: soma, dias em falta, limite ao último dia com dados', () => {
  assert.deepStrictEqual(M.lineHours(H, 'C', '2026-08-01', '2026-09-30'), { hours: 110, missing: ['2026-08-31'] });
  assert.deepStrictEqual(M.lineHours(H, 'C', '2026-08-06', '2026-08-08'), { hours: 30, missing: [] });
  assert.deepStrictEqual(M.lineHours(H, 'D', '2026-08-01', '2026-09-30'), { hours: 0, missing: [] });
  assert.deepStrictEqual(M.lineHours(null, 'C', '2026-08-01'), { hours: null, missing: [] });
});

t('horas ideais: lista mestre, alteradas nas Definições (último registo manda)', () => {
  const E = [rec('rollConfig', { scope: 'hours', group: 'B1', hours: '1500', reason: 'x' }), rec('rollConfig', { scope: 'hours', group: 'B1', hours: 1300, reason: 'y' })];
  assert.deepStrictEqual(M.effectiveLimits({ B1: 1200, R: 3000 }, E), { B1: 1300, R: 3000 });
});

t('rolos: horas desde o início ou a troca; inspecção só depois das horas ideais', () => {
  let r = M.rollState(P, [], '2026-09-02', { hours: H, limits: LIM });
  assert.deepStrictEqual([r[0].hours, r[0].over, r[0].status, r[0].missingDays], [110, true, 'inspect', ['2026-08-31']]);
  assert.deepStrictEqual([r[1].startDay, r[1].hours, r[1].over, r[1].status], ['2026-08-06', 60, false, 'ok']);
  // estado inicial do registo: B3-1 'para reestriar' → precisa de inspecção semanal, mesmo abaixo das horas
  assert.deepStrictEqual([r[2].condition, r[2].needsInspection, r[2].status, r[2].inspection.baseline], ['due', true, 'inspect', true]);
  // sem ficheiro de horas: horas desconhecidas, sem aviso de horas
  r = M.rollState(P, [], '2026-09-02', { hours: null, limits: LIM });
  assert.deepStrictEqual([r[0].hours, r[0].over, r[0].status], [null, false, 'ok']);
  // inspecção desta semana: 'ainda bom' → sem aviso (fica 'over'); na semana seguinte volta a pedir inspecção
  const E = [rec('rollCheck', { passageId: 'C-B1-1', week: M.weekOf('2026-09-02'), condition: 'good', prodDay: '2026-09-02' })];
  assert.strictEqual(M.rollState(P, E, '2026-09-02', { hours: H, limits: LIM })[0].status, 'over');
  assert.strictEqual(M.rollState(P, E, '2026-09-08', { hours: H, limits: LIM })[0].status, 'inspect');
  E.push(rec('rollCheck', { passageId: 'C-B1-1', week: M.weekOf('2026-09-08'), condition: 'critical', note: 'aquece', prodDay: '2026-09-08' }));
  assert.strictEqual(M.rollState(P, E, '2026-09-08', { hours: H, limits: LIM })[0].status, 'critical');
  assert.deepStrictEqual(M.warnings(E, P.slice(0, 1), '2026-09-08', { hours: H, limits: LIM }).map(w => [w.type, w.level]), [['roll_critical', 'bad']]);
});

t('rolos: troca recomeça horas e estado; IDs e diâmetros; registo de reestriagem em horas', () => {
  const E = [
    rec('rollConfig', { scope: 'rollIds', passageId: 'C-B1-1', rollFast: 'R-101', rollSlow: 'R-102', reason: 'inicial' }),
    rec('rollCheck', { passageId: 'C-B1-1', week: '2026-W32', condition: 'critical', note: 'x' }),
    rec('rollMeasure', { passageId: 'C-B1-1', diaFast: '249,5', diaSlow: 249.2, date: '2026-08-08' }),
    rec('rollChange', { passageId: 'C-B1-1', date: '2026-08-08', reason: 'wear', refluted: true, newFast: 'R-201', newSlow: '', diaFast: 248, doneBy: 'Rui' })
  ];
  const r = M.rollState(P, E, '2026-09-02', { hours: H, limits: LIM })[0];
  assert.deepStrictEqual([r.startDay, r.hours, r.condition, r.status, r.lastChangeDate], ['2026-08-09', 30, null, 'ok', '2026-08-08']);
  assert.deepStrictEqual(r.rollIds, { fast: 'R-201', slow: 'R-102' }, 'ID em branco na troca mantém o anterior');
  assert.deepStrictEqual([r.diaFast, r.diaSlow, r.measuredOn], [248, null, '2026-08-08'], 'a troca com diâmetro é a medição mais recente');
  assert.deepStrictEqual(r.register, [{ date: '2026-08-08', reason: 'wear', refluted: true, hours: 80, missingDays: 0 }]);
  assert.deepStrictEqual([r.changes, r.refluted, r.avgHoursBetween], [1, 1, 80]);
});

t('escovas: aviso quando críticas ou em falta', () => {
  const E = [rec('brushCheck', { passageId: 'C-R3-3', state: 'missing', note: 'sem escovas' })];
  assert.deepStrictEqual(M.warnings(E, P, '2026-09-02', { hours: H, limits: LIM }).map(w => w.type), ['roll_inspect', 'brush_missing', 'roll_inspect']);
  E.push(rec('brushCheck', { passageId: 'C-R3-3', state: 'good' }));
  assert.deepStrictEqual(M.warnings(E, P, '2026-09-02', { hours: H, limits: LIM }).map(w => w.type), ['roll_inspect', 'roll_inspect']);
});

t('rolos, escovas, Definições e notas: validação', () => {
  assert.deepStrictEqual(M.validateRollCheck({ passageId: 'C-B1-1', week: '2026-W44', condition: 'good', by: 'X' }, P), []);
  assert.deepStrictEqual(M.validateRollCheck({ passageId: 'C-B1-1', week: '2026-W44', condition: 'due', by: 'X' }, P), ['note']);
  assert.deepStrictEqual(M.validateRollCheck({ passageId: 'Z', week: '2026-W44', condition: 'worn', by: 'X' }, P), ['passageId', 'condition', 'note']);
  assert.deepStrictEqual(M.validateRollChange({ passageId: 'C-B1-1', date: '2026-10-31', reason: 'wear', diaFast: '249', diaSlow: '', doneBy: 'R', by: 'X' }, P), []);
  assert.deepStrictEqual(M.validateRollChange({ passageId: 'C-B1-1', date: '2026-10-31', reason: 'x', diaFast: '2490', doneBy: '', by: 'X' }, P), ['reason', 'diaFast', 'doneBy']);
  assert.deepStrictEqual(M.validateRollMeasure({ passageId: 'C-B1-1', diaFast: '', diaSlow: '', by: 'X' }, P), ['diaFast']);
  assert.deepStrictEqual(M.validateRollMeasure({ passageId: 'C-B1-1', diaFast: '249,8', diaSlow: '100', by: 'X' }, P), ['diaSlow']);
  assert.deepStrictEqual(M.validateBrushCheck({ passageId: 'C-B1-1', state: 'critical', by: 'X' }, P), ['note']);
  assert.deepStrictEqual(M.validateBrushCheck({ passageId: 'C-B1-1', state: 'worn', by: 'X' }, P), []);
  assert.deepStrictEqual(M.validateRollConfig({ scope: 'hours', group: 'B1', hours: '1200', reason: 'r', by: 'X' }, P, ['B1', 'R']), []);
  assert.deepStrictEqual(M.validateRollConfig({ scope: 'hours', group: 'B9', hours: '50', reason: '', by: 'X' }, P, ['B1', 'R']), ['group', 'hours', 'reason']);
  assert.deepStrictEqual(M.validateRollConfig({ scope: 'rollIds', passageId: 'C-B1-1', rollFast: 'A1', reason: 'r', by: 'X' }, P, []), []);
  assert.deepStrictEqual(M.validateNote({ topic: 'requirement', text: '72 escovas', by: 'X' }), []);
  assert.deepStrictEqual(M.validateNote({ topic: 'x', text: ' ', by: '' }), ['topic', 'text', 'by']);
});

t('resumo do turno e totais de consumíveis', () => {
  const day = '2026-10-27';
  const E = [
    rec('stop', { prodDay: day, period: 'D', category: 'Breakdown', code: 'A07', durationMin: 45 }),
    rec('stop', { prodDay: day, period: 'D', category: 'Process', code: 'P04', durationMin: '15' }),
    rec('stop', { prodDay: day, period: 'N', category: 'Other', code: 'O03', durationMin: 60 }),
    rec('consumable', { prodDay: day, period: 'D', item: 'Massa EP2', qty: '0,5', unit: 'kg' }),
    rec('consumable', { prodDay: day, period: 'D', item: 'massa  ep2', qty: 1, unit: 'kg' }),
    rec('consumable', { prodDay: day, period: 'N', item: 'Massa EP2', qty: 2, unit: 'un' }),
    rec('work', { prodDay: day, period: 'D' })
  ];
  const d = M.shiftSummary(E, day, 'D');
  assert.deepStrictEqual([d.stops.length, d.stopMin, d.byCat.Breakdown, d.byCat.Process, d.works.length], [2, 60, 45, 15, 1]);
  assert.deepStrictEqual(d.consumableTotals, [{ item: 'Massa EP2', unit: 'kg', qty: 1.5, n: 2 }]);
  const all = M.shiftSummary(E, day);
  assert.deepStrictEqual([all.stopMin, all.consumableTotals.length], [120, 2]);
});

console.log('maint: ' + n + ' testes OK');
