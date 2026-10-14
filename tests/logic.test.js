/* Testes das regras: node tests/logic.test.js */
const L = require('../js/logic.js');
const assert = require('assert');
let n = 0; function ok(name, fn) { fn(); n++; }
const SOP = { hum: ['13.0', '14.0', '15.0'], brk: ['3.0', '6.0', '10.0'], fm: ['1.0', '2.0', '3.0'], dis: ['0.5', '1.0', '2.0'], sw: ['72', '68', '64'], humLow: '12.5' };
const base = { hum: '12.8', brk: '2', fm: '0,5', dis: '0.3', sw: '74', odor: 'Normal', ins: 'N' };
const g = (o, m) => L.gradeLot(Object.assign({}, base, o), SOP, m || {});

ok('num kg thousands', () => {
  assert.strictEqual(L.num('30.000', 'kg'), 30000);
  assert.strictEqual(L.num('30 000', 'kg'), 30000);
  assert.strictEqual(L.num('1.250,5', 'kg'), 1250.5);
  assert.strictEqual(L.num('1,250.5', 'kg'), 1250.5);
  assert.strictEqual(L.num('30.5', 'kg'), 30.5);
  assert.strictEqual(L.num('13,5'), 13.5);
  assert.strictEqual(L.num('13.000'), 13);
  assert.strictEqual(L.num(''), null);
  assert.ok(isNaN(L.num('1O')));
  assert.ok(isNaN(L.num('1.2.3', 'kg')));
});
ok('grade 1', () => assert.strictEqual(g({}).code, 'G1'));
ok('boundary 13.0 is G1, 13.05 is G2', () => { assert.strictEqual(g({ hum: '13,0' }).code, 'G1'); assert.strictEqual(g({ hum: '13.05' }).code, 'G2'); });
ok('worst parameter wins', () => assert.strictEqual(g({ brk: '7' }).code, 'OFF'));
ok('reject above off-grade', () => { assert.strictEqual(g({ fm: '3.1' }).code, 'REJ'); assert.strictEqual(g({ hum: '15.01' }).code, 'REJ'); });
ok('SW between grades -> lower', () => { assert.strictEqual(g({ sw: '71.5' }).code, 'G2'); assert.strictEqual(g({ sw: '63.9' }).code, 'REJ'); });
ok('odour -> HOLD with matrix kept', () => { const r = g({ odor: 'Anormal', brk: '4' }); assert.strictEqual(r.code, 'HOLD'); assert.strictEqual(r.matrix, 'G2'); });
ok('reject beats hold', () => assert.strictEqual(g({ ins: 'S', dis: '5' }).code, 'REJ'));
ok('missing -> INCOMPLETE', () => assert.strictEqual(g({ sw: '' }).code, 'INCOMPLETE'));
ok('typo -> INVALID', () => assert.strictEqual(g({ dis: '0.O' }).code, 'INVALID'));
ok('low moisture note', () => assert.deepStrictEqual(g({ hum: '12' }).notes, ['low_moisture']));
ok('myco above limit -> REJ', () => assert.strictEqual(g({ afla: '12' }, { afla: '10' }).code, 'REJ'));
ok('myco required missing -> HOLD', () => assert.strictEqual(g({}, { afla: '10', aflaRequired: true }).code, 'HOLD'));
ok('no limits -> NONE', () => assert.strictEqual(L.gradeLot(base, {}, {}).code, 'NONE'));
ok('release options never upgrade', () => { assert.deepStrictEqual(L.releaseOptions('G2'), ['G2', 'OFF', 'REJ']); assert.deepStrictEqual(L.releaseOptions('OFF', true), ['OFF', 'PRI', 'REJ']); });
ok('allocate in order', () => {
  const a = L.allocate(30000, [{ id: 'S1', avail: 12000 }, { id: 'S2', avail: 50000 }]);
  assert.deepStrictEqual(a, { parts: [{ silo: 'S1', kg: 12000 }, { silo: 'S2', kg: 18000 }], short: 0 });
  assert.strictEqual(L.allocate(30000, [{ id: 'S1', avail: 10000 }]).short, 20000);
});
ok('silo contents and free space', () => {
  const ev = [{ seq: 1, date: '2026-10-05', time: '08:00', silo: 'S1', type: 'IN', lots: ['A'], kg: 20000 },
    { seq: 2, date: '2026-10-05', time: '09:00', silo: 'S1', type: 'OUT', lots: ['A'], kg: 5000 },
    { seq: 3, date: '2026-10-05', time: '10:00', silo: 'S1', type: 'TRANSFER', toSilo: 'S2', lots: ['A'], kg: 1000 }];
  assert.strictEqual(L.siloContents('S1', ev).kg, 14000);
  assert.strictEqual(L.siloContents('S2', ev).kg, 1000);
  assert.strictEqual(L.freeSpace({ id: 'S1', cap: '50.000' }, ev), 36000);
  assert.strictEqual(L.freeSpace({ id: 'S1', cap: '' }, ev), null);
});
ok('silo fit', () => {
  const lot = { cereal: 'Milho', colour: 'Amarelo', grade: 'G1' };
  assert.deepStrictEqual(L.siloFit(lot, { cereal: 'Milho', colour: 'Amarelo', grade: 'G1' }), { ok: true, mismatch: false });
  assert.deepStrictEqual(L.siloFit(lot, { cereal: 'Milho', colour: 'Amarelo', grade: 'G2' }), { ok: true, mismatch: true });
  assert.strictEqual(L.siloFit(lot, { cereal: 'Milho', colour: 'Branco', grade: 'G1' }).why, 'other_colour');
  assert.strictEqual(L.siloFit(lot, { cereal: 'Trigo', grade: 'G1' }).why, 'other_cereal');
  assert.strictEqual(L.siloFit(lot, { cereal: '', grade: '' }).why, 'not_designated');
});
ok('backup validation', () => {
  const good = { app: 'moagem-app', format: 3, lots: [{ id: 'REC-261005-01', status: 'ACCEPTED', grade: 'G1' }], events: [{ type: 'IN', silo: 'S1' }], settings: [{ key: 'main' }], monitor: [{ kind: 'ROUND', silo: 'S1' }], sevents: [{ id: 'EV-1', status: 'OPEN' }] };
  assert.ok(L.validBackup(good));
  assert.ok(!L.validBackup(Object.assign({}, good, { lots: [{ id: 'X', status: 'x"><img src=x onerror=alert(1)>' }] })));
  assert.ok(!L.validBackup(Object.assign({}, good, { lots: [{ id: '<b>', status: 'HELD' }] })));
});
const ST = { moist: ['13.00', '13.50', '14.00', '15.00'], temp: ['25.0', '30.0', '35.0', '40.0'], dt: ['2.0', '3.0'], shifts: ['07:00', '19:00'], weeklyDays: '7', amberRounds: '2', clearShifts: '3' };
ok('moisture bands (Table 5.1)', () => {
  assert.deepStrictEqual(['13', '13.01', '13.5', '13.51', '14', '14.01', '15', '15.01'].map(v => L.moistBand(v, ST)), [0, 1, 1, 2, 2, 3, 3, 4]);
});
ok('temp and dT bands', () => {
  const th = L.storeTh(ST);
  assert.deepStrictEqual([25, 25.1, 30, 30.1, 35, 35.1, 40, 40.1].map(v => L.bandTemp(v, th.t)), [0, 1, 1, 2, 2, 4, 4, 5]);
  assert.deepStrictEqual([-1, 1.9, 2.0, 2.9, 3.0].map(v => L.bandDT(v, th.d)), [0, 0, 2, 2, 4]);
});
ok('priority: moisture orange, rest G1/G2', () => {
  const r = L.intakeClass(Object.assign({}, base, { hum: '14.5', brk: '4' }), SOP, {}, ST);
  assert.strictEqual(r.code, 'PRI'); assert.strictEqual(r.baseGrade, 'G2');
  assert.strictEqual(L.intakeClass(Object.assign({}, base, { hum: '14.5', brk: '7' }), SOP, {}, ST).code, 'OFF');
  assert.strictEqual(L.intakeClass(Object.assign({}, base, { hum: '15.2' }), SOP, {}, ST).code, 'REJ');
  assert.strictEqual(L.intakeClass(Object.assign({}, base, { hum: '13.7' }), SOP, {}, ST).code, 'G2');
});
ok('shifts 07-19 / 19-07', () => {
  // turnos fixos D 07:00–19:00 e N 19:00–07:00; o N das 00:00–07:00 pertence ao dia anterior
  assert.strictEqual(L.shiftOf('2026-10-05', '06:59', ST.shifts).id, '2026-10-04/N');
  assert.strictEqual(L.shiftOf('2026-10-05', '00:30', ST.shifts).id, '2026-10-04/N');
  assert.strictEqual(L.shiftOf('2026-10-05', '07:00', ST.shifts).id, '2026-10-05/D');
  assert.strictEqual(L.shiftOf('2026-10-05', '19:00', ST.shifts).id, '2026-10-05/N');
  assert.strictEqual(L.shiftOf('2026-10-05', '18:59', ST.shifts).id, '2026-10-05/D');
  assert.strictEqual(L.prevShift(L.shiftOf('2026-10-05', '08:00', ST.shifts)).id, '2026-10-04/N');
  assert.strictEqual(L.prevShift(L.shiftOf('2026-10-05', '20:00', ST.shifts)).id, '2026-10-05/D');
  assert.strictEqual(L.prevShift(L.shiftOf('2026-10-05', '02:00', ST.shifts)).id, '2026-10-04/D');
});
ok('round eval: dT red even at 30.0 (SOP warning example)', () => {
  const e = L.roundEval({ points: [{ t: '30.0' }, { t: '26' }], odour: 'N' }, { points: [{ t: '27.0' }, { t: '26' }] }, ST);
  assert.strictEqual(e.lv.temp, 1); assert.strictEqual(e.maxDT, 3); assert.strictEqual(e.lv.dt, 4); assert.strictEqual(e.level, 4);
  assert.strictEqual(L.roundEval({ points: [{ fault: true }, { t: '20' }], odour: 'MUSTY' }, null, ST).level, 2);
});
ok('silo status, hold and disposition', () => {
  const now = { date: '2026-10-05', time: '10:00' };
  const lots = [{ date: '2026-09-20', hum: 13.2 }];
  const r1 = { kind: 'ROUND', silo: 'S1', seq: 1, date: '2026-10-05', time: '08:00', points: [{ t: '24' }], odour: 'N' };
  let s1 = L.siloStatus({ siloId: 'S1', recs: [r1], lots, st: ST, now, kg: 100 });
  assert.strictEqual(s1.level, 1); assert.strictEqual(s1.ageDays, 15); assert.strictEqual(s1.roundsDone, 1); assert.strictEqual(s1.roundsNeed, 1); assert.ok(s1.weeklyDue); assert.ok(!L.siloStatus({ siloId: 'S1', recs: [r1], lots: [{ date: '2026-10-04', hum: 13 }], st: ST, now, kg: 100 }).weeklyDue);
  const r2 = { kind: 'ROUND', silo: 'S1', seq: 2, date: '2026-10-05', time: '09:00', points: [{ t: '27.5' }], odour: 'N' };
  s1 = L.siloStatus({ siloId: 'S1', recs: [r1, r2], lots, st: ST, now, kg: 100 });
  assert.strictEqual(s1.level, 4); assert.ok(s1.held); assert.strictEqual(s1.roundsNeed, 2);
  const d = { kind: 'DISP', silo: 'S1', seq: 3, date: '2026-10-05', time: '09:30', decision: 'RELEASE_PRIORITY' };
  s1 = L.siloStatus({ siloId: 'S1', recs: [r1, r2, d], lots, st: ST, now, kg: 100 });
  assert.ok(!s1.held); assert.ok(!s1.rejected);
  const w1 = { kind: 'WEEKLY', silo: 'S1', seq: 4, date: '2026-09-28', time: '10:00', moist: '13.1', insects: '0' };
  const w2 = { kind: 'WEEKLY', silo: 'S1', seq: 5, date: '2026-10-05', time: '09:45', moist: '13.3', insects: '2' };
  s1 = L.siloStatus({ siloId: 'S1', recs: [w1, w2], lots, st: ST, now, kg: 100 });
  assert.deepStrictEqual(s1.drivers.map(x => x.p + ':' + x.level), ['moist:1', 'moist_rise:2', 'insects:2']);
  s1 = L.siloStatus({ siloId: 'S1', recs: [w1, w2], sevents: [{ status: 'CLOSED', triggers: ['moist_rise@5'] }], lots, st: ST, now, kg: 100 });
  assert.deepStrictEqual(s1.drivers.map(x => x.p), ['moist', 'insects']);
  const tr = { kind: 'TREAT', silo: 'S1', seq: 6, date: '2026-10-05', time: '09:50' };
  assert.ok(L.siloStatus({ siloId: 'S1', recs: [w2, tr], lots, st: ST, now, kg: 100 }).drivers.some(x => x.p === 'treat_pending'));
  assert.strictEqual(L.siloStatus({ siloId: 'S1', recs: [], lots: [{ date: '2026-10-01', hum: 14.3 }], st: ST, now, kg: 100 }).level, 3);
});

ok('silo normalisation S1 -> S01, S21 kept, invalid refused', () => {
  assert.strictEqual(L.normalizeSiloId('S1'), 'S01');
  assert.strictEqual(L.normalizeSiloId('s9'), 'S09');
  assert.strictEqual(L.normalizeSiloId('S 12'), 'S12');
  assert.strictEqual(L.normalizeSiloId('S21'), 'S21');
  assert.strictEqual(L.normalizeSiloId('S22'), null);
  assert.strictEqual(L.normalizeSiloId('S0'), null);
  assert.strictEqual(L.normalizeSiloId('Silo 15'), null);
  assert.strictEqual(L.normalizeSiloId(''), null);
});
ok('silo master: 21 ids, S01-S12 6000 t, S13-S21 3000 t', () => {
  assert.strictEqual(L.SILO_IDS.length, 21);
  assert.strictEqual(L.SILO_IDS[0], 'S01'); assert.strictEqual(L.SILO_IDS[20], 'S21');
  assert.strictEqual(L.siloCapKg('S01'), 6000000); assert.strictEqual(L.siloCapKg('S12'), 6000000);
  assert.strictEqual(L.siloCapKg('S13'), 3000000); assert.strictEqual(L.siloCapKg('S21'), 3000000);
  assert.strictEqual(L.siloCapKg('S22'), null);
  assert.strictEqual(L.siloCapT, undefined, 'capacidades só em kg');
});

ok('normalizeSilos: production backup (S1-S4) -> 21 silos, renames, master caps', () => {
  const r = L.normalizeSilos([{ id: 'S1', cap: '' }, { id: 'S2', cap: '' }, { id: 'S3', cap: '' }, { id: 'S4', cap: '' }]);
  assert.strictEqual(r.silos.length, 21);
  assert.deepStrictEqual(r.silos.map(s => s.id), L.SILO_IDS);
  assert.strictEqual(r.silos[0].cap, '6000000');
  assert.strictEqual(r.silos[12].cap, '3000000');
  assert.deepStrictEqual(r.idMap, { S1: 'S01', S2: 'S02', S3: 'S03', S4: 'S04' });
  assert.ok(r.changes.indexOf('renamed:S1->S01') >= 0);
  assert.deepStrictEqual(r.warnings, []);
});
ok('normalizeSilos: keeps an existing cap, warns when it differs from master', () => {
  const r = L.normalizeSilos([{ id: 'S05', cap: '5000000' }]);
  assert.strictEqual(r.silos.find(s => s.id === 'S05').cap, '5000000');
  assert.ok(r.warnings.indexOf('cap-differs:S05') >= 0);
});
ok('normalizeSilos: invalid id kept and flagged; duplicate dropped and flagged', () => {
  const r = L.normalizeSilos([{ id: 'Silo 15', cap: '' }, { id: 'S1' }, { id: 'S01' }]);
  assert.ok(r.silos.some(s => s.id === 'Silo 15'));
  assert.ok(r.warnings.indexOf('invalid:Silo 15') >= 0);
  assert.ok(r.warnings.indexOf('duplicate:S01') >= 0);
  assert.strictEqual(r.silos.filter(s => s.id === 'S01').length, 1);
});
ok('normalizeSilos: already canonical -> no renames', () => {
  const r = L.normalizeSilos(L.SILO_IDS.map(id => ({ id: id, cap: String(L.siloCapKg(id)) })));
  assert.deepStrictEqual(r.idMap, {});
  assert.deepStrictEqual(r.changes, []);
});
ok('remapSiloRefs rewrites silo and toSilo, leaves others untouched', () => {
  const recs = [{ seq: 1, silo: 'S1', type: 'IN' }, { seq: 2, silo: 'S5', toSilo: 'S1', type: 'TRANSFER' }, { seq: 3, silo: 'S9', type: 'OUT' }];
  const out = L.remapSiloRefs(recs, { S1: 'S01' });
  assert.strictEqual(out.length, 2);
  assert.strictEqual(out[0].silo, 'S01');
  assert.strictEqual(out[1].toSilo, 'S01');
  assert.strictEqual(recs[0].silo, 'S1', 'input not mutated');
});
ok('format 4 backups accepted', () => {
  const d = { app: 'moagem-app', format: 4, lots: [], events: [], settings: [] };
  assert.strictEqual(L.validBackup(d), true);
  assert.strictEqual(L.validBackup(Object.assign({}, d, { format: 5 })), false);
});

ok('newUid: UUID v4 format and distinct across 2000 draws', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const u = L.newUid();
    assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u), u);
    seen.add(u);
  }
  assert.strictEqual(seen.size, 2000);
});
ok('stampRecord: new event gets uid, deviceId, appVersion; existing uid kept; config store untouched', () => {
  const s = L.stampRecord('events', { type: 'IN' }, { uid: 'U-1', deviceId: 'D9' });
  assert.strictEqual(s.uid, 'U-1'); assert.strictEqual(s.deviceId, 'D9'); assert.strictEqual(s.appVersion, L.APP_VERSION);
  const k = L.stampRecord('events', { uid: 'KEEP', type: 'IN' }, { uid: 'NEW', deviceId: 'D9' });
  assert.strictEqual(k.uid, 'KEEP');
  const c = L.stampRecord('settings', { key: 'main' }, { uid: 'X', deviceId: 'D9' });
  assert.strictEqual(c.uid, undefined);
});
ok('upgradeRecord: renames silo, backfills uid + deviceId, reports change', () => {
  const r = L.upgradeRecord('events', { seq: 4, silo: 'S1', toSilo: 'S2', type: 'TRANSFER' }, { S1: 'S01', S2: 'S02' }, 'D9', () => 0.5);
  assert.strictEqual(r.changed, true);
  assert.strictEqual(r.rec.silo, 'S01'); assert.strictEqual(r.rec.toSilo, 'S02');
  assert.ok(r.rec.uid && r.rec.uid.length === 36); assert.strictEqual(r.rec.deviceId, 'D9');
  assert.strictEqual(r.rec.seq, 4);
});
ok('upgradeRecord: already migrated record is unchanged; lots are not silo-remapped', () => {
  const done = { uid: 'U', deviceId: 'D', silo: 'S01' };
  const r1 = L.upgradeRecord('monitor', done, { S1: 'S01' }, 'D');
  assert.strictEqual(r1.changed, false);
  const lot = L.upgradeRecord('lots', { id: 'REC-261014-01', silo: 'S1' }, { S1: 'S01' }, 'D');
  assert.strictEqual(lot.rec.silo, 'S1');
  assert.ok(lot.rec.uid);
});
ok('stampRecord: updates (noVersion) get uid/deviceId but no appVersion', () => {
  const u = L.stampRecord('lots', { id: 'REC-1', status: 'HELD' }, { uid: 'U', deviceId: 'D', noVersion: true });
  assert.strictEqual(u.uid, 'U'); assert.strictEqual(u.deviceId, 'D'); assert.strictEqual(u.appVersion, undefined);
});

ok('lotCode: uses display code, so a UUID-keyed lot does not break numbering', () => {
  const lots = [{ id: '6f1c0a2e-0000-4000-8000-000000000001', code: 'REC-261014-01' }, { id: 'REC-261013-07' }];
  assert.strictEqual(L.lotCode('2026-10-14', lots), 'REC-261014-02');
  assert.strictEqual(L.lotCode('2026-10-13', lots), 'REC-261013-08');
  assert.strictEqual(L.lotCode('2026-10-15', lots), 'REC-261015-01');
});
ok('lotLabel: shows the code for a uuid; falls back to the id when unknown', () => {
  const lots = [{ id: 'U-1', code: 'REC-261014-01' }];
  assert.strictEqual(L.lotLabel(lots, 'U-1'), 'REC-261014-01');
  assert.strictEqual(L.lotLabel(lots, 'MISSING'), 'MISSING');
  assert.strictEqual(L.codeExists(lots, 'REC-261014-01'), true);
  assert.strictEqual(L.codeExists(lots, 'REC-261014-02'), false);
});
ok('newLotRecord: creation sets key = uid, a fresh code, and keeps the fields', () => {
  const existing = [{ id: 'U-OLD', code: 'REC-261014-01' }];
  const lot = L.newLotRecord({ date: '2026-10-14', supplier: 'X', kg: 1000 }, existing, 'U-NEW');
  assert.strictEqual(lot.id, 'U-NEW'); assert.strictEqual(lot.uid, 'U-NEW');
  assert.strictEqual(lot.code, 'REC-261014-02'); assert.strictEqual(lot.supplier, 'X');
});
ok('creation in sequence: 50 lots get 50 distinct codes and distinct keys', () => {
  let all = []; const codes = new Set(), keys = new Set();
  for (let i = 0; i < 50; i++) {
    const lot = L.newLotRecord({ date: '2026-10-14' }, all, 'K' + i);
    codes.add(lot.code); keys.add(lot.id); all = all.concat([lot]);
  }
  assert.strictEqual(codes.size, 50); assert.strictEqual(keys.size, 50);
  assert.strictEqual(all[49].code, 'REC-261014-50');
});
ok('lotUpgrade: legacy REC key becomes uid key; old code kept; uid reused when present', () => {
  const u = L.lotUpgrade({ id: 'REC-261014-01', uid: 'U-7', supplier: 'X' }, 'FALLBACK');
  assert.strictEqual(u.oldId, 'REC-261014-01'); assert.strictEqual(u.newId, 'U-7');
  assert.strictEqual(u.lot.id, 'U-7'); assert.strictEqual(u.lot.code, 'REC-261014-01'); assert.strictEqual(u.lot.supplier, 'X');
  const v = L.lotUpgrade({ id: 'REC-261014-02' }, 'FALLBACK');
  assert.strictEqual(v.newId, 'FALLBACK'); assert.strictEqual(v.lot.uid, 'FALLBACK');
});
ok('upgradeRecord: event lot and lots[] references move to the new key', () => {
  const map = { 'REC-261014-01': 'U-7' };
  const r = L.upgradeRecord('events', { seq: 3, type: 'IN', lot: 'REC-261014-01', lots: ['REC-261014-01'], silo: 'S01' }, {}, 'D', () => 0.5, map);
  assert.strictEqual(r.changed, true); assert.strictEqual(r.rec.lot, 'U-7'); assert.deepStrictEqual(r.rec.lots, ['U-7']);
  const other = L.upgradeRecord('events', { lot: 'REC-261014-09', lots: ['REC-261014-09'], silo: 'S01', uid: 'x', deviceId: 'd' }, {}, 'D', () => 0.5, map);
  assert.deepStrictEqual(other.rec.lots, ['REC-261014-09']);
});
ok('retrieval: silo contents built from uid references report the same lots and kg', () => {
  const events = [
    { seq: 1, type: 'IN', silo: 'S01', lot: 'U-7', lots: ['U-7'], kg: 1000 },
    { seq: 2, type: 'IN', silo: 'S01', lot: 'U-8', lots: ['U-8'], kg: 500 },
  ];
  const c = L.siloContents('S01', events);
  assert.strictEqual(c.kg, 1500);
  assert.deepStrictEqual(c.lots.slice().sort(), ['U-7', 'U-8']);
  assert.deepStrictEqual(L.lotsCarried('S01', events).slice().sort(), ['U-7', 'U-8']);
});
// ----- códigos provisórios, sincronização, ordem e versão do mestre -----
ok('provisionalCode: formato REC-AAMMDD-P<dispositivo>-NN, sequência por dispositivo e dia', () => {
  assert.strictEqual(L.deviceTag('3f9a1c2e0b7d'), '3F9A1C');
  assert.strictEqual(L.deviceTag(''), 'NODEV');
  assert.strictEqual(L.provisionalCode('2026-10-14', '3f9a1c2e0b7d', []), 'REC-261014-P3F9A1C-01');
  const mine = [{ id: 'a', code: 'REC-261014-P3F9A1C-01' }, { id: 'b', code: 'REC-261014-P3F9A1C-02' }];
  assert.strictEqual(L.provisionalCode('2026-10-14', '3f9a1c2e0b7d', mine), 'REC-261014-P3F9A1C-03');
  // outro telemóvel, mesmo dia: não colide
  assert.strictEqual(L.provisionalCode('2026-10-14', 'aa11bb22cc33', mine), 'REC-261014-PAA11BB-01');
  // código central do mesmo dia não conta para a sequência provisória
  assert.strictEqual(L.provisionalCode('2026-10-14', '3f9a1c2e0b7d', [{ id: 'c', code: 'REC-261014-07' }]), 'REC-261014-P3F9A1C-01');
});
ok('newLotCode: lote novo fica provisório', () => {
  const r = L.newLotCode('2026-10-14', [], '3f9a1c2e0b7d');
  assert.deepStrictEqual(r, { code: 'REC-261014-P3F9A1C-01', codeState: 'provisional' });
});
ok('applyCentralCode: troca o código provisório pelo central, guarda o antigo, mantém a chave', () => {
  const lot = { id: 'U-1', uid: 'U-1', code: 'REC-261014-P3F9A1C-01', codeState: 'provisional', date: '2026-10-14' };
  const other = { id: 'U-2', code: 'REC-261014-01', codeState: 'central' };
  const c = L.applyCentralCode(lot, 'REC-261014-02', [lot, other]);
  assert.strictEqual(c.code, 'REC-261014-02');
  assert.strictEqual(c.provisionalCode, 'REC-261014-P3F9A1C-01');
  assert.strictEqual(c.codeState, 'central');
  assert.strictEqual(c.id, 'U-1');
  assert.strictEqual(lot.code, 'REC-261014-P3F9A1C-01');        // entrada não alterada
});
ok('applyCentralCode: recusa código já usado, formato inválido ou lote não provisório', () => {
  const lot = { id: 'U-1', code: 'REC-261014-P3F9A1C-01', codeState: 'provisional' };
  assert.throws(() => L.applyCentralCode(lot, 'REC-261014-01', [lot, { id: 'U-2', code: 'REC-261014-01' }]), /central-code-taken/);
  assert.throws(() => L.applyCentralCode(lot, 'REC-26-1', [lot]), /bad-central-code/);
  assert.throws(() => L.applyCentralCode(lot, 'REC-261014-P3F9A1C-02', [lot]), /bad-central-code/);
  assert.throws(() => L.applyCentralCode({ id: 'U-3', code: 'REC-261014-01', codeState: 'central' }, 'REC-261014-09', []), /not-provisional/);
  assert.throws(() => L.applyCentralCode({ id: 'U-4', code: 'REC-261014-01', codeState: 'legacy' }, 'REC-261014-09', []), /not-provisional/);
});
ok('lotUpgrade: lote antigo fica com codeState legacy; lote novo mantém o seu', () => {
  assert.strictEqual(L.lotUpgrade({ id: 'REC-261014-01' }, 'F').lot.codeState, 'legacy');
  assert.strictEqual(L.lotUpgrade({ id: 'U-1', code: 'REC-261014-01', codeState: 'central' }, 'F').lot.codeState, 'central');
});
ok('lotOrder: data e hora descendentes; empates ordenados pelo código (comparador válido)', () => {
  const a = { id: 'U-1', date: '2026-10-14', time: '08:00', code: 'REC-261014-P3F9A1C-02' };
  const b = { id: 'U-2', date: '2026-10-14', time: '08:00', code: 'REC-261014-P3F9A1C-01' };
  const c = { id: 'U-3', date: '2026-10-14', time: '09:00', code: 'REC-261014-P3F9A1C-03' };
  const sorted = [a, b, c].sort(L.lotOrder).map(x => x.id);
  assert.deepStrictEqual(sorted, ['U-3', 'U-1', 'U-2']);
  assert.strictEqual(L.lotOrder(a, a), 0);
  // ordem independente da ordem de entrada
  assert.deepStrictEqual([b, c, a].sort(L.lotOrder).map(x => x.id), sorted);
});
ok('masterStatus: same / older / newer / missing; registos recebem masterVersion', () => {
  assert.strictEqual(L.masterStatus(L.MASTER_VERSION), 'same');
  assert.strictEqual(L.masterStatus('2026-01-01.1'), 'older');
  assert.strictEqual(L.masterStatus('2099-01-01.1'), 'newer');
  assert.strictEqual(L.masterStatus(undefined), 'missing');
  const s = L.stampRecord('events', { kind: 'x' }, { deviceId: 'D1' });
  assert.strictEqual(s.masterVersion, L.MASTER_VERSION);
  const u = L.stampRecord('events', { kind: 'x', masterVersion: '2026-01-01.1' }, { deviceId: 'D1' });
  assert.strictEqual(u.masterVersion, '2026-01-01.1');   // não altera o existente
  const n = L.stampRecord('events', { kind: 'x' }, { deviceId: 'D1', noVersion: true });
  assert.strictEqual(n.masterVersion, undefined);         // atualizações não ganham versão nova
});

ok('backupMasterSummary: conta versões do mestre nos registos da cópia', () => {
  const sum = L.backupMasterSummary({ events: [{ masterVersion: L.MASTER_VERSION }, { masterVersion: '2026-01-01.1' }], lots: [{}], monitor: [{ masterVersion: '2099-01-01.1' }] });
  assert.deepStrictEqual(sum, { same: 1, older: 1, newer: 1, missing: 1 });
  assert.deepStrictEqual(L.backupMasterSummary({}), { same: 0, older: 0, newer: 0, missing: 0 });
});

ok('contrato v1: registo novo leva schemaVersion, createdAt, operatorId, test, uploadedAt e shift', () => {
  const ctx = { deviceId: 'D1', operatorId: 'OP-042', test: false, starts: ['07:00', '19:00'] };
  const r = L.stampRecord('events', { date: '2026-10-14', time: '08:30', kind: 'x' }, ctx);
  assert.strictEqual(r.schemaVersion, L.CONTRACT_VERSION);
  assert.strictEqual(L.CONTRACT_VERSION, 1);
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.createdAt), r.createdAt);
  assert.strictEqual(r.operatorId, 'OP-042');
  assert.strictEqual(r.test, false);
  assert.strictEqual(r.uploadedAt, null);
  assert.strictEqual(r.shift, '2026-10-14/D');
  assert.strictEqual(r.deviceId, 'D1');
  const n = L.stampRecord('events', { date: '2026-10-14', time: '20:10' }, ctx);
  assert.strictEqual(n.shift, '2026-10-14/N');
});
ok('contrato v1: modo de teste marca os registos novos; hora do dispositivo pode ser dada', () => {
  const r = L.stampRecord('lots', { date: '2026-10-14', time: '09:00' }, { deviceId: 'D1', test: true, now: '2026-10-14T08:00:00.000Z' });
  assert.strictEqual(r.test, true);
  assert.strictEqual(r.createdAt, '2026-10-14T08:00:00.000Z');
});
ok('contrato v1: actualização (noVersion) não acrescenta campos novos a registos antigos', () => {
  const old = { uid: 'U-9', date: '2026-10-01', time: '10:00', kind: 'ROUND' };
  const u = L.stampRecord('monitor', old, { deviceId: 'D1', noVersion: true, operatorId: 'OP-1', test: true });
  assert.strictEqual(u.schemaVersion, undefined);
  assert.strictEqual(u.createdAt, undefined);
  assert.strictEqual(u.test, undefined);
  assert.strictEqual(u.operatorId, undefined);
  assert.strictEqual(u.uid, 'U-9');
});

ok('turma (A–D) no contrato: registo leva a turma das Definições; sem turma fica null', () => {
  const a = L.stampRecord('events', { date: '2026-10-14', time: '09:00' }, { deviceId: 'D1', crew: 'B' });
  assert.strictEqual(a.crew, 'B');
  const b = L.stampRecord('events', { date: '2026-10-14', time: '09:00' }, { deviceId: 'D1' });
  assert.strictEqual(b.crew, null);
  assert.strictEqual(b.shift, '2026-10-14/D');
});

console.log('OK — ' + n + ' tests');
