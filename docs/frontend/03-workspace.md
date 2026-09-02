# C03 Workspace｜营销工作空间

## 1. 目标

Workspace 是所有营销任务的业务上下文容器。

用户进入 Workspace 后，5 秒内应知道：

1. 目标是什么
2. 已有什么资料
3. 最近发生什么
4. 正在做什么
5. 下一步最值得做什么

## 2. 边界

负责：

- Goal
- Context Summary
- Materials
- Tasks
- Artifacts
- Key Timeline
- Decision / Outcome 摘要

不负责：

- CRM 全量客户档案
- 联系人后台
- 商机 Pipeline
- Memory 底层展示

## 3. 页面结构

```text
Workspace Header
├─ 名称 / 类型 / Goal / Status
├─ Success Criteria
└─ 新任务

Workspace Body
├─ Overview
│  ├─ 当前判断
│  ├─ 最近变化
│  └─ Next Best Task
├─ Materials
├─ Tasks
├─ Artifacts
└─ Key Timeline
```

## 4. Material Feed

支持：

- 文件拖拽
- 链接
- 文本粘贴
- 会议记录
- 历史方案
- 图片 / PDF / PPT / DOC / XLS 等文件入口

上传后前端状态：

```text
Uploading
→ Processing
→ Ready
→ Needs Review(optional)
→ Failed
```

如果系统识别出关键事实冲突，必须显示 `Needs Review`。

## 5. 数据契约

```text
WorkspaceView
- workspace_id
- name
- workspace_type
- goal
- success_criteria
- constraints
- priority
- status
- current_judgment
- recent_signals[]
- suggested_tasks[]
- materials[]
- tasks[]
- artifacts[]
- timeline_items[]
```

`MaterialCard`：

```text
- material_id
- title
- type
- source
- source_time
- processing_status
- summary(optional)
- conflict_count
```

## 6. 关键交互

- 创建 Workspace
- 编辑 Goal / Success Criteria
- Feed Material
- 打开 Material
- 确认 / 修正提取出的关键事实
- 发起 Task
- 从 Artifact 继续任务
- 从 Signal 创建 Task

## 7. 空状态

新 Workspace 空状态只做三件事：

1. 输入目标
2. 喂资料
3. 开始第一个任务

禁止展示大量空卡片。

## 8. 复用来源

AnythingLLM 可抽取：

- Workspace 切换体验
- DnD 文件投喂
- Workspace Thread / 文件上下文组织思路

只抽取前端交互模式与适用组件，不引入其 Workspace 后端和 RAG 体系。

## 9. 禁止事项

- 禁止把 Workspace 设计成项目管理系统。
- 禁止把 Entity 全量表格化要求用户维护。
- 禁止所有资料上传后立即自动认定为事实。
- 禁止关键冲突无提示合并。

## 10. 验收标准

1. 新 Workspace 3 步以内完成创建、目标、首批资料。
2. 资料状态清晰可见。
3. 用户能从任意 Material 发起任务。
4. 用户能从 Workspace 看到真实最近任务和产出物。
5. 冲突信息有显式人工确认入口。
