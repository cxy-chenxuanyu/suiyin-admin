# 质检日报部门规则配置

日期为 2026-11-16。适用于管理页的企业微信和个人微信质检日报，承接原 [质检日报原型一致性约定](./prototype-parity-20261105.md)。本次 [交互原型](./department-overrides-prototype-20261116.html) 使用合成规则及分组示例，作为所选范围、配置来源、编辑与恢复默认的交互依据。

用户已批准按工作号分组、改名按新组处理，红线和检查项启停由企业统一管理。任务会话 `01a1e3a4-5f86-7ea0-a6cb-19d889c8e8b9` 的原 Plan 及六项验收适用。此文件作为待审源材料随工程 Issue 固定版本，团队正式审批沿原流程。

## 页面与业务规则

- 管理页「质检规则与指标」默认显示企业默认。切换工作号分组后，各项分别标明「沿用企业默认」「部门单独设置」或「企业统一」，编辑时展示企业默认和当前生效值。保存前展示影响范围，沿用未保存编辑保护及保存后读回。
- 部门可各自设置连续咨询合并时间 1–60 分钟、回复超时 1–1440 分钟、深聊客户消息数 1–1000 条。普通 AI 检查项的判定、适用与排除场景、正反例作为一个单元覆盖。表单以当前生效项目为起点。
- 企业维护检查项标识、类型、启停、严重程度、分类选项、数值结构、含红线的完整项目、指标和产品目录。启用红线、删除检查项或改变检查项结构时，企业保存同次清理失效覆盖并展示受影响分组。企业暂时停用某项时，部门覆盖随之暂停，该项重新启用后可继续使用原覆盖。
- 部门配置用当前企业工作号分组名识别，两渠道共用。工作号改组后，新生成用新组。分组名称变化按新组处理，旧名称的已保存覆盖可查看和清理，同名再次出现可沿用原覆盖。空分组、默认分组、归属未知和未设置覆盖的部门均使用企业默认。
- 生成批次冻结各工作号的分组和生效配置。部门修改作用于新生成和主动重新分析，原报告的采集恢复、已有模型任务恢复和历史说明沿用原快照。由部门程序参数生成的日报，在复核、恢复或手动刷新统计时仍使用该日报冻结的整组程序参数。没有采用部门程序参数的日报沿用现有企业统一统计重算协议。

## 两端接口

接口前缀沿用 `/api/v1/ai/quality-daily`。企业 `GET/PUT /config` 继续使用当前响应、参数和单文档版本比较保存。以下配置接口复用 `quality_daily_config` 权限，范围由可信租户决定。配置权限带来的分组信息限于该企业的名称和配置状态。工作号、日报、原文权限分别沿用原入口。

- `GET /config/department-scopes` 返回 `{items: DepartmentScope[]}`。`DepartmentScope` 包含 `id: string`、`name: string`、`active: boolean`、`hasOverrides: boolean`、`overriddenFactCodes: string[]`。服务端沿日报归一口径生成 `group:<归一分组名>`，企微、个微去重。`active=false` 表示该名称当前无可配置工作号且仍有旧覆盖。企业保存前用 `overriddenFactCodes` 标明受影响的分组。
- `GET /config/department?departmentId=...` 返回 `DepartmentConfig`。它沿用 `ConfigDTO` 的 `revision`、`value`、`limits`、`operations`、`sourceCatalog`、`warnings` 等字段，`value` 为完整生效配置，并增加 `department: DepartmentScope`、`enterpriseValue: QualityConfig`、`overrides: DepartmentOverrides`。不在配置范围内的标识返回可辨别的不存在错误。
- `PUT /config/department` 接收 `{departmentId,expectedRevision,overrides}`，返回保存后的 `DepartmentConfig`。部门只提交自己的完整稀疏覆盖；省略的项继承默认。`DepartmentOverrides` 仅包含 `parameters?: Partial<Parameters>` 和 `facts?: {code:string,criteria:string,applicability?:string,examples?:{positive?:string,negative?:string}}[]`。空对象清掉全部覆盖。对无工作号的旧分组可清理覆盖，仍然存在的旧项可逐项恢复默认。没有变化时沿用版本。非法字段或参数返回 `400`，无权限返回 `403`，企业或部门配置的修订过期返回 `409`。拒绝旧分组新增覆盖、重复规则编号及保护字段的提交。
- 生成按单一可信设置版本冻结企业基准及所选工作号用到的覆盖，日报可直接读取完整的生效配置。保留规则编号，区分不同有效定义的版本，规则字典、AI 合同及指标来源绑定同一个实际定义。原设置结构兼容读取，原批次格式继续可恢复。
- 日报查询沿用实际 `reportRefs`。`context.mixedRuleStandards?: boolean` 表示选定报告采用不同判定标准。`overview/query` 增加 `mixedRuleMetrics?: string[]`，固定卡用卡片键（如 `timeout`、`deep_chat`），扩展指标用指标 `code`；`mixedRuleRankings?: string[]` 的值为 `problemAccounts`、`lowProblemAccounts` 或 `timeoutAccounts`（哪一项受到影响就返回该项）。是否混合由实际计算所需规则及参数决定，分组名或配置版本变化本身不代表口径变化。单工作号的标准与原文按该报告或程序投影的冻结版本。`standards/query` 中 `reportConfigs[].ruleScope?` 为 `{kind: 'enterprise'|'department', departmentId?: string, departmentName?: string}`，缺省表示历史无单独记录。合看不同口径时，管理页提示并引导选择单一部门或工作号，统一口径的指标正常展示。

## 验收与交付顺序

1. 企业默认 20 分钟、咨询组 10 分钟，咨询组企微和个微的 15 分钟回复均计为超时，未设置及无归属账号按企业值。
2. 企业改 30 分钟时部门设置保留；恢复一个部门参数后新报告用 30 分钟，部门其他覆盖仍生效。
3. 合成会话在普通检查项的企业与部门标准下各得到预期结果。含红线的项目在部门页只读，服务端拒绝写入红线或启停字段。
4. 调组后新报告用新组，已有批次、失败恢复和已生成日报沿用原组快照。部门保存产生的模型调用、历史重算任务均为 0。复核后的统计按旧报告冻结参数刷新。
5. 多部门不同阈值时明确标识受影响的指标和排行，单组下钻概览、事实和原文使用同一份报告与参数。企业统一指标继续出数。
6. 验证 `403`、`409`、无效阈值、存量配置和旧批次。切租户或切分组时，迟到结果不得覆盖当前编辑范围。

后端更新 Swagger 和接口约定，先于管理页发布。真实 Mongo 语义和两仓正式验证由集中端在隔离环境完成；来源侧用合成数据做定向验证和联调。深圳的新配置和生产业务验收沿原发布授权。
