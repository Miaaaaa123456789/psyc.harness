# 精神专科 AI 医院 · 数字员工工作台

面向精神专科医院的移动优先 AI 运行工作台，展示机器人团队、Skill 库、任务中心、患者状态、部门协同、运行审计与 AI Native 医院演进路线。

## 本地运行

```bash
npm install
npm run dev
```

## Netlify 构建

```bash
npm run build:netlify
```

发布目录为 `out`，部署配置见 `netlify.toml`。

## 经营看板数据自动化改良（2026-10-18）

**模型先读：[实施入口与状态](docs/live-data/START_HERE.md)。** 保留原看板所有信息、布局、弹窗、渠道及拖图核验交互，只替换数据链路并在原位置改良AI洞察。

采用院方自托管 PostgreSQL、授权在线表格采集、共享图片导入、统一版本快照；GitHub不充当生产数据库。方案包含来源配置、数据库结构、指标/时间戳/API契约及跨设备验收。

**当前为方案和规则参考，后端尚未部署；不能认定自动更新或全端同步已实现。** 原Workbuddy、ChatGPT Site和GitHub分别是独立发布目标。

规则参考测试：`node --test tests/live-data/metric-rules.test.mjs`。
