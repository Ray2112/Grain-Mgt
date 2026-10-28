// node tests/fssc.test.js — conformidade FSSC 22000 (js/fssc.js + js/fssc-reqs.js, iguais nas duas apps)
const assert = require('assert');
const F = require('../js/fssc.js');
const Q = require('../js/fssc-reqs.js');
let n = 0;
function t(name, fn) { try { fn(); n++; } catch (e) { console.error('FALHOU:', name); throw e; } }
let seq = 0;
const rec = (kind, o) => Object.assign({ uid: 'u' + String(++seq).padStart(4, '0'), kind, t: 1000 + seq, by: 'Zhax' }, o);
const REQS = [
  { id: 'A', sec: 'iso5', area: 'both', doc: true }, { id: 'B', sec: 'iso5', area: 'both', doc: false },
  { id: 'C', sec: 'fssc', area: 'mill', doc: true }, { id: 'D', sec: 'fssc', area: 'grain', doc: true }
];

t('registo de requisitos: ids únicos, secções conhecidas, áreas válidas; §2.5.14 e §2.5.18 fora (não aplicáveis a CIV)', () => {
  const ids = Q.REQS.map(r => r.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  const secs = Q.SECTIONS.map(s => s[0]);
  assert.ok(Q.REQS.every(r => secs.indexOf(r.sec) >= 0 && ['both', 'mill', 'grain'].indexOf(r.area) >= 0 && r.pt && r.en));
  assert.ok(!ids.some(i => /2\.5\.1[48]/.test(i)));
  assert.ok(ids.indexOf('F-2.5.12') >= 0 && ids.indexOf('F-2.5.17') >= 0);
  assert.ok(F.applicable(Q.REQS, 'mill').length > F.applicable(Q.REQS, 'grain').length);
});

t('meses e datas de revisão', () => {
  assert.strictEqual(F.addMonths('2026-12', 1), '2027-01');
  assert.strictEqual(F.addMonths('2026-01', -1), '2025-12');
  assert.strictEqual(F.addMonthsDay('2026-01-31', 1), '2026-02-28');
  assert.strictEqual(F.addMonthsDay('2026-10-28', 12), '2027-10-28');
});

t('avaliação: justificação para N/A e não conformidades; acção, responsável e prazo para Menor/Maior/Crítica', () => {
  const req = REQS[0];
  assert.deepStrictEqual(F.validateGrade({ month: '2026-10', grade: 'C', by: 'X' }, req), []);
  assert.deepStrictEqual(F.validateGrade({ month: '2026-10', grade: 'NA', by: 'X' }, req), ['evidence']);
  assert.deepStrictEqual(F.validateGrade({ month: '2026-10', grade: 'MA', evidence: 'x', by: 'X' }, req), ['action', 'owner', 'due']);
  assert.deepStrictEqual(F.validateGrade({ month: '2026-13', grade: 'Z', by: '' }, null), ['reqId', 'month', 'grade', 'by']);
});

t('pontuação: média dos aplicáveis; N/A não conta; Maior limita a 89; Crítica limita a 49', () => {
  const G = g => Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { grade: v }]));
  let s = F.score(REQS, 'mill', G({ A: 'C', B: 'MI', C: 'NA' }));
  assert.deepStrictEqual([s.score, s.applicable, s.complete, s.band], [85, 3, true, 'fair']);
  s = F.score(REQS, 'mill', G({ A: 'C', B: 'C' }));
  assert.deepStrictEqual([s.score, s.complete, s.counts.open], [100, false, 1]);
  s = F.score(REQS, 'mill', G({ A: 'C', B: 'C', C: 'MA' }));
  assert.deepStrictEqual([s.raw, s.score, s.band], [76.7, 76.7, 'fair']);
  const many = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ({ id: 'X' + i, sec: 's', area: 'both' }));
  const Gm = Object.fromEntries(many.map((r, i) => [r.id, { grade: i === 0 ? 'MA' : 'C' }]));
  s = F.score(many, 'mill', Gm);
  assert.deepStrictEqual([s.raw, s.score, s.band], [93, 89, 'fair'], 'uma Maior não deixa passar de 89');
  Gm.X1 = { grade: 'CR' };
  s = F.score(many, 'mill', Gm);
  assert.deepStrictEqual([s.raw, s.score, s.band], [90, 49, 'critical']);
  assert.strictEqual(F.score(REQS, 'grain', {}).score, null);
});

t('avaliações: a última de cada requisito no mês conta; anulação', () => {
  const a = rec('grade', { month: '2026-10', reqId: 'A', grade: 'MI' }), b = rec('grade', { month: '2026-10', reqId: 'A', grade: 'C' });
  assert.strictEqual(F.grades([a, b], '2026-10').A.grade, 'C');
  assert.strictEqual(F.grades([a, b, rec('void', { voids: b.uid })], '2026-10').A.grade, 'MI');
  assert.deepStrictEqual(F.grades([a], '2026-11'), {});
});

t('documentos: versão em vigor, revisão em atraso, cobertura dos requisitos', () => {
  const E = [
    rec('doc', { code: 'pol-01', title: 'Política SA', reqIds: ['A'], status: 'approved', version: '1', approvedOn: '2025-09-01', reviewMonths: 12, owner: 'QC' }),
    rec('doc', { code: 'POL-01', title: 'Política SA', reqIds: ['A'], status: 'approved', version: '2', approvedOn: '2026-09-01', reviewMonths: 12, owner: 'QC' }),
    rec('doc', { code: 'PRC-07', title: 'Proc.', reqIds: ['C'], status: 'approved', version: '1', approvedOn: '2025-01-15', reviewMonths: 12, owner: 'QC' }),
    rec('doc', { code: 'PLN-02', title: 'Plano', reqIds: ['D'], status: 'draft', owner: 'QC' })
  ];
  const D = F.docs(E, '2026-10-28');
  assert.deepStrictEqual(D.map(d => [d.code, d.state, d.nextReview]), [['PLN-02', 'draft', null], ['POL-01', 'ok', '2027-09-01'], ['PRC-07', 'overdue', '2026-01-15']]);
  const cm = F.docCoverage(REQS, 'mill', E, '2026-10-28');
  assert.deepStrictEqual(cm.rows.map(r => [r.req.id, r.state]), [['A', 'ok'], ['C', 'overdue']]);
  assert.deepStrictEqual([cm.ok, cm.total, cm.pct], [1, 2, 50]);
  assert.deepStrictEqual(F.docCoverage(REQS, 'grain', E, '2026-10-28').rows.map(r => r.state), ['ok', 'draft']);
  assert.deepStrictEqual(F.validateDoc({ code: 'X', title: 'Y', reqIds: ['A'], status: 'approved', owner: 'o', by: 'b' }, REQS), ['version', 'approvedOn', 'reviewMonths']);
  assert.deepStrictEqual(F.validateDoc({ code: '', title: 'Y', reqIds: ['Z'], status: 'draft', owner: 'o', by: 'b' }, REQS), ['code', 'reqIds']);
});

t('fecho e reabertura do mês; acções e avisos', () => {
  const g1 = rec('grade', { month: '2026-09', reqId: 'A', grade: 'MA', evidence: 'e', action: 'rever', owner: 'Ana', due: '2026-10-15' });
  const g2 = rec('grade', { month: '2026-09', reqId: 'B', grade: 'CR', evidence: 'e', action: 'parar', owner: 'Rui', due: '2026-11-15' });
  const close = rec('close', { month: '2026-09', score: 49, counts: { C: 0, MI: 0, MA: 1, CR: 1, NA: 0 } });
  let E = [g1, g2];
  assert.deepStrictEqual(F.warnings(E, REQS, 'mill', '2026-10-10').map(w => w.type), []);
  assert.deepStrictEqual(F.warnings(E, REQS, 'mill', '2026-10-11').map(w => w.type), ['month_open']);
  E = E.concat([close]);
  assert.strictEqual(F.monthState(E, '2026-09').closed, true);
  assert.deepStrictEqual(F.warnings(E, REQS, 'mill', '2026-10-16').map(w => [w.type, w.level]), [['action_overdue', 'bad'], ['month_critical', 'bad']]);
  E = E.concat([rec('actionDone', { gradeUid: g1.uid, note: 'feito' }), rec('reopen', { month: '2026-09', reason: 'erro' })]);
  assert.strictEqual(F.monthState(E, '2026-09').closed, false);
  const A = F.actions(E, '2026-10-16');
  assert.deepStrictEqual(A.map(a => [a.grade.reqId, !!a.done, a.overdue]), [['B', false, false], ['A', true, false]]);
});

console.log('fssc: ' + n + ' testes OK');
