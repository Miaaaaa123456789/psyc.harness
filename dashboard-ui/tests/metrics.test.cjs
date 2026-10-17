const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const s=require('../public-snapshot.js'),M=require('../data-model.js'),m=M.build(s);
assert.equal(s.mode,'deidentified-actual');
assert.equal(s.privacy.financialValuesChanged,false);
assert.equal(m.last,'2026-10-15');
assert.equal(m.m.total,1286032.05);
assert.equal(m.w.days,4);assert.equal(m.w.total,260912.8);
assert.equal(m.w.admit,10);assert.equal(m.w.discharge,10);assert.equal(m.w.visits,84);assert.equal(m.w.ward,31);
assert.equal(m.previous.days,4);assert.equal(m.comparable,true);
assert.equal(M.sum(s.departments.doctor.rows,'attributedYuan'),332209.29000000004);
assert.equal(M.sum(s.departments.marketing.rows,'contacts'),89);
assert.equal(M.sum(s.departments.service.rows,'arrived'),36);
assert.equal(M.sum(s.departments.psychology.rows,'consults'),39);
assert.equal(M.ranking(s,'nursing')[0].score,92.9);
assert.ok(M.findings(s).some(f=>f.dept==='nursing'&&f.value==='6项待核'));
const missing=structuredClone(s);missing.revenue=missing.revenue.filter(r=>r.date!=='2026-10-14');assert.equal(M.build(missing).comparable,false);assert.equal(M.build(missing).missing,1);
const nulls=structuredClone(s);nulls.revenue.at(-1).admit=null;assert.equal(M.build(nulls).w.admit,null);
const dup=structuredClone(s);dup.revenue.push(dup.revenue[0]);assert.throws(()=>M.build(dup),/重复/);
for(const [k,d]of Object.entries(s.departments))for(const r of d.rows){assert.match(r.name,/^(医生|护理|咨询|客服|管家)\d{2}$/);assert.ok(r.id.startsWith(k+'-'));assert.ok(!('patient' in r));}
for(const k of ['patientRowsIncluded','realEmployeeNamesIncluded','identityMapIncluded','sourceAccessUrlsIncluded'])assert.equal(s.privacy[k],false);
const files=['index.html','app.js','data-model.js','data-adapter.js','public-snapshot.js','ui.css','shell.css'];
for(const f of files){const t=fs.readFileSync(path.join(__dirname,'..',f),'utf8');assert.ok(!/ghp_[A-Za-z0-9]{12,}|github_pat_|https?:\/\/[^\s"']*kdocs\.cn|patient_name|身份证号/.test(t),'Possible secret or patient field in '+f);}
console.log('PASS: exact real amounts, source scores, anonymous IDs, partial-week comparison, missing-vs-zero, no private URLs or access tokens.');
