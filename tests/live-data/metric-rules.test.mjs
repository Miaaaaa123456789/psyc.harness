import test from 'node:test';
import assert from 'node:assert/strict';
import {yuanToCents, shanghaiBusinessDate, validDate, budget, daySequence, comparePeriods, aggregateRevenue} from '../../tools/live-data/metric-rules.mjs';

test('money remains integer cents and preserves signed corrections',()=>{
  assert.equal(yuanToCents('1397778.29'),139777829);
  assert.equal(yuanToCents('-0.01'),-1);
  assert.throws(()=>yuanToCents('1.001'));
  assert.throws(()=>yuanToCents(''));
});
test('Shanghai midnight does not become previous UTC date',()=>{
  assert.equal(shanghaiBusinessDate('2026-10-17T16:01:00Z'),'2026-10-18');
  assert.throws(()=>shanghaiBusinessDate('2026-10-18T00:01:00'));
  assert.throws(()=>validDate('2026-02-29'));
  assert.equal(validDate('2028-02-29'),'2028-02-29');
});
test('true September daily gap is 7.83 not 6.24 yuan ten-thousands',()=>{
  const b=budget({actualCents:153890000,targetCents:260000000,dataThrough:'2026-09-22',speedCentsPerDay:5430000});
  assert.equal(b.remainingDays,8);
  assert.equal(b.budgetVarianceCents,-106110000);
  assert.equal(b.dailyGapCents,7833750);
});
test('month end and leap month do not divide by zero',()=>{
  const b=budget({actualCents:0,targetCents:100,dataThrough:'2028-02-29',speedCentsPerDay:0});
  assert.equal(b.remainingDays,0); assert.equal(b.requiredDailyCents,null);
  assert.equal(b.status,'closed_below_target');
});
test('same calendar prefixes, missing day and zero baseline are not fake growth',()=>{
  const a=daySequence('2026-10-12','2026-10-13'),b=daySequence('2026-10-05','2026-10-06');
  assert.equal(comparePeriods(new Map([[a[0],100]]),new Map(b.map(d=>[d,50])),a,b).status,'missing');
  assert.equal(comparePeriods(new Map(a.map(d=>[d,100])),new Map(b.map(d=>[d,0])),a,b).change,null);
  assert.equal(comparePeriods(new Map(a.map(d=>[d,100])),new Map(b.map(d=>[d,50])),a,b).change,1);
});
test('ward uses latest point, admissions are events; missing dates stay explicit',()=>{
  // Synthetic boundary fixture, not production data.
  const row=(date,ward)=>({date,ward,outpatientCents:100,inpatientCents:200,totalCents:300,admissions:2,discharges:1,visits:4});
  const r=aggregateRevenue([row('2026-10-12',30),row('2026-10-14',32)],'2026-10-12','2026-10-14');
  assert.equal(r.ward,32);assert.equal(r.admissions,4);assert.equal(r.totalCents,600);
  assert.deepEqual(r.missingDates,['2026-10-13']);assert.equal(r.status,'partial');
  assert.throws(()=>aggregateRevenue([row('2026-10-12',30),row('2026-10-12',30)],'2026-10-12','2026-10-12'));
});
