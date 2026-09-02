# C05 Artifact Workspace｜产出物工作区

## 1. 目标

把营销成果从“聊天消息”升级成可持续编辑、比较、反馈、复用的 Artifact。

P0 支持：

- 研究报告
- 策略判断
- PRD / 提案
- 文案
- 汇报框架
- 会前 Brief
- 复盘

## 2. 边界

负责：

- Artifact 主视图
- 版本
- 编辑
- Diff
- Feedback
- Evidence
- Applied Experience
- 导出 / 复制入口

不负责：

- 通用 Office 编辑器
- 复杂多人协作文档
- 云盘系统

## 3. 页面结构

```text
┌───────────────────────┬────────────────────────────┐
│ Task / Conversation   │ Artifact                   │
│                       │                            │
│ 任务上下文            │ Title                      │
│ 修改意见              │ Content                    │
│ AI 回复               │                            │
│                       │ Version / Diff / Evidence  │
└───────────────────────┴────────────────────────────┘
```

窄屏时 Artifact 全屏打开。

## 4. Artifact 状态

```text
Generating
→ Draft
→ User Editing
→ Final
→ Outcome Pending
→ Archived
```

## 5. 版本模型

至少保留：

- AI Initial
- AI Revision
- User Final

每次重要用户修改产生一个可比较 Version。

```text
ArtifactVersion
- version_id
- artifact_id
- source_type
- content_ref
- created_at
- created_by
- parent_version_id
```

`source_type`：

- ai_initial
- ai_revision
- user_edit
- user_final

## 6. Diff

Diff 是 Feedback Capture 的重要输入。

必须能识别：

- 删除
- 新增
- 改写
- 调序（可在后续增强）

用户可以将某个变化标记为：

- 仅本次修改
- 值得学习
- 不要学习

## 7. Artifact Actions

P0：

- 编辑
- 保存版本
- 比较版本
- 复制
- 查看 Evidence
- 查看 Applied Experience
- 提交 Feedback
- 记录 Outcome

P1：

- 导出 DOCX / PPTX / PDF
- 分享

## 8. 数据契约

```text
ArtifactView
- artifact_id
- task_id
- workspace_id
- artifact_type
- title
- current_version
- versions[]
- evidence_refs[]
- applied_experience_refs[]
- feedback_summary
- outcome_status
```

## 9. 复用来源

重点抽取 Vercel Chatbot 的 Artifact Pattern：

- Artifact 抽象
- Artifact Actions
- 独立工作区
- Version / Diff 模式

保留其 Apache-2.0 许可要求。

需要改造：

- Artifact 类型改为 Marketing Artifact。
- 数据层对接产品自己的 Artifact Domain。
- AI SDK 后端依赖不作为产品底层依赖强制引入。

## 10. 禁止事项

- 禁止产出物只存在消息流里。
- 禁止用户最终版本覆盖掉 AI 初版导致无法学习修改差异。
- 禁止单次 Edit 自动上升成全局规则。

## 11. 验收标准

1. AI 结果可一键进入 Artifact 主视图。
2. AI Initial 与 User Final 可比较。
3. 修改可形成结构化 Feedback 入口。
4. Artifact 可追溯 Task、Evidence、Experience。
5. 用户继续任务时可引用当前 Artifact。
