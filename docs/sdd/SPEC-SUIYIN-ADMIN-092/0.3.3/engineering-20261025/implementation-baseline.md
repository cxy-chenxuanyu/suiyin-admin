# 深圳双渠道会话质检日报：生产实现基线核对

核对日期：2026-10-25。使用已授权 `gh` CLI 只读获取默认分支、代码和 Issue；未读取运行密钥、修改生产仓、调用模型、创建 Issue 或发送消息。代码存在不等于对应版本已经部署或租户已经启用。

## 固定远端基线

| 仓库 | 默认分支 | 已核对 SHA | 提交时间 UTC |
| --- | --- | --- | --- |
| PetWebOrg/suiyin-go | main | `47b8f4b18daeefd11a403fa4cb14c0d8cfddfa77` | 2026-10-25 11:48:12 |
| PetWebOrg/suiyin-admin | master | `c6202fd78d245eb1f96da2db7a31be059d9bfa61` | 2026-10-25 02:10:18 |

已完整读取两仓该 SHA 下的 AGENTS.md 和 CLAUDE.md；本次仅做实施基线调查。

## 可复用能力及精确入口

1. Go 的模型解析链为“显式模型 → 提示词模板绑定 → 企业场景绑定 → 平台默认”；提示词按显式 ID 或当前场景解析，缺失时明确失败。[ai_helpers.go:20](https://github.com/PetWebOrg/suiyin-go/blob/47b8f4b18daeefd11a403fa4cb14c0d8cfddfa77/admin/service/ai_helpers.go#L20)。内置 `Generate` / `GenerateWithTemperature` 接收模型配置 ID、systemPrompt、userContent，可复用模型服务层；这是内部函数，不等于已有任意单次推理 HTTP 接口。[ai_task_provider.go:114](https://github.com/PetWebOrg/suiyin-go/blob/47b8f4b18daeefd11a403fa4cb14c0d8cfddfa77/admin/service/ai_task_provider.go#L114)。
2. Go 已有客户×人设评分任务、队列、重试、进度、列表、详情与统计；创建任务时冻结维度、提示词内容和解析的模型 ID。[任务快照规划](https://github.com/PetWebOrg/suiyin-go/blob/47b8f4b18daeefd11a403fa4cb14c0d8cfddfa77/admin/service/ai_chat_score.go#L369)、[已有路由](https://github.com/PetWebOrg/suiyin-go/blob/47b8f4b18daeefd11a403fa4cb14c0d8cfddfa77/admin/router/ai_chat_score.go#L21)、[任务类型](https://github.com/PetWebOrg/suiyin-go/blob/47b8f4b18daeefd11a403fa4cb14c0d8cfddfa77/db/models/ai_task.go#L12)。
3. 现有评分读取全历史游标快照，最新窗口版本按 500 条/192 KiB 动态分段；读取时只认任务快照而不回退当前配置。[分段常量](https://github.com/PetWebOrg/suiyin-go/blob/47b8f4b18daeefd11a403fa4cb14c0d8cfddfa77/admin/service/ai_chat_score.go#L23)、[输入解析](https://github.com/PetWebOrg/suiyin-go/blob/47b8f4b18daeefd11a403fa4cb14c0d8cfddfa77/admin/service/ai_chat_score_resolver.go#L119)。已有持久化自动扫描、进度 checkpoint 和恢复机制可作为实现参考。[自动扫描](https://github.com/PetWebOrg/suiyin-go/blob/47b8f4b18daeefd11a403fa4cb14c0d8cfddfa77/admin/service/ai_chat_score_auto_trigger.go#L166)。不能直接把全历史评分当作自然日日报。
4. Admin 已有评分规则、质检记录、多人设/日期筛选、任务和批次进度、历史详情；使用 `/v1/ai/chat-score/*`。[API 客户端](https://github.com/PetWebOrg/suiyin-admin/blob/c6202fd78d245eb1f96da2db7a31be059d9bfa61/src/api/ai/chat_quality/index.ts#L46)、[查询和响应类型](https://github.com/PetWebOrg/suiyin-admin/blob/c6202fd78d245eb1f96da2db7a31be059d9bfa61/src/api/ai/chat_quality/types.ts#L59)、[管理页](https://github.com/PetWebOrg/suiyin-admin/blob/c6202fd78d245eb1f96da2db7a31be059d9bfa61/src/views/ai/chat_quality/list.vue#L900)。
5. Admin 提示词编辑器继续从业务模型目录取候选，过滤 enabled 且支持对应 scene；企业模型页说明调用配置由平台维护。[模板模型过滤](https://github.com/PetWebOrg/suiyin-admin/blob/c6202fd78d245eb1f96da2db7a31be059d9bfa61/src/views/ai/prompt_template/list.vue#L117)、[读取业务目录](https://github.com/PetWebOrg/suiyin-admin/blob/c6202fd78d245eb1f96da2db7a31be059d9bfa61/src/views/ai/prompt_template/list.vue#L170)、[企业只读配置页](https://github.com/PetWebOrg/suiyin-admin/blob/c6202fd78d245eb1f96da2db7a31be059d9bfa61/src/views/ai/ent_model_config/list.vue#L37)。本期应复用这些权限和绑定来源，不另建企业持有密钥入口。

## 与指定已关闭 Issue 的区别

| 历史 Issue | 已有范围 | 与 SPEC092 双渠道日报的区别 |
| --- | --- | --- |
| [Go #2931](https://github.com/PetWebOrg/suiyin-go/issues/2931) CLOSED | 客户×人设全部历史评分；双方增量均至少 5 条时自动触发，首次观察最近 2 天；05:30 启动 | 不是前一自然日固定窗口、企微/个微各一份日报，不是 04:00–08:00 批次预算 |
| [Go #2965](https://github.com/PetWebOrg/suiyin-go/issues/2965) CLOSED | 多人设筛选；在所选范围内每客户×人设取最新评分后计算均分，区分评分次数与覆盖客户 | 不提供逐日会话覆盖、14 维证据判断、回复程序计时和业务日报聚合 |
| [Admin #222](https://github.com/PetWebOrg/suiyin-admin/issues/222) CLOSED | 质检记录、动态评分规则、单次/最多 500 对批量任务、历史复盘；明确继续复用已有提示词库 | 不是两个渠道日报菜单、日报七页签和按消息证据打开 PC 抽屉；该单明确不增加定时 |
| [Admin #234](https://github.com/PetWebOrg/suiyin-admin/issues/234) CLOSED | 人设表现与质检记录分区独立筛选，多人设/7、30、90 天/全部/自定义统计 | 只是现有评分页面筛选和统计口径，不是本次自然日日报及配置/批次状态交互 |

现有场景枚举包含 `chat_score`，此次检查未发现 `wecom_quality_daily` 或 `wechat_quality_daily`；其定时说明仍是 05:30、双方各新增至少 5 条、全历史分析。[场景枚举及定时说明](https://github.com/PetWebOrg/suiyin-go/blob/47b8f4b18daeefd11a403fa4cb14c0d8cfddfa77/db/models/ai_prompt_template.go#L13)。新日报需要明确新增场景、固定日窗口和身份/渠道隔离、运行与报告持久化、严格结构和证据校验、完整覆盖/未知状态、预算停止领新请求以及版本化结果；不能仅换现有评分页标题。

## 重复核对与交接结论

主线程已按开放日报和 SPEC092 查重四次均无命中。本次独立读取四个指定历史 Issue，并补查两仓全部状态的“日报”标题检索：没有发现本次医美企微+个微会话质检自然日日报的真正重复项。返回的触达消息统计、销售消息日聚合、账号健康早报等是不同需求，不应阻止建立本次 Go/Admin 配对 Issue。此结论限定于本次查到的结果，不把搜索空结果作为所有历史需求均不存在的绝对证明。

建议两单互链：Go 负责日报数据/场景/任务/报告契约，Admin 依赖该契约完成已验收原型界面和现有提示词/模型管理接入。沿用既有架构，但保留本日报独立范围。开发后提交 PR；本调查不表示生产开发、部署或 04:00–08:00 容量验收已经完成。
