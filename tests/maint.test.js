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

t('rolos: plano, atraso, intervalo de reestriagem, registo de frequência', () => {
  const P = [{ id: 'C-B1', lineId: 'C', name: 'B1', fluteSpec: '', refluteEveryDays: 90 }, { id: 'C-B2', lineId: 'C', name: 'B2', fluteSpec: '' }];
  let E = [rec('rollCheck', { passageId: 'C-B1', week: '2026-W43', condition: 'worn', note: 'desgaste', plannedChange: '2026-10-30' })];
  let r = M.rollState(P, E, '2026-10-30');
  assert.deepStrictEqual([r[0].plan, r[0].overdue, r[0].condition, r[0].checkedThisWeek], ['2026-10-30', false, 'worn', false]);
  assert.strictEqual(M.rollState(P, E, '2026-10-24')[0].checkedThisWeek, true);
  r = M.rollState(P, E, '2026-10-31');
  assert.deepStrictEqual([r[0].overdue, r[0].daysLate, r[1].plan, r[1].overdue], [true, 1, null, false]);
  assert.deepStrictEqual(M.warnings(E, P, '2026-10-31').map(w => [w.type, w.passageId, w.due]), [['roll_overdue', 'C-B1', '2026-10-30']]);
  // troca sem próxima data: plano calculado pelo intervalo de 90 dias
  E = E.concat([rec('rollChange', { passageId: 'C-B1', date: '2026-10-31', reason: 'wear', refluted: true, fluteSpec: '10 estrias/cm', doneBy: 'Rui' })]);
  r = M.rollState(P, E, '2026-11-01');
  assert.deepStrictEqual([r[0].plan, r[0].planCalc, r[0].overdue, r[0].changes, r[0].refluted, r[0].fluteSpec], ['2027-01-29', true, false, 1, 1, '10 estrias/cm']);
  assert.strictEqual(r[0].condition, null, 'rolos novos: estado anterior à troca não conta');
  E = E.concat([rec('rollChange', { passageId: 'C-B1', date: '2027-01-20', reason: 'scheduled', refluted: false, nextPlanned: '2027-04-20', doneBy: 'Rui' })]);
  r = M.rollState(P, E, '2027-01-21');
  assert.deepStrictEqual([r[0].plan, r[0].planCalc, r[0].avgDaysBetween, r[0].changes12m], ['2027-04-20', false, 81, 2]);
});

t('rolos: validação', () => {
  const P = [{ id: 'C-B1' }];
  assert.deepStrictEqual(M.validateRollCheck({ passageId: 'C-B1', week: '2026-W44', condition: 'good', by: 'X' }, P), []);
  assert.deepStrictEqual(M.validateRollCheck({ passageId: 'C-B1', week: '2026-W44', condition: 'damaged', by: 'X' }, P), ['note']);
  assert.deepStrictEqual(M.validateRollCheck({ passageId: 'Z', week: '2026-W44', condition: 'good', plannedChange: '30/10', by: 'X' }, P), ['passageId', 'plannedChange']);
  assert.deepStrictEqual(M.validateRollChange({ passageId: 'C-B1', date: '2026-10-31', reason: 'wear', nextPlanned: '2026-10-31', doneBy: 'R', by: 'X' }, P), ['nextPlanned']);
  assert.deepStrictEqual(M.validateRollChange({ passageId: 'C-B1', date: '2026-10-31', reason: 'x', doneBy: '', by: 'X' }, P), ['reason', 'doneBy']);
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
