/** Pure reference rules. No network, seeds, production records or UI mutation. */
export const RULE_VERSION = 'operations-v1';
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Expected YYYY-MM-DD');
  const d = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(d.valueOf()) || d.toISOString().slice(0, 10) !== value) throw new Error('Invalid date');
  return value;
}
export function shanghaiBusinessDate(instant) {
  if (typeof instant === 'string' && !/(Z|[+-]\d{2}:\d{2})$/.test(instant)) throw new Error('Timezone required');
  const d = new Date(instant);
  if (Number.isNaN(d.valueOf())) throw new Error('Invalid instant');
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function yuanToCents(value) {
  // Text input avoids binary floating point. Unit conversion occurs explicitly upstream.
  if (typeof value !== 'string' || !/^-?\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error('Expected decimal yuan, max 2 places');
  const v = value.trim(), negative = v.startsWith('-');
  const [whole, fraction = ''] = (negative ? v.slice(1) : v).split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('Unsafe money value');
  return negative ? -result : result;
}
export function daySequence(start, end) {
  validDate(start); validDate(end);
  if (start > end) throw new Error('Reversed period');
  const out = [], limit = Date.parse(end + 'T00:00:00Z');
  for (let ms = Date.parse(start + 'T00:00:00Z'); ms <= limit; ms += 86400000) {
    out.push(new Date(ms).toISOString().slice(0, 10));
  }
  return out;
}
function integer(n) {
  if (!Number.isSafeInteger(n)) throw new Error('Expected safe integer');
  return n;
}
export function comparePeriods(current, previous, currentDates, previousDates) {
  // Map<date, integer cents|null>; exact expected calendar prefix required.
  if (!currentDates.length || currentDates.length !== previousDates.length) return {status:'incomparable',change:null};
  currentDates.forEach(validDate); previousDates.forEach(validDate);
  if (new Set(currentDates).size !== currentDates.length || new Set(previousDates).size !== previousDates.length) throw new Error('Duplicate date');
  const a = currentDates.map(d => current.get(d)), b = previousDates.map(d => previous.get(d));
  if ([...a, ...b].some(v => v == null)) return {status:'missing',change:null};
  a.forEach(integer); b.forEach(integer);
  const currentTotal = integer(a.reduce((s, n) => s+n, 0));
  const previousTotal = integer(b.reduce((s, n) => s+n, 0));
  return {status: previousTotal <= 0 ? 'incomparable' : 'ok',currentTotal,previousTotal,
    change:previousTotal <= 0 ? null : (currentTotal-previousTotal)/previousTotal};
}
export function budget({actualCents, targetCents, dataThrough, speedCentsPerDay}) {
  integer(actualCents); integer(targetCents); validDate(dataThrough);
  if (targetCents <= 0 || !Number.isFinite(speedCentsPerDay) || speedCentsPerDay < 0) throw new Error('Invalid target/speed');
  const day = Number(dataThrough.slice(8));
  const daysInMonth = new Date(Date.UTC(Number(dataThrough.slice(0,4)), Number(dataThrough.slice(5,7)), 0)).getUTCDate();
  const remainingDays = daysInMonth-day, remainingCents = Math.max(targetCents-actualCents,0);
  const requiredDailyCents = remainingDays ? remainingCents/remainingDays : null;
  return {budgetVarianceCents:actualCents-targetCents, remainingCents, remainingDays,
    amountProgress:actualCents/targetCents, timeProgress:day/daysInMonth,
    requiredDailyCents, dailyGapCents:requiredDailyCents===null?null:Math.max(requiredDailyCents-speedCentsPerDay,0),
    status:remainingDays===0&&remainingCents>0?'closed_below_target':'ok'};
}
export function aggregateRevenue(rows, start, end) {
  const dates=daySequence(start,end), selected=rows.filter(r=>r.date>=start&&r.date<=end), seen=new Set();
  for(const r of selected){validDate(r.date);if(seen.has(r.date))throw new Error('Unresolved daily revisions');seen.add(r.date);}
  const missingDates=dates.filter(d=>!seen.has(d));
  const sums={outpatientCents:0,inpatientCents:0,totalCents:0,admissions:0,discharges:0,visits:0};
  for(const r of selected){
    for(const key of Object.keys(sums))integer(r[key]);
    if(r.totalCents!==r.outpatientCents+r.inpatientCents)throw new Error('Daily revenue mismatch');
    for(const key of Object.keys(sums))sums[key]=integer(sums[key]+r[key]);
  }
  const latest=[...selected].sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
  if(latest)integer(latest.ward);
  return {...sums,ward:latest?.ward??null,asOf:latest?.date??null,missingDates,
    status:missingDates.length?'partial':'ok'};
}
