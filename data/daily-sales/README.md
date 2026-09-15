# 每日销售日报数据集（2026年9月）

梓笙园医院销售部《每日销售日报表》，按日期（时间戳）整理。

## 文件

| 文件 | 说明 |
|---|---|
| `2026-09.csv` | 主数据集，UTF-8 BOM，Excel/WPS 可直接打开；含 2026-09-01 ~ 2026-09-14 共 14 行 |
| `2026-09.json` | 同内容结构化版本，含来源元数据与字段中英文映射 |
| `CROSSCHECK-2026-09-15.md` | 与线上销售进度工作台面板快照的逐格核对报告 |

## 字段

| 字段 | 中文 | 单位 |
|---|---|---|
| `mzRevenue` | 门诊收入 | 元 |
| `mzMoM` | 门诊环比 | 元 |
| `firstVisit` | 初诊 | 人次 |
| `revisit` | 复诊 | 人次 |
| `zyRevenue` | 在院收入 | 元 |
| `zyMoM` | 在院环比 | 元 |
| `inHospital` | 在院 | 人 |
| `admissions` | 入院 | 人 |
| `discharges` | 出院 | 人 |
| `dischargeFirst` | 出院第一次 | 人 |
| `dischargeMulti` | 出院多次 | 人 |
| `dayTotal` | 当日收入合计 | 元 |
| `monthCumulative` | 当月累计收入 | 元 |

- `date`：业务日期（时间戳主键，`YYYY-MM-DD`）
- `weekday`：星期
- `*MoM`：较前一日的绝对增减额，负数表示减少
- `dischargeMulti`：多数行源表为空，已按面板值补齐的单元格见 JSON 中 `dischargeMultiSource`

## 数据质量

与面板快照的差异、遗漏与算术自检结论见 `CROSSCHECK-2026-09-15.md`。**校验：14 行全部满足「门诊收入+在院收入=当日收入合计」与累计额递推关系。**
