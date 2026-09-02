# C06 Evidence Drawer｜证据抽屉

## 1. 目标

让任何关键事实、判断、建议、Artifact 都能在不打断主任务的情况下展开依据。

用户必须能够快速回答：

> **这个结论从哪里来？**

## 2. 边界

负责：

- Citation
- Evidence Source Card
- 来源分类
- 来源片段
- 时间
- 相关性说明
- 打开原来源

不负责：

- 通用知识库浏览器
- Memory 管理后台
- 搜索引擎后台

## 3. 入口

Evidence Drawer 可从以下位置打开：

- Task Response
- Artifact
- Strategy Judgment
- Signal
- Applied Experience
- Evolution Candidate

## 4. 页面结构

```text
Evidence Drawer
├─ 本次直接引用
├─ Workspace Materials
├─ 历史 Task / Artifact
├─ Applied Experience Sources
└─ External Sources
```

每个 Source Card：

```text
source_type
source_title
source_time
source_origin
snippet
why_relevant
confidence(optional)
open_source_action
```

## 5. 来源类型

```text
workspace_material
meeting
message
email
artifact
historical_task
experience
web
public_document
user_input
```

## 6. 排序规则

默认优先级：

1. 当前结论直接引用
2. 用户自己的原始资料
3. 已确认历史资料
4. 已验证 Experience
5. 外部公开来源
6. 辅助背景来源

同组内按引用顺序或相关度排序。

## 7. 交互状态

- collapsed
- open
- source-preview
- source-unavailable
- source-conflict

冲突来源要显式标记。

## 8. 数据契约

```text
EvidenceBundle
- subject_type
- subject_id
- citations[]
- supporting_sources[]
- conflicting_sources[]
```

`EvidenceSource`：

```text
- evidence_id
- source_type
- title
- source_ref
- source_time
- snippet
- relation
- confidence
- availability
```

## 9. 复用来源

Onyx 非 `ee` MIT 部分可抽取 / 改造：

- DocumentsSidebar
- Sources Sheet / Drawer
- citation order
- source metadata
- snippet 卡片

保持许可边界，不复制 `ee` 目录内容。

## 10. 禁止事项

- 禁止只给“参考了 8 个来源”但不给来源。
- 禁止外部 Web 结果覆盖用户已确认事实而无冲突提示。
- 禁止把 Evidence Drawer 做成文件管理器。

## 11. 验收标准

1. 任意关键判断 1 次操作可查看 Evidence。
2. 来源包含标题、时间、片段、类型。
3. 用户可打开原始来源。
4. 冲突证据可被识别。
5. Evidence Drawer 不阻塞 Task / Artifact 主流程。
