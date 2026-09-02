# C08 Feedback Capture｜用户反馈捕获

## 1. 目标

把用户真实修改、采用、否决转成结构化 Feedback，为 Experience Candidate 提供可靠输入。

## 2. 边界

负责：

- 采用 / 部分采用 / 修改 / 拒绝 / 重做
- Artifact Diff 关联
- 用户原因
- 是否值得学习
- Feedback Scope

不负责：

- 自动生成全局偏好
- 自动发布 Rule / SKILL

## 3. Feedback 类型

```text
accept
partial_accept
edit
reject
retry
experience_disable
```

## 4. UI 设计

任务 / Artifact 完成后提供轻量反馈条：

```text
采用
部分采用
需要修改
放弃
```

当选择“修改”或检测到 User Final 与 AI Initial 存在明显 Diff：

```text
这次修改是否值得以后参考？
[仅本次] [值得学习] [不要学习]
```

可选补充：

```text
为什么改？
```

## 5. Diff Feedback

对 Artifact 的关键变化支持逐段标记：

- 保留
- 删除
- 重写
- 新增

系统可提出候选解释，但用户最终选择优先。

## 6. 数据契约

```text
FeedbackRecord
- feedback_id
- task_id
- artifact_id(optional)
- feedback_type
- original_ref
- modified_ref(optional)
- diff_ref(optional)
- reason(optional)
- learning_intent
- scope
- created_at
```

`learning_intent`：

```text
this_time_only
candidate
never_learn
unknown
```

`scope`：

```text
task
workspace
global_candidate
```

## 7. 交互原则

- 反馈必须轻。
- 不强迫用户每次填写原因。
- 明确修改比隐式行为权重更高。
- 单次修改默认不形成全局规则。

## 8. 禁止事项

- 禁止只有 👍 / 👎 两个反馈。
- 禁止把“复制内容”当成采用。
- 禁止没有用户确认就将单次编辑升级为全局偏好。

## 9. 验收标准

1. 每个 Completed Task 都有反馈入口。
2. Artifact Diff 可关联 Feedback。
3. 用户可明确“这次不要学”。
4. Feedback 可声明适用范围。
5. 后续 Candidate 能追溯原始 Feedback。
