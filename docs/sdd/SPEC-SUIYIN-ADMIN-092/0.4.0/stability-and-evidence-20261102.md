# 日报稳定性与运营依据增补 · 2026-11-02

状态：用户已在本聊天回复“按此范围开始修复”，授权本轮实现；源分支为待审资料，不冒称正式合入或部署。延续0.4.0，不新增表、队列、环境变量、身份框架或媒体识别。工程：Go#5228、Admin#642。

## 已批准六组范围

1. 纠错反馈透传受控的具体路径、类型、缺失值与证据错误，最多两次模型调用不变。图片视频等未解析记录保留存在信息，不能用作内容证据。保留AI Task、公共限流、回执、用量与成功任务去重。
2. 历史参考窗口不足不阻断独立当日会话及其他客户。保留有界容量、截止快照、跨日5分钟消息组、双向5+5准入。无法证明的跨日边界仅影响相应程序事实，不伪造完整性，不吞当前日真实取数错误。
3. 内部协调或第三方转述不等于该对象本人购买意向或顾客投诉。不凭昵称/AI猜测删除身份；既有人工内部/外联排除继续生效。服务优先级有独立业务原因和当前日可读证据，不能借意向原文充当投诉依据。
4. 分别查看意向、投诉/售后等优先级、具体问题、回复事件的依据；抽屉显示主体、原判/复核后及结果版本，旧结果没有独立依据时明确未留存。保留头像对话与上下文，原始证据ID/枚举不作为运营读懂摘要的前提。
5. 回复表现先汇总，事件按真实occurrence合并耗时与超时；一事件一行，正常默认收起。显示实际发言/人工回复时间、冻结阈值、易读时长与观察截止。未见人工回复只是观察状态，不自动制造业务待办。正常、未知和不适用项目不显示待处理，原问题被排除后的复核审计仍可追溯。
6. 产品触达仅成立记录下钻，员工主动提及需同一subject筛选；数量/去重会话口径各自清楚。工作号指标对应相关会话。大量工作号选择折叠标签并提供仅选已接入范围；查看范围不冒充执行范围。终态失败不显示仍整理中；定时开关仍只在提示词模板。

## 原接口最小增量

- `intention.applicability?: 'applicable'|'not_applicable'|'unknown'`。新模型协议要求填写；not_applicable用于内部协调/代人传话等不能作为本人购买咨询的会话，level为unknown，保留业务说明和证据。不等于认定对象真实员工身份。历史缺字段不反推分类，不补写旧数据。意向复核沿现有一个下拉：选不适用提交level=unknown/applicability=not_applicable，选暂无法判断提交unknown/unknown，选具体等级提交对应level/applicable；ReviewPatch增加可选applicability，before/after保留。旧客户端仅改具体等级时服务端同步为applicable，避免保留矛盾适用性；仅改为unknown时保留不适用或置unknown，不推断身份。
- `ConversationRow.servicePriorityReason?:string` 与 `servicePriorityEvidenceIds?:string[]`：与servicePriority一起冻结。complaint/aftercare/urgent必须有独立原因与可核对的当前日可读依据；normal/unknown不冒充待办。模型原文摘要应为简洁业务说明，不夹带message ID或level_x等协议内容。
- `GET /conversations/:id/evidence`增加`mode?:'ai'|'effective'`，默认effective；响应增加mode并按该模式构建conversation/facts。原判值与复核审计保留，不能点击原判入口后静默显示复核后。
- `FactRow`追加`occurrenceKey:string`、`programVersion:number`、`mentionedBy?:'staff'|'customer'|'unknown'`，正式保留`startedAt?`、`endedAt?`、`waitMinutes?`。客户端事件标识结合reportId/conversationId/programVersion/occurrenceKey，不用时长或回复ID猜配对。
- Evidence追加`responseContext={timeoutMinutes:number,customerGroupMinutes:number,observationEndAt:string,programVersion:number}`，来自该报告冻结参数及观察截止。已回复耗时按startedAt到endedAt的实际秒数呈现；pending截至observationEndAt，阈值为严格大于。完整conversation facts在抽屉内归并事件，本轮不新增全局事件分页接口。
- `POST /facts/query`追加`mentionedBy?:'staff'|'customer'|'unknown'`。产品成立明细传valueStatus=true；员工主动触达再传mentionedBy=staff，与同一reportRefs/ACL/版本及统计对应。不得以当前页前端过滤替代服务端匹配。
- 真实AI问题的复核/处理资格由原始问题、当前有效值和历史复核分别表达：当前有效true才是处理待办；原始false/unknown/not_applicable没有问题复核；原始true后被人工排除保留修改复核及审计，不成为待处理。程序统计始终只读。

## 合成场景与验收

- AC-1 六类已见失败结构、真实包装链纠错：路径和错误预期传到第二次请求，不放宽证据、不增加调用上限；成功请求和用量不重复。
- AC-2 257条历史、跨日相邻消息与独立当日5+5客户：独立客户继续，仅不能证明的边界未知；4+5/5+4仍跳过，容量、冲突副本、SavedAt及隔离保持。
- AC-3 先约11点再投诉等待，与另一内部协调对话：投诉依据只高亮等待/无人接待相关消息，意向只高亮预约；内部协作不赋予本人购买/顾客投诉，原判/有效结果匹配版本。
- AC-4 两次已答复+一个未见回复形成三个事件；等于阈值不超时，按实际秒格式化且不重算覆盖原值。产品两次提及一个会话的次数及去重下钻一致；正常/未知无待办，审计保留。

只补缺失/失效的必要验证，复用真实有效结果，不默认重跑全量。任何新增或新用途监听需用户明确确认后启动。当前不追加生产付费分析、补跑、数据清除、定时开关或部署；开发、合并、部署与实跑分别报告。
