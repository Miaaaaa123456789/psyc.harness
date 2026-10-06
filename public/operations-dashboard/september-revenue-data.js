/* ============================================================================
   9 月营收统一数据源（移植自 psyc.harness 的 hospital-operations-dashboard）
   ----------------------------------------------------------------------------
   ⚠ 与源版的关键差异：**不自带 rows**，而是从本仓唯一真源 window.OPS_REVENUE
   （data-import.js）派生。源版自己也存一份 rows + localStorage，两边并存会出现
   「拖图片后只有一个面板更新」的双数据源问题。
   这里改为：OPS_REVENUE 更新 → 重建 rows → 派发 september-revenue-updated。

   对外 API 与源版保持一致（derive / subset / summarize / rows / updatedAt …），
   使 month-dashboard.js 与 marketing-current-report.js 可原样工作。
   ========================================================================== */
(function () {
  'use strict';

  var GOAL = 2600000;                       // 月度目标 260 万（元）
  var REPORT_RANGE = '2026-09-01—2026-09-29';
  var DOW = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var W1 = ['2026-09-01', '2026-09-06'], W2 = ['2026-09-07', '2026-09-13'],
      W3 = ['2026-09-14', '2026-09-20'], W4 = ['2026-09-21', '2026-09-27'],
      W5 = ['2026-09-28', '2026-10-04'];
  /* ⭐⭐ 周窗口**动态推导**：本周＝「最后一个有数据的日期」所在自然周（周一—周日）；
     上一周＝其前一周。与 data-import.js 的 refreshWindow() 同一口径。

     ⚠⚠ 2026-10-06 修：原先 CUR/PREV **硬编码**为 W5/W4（9.28—10.4）。
     数据推进到 10.5（周一，属**新的一周**）后，本周窗口仍停在 9.28—10.4
     → 10.5 落在窗口外、周口径面板整段不更新（「本周」永远显示上一周的数）。
     这类「窗口不跟数据滚」是本项目最常见的静默失真，务必保持动态。
     ⚠ W1—W5 仍保留为常量：它们是**9 月报告**的周序列（月口径封顶），与「本周」语义不同。 */
  var CUR = W5, PREV = W4;   // 初值；derive() 会按数据实际末日重算
  function ymd(x) {
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function addDays(d, n) {
    var x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return ymd(x);
  }
  /* 返回 d 所在自然周的周一（周一为一周之始） */
  function weekStartOf(d) {
    var x = new Date(d + 'T12:00:00');
    var dow = x.getDay();                      // 0=周日
    return addDays(d, -(dow === 0 ? 6 : dow - 1));
  }
  function refreshWindow() {
    var rs = data.rows;
    if (!rs || !rs.length) return;
    var mon = weekStartOf(rs[rs.length - 1].date);
    CUR = [mon, addDays(mon, 6)];
    PREV = [addDays(mon, -7), addDays(mon, -1)];
  }
  /* ⭐ 结算月（与 data-import.js 同一口径）：所有**月**维度聚合只统计 9 月。
     10.1 属 10 月账，若并入月累计 → 227.17 万被冲成 234.17 万、「已收官」失效。
     周维度不受影响：本周(system)仍取 W5＝9.28—10.4，含 10.1。 */
  var SETTLED_MONTH = '2026-09';
  var MONTH_FIRST = SETTLED_MONTH + '-01';
  var MONTH_LAST = '2026-09-30';
  function monthRows() { return subset(MONTH_FIRST, MONTH_LAST); }

  function num(v) { var x = Number(v); return Number.isFinite(x) ? x : 0; }
  function sum(list, key) { return list.reduce(function (a, r) { return a + num(r[key]); }, 0); }

  /* ---- 从唯一真源重建 rows ----
     OPS_REVENUE.daily()：{ '2026-09-21': [门诊, 在院, 初诊, 复诊, 在院数, 入院, 出院] } */
  function buildRows() {
    var src = window.OPS_REVENUE;
    if (!src || !src.daily) return [];
    var daily = src.daily() || {};
    var cum = 0, out = [];
    Object.keys(daily).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); }).sort()
      .forEach(function (k) {
        var v = daily[k] || [];
        if (v[0] == null && v[1] == null) return;
        var o = num(v[0]), i = num(v[1]), total = o + i;
        cum += total;
        out.push({
          date: k,
          weekday: DOW[new Date(k + 'T12:00:00').getDay()],
          outpatient: o, inpatient: i,
          first: num(v[2]), repeat: num(v[3]),
          /* ⚠ 在院人数是**时点值**，必填字段缺失时必须保留 null：
             num(null) 会返回 0，使 lastWard() 的「ward != null」判断永远成立，
             结果取到最后一天 → 在院被读成 0。 */
          ward: (v[4] == null || v[4] === '') ? null : num(v[4]), admit: num(v[5]),
          /* ⚠ 本仓 OPS_REVENUE 的出院是一列「合计」（＝初次＋多次）；
             源版拆两列。统一放进 dischargeFirst、dischargeRepeat 记 0，
             这样 summarize() 的 dischargeFirst+dischargeRepeat 仍等于合计。 */
          dischargeFirst: num(v[6]), dischargeRepeat: 0,
          total: total, cumulative: cum
        });
      });
    return out;
  }

  var data = {
    month: '2026-09',
    reportRange: REPORT_RANGE,
    updatedThrough: '',
    updatedAt: '—',
    goal: GOAL,
    source: '销售部每日销售日报（截图 OCR）＋ 金山文档主表',
    revision: '9月1—6日为后续修订口径；出院＝出院初次＋多次',
    rows: []
  };

  function subset(from, to) {
    return data.rows.filter(function (r) { return r.date >= from && r.date <= to; });
  }
  function summarize(list) {
    var last = list[list.length - 1] || {};
    /* ⚠ 「在院人数」是**时点值**、不是可加量：取区间内最后一个**有填报**的日期。
       原先写 last.ward || 0 —— 只要最后一天没填该字段（导入营收时很常见），
       在院人数就会直接变成 0，月面板/营销报告会一起显示「在院 0 人」。
       现在缺字段的日期自动向前回退，并记录实际时点 wardAt。 */
    var wardV = null, wardAt = '';
    for (var wi = list.length - 1; wi >= 0; wi--) {
      if (list[wi].ward != null) { wardV = list[wi].ward; wardAt = list[wi].date; break; }
    }
    return {
      days: list.length,
      total: sum(list, 'total'),
      outpatient: sum(list, 'outpatient'),
      inpatient: sum(list, 'inpatient'),
      first: sum(list, 'first'),
      repeat: sum(list, 'repeat'),
      visits: sum(list, 'first') + sum(list, 'repeat'),
      admissions: sum(list, 'admit'),
      discharges: sum(list, 'dischargeFirst') + sum(list, 'dischargeRepeat'),
      dischargeFirst: sum(list, 'dischargeFirst'),
      dischargeRepeat: sum(list, 'dischargeRepeat'),
      ward: wardV,
      wardAt: wardAt,
      average: list.length ? sum(list, 'total') / list.length : 0
    };
  }
  function lastDay() { return data.rows.length ? Number(data.rows[data.rows.length - 1].date.slice(8)) : 0; }
  /* 全站统一的「最新在院人数」取值：最后一个有填报的日期（缺字段自动回退）。
     各面板请用它，不要再直接取 rows 最后一行 —— 见 summarize() 里的说明。 */
  function lastWard() {
    for (var i = data.rows.length - 1; i >= 0; i--) {
      if (data.rows[i].ward != null) return { value: data.rows[i].ward, date: data.rows[i].date };
    }
    return { value: null, date: '' };
  }

  function derive() {
    refreshWindow();                             // ⭐ 先按数据末日重算周窗口
    var month = summarize(monthRows());          // ⭐ 月口径只算 9 月
    var current = summarize(subset(CUR[0], CUR[1]));   // ⭐ 周口径（含跨月日）
    /* 上周可比区间＝与本周已发生天数相同的上周片段（同天数口径）
       ⚠ pcTo 必须用日期加法算；原先把月份硬编码成 '2026-09-'，
       PREV 一旦落在别的月份（如 9.28—10.4）就会算错。 */
    var n = Math.max(1, current.days);
    var pcTo = addDays(PREV[0], n - 1);
    if (pcTo > PREV[1]) pcTo = PREV[1];
    var previousComparable = summarize(subset(PREV[0], pcTo));
    /* ⚠ W5 的自然周是 9.28—10.4，但**月口径**下只能取 9 月内的 9.28—9.30。
       否则「9月各周营业对比 / 9月周度节奏」会把 10.1 的 8.60 万算进 9 月，
       五根柱相加也凑不出 227.17 万。本周（含 10.1）另行由 currentWeek 提供。 */
    var weeks = [[W1, '9.1—9.6'], [W2, '9.7—9.13'], [W3, '9.14—9.20'], [W4, '9.21—9.27'], [W5, '9.28—10.4']]
      .map(function (w) {
        var to = w[0][1] > MONTH_LAST ? MONTH_LAST : w[0][1];
        var x = summarize(subset(w[0][0], to));
        x.fullLabel = w[1];
        x.capped = (to !== w[0][1]);
        x.label = x.capped ? (w[1].split('—')[0] + '—' + (+MONTH_LAST.slice(5, 7)) + '.' + (+MONTH_LAST.slice(8))) : w[1];
        x.current = (w[0] === CUR); x.from = w[0][0]; x.to = to;
        return x;
      });

    /* ⚠ 原为 lastDay()（＝数据末日的「日」）—— 数据到 10.1 后会变成 1，
       时间进度掉到 3.2%、剩余 30 天。改为结算月实际覆盖天数。 */
    var used = monthRows().length || month.days;
    var remainingDays = Math.max(0, 30 - used);
    var remaining = GOAL - month.total;
    var MR = monthRows();                       // 月口径样本（9 月）
    var sorted = MR.slice().sort(function (a, b) { return b.total - a.total; });
    var weekend = MR.filter(function (r) { return r.weekday === '周六' || r.weekday === '周日'; });
    var weekday = MR.filter(function (r) { return r.weekday !== '周六' && r.weekday !== '周日'; });
    return {
      month: month, currentWeek: current, previousComparable: previousComparable, weeks: weeks,
      usedDays: used, remaining: remaining, remainingDays: remainingDays,
      requiredDaily: remainingDays ? remaining / remainingDays : 0,
      forecast: month.total + month.average * remainingDays,
      amountRate: month.total / GOAL * 100,
      timeRate: used / 30 * 100,
      topDays: sorted.slice(0, 5),
      weekend: summarize(weekend), weekday: summarize(weekday),
      lastDate: data.rows.length ? data.rows[data.rows.length - 1].date : ''
    };
  }

  /* ⭐ 统一「经营口径」对象 —— 全站文案取数的**唯一入口**。
     为什么要它：此前 9 个模块各自硬编码「剩余 5 天 / 需 82.00 万 / 落后 14.9pt」，
     口径一改就要满页找数字，且极易改漏（本轮实测漏过 3 轮）。
     现在所有会变的数字都从这里取；数据一变，全站文案跟着变。
     ⚠ 口径约定（业主 2026-09-28 定）：
       · 「剩余 X 天」按**数据最新日**算（不是按今天）——
         这样与「数据更新至」时间戳同源，不会出现「时间戳跳了、天数没跳」。
       · 时间进度 = 数据最新日 ÷ 当月天数（与营收进度同源比较）。
       · 负数一律用 U+2212「−」而非 ASCII「-」。 */
  function buildFacts() {
    /* ⚠ 月口径一律取**结算月**（2026-09）。原用 data.rows 与 last（数据末日）：
       10.1 进来后 last 变 10-01 → used=1、monthDays=31、时间进度 3.2%、剩余 30 天，
       9 月「已收官」的整站文案会全部退回错误表述。 */
    var m = summarize(monthRows());
    var last = data.rows.length ? data.rows[data.rows.length - 1].date : '';
    /* 实际末日（10.1）只用于时间戳 labelDate / labelDateShort */
    var ly = +last.slice(0, 4), lmo = +last.slice(5, 7), lday = +last.slice(8);
    var y = +MONTH_LAST.slice(0, 4), mo = +MONTH_LAST.slice(5, 7);
    var monthDays = new Date(y, mo, 0).getDate();
    var used = monthRows().length;
    var remainDays = Math.max(0, monthDays - used);
    var remain = Math.max(0, GOAL - m.total);
    var needDaily = remainDays ? remain / remainDays : 0;
    var timeRate = monthDays ? used / monthDays * 100 : 0;
    var amountRate = m.total / GOAL * 100;
    var sgn = function (v, d) { d = d == null ? 1 : d; return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d); };
    var wan = function (yuan, d) { return (yuan / 10000).toFixed(d == null ? 2 : d); };
    /* 本周已发生的日均（用有值的实际天数，不用自然天数，避免"待补"拉低均值） */
    var cw = summarize(subset(CUR[0], CUR[1]));
    var cwAvg = cw.days ? cw.total / cw.days : 0;
    return {
      lastDate: last,                              // '2026-09-25'
      monthDays: monthDays, usedDays: used, remainDays: remainDays,
      total: m.total, totalWan: wan(m.total),      // '178.00'
      goalWan: GOAL / 10000,                       // 260
      remainWan: wan(remain),                      // '82.00'
      needDailyWan: wan(needDaily),                // '16.40'
      mtdAvgWan: wan(m.average),                   // 当月日均
      weekAvgWan: wan(cwAvg),                      // 本周实际日均
      /* ⭐ 月末收官：数据已覆盖整月（剩余 0 天）时，「剩余 X 天 / 日均需」不再成立，
         各模块据此换文案（否则会显示「日均需 0.00 万」这种误导性说法）。 */
      monthClosed: remainDays === 0,
      gapDailyWan: wan(Math.max(0, needDaily - m.average)),
      timeRate: timeRate, amountRate: amountRate,
      lagPt: timeRate - amountRate,                // 落后百分点（正数=落后）
      forecastWan: wan(m.total + m.average * remainDays),
      forecastGapWan: wan(Math.max(0, GOAL - (m.total + m.average * remainDays))),
      days: m.days, weekDays: cw.days,
      /* 统一格式化的字符串，模块直接用，避免各处再拼 */
      labelDate: last ? (ly + '年' + lmo + '月' + lday + '日') : '—',
      labelDateShort: last ? (lmo + '.' + lday) : '—',       // 实际末日 10.1（营收数据至）
      labelMonth: y + '年' + mo + '月',                       // 结算月 2026年9月
      sgn: sgn
    };
  }
  var FACTS = null;
  function facts() { if (!FACTS) FACTS = buildFacts(); return FACTS; }

  function refresh() {
    data.rows = buildRows();
    var last = data.rows[data.rows.length - 1];
    data.updatedThrough = last ? last.date : '';
    data.updatedAt = last
      ? (last.date.slice(0, 4) + '年' + (+last.date.slice(5, 7)) + '月' + (+last.date.slice(8)) + '日 23:59')
      : '—';
    /* ⚠ REPORT_RANGE 原写死；且不能跟着 last 走 —— 数据到 10.1 后
       报告期会变成 09-01—10-01，把 10 月并进 9 月报告。固定为结算月区间。 */
    data.reportRange = MONTH_FIRST + '—' + MONTH_LAST;
    FACTS = null;          // 数据变了 → 口径缓存失效，下次取用时重算
    /* ⚠ 不要把 data.facts 覆盖成对象：data.facts 必须始终是**函数**，
       否则各模块调用 data.facts() 会抛错（此前 refresh 每次写入都会把它换成对象）。 */
    data.factsCache = facts();
  }

  refresh();
  data.subset = subset;
  data.lastWard = lastWard;
  data.facts = facts;          // ⭐ 全站统一口径：data.facts() 取最新值
  data.summarize = summarize;
  data.derive = derive;
  window.SEPTEMBER_REVENUE_DATA = data;

  /* 源版这里会写自己的 localStorage；本仓不落第二份数据，转交 OPS_REVENUE */
  window.updateSeptemberRevenueData = function (nextRows, meta) {
    if (window.OPS_REVENUE && typeof window.OPS_REVENUE.applyRows === 'function' && Array.isArray(nextRows) && nextRows.length) {
      window.OPS_REVENUE.applyRows(nextRows, meta);
    } else {
      refresh();
      window.dispatchEvent(new CustomEvent('september-revenue-updated', { detail: data }));
    }
    return derive();
  };
  window.resetSeptemberRevenueData = function () {
    if (window.OPS_REVENUE && typeof window.OPS_REVENUE.reset === 'function') window.OPS_REVENUE.reset();
    refresh();
    window.dispatchEvent(new CustomEvent('september-revenue-updated', { detail: data }));
  };

  /* ⭐ 唯一真源更新 → 重建 rows → 通知两个新面板 */
  window.addEventListener('ops:revenue-updated', function () {
    refresh();
    window.dispatchEvent(new CustomEvent('september-revenue-updated', { detail: data }));
  });
})();
