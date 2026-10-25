---
test_contract_id: TEST-CONTRACT-SUIYIN-ADMIN-092
spec_id: SPEC-SUIYIN-ADMIN-092
spec_version: 0.3.3
status: draft
prepared_by: "Codex"
prepared_at: 2026-10-25
---

# 深圳企微与个微会话质检日报 — Test Contract

## 1. 测试摘要

- 源规格：[SPEC-SUIYIN-ADMIN-092@0.3.3](https://github.com/xfang9528-glitch/suiyin-admin/blob/v2026102501-admin-chat-quality-daily/docs/sdd/SPEC-SUIYIN-ADMIN-092/0.3.3/spec.md)，源字节 SHA256：`5fb7b3979589027dea7bc27f2f61787246d9aa4875cdb844efccabbd3fdf432e`。
- 对应 Handoff：`HANDOFF-SUIYIN-ADMIN-092`；I001 为 PetWebOrg/suiyin-go，I002 为 PetWebOrg/suiyin-admin。租户 metadata=艺星，实际首批范围=深圳yestar-sz；平台分别不适用、PC；提出人=房昕。
- 本次用户已授权建立两仓 Issue：[Go #4901](https://github.com/PetWebOrg/suiyin-go/issues/4901)、[Admin #569](https://github.com/PetWebOrg/suiyin-admin/issues/569)。本文件定义计划测试，不表示已开始生产开发或已完成生产验收；分工与真实Issue回链见[Handoff](issue-handoff.md)。
- 覆盖 27 个 MUST、48 个 AC、79 个测试（76 自动化计划、3 人工视觉计划）。跨仓共同AC各有自己的Test ID，不以另一仓测试替代本仓验收。
- 原型与旧本地结果是交接参考。当前规则/模板必须从已发布配置读取并冻结；源SPEC的20/5/6/3为可配置样例，不覆盖现有已发布值。原v1.4离线记录与新DeepSeek执行保持独立来源。

## 2. Strategy

业务计算采用domain/unit，输入输出与证据采用contract，持久化/快照/幂等/恢复采用integration，租户及证据授权采用security，用户路径采用e2e，跨渠道和状态矩阵采用parameterized。可机判项目均为automated，人工仅保留视觉对照；医疗/业务语义结果仍待有资质人员或业务复核，不把结构校验当准确率保证，不新增未经批准的准确率门槛。

所有路径为计划路径，工程在Phase 1确认框架与实际目录后可调整实现路径，但不得改变Oracle、R/AC归属或Test ID。当前全部CI Evidence=planned；不引用已有原型检查数字冒充生产CI。

### 2.1 历史参考与生产范围

以下测试仅为已交付参考合同回归：T-R011-05、T-R019-01、T-R019-02、T-R019-03、T-R020-01、T-R021-01、T-R022-01、T-R024-01、T-R026-02、T-R026-04。可用合成数据与安全metadata重复验证其隔离、来源和显示不变量；不要求生产追溯实施17租户采集、补采延期租户、重跑2026-10-19/20原v1.4、构造本机outputs目录或重建私有侧车。

R011本地删除仍只是静态演示：其确认/取消/失败与保留边界可作回归，不能据此默认为生产删除API或新恢复重建流程。若工程确需改变该业务行为，回源SPEC办理变更。

R025/R026的稳定身份、所选occurrence证据归属、右侧PC只读呈现与关闭恢复是Admin实现参考；历史原bundle/侧车/ Codex来源不变属于参考回归。生产读取必须由I001服务端授权，不将本机私有JSON直出公网。

本文件不更新SPEC静态阶段的历史事实；实时本地执行进展与本次授权由独立安全回执/Handoff承接。旧Codex、旧transport与新执行结果不能混为同一验收证据。

## 3. Coverage Matrix

| Test ID | Slice ID | Rule | Acceptance | Layer | Automation | Target Repo | Planned Test Path | Oracle | CI Evidence | Manual Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| T-R001-01 | I002 | R001 | AC-R001-01 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r001.spec.ts | 两个独立聊天管理路由各默认昨日，仅查询本渠道；七模块保持本页筛选和版本；提示词/模型仍在AI管理；未接入个微显示未接入，不显示已检测零问题。 | planned | — |
| T-R001-02 | I002 | R001 | AC-R001-02 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r001.spec.ts | 在企微历史日期/工作号/版本/复核状态保持的前提进入个微并补跑失败项，个微不继承前页状态；渠道缓存、进度与批次身份分开，企微结果保持。 | planned | — |
| T-R002-01 | I001 | R002 | AC-R002-01 | domain | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r002_test.go | Asia/Shanghai的D主体窗口为D日00:00至D+1日00:00左闭右开，计划D+1日04:00、目标08:00，观察截至/实际启动/实际完成独立记录，完成后即可读取。 | planned | — |
| T-R002-02 | I001 | R002 | AC-R002-02 | integration | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r002_test.go | 05:00迟启动仍保存04:00计划；08:00未完成保留真实进度和超时标记，不转成完成、不改统计日、不以零问题填空。 | planned | — |
| T-R003-01 | I001 | R003 | AC-R003-01 | security | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r003_test.go | 以租户/渠道/工作号/稳定客户关系建会话并按稳定消息ID去重；同名不合并，失败/系统/观察点已撤回均排除；原始、排除、有效数可对账且越范围记录拒绝。 | planned | — |
| T-R004-01 | I001 | R004 | AC-R004-01 | domain | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r004_test.go | 合成23:55客户至次日00:03有效回复计8分钟，按20分钟样例不超时；事件归D且次日不重复，次日消息不增加D日消息数。 | planned | — |
| T-R004-02 | I001 | R004 | AC-R004-02 | domain | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r004_test.go | 23:55至次日00:16计21分钟一个超时；23:59/00:02连发至00:10按末条计8分钟、归首条日；边界采用当前规则，未回复只有等待下限，零点不提前判定。 | planned | — |
| T-R005-01 | I001 | R005 | AC-R005-01 | domain | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r005_test.go | 合成100活跃/70适用/14超时会话得14%全量占比和20%适用率；超时事件另计，30仅触达为当日未回应；各聚合来自同一结果集，未知身份单列。 | planned | — |
| T-R005-02 | I001 | R005 | AC-R005-02 | domain | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r005_test.go | D-1日23:59及D日00:02连发事件归D-1；D日仍可有活跃会话，但适用响应会话/超时会话/次数均不增加，分母0返回不适用而非0%。 | planned | — |
| T-R006-01 | I001 | R006 | AC-R006-01 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r006_test.go | 语音未转写/图片未OCR的数量及受影响维度保持证据不足，不判合格或缺失业务动作；文本结果可保留，覆盖部分完成；补解析后另存修订。 | planned | — |
| T-R007-01 | I001 | R007 | AC-R007-01 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r007_test.go | 仅统计日客户表达支持购买意向，员工主动预约不能升级客户意向；售后/投诉服务优先级独立，无回应单列；14维有适用性/证据/结论/引用，不适用或未知不计合格，医疗候选待有资质人员复核。 | planned | — |
| T-R007-02 | I001 | R007 | AC-R007-02 | domain | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r007_test.go | 次日00:03回复可解释D日诉求收尾；次日02:00新项目/预约表达不升级D日意向，补充上下文不增D日深聊/互动数，不以D最后发送者直接认定违规。 | planned | — |
| T-R007-03 | I001 | R007 | AC-R007-03 | domain | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r007_test.go | 按当前共享规则阈值，样例双方有效2条为不适用，恰3条进入场景/岗位判定；客户条数不能替代双方条数，撤回/系统/失败不凑门槛，3条本身不证明违规。 | planned | — |
| T-R008-01 | I001 | R008 | AC-R008-01 | security | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r008_test.go | 接待A转B、当前归属C及未知实际操作人分别保存；不统一归责C；稳定证据ID必须属于授权会话，伪造/跨会话/跨租户ID拒绝。 | planned | — |
| T-R009-01 | I001 | R009 | AC-R009-01 | integration | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r009_test.go | 确认/误报/处理/更正原子保存操作人、时间、理由及前后状态；原AI和复核历史不覆盖；误报不计人工确认仍计原候选；取消/保存失败不变，已处理不自动等于诉求解决。 | planned | — |
| T-R010-01 | I001 | R010 | AC-R010-01 | security | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r010_test.go | 读汇总/原文/复核/配置/重跑分别鉴权；汇总可读但原文无权时通过直接URL/API也不能取到原文；服务端验证租户及工作号范围。 | planned | — |
| T-R011-01 | I002 | R011 | AC-R011-01 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r011.spec.ts | 两日报与旧模板共用六列表及全部场景筛选，工具栏进入共同规则；基础编辑沿旧流程、高级区明确草稿/试跑/发布；企微保存仅影响企微，失败保留草稿、取消保持；候选模型按启用/场景过滤并标来源，默认缺失或失效阻断，企业目录只读且浏览器无密钥。 | planned | — |
| T-R011-02 | I001 | R011 | AC-R011-02 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r011_test.go | 试跑签名覆盖租户/渠道/场景/正文/共同规则/最终模型参数/系统契约/同渠道样本；任一输出相关值变化后旧通过不能发布新配置；共规变化使两渠道候选记录失效，旧发布与历史保持。 | planned | — |
| T-R011-03 | I001 | R011 | AC-R011-03 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r011_test.go | 各渠道仅按租户+渠道+场景显式绑定的生效模板ID/版本及有效模型执行；新增同名或最新草稿不能替代；模板缺失仅该渠道配置异常，不借对方。 | planned | — |
| T-R011-04 | I002 | R011 | AC-R011-04 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r011.spec.ts | 两日报行与普通行均为编辑/删除，无查看日报快捷链接；编辑沿原流程且保留高级配置与未保存保护；普通CRUD及聊天管理日报入口不回退。 | planned | — |
| T-R011-05 | I002 | R011 | AC-R011-05 | integration | automated | PetWebOrg/suiyin-admin | tests/contracts/quality-daily-reference.spec.ts | 仅回归已交付本地演示删除合同：确认并本地持久化成功才隐藏/停用目标渠道、刷新保持；取消/存储失败原样且失败提示；历史、另一渠道、共规、模型、正文备份保持；不产生API/线上删除/恢复重建。不能据此实现未经定义的生产删除接口。 | planned | — |
| T-R012-01 | I001 | R012 | AC-R012-01 | integration | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r012_test.go | 04:00计划快照先固定共规，再冻结各渠道模板/最终模型/输入；06:00编辑不影响排队与原批重试；两个计划渠道用同一共规快照，主动重跑生成本渠道新修订且旧版可读。 | planned | — |
| T-R012-02 | I001 | R012 | AC-R012-02 | integration | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r012_test.go | 主动重跑提交摘要显示当前已启用配置/原范围/截至点，重新冻结纳入早于D+1日04:00的晚到或补解析数据；04:00后的事件不得纳入；恢复失败项沿原输入配置。 | planned | — |
| T-R013-01 | I001 | R013 | AC-R013-01 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r013_test.go | 缺字段/非法枚举/截断JSON/Markdown包装/伪造或越界证据均不入成功与统计；错误可追溯且有限重试后列未完成；仅接收规定字段，会话内越权指令不执行，旧Markdown场景不变。 | planned | — |
| T-R014-01 | I001 | R014 | AC-R014-01 | integration | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r014_test.go | 合成100任务90成功5失败5待处理互斥对账且非完成；重复计划触发/恢复不重复批次或问题；同快照失败重试不改修订，晚到/补解析/主动重算新修订并留旧版。 | planned | — |
| T-R014-02 | I001 | R014 | AC-R014-02 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r014_test.go | 完整同步无消息、离线不完整、渠道未接入为不同状态；后两者不计已分析；未知预计数保持unknown并说明，不返回虚假100%。 | planned | — |
| T-R015-01 | I002 | R015 | AC-R015-01 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r015.spec.ts | 复用既有Shell/菜单身份/排序/权限/租户术语；日报页签与意向筛选互不误绑；切换/返回/编辑/租户转换不使旧页回退，合成操作明确本地，不伪称线上生成。 | planned | — |
| T-R016-01 | I001 | R016 | AC-R016-01 | integration | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r016_test.go | 在独立批准的运行边界及预算内，对深圳企微/个微各保留真实provider调用、程序计数、结构证据校验、持久化、重启回读、版本/幂等/失败恢复回执；stub/旧Codex/静态HTML不能满足真实调用验收。当前生产测试planned，不据本地结果直接置verified。 | planned | — |
| T-R017-01 | I001 | R017 | AC-R017-01 | integration | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r017_test.go | 代表输入规模/长度/配额明确，两渠道同时运行完整取数至落库链并注入限流/超时；记录规模/token/并发/实际或可核验费用/阶段耗时；全批成功<4小时与实际早于08:00分别判定，小样本/推算不替代实测。 | planned | — |
| T-R017-02 | I001 | R017 | AC-R017-02 | domain | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r017_test.go | 计划04:00、实际05:00至08:30完整完成时容量耗时3.5小时通过，但08:00按时目标失败；两字段及迟启动/完成记录独立，不合成总达标。 | planned | — |
| T-R018-01 | I001 | R018 | AC-R018-01 | integration | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r018_test.go | 共规单一ID/版本；已启用两渠道各用候选规则及各自拟生效模板/模型/契约试跑，任一失败不发布；全过原子发布，未启用不阻断但启用前需验证；历史不变，不复制两套标准。 | planned | — |
| T-R018-02 | I001 | R018 | AC-R018-02 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r018_test.go | 只发布个微p3后个微r1+p3、企微r1+p1，核心统计口径不变；本渠道新增字段需带版本扩展及校验，不删共同核心、不破坏企微或历史读取。 | planned | — |
| T-R019-01 | I002 | R019 | AC-R019-01 | parameterized | automated | PetWebOrg/suiyin-admin | tests/contracts/quality-daily-reference.spec.ts | 以公开合成metadata回归17租户独立采样状态：未开入口/失败/未采/部分/确认0分别显示；条数与总数只在完整页/逐行身份核对后称完整；不借其他租户数据、不补开入口；不要求工程重新采集历史17租户。 | planned | — |
| T-R019-02 | I002 | R019 | AC-R019-02 | parameterized | automated | PetWebOrg/suiyin-admin | tests/contracts/quality-daily-reference.spec.ts | 用合成场景schema回归原有完整主/子正文保留、标签/定时/模型/字段文案及分组操作；同一已配置分组用子提示词、跨组/未配置/空子正文回主正文，保存不自动重跑；原场景02:00/05:30不得改为日报04:00；不将私有采样写入公开测试。 | planned | — |
| T-R019-03 | I002 | R019 | AC-R019-03 | parameterized | automated | PetWebOrg/suiyin-admin | tests/contracts/quality-daily-reference.spec.ts | 历史metadata保持15/17采样、2家已登录但无目标入口且用户延期/内容未取得；总条数未知不等于确认0，不称登录仍失败或全部完成，也不阻塞深圳；不要求生产补采。 | planned | — |
| T-R020-01 | I002 | R020 | AC-R020-01 | security | automated | PetWebOrg/suiyin-admin | tests/contracts/quality-daily-reference.spec.ts | 构建/版本化交接只允许代码及无原文metadata/合成fixture；扫描不含真实Prompt、名称、会话和截图；本机私有源被忽略且不打包，不能以改写业务规则假脱敏；深圳私有显示许可不扩大为公开许可。 | planned | — |
| T-R021-01 | I001 | R021 | AC-R021-01 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_reference_contract_test.go | 回归旧离线来源清单格式只允许深圳10/19与10/20两渠道四组合、原v1.4摘要和输入范围可追溯；不得把当前共规或新Prompt冒充旧来源、不得覆盖合成历史；只验证公开合成清单，不要求重采或重跑历史私有材料。 | planned | — |
| T-R022-01 | I001 | R022 | AC-R022-01 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_reference_contract_test.go | 旧source-v1.4-offline条目始终Codex/apiExecuted=false并保留输入/规则摘要和原分析时间；禁止改标DeepSeek、编造费用/耗时或借其通过真实功能/按时验收；新执行必须另有真实来源记录。 | planned | — |
| T-R023-01 | I001 | R023 | AC-R023-01 | domain | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r023_test.go | status/操作人/OCR未提供保留null/unknown及原因；不默认成功、未撤回、具体员工或已解析图片；有效量/响应/语义注明可判定范围，原始/排除/未知计数分开。 | planned | — |
| T-R023-02 | I001 | R023 | AC-R023-02 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r023_test.go | 分页、算术与语义覆盖独立；应分析/已分析/未分析/失败/媒体缺失互相可对账；语义聚合仅已分析范围并明确分母，未分析不等于零问题或合格，空首页等范围限制保留。 | planned | — |
| T-R024-01 | I002 | R024 | AC-R024-01 | security | automated | PetWebOrg/suiyin-admin | tests/contracts/quality-daily-reference.spec.ts | 公开合成与本机真实只读来源/配置/存储隔离；只读源不能生成/重跑/发布/回写；仅私有404才经installPublic切到明确合成四报告，其他错误保留错误，不覆盖私有；旧Codex展示不当生产执行。 | planned | — |
| T-R025-01 | I002 | R025 | AC-R025-01 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r025.spec.ts | 筛选、工作号表、会话和证据均按稳定ID取账号状态人设名并展示来源/采样时间/映射状态；不以salesName/当前分配人/alias替代，不推断实际操作人；仅授权范围显示。 | planned | — |
| T-R025-02 | I001 | R025 | AC-R025-02 | domain | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r025_test.go | 同名工作号仍按ID独立；同ID改名仅变显示映射不变会话键；缺失/冲突为unknown及原因，不按名称模糊拼接，不将人设名作为事发员工。 | planned | — |
| T-R026-01 | I002 | R026 | AC-R026-01 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r026.spec.ts | 右侧只读PC时间轴按时间+自身seq显示当前会话已导入消息，客户左/我方右/未知方向独立；选中occurrence只使用其自身证据ID高亮定位，不能套代表seq；可靠元信息与unknown/头像占位明确，AI摘要不进入气泡，缺文本/媒体不补造，不宣称设备完整历史。 | planned | — |
| T-R026-02 | I002 | R026 | AC-R026-02 | contract | automated | PetWebOrg/suiyin-admin | tests/contracts/quality-daily-reference.spec.ts | 对历史合成对照清单执行显示修订时，原稳定ID、证据引用、分析结论、意向、响应、各分母与Codex/apiExecuted=false不变；显示修订另有摘要；纯系统排除及缺失unknown不变，公开内容不含原文。 | planned | — |
| T-R026-03 | I002 | R026 | AC-R026-03 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r026.spec.ts | 关闭按钮/Esc/遮罩三路径恢复原日期、页签、名单筛选、滚动和可用入口焦点；抽屉滚动不改报告定位，无输入框/发送/转发/撤回，不触发写入、模型调用或新取数。 | planned | — |
| T-R026-04 | I002 | R026 | AC-R026-04 | contract | automated | PetWebOrg/suiyin-admin | tests/contracts/quality-daily-reference.spec.ts | 仅回归历史显示侧车契约：按同租户/日期/渠道/稳定会话/自身seq关联既有本机记录，来源摘要和显示版本独立；原bundle摘要/分析时间/来源/结论/分母不变；缺侧车/校验失败明示缺口且不跨客户拼接，不要求生产重建私有历史包。 | planned | — |
| T-R027-01 | I001 | R027 | AC-R027-01 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r027_test.go | 阶段证据顺序为已验收原型→独立运行边界→企微/个微真实功能闭环→双渠道共同时间窗口实测；各阶段独立回执，不以静态/旧Codex/小样本替代后续验收，不把本地成功宣称生产部署。 | planned | — |
| T-R001-03 | I001 | R001 | AC-R001-01 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r001_test.go | 按租户/渠道/统计日/工作号范围查询，未接入返回明确状态；企微请求不得返回个微报告或另一租户数据。 | planned | — |
| T-R001-04 | I001 | R001 | AC-R001-02 | integration | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r001_test.go | 两渠道批次ID、任务、缓存和补跑互相隔离；仅个微失败恢复时企微结果与修订保持不变。 | planned | — |
| T-R002-03 | I002 | R002 | AC-R002-01 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r002.spec.ts | 页面分别展示统计日、观察截至、计划/实际启动及实际完成；完成即可展示且不将生成日期替代统计日。 | planned | — |
| T-R002-04 | I002 | R002 | AC-R002-02 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r002.spec.ts | 迟启动和超过08:00保留计划时间与实际进度，页面不提前完成、不改日期或显示零问题。 | planned | — |
| T-R005-03 | I002 | R005 | AC-R005-01 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r005.spec.ts | 14/100与14/70分别显示命名明确的14%与20%，事件次数另列；筛选后全部模块一致，未知身份和当日未回应不隐藏。 | planned | — |
| T-R005-04 | I002 | R005 | AC-R005-02 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r005.spec.ts | 历史响应事件单列；当日适用分母0显示不适用，不显示0%，活跃会话保留。 | planned | — |
| T-R006-02 | I002 | R006 | AC-R006-01 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r006.spec.ts | 未解析媒体数、受影响证据不足维度与部分完成标识可见；有文本结果仍可读，修订前后不互相覆盖。 | planned | — |
| T-R007-04 | I002 | R007 | AC-R007-01 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r007.spec.ts | 分别显示购买意向/当日未回应/服务优先级与14维适用性、充分性和结论；未知/不适用不计合格或个人处罚。 | planned | — |
| T-R008-02 | I002 | R008 | AC-R008-01 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r008.spec.ts | 工作号/已知事发接待人/实际发言者/当前归属分别显示，未知不猜；详情只能定位选中会话的证据。 | planned | — |
| T-R009-02 | I002 | R009 | AC-R009-01 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r009.spec.ts | 确认/误报/处理/更正均提交理由且保存后回显审计；取消/失败保持原状态；候选与确认数分开，已处理不冒充已解决。 | planned | — |
| T-R010-02 | I002 | R010 | AC-R010-01 | security | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r010.spec.ts | 无原文权限时入口及直达详情均为无权限且无原文载荷；切换租户清理筛选/详情；配置/复核/重跑权限独立，前端隐藏不作为后端权限证明。 | planned | — |
| T-R011-06 | I001 | R011 | AC-R011-01 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r011_test.go | 验证两个独立场景及显式模板模型绑定、单一共规引用、候选模型场景/启用过滤、默认最终解析冻结；保存/取消/失败原子，密钥不得进入浏览器响应。 | planned | — |
| T-R011-07 | I002 | R011 | AC-R011-02 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r011.spec.ts | 候选正文/规则/模型改动后旧试跑通过显示失效并阻断发布；跨渠道试跑不可借用；共同规则变化两模板提示重新验证，历史显示不改。 | planned | — |
| T-R011-08 | I002 | R011 | AC-R011-03 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r011.spec.ts | 展示实际生效模板ID/版本及模型解析结果；缺配置只该渠道异常，不以最新草稿或对方模板代替。 | planned | — |
| T-R012-03 | I002 | R012 | AC-R012-01 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r012.spec.ts | 报告标准页与历史显示实际执行快照；运行中编辑后的当前配置不得改写旧日报，重跑生成独立可选修订。 | planned | — |
| T-R012-04 | I002 | R012 | AC-R012-02 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r012.spec.ts | 主动重跑确认摘要包含本渠道当前配置、原范围和D+1日04:00截至点；失败恢复与主动重跑文案/版本行为分开，不同时重跑对方。 | planned | — |
| T-R013-02 | I002 | R013 | AC-R013-01 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r013.spec.ts | 校验失败显示未完成及错误状态，保持旧历史可读；无问题只来自合法结果，不能用空表遮掩模型或schema失败。 | planned | — |
| T-R014-03 | I002 | R014 | AC-R014-01 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r014.spec.ts | 100任务的90成功/5失败/5待处理准确展示且未完成；重复提交防抖，恢复和新修订显示清楚，旧版本保留。 | planned | — |
| T-R014-04 | I002 | R014 | AC-R014-02 | parameterized | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r014.spec.ts | 完整无数据/采集不完整/未接入/预计数量未知有不同文案与分母；未知覆盖不画100%，筛选空态可恢复。 | planned | — |
| T-R016-02 | I002 | R016 | AC-R016-01 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r016.spec.ts | 受控联调读取新真实结果并在后端重启后再次回读，显示对应版本/来源/状态/统计；不把静态fixture、旧Codex或仅样本完成称为正式全日完成。 | planned | — |
| T-R017-03 | I002 | R017 | AC-R017-02 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r017.spec.ts | 05:00至08:30示例显示容量3.5小时与08:00未达标两个事实，保留迟启动/迟完成，不显示统称达标。 | planned | — |
| T-R018-03 | I002 | R018 | AC-R018-01 | e2e | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r018.spec.ts | 共规只有一个编辑入口；显示影响渠道及各自试跑状态，任一已启用渠道失败不能发布；未启用渠道启用前校验，共规发布不改历史。 | planned | — |
| T-R018-04 | I002 | R018 | AC-R018-02 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r018.spec.ts | 个微p3发布后两个页面分别显示r1+p3和r1+p1；渠道扩展字段按版本读取，核心/另一渠道/历史报告保持兼容。 | planned | — |
| T-R023-03 | I002 | R023 | AC-R023-01 | parameterized | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r023.spec.ts | 状态、发言人、OCR未知逐项显示原因；工作号名不是实际操作人，未解析图片不生成确定业务标签或确认超时。 | planned | — |
| T-R023-04 | I002 | R023 | AC-R023-02 | integration | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r023.spec.ts | 分页/算术/语义覆盖分开展示，语义表只以已分析为分母；未分析/失败/媒体缺失可见，不随算术100%变为语义100%。 | planned | — |
| T-R025-03 | I001 | R025 | AC-R025-01 | contract | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r025_test.go | 账号状态人设名通过稳定账号ID映射，返回采样时间/来源/映射状态，缺失不借聊天header或当前归属推实名。 | planned | — |
| T-R025-04 | I002 | R025 | AC-R025-02 | parameterized | automated | PetWebOrg/suiyin-admin | tests/quality-daily/r025.spec.ts | 同名仍能独立筛选，改名不改变会话归属；无名称/映射冲突显示unknown及原因，不造成合并或员工归责。 | planned | — |
| T-R026-05 | I001 | R026 | AC-R026-01 | security | automated | PetWebOrg/suiyin-go | admin/service/quality_daily_r026_test.go | 原文读取校验租户/渠道/工作号/会话及消息身份；多occurrence同文案必须使用所选会话自己的证据ID，拒绝代表seq跨客户引用；已导入范围和缺失元信息如实返回。 | planned | — |
| T-R001-05 | I002 | R001 | AC-R001-01 | visual | manual | PetWebOrg/suiyin-admin | docs/testing/quality-daily/visual-acceptance.md | 在批准原型对应浏览器视口逐页比对：聊天管理双入口、标题内日期、七页签在卡片前、名单内筛选、页尾来源说明和碎银青绿色层级保持；无旧顶部分组筛选或同页渠道切换。 | planned | 跨容器位置、视觉层级及批准参考的一致性需人工逐页比对；DOM断言不能单独证明视觉体验。使用合成数据，截图存PR受控artifact并记录视口/浏览器/逐项判断。 |
| T-R011-09 | I002 | R011 | AC-R011-04 | visual | manual | PetWebOrg/suiyin-admin | docs/testing/quality-daily/visual-acceptance.md | 在同一提示词表内比对普通行与两日报行，编辑/删除文案、字重、间距、排列和交互位置一致；无额外查看日报链接；长名/空态不破坏表格。 | planned | 同表按钮视觉对齐与长文本布局需对照批准原型人工确认；自动化仍独立检查按钮/行为。仅合成模板截图，记录比较项及结果。 |
| T-R026-06 | I002 | R026 | AC-R026-01 | visual | manual | PetWebOrg/suiyin-admin | docs/testing/quality-daily/visual-acceptance.md | 对照批准PC布局核对右贴边抽屉、客户左/我方右、头像昵称/来源/时间、未知占位、问题高亮及AI摘要分离；检查长消息、转写展开与滚动可读性；无发送区。 | planned | 聊天气泡空间层次、阅读连贯性及高亮可辨性不能仅靠DOM存在判断；用合成会话逐项验收并保存标注截图，功能关闭恢复另由自动化验。 |

## 4. Test Data & Profiles

| Data ID | Tenant / Profile | 前置数据 | 隐私处理 | 覆盖 Test IDs |
|---|---|---|---|---|
| D001 | 深圳授权范围与隔离对照租户 | 合成双渠道、同名不同ID、转接/未知操作人、跨日/失败/撤回/系统消息、未解析媒体 | 全部合成，不取生产原文或凭据 | R003–R010、R023、R025对应测试 |
| D002 | 两渠道共享规则、独立模板和模型 | 已发布/草稿/试跑摘要、默认模型失效、共同规则原子发布、版本与输入修订 | 合成正文/模型非密钥参数；阈值参数化，不能硬回落样例20分钟 | R011–R014、R018对应测试 |
| D003 | 17租户已交付采样metadata参考 | 15完成、2已登录无目标入口且用户延期；完整/部分/未知/确认0及动态分组字段 | 仅合成状态、无正文metadata；禁止重采历史私人材料 | R019–R024参考测试 |
| D004 | 旧四报告与显示侧车参考 | 合成稳定ID/seq/来源摘要、Codex标志、显示修订前后hash、同文案多occurrence | 合成聊天与姓名，不复制真实Prompt/证据；公开与私有来源状态测试使用临时fixture | R021、R022、R024–R026参考测试 |
| D005 | 授权真实联调与代表规模 | 对应已批准运行边界、当前发布配置、来源/输入快照、两渠道数量与长度分布 | 私有受控执行，公开只保留计数/hash/耗时/token/可核验费用与判定；无原文、姓名、密钥 | T-R016-01、T-R016-02、T-R017-01、T-R027-01 |

D005不得由普通CI默认触发真实模型调用；离线故障注入/恢复先用stub，真正功能与容量验收在已授权执行窗口运行并独立存证。stub通过不把T-R016/017置verified。

## 5. CI Gates

- PR至少运行本Slice自动化Test IDs并在测试名/报告标签/CI artifact中保留Test ID或AC-ID；相关契约变化应运行另一仓契约消费者回归。
- 稳定ID与租户越界、非法结构/证据、未知被判合格、快照漂移、分母不守恒、重复批次、失败保存虚假成功均阻断该项验收。
- 人工视觉Test IDs为T-R001-05、T-R011-09、T-R026-06：记录批准参考、视口、浏览器、逐项Oracle结论与合成截图artifact；不以一句“人工通过”替代证据。
- T-R016真实闭环与T-R017双渠道代表规模/04:00–08:00独立验收；只运行离线stub或未完成真实链路时继续planned/pending，不伪称verified或达标。
- Handoff/Test Contract进入verified、Slice进入released前，planned必须替换为真实可访问的CI/人工证据；生产发布仍走各仓正式Issue→worktree→Phase→PR→房总review，不据本合同直接部署。
- 源版本/行为变化使本合同待重新校验；历史静态任务不能因工程创建Issue而被追溯改写。

## 6. Evidence

| Evidence ID | Test IDs | 类型 | 位置 | 保留时机 |
|---|---|---|---|---|
| EV001 | I001全部automated | 计划中的Go测试与安全报告 | 对应PR的CI artifact：quality-daily-go；尚未产生 | PR验收 |
| EV002 | I002全部automated | 计划中的Admin DOM/e2e/契约与安全扫描 | 对应PR的CI artifact：quality-daily-admin；尚未产生 | PR验收 |
| EV003 | T-R001-05、T-R011-09、T-R026-06 | 计划中的人工视觉逐项记录与合成截图 | 对应PR的quality-daily-visual artifact；尚未产生 | PR验收 |
| EV004 | T-R016-01、T-R016-02、T-R017-01、T-R027-01 | 真实运行安全回执及原始私有审计索引 | 受控运行回执公开计数/hash，不附私有正文或凭据；须区分sample/day及原型/本地/生产 | 功能及时间窗口验收 |

当前本草案没有真实CI Evidence；已有原型与本地结果由Handoff提供准确阶段和安全链接，不能替代上述planned项。

## 7. Change Control

唯一行为真源为SPEC-SUIYIN-ADMIN-092@0.3.3；mapping.json记录同一源hash及双向R/AC/Slice/Test归属。测试实现可以选框架和文件目录，不得静默改变业务Oracle。新发现超出本SPEC范围的业务行为先回源评审，不能只在Issue或代码里拍板。

生产测试只在目标生产仓正式工程流程实现；本次仅在临时交接目录写合同与映射，不修改canonical SPEC或生产文件。Reporter/仓/平台已按本轮主线程确认填写，真实Issue引用由主线程创建后回填。
