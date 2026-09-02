# P1 Material Development-Verified Baseline

## 1. 基线

- Commit: `81947e512aa41f3b4070756a0cd52e2830bc167d`
- GitHub Actions Run: `33622442041`
- 状态：`DEVELOPMENT_VERIFIED`

验证：

```text
npm run typecheck  ✓
npm run test:p0    ✓
npm run build      ✓
```

`DEVELOPMENT_VERIFIED` 只表示营销产品仓库内的实现、契约、自动验收与 production build 已通过。真实 AWKN 文件上传/解析服务仍需独立联调验收。

## 2. 产品边界

P1 只增加营销助理产品层的 Material 能力，不在本仓库实现 Agent OS、AWKN Engine、Memory OS、MCP、通用文件解析、向量数据库或长期记忆基础设施。

## 3. 统一 Material 模型

所有资料先生成稳定 `material_id`。

```text
文本文件 / 粘贴文本 / URL
→ local write
→ material.feed

PDF / PPT / DOC / XLS / 图片等二进制
→ local material_id
→ /api/material-upload
→ AWKN product upload endpoint
→ parse status
```

平台不得静默替换产品生成的 `material_id`。

## 4. 二进制上传契约

浏览器：

```text
POST /api/material-upload
multipart/form-data
- workspace_id
- material_id
- file
```

产品 Adapter 向上游转发：

```text
product=awkn-marketing
operation=material.upload
workspace_id
material_id
idempotency_key
file
```

环境变量：

```text
AWKN_MARKETING_MATERIAL_UPLOAD_URL
AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN
AWKN_MARKETING_MATERIAL_MAX_MB
```

默认产品层上传上限为 100 MB，可配置。

## 5. 解析结果契约

上游最小成功响应：

```json
{
  "ok": true,
  "data": {
    "material_id": "material-xxx",
    "parse_status": "queued | parsing | ready | failed",
    "parsed_text": "optional",
    "evidence": []
  },
  "trace_id": "optional"
}
```

营销产品层会校验 `material_id`。不一致时进入 `MATERIAL_IDENTITY_MISMATCH`，不会建立隐形 ID 映射。

## 6. 状态机

```text
uploading
→ queued
→ parsing
→ ready

failed
→ material.parse.retry
→ queued / parsing
```

`queued / parsing` 在 Workspace 页面每 8 秒调用 `material.parse.get` 刷新。页面关闭后不承担后台调度。

上传接口未配置：

```text
local-only
```

此时只保存本地资料引用，不生成虚假的解析正文或 Evidence。

## 7. Evidence 与 Agent Context

`ready` 后：

```text
parsed_text → Material content → Agent Context
evidence[] → Evidence Drawer → Agent Context metadata
trace_id → Material trace
```

文本资料继续使用浏览器本地读取内容；二进制资料只有 AWKN 返回真实解析结果以后才获得 `platform_parsed` 状态。

## 8. 自动验收新增项

P1 Material 增加并通过：

- 文本 / 二进制识别边界；
- `platform_parsed` 内容进入 Agent Context；
- Material Evidence 进入 Context；
- 上传成功状态归一化；
- `processing → parsing`；
- `completed → ready`；
- `MATERIAL_IDENTITY_MISMATCH`；
- `PLATFORM_NOT_CONFIGURED → local-only`；
- `material.parse.get` / `material.parse.retry` 产品操作存在。

## 9. 尚未证明的能力

本基线没有声称以下事项已经完成：

- AWKN 上游实际 PDF/PPT/DOC/XLS 解析质量；
- 大文件真实传输性能；
- OCR / 表格 / 图片 / 多模态解析效果；
- 企业私有部署下的文件存储与 DLP 策略；
- 多用户权限与租户隔离；
- 真实业务数据规模下的检索效果。

这些必须在 AWKN 平台真实环境中单独验收。
