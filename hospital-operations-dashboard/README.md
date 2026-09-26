# 医院经营协同看板（静态发布版）

此目录保存当前线上“医院经营协同 / 营销分析”看板的可复现静态版本。

## 打开方式

直接用静态服务器打开本目录：

```bash
cd hospital-operations-dashboard
python3 -m http.server 4173
```

然后访问 `http://localhost:4173`。

## 数据更新

- 营业、门诊、在院、入院、出院统一由 `september-revenue-data.js` 管理。
- 页面支持拖入 PNG/JPG/WEBP、CSV、XLS/XLSX。图片在浏览器本地 OCR；经字段、当日收入与累计金额勾稽校验后，才触发各模块同步重算。
- 浏览器确认导入的数据会本地持久化；若要作为所有设备共享的基线，请将确认后的日报同步回 `september-revenue-data.js` 并提交。
- 数据截至 2026-09-25 23:59；9 月 26—27 日暂未按 0 处理。

## 本次同步

- 来源：ChatGPT Site 发布版本 13
- Site 源码提交：`bc4eefcec11a3783a202a14b68911b5c203c4da6`
- 同步日期：2026-09-26
