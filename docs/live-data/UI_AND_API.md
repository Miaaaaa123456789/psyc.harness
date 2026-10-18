# 原UI适配与API实施契约

本文件是待实现接口约定，不是现有可调用接口。采用原站同源`/api/operations/v1`。鉴权由院方账号/会话完成，所有查询按角色过滤，写入校验CSRF和权限。不得在静态JS嵌数据库密码/WPS令牌。

## 数据接口

| 方法与路径 | 输入 | 输出/要求 |
|---|---|---|
| GET `/snapshot?month=YYYY-MM&periodStart=...&periodEnd=...` | 显式筛选；If-None-Match | schemaVersion、revision、期间、各源watermark、metrics、series、departments、rankings、channel、insights；未授权字段不下发；304可用 |
| GET `/sources` | 会话 | 每源状态、数据截至、最后尝试/成功/失败原因；不暴露令牌/患者原始记录 |
| GET `/events` | Last-Event-ID | SSE `revision-published`含revision、affectedMetricIds；重连重放，快照轮询兜底 |
| POST `/imports` | multipart文件、requestId、文件类别 | 202 importId、statusURL；受控文件持久化后才回应；限制文件大小/类型并防压缩包炸弹 |
| GET `/imports/:id` | 导入者或授权审核人 | queued/processing/needs_review/failed/committed、候选、来源位置、校验错误、expectedRevision；OCR置信度只是提示 |
| POST `/imports/:id/confirm` | correctedRows、expectedRevision、idempotencyKey、correctionReason | 事务接受后返回revision；重复确认回相同结果；409版本冲突；422校验不通过；403越权 |
| POST `/channels/changes` | 原渠道表单/粘贴解析候选、expectedRevision、idempotencyKey | 推进/学校/新旧渠道/收益/成本/负责人/周报全部共享；校验后新revision |
| POST `/corrections` | 目标revision、差异、理由、审批信息 | 原回退按钮生成补偿更正，非物理删历史；月末锁定需额外审批 |

snapshot指标对象至少为：`{value,unit,numerator,denominator,periodStart,periodEnd,dataThrough,asOf,sourceIds,status,coverage,definitionVersion}`；value允许null。状态只使用ok/provisional/missing/conflict/stale，错误不返回伪造0。snapshot内容必须可追溯到事实修订ID，但浏览器只按权限返回脱敏来源位置。

错误响应统一`{code,message,requestId,retryable}`。服务端记录脱敏日志与运行耗时，禁在console输出原图文本或整份患者表。

## 逐文件接线，避免漏更新

| 原文件/区域（两份目录同样适用） | 改造点 | 保留内容 |
|---|---|---|
| `index.html` | 启动时先初始化统一store，再绑定原渲染器；内嵌analytics全部分组及静态数字文案逐项登记 | 原布局/DOM/入口/完整历史与榜单；不得用重定向换到dashboard-ui |
| `data-import.js` | OPS_REVENUE.daily改读共享快照，applyRows/确认导入改异步服务端确认；唯一一次更新事件在新revision安装后发出 | 整页拖入、原drop zone、上传/粘贴、OCR核验、错误/取消/回退；不可只剩图片预览 |
| `september-revenue-data.js` | 继续订阅ops:revenue-updated，转译原接口形状并发september-revenue-updated | 原derive/facts与日期筛选调用方式，9月历史月与当前月隔离 |
| `channel-dashboard.js` | S从共享channel快照读取；保存函数改调用服务端；每次提交刷新依赖 | 渠道所有tab、推进阶段、学校开通、到院/去重、收益/成本、新旧渠道、粘贴、周排名及周报，不只快照人数 |
| `channel-snapshot.js` / `channel-weekly.js` | 静态快照仅迁移种子/离线标记；周报改共享API | 原呈现与编辑方式，不能混用本机S和共享数据 |
| `month-dashboard.js` / `october-board.js` | 月、本期、排名、日期由统一snapshot派生，去掉固定月份数字逻辑 | 现有卡片、月份切换、历史抽屉 |
| `marketing-current-report.js` / `marketing-detail.js` / `marketing-redesign.js` | 本期快照、环比、逐日明细、收入结构、患者流动全绑定同revision | 营收弹窗默认打开行为与红色关闭按钮，原完整分析 |
| `final-enhancements.js` / `business-analysis.js` / `revision-v6.js` | 财务预测、经营判断、重点问题全部用metric id，清掉独立硬编码结论 | 原卡内可视化与抽屉解释，不删分析 |
| `september-report.js` | 固定历史月份可保留筛选，但数据由历史快照读取；修订留痕 | 原9月报告内容，不改为当前月数字 |
| 原部门抽屉、护理分项/工作报告、任务、例会 | 逐块登记动态指标/来源；原文保持原日期、待办状态也共享保存 | 全文/历史/展开折叠，不能把原文自动改写成最新事实 |
| `lib/server/db.ts` | 本期先新增operations服务，后续按签名兼容迁移其他系统 | 其他患者/任务API不应因停飞书而一起失效 |

若原API为同步函数而保存现在异步，必须修改调用方await并禁重复确认，不能用“立即返回成功、后台再上传”的适配器伪装兼容。读接口可仍同步返回已加载store；加载完成前显示加载/缓存日期，不能先播种虚构数值。

每个旧渲染器只绑定一次刷新事件；刷新不重新执行启动代码/autoOpen。原默认弹出只在初次导航按原策略执行，SSE/轮询不得把用户关掉的面板再次弹开。不要重建整页DOM，抽屉/输入框草稿独立于数据store；草稿与服务器同字段冲突时提示，不覆盖用户输入。

单一发布目录建议沿用`hospital-operations-dashboard/`为UI源码，通过构建复制到`public/operations-dashboard/`，CI逐文件摘要比对。在真正验证复制一致前，不删除任一目录。数据加载器生产模式禁止读取SEED/localStorage当权威；离线模式如启用必须显示缓存日期/只读，不显示自动同步正常。

## AI呈现保持原位置

每张既有分析卡用：① 一个指标与同期变化 ② 7—14点小趋势图或分段条 ③ 受影响流程位置/数据质量徽标 ④ 一条待办。点击原卡展开来源、时间、分子分母、对照范围和完整解释。利润/ROI缺字段时原卡显示待接入而非删掉卡片；心理断点可显示“日报→周统计→患者事件”的匹配状态计数，未能串联就明确未能串联。

所有组件（包括已打开抽屉、侧栏摘要、营收弹窗、渠道、逐日表、环比、预算、预测、部门、榜单、AI、核验清单）列入`component-bindings`清单。发布新revision时测试清单上的每项，禁止仅首页更新。固定业务原文与图片装饰可静态，所有变化数据和数据性文案必须绑定指标。
