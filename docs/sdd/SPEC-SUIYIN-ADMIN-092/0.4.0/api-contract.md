# 质检日报实施接口合同 v0.4.0（已确认Plan的工程细化）

适用两渠道 `wecom` / `wechat`；企业由可信请求上下文选择数据库，客户端不传 tenant_id。原Prompt接口与保存保留；这里只定义日报及规则接口。根路径 `/api/v1/ai/quality-daily`，使用既有 ApiResponse envelope。日期格式 YYYY-MM-DD，北京自然日；ID均为不透明字符串。所有result／review／config／definition／analysis／projection的revision或version均为整数。`intention.level`为`level_1`至`level_5`或`unknown`。

## 查询及一致视图

通用 Scope：`channel,date,departmentIds?:string[],workAccountIds?:string[],mode:'ai'|'effective',view:'current'|'original'`。默认 effective/current；空数组只代表用户没有额外筛选，服务器必须先与可信ACL相交；ACL空集永远返回空。

`ReportRef={reportId,workAccountId,analysisRevision,projectionRevision}`。首次 overview 解析各账号当前可读报告，返回 `context={reportRefs,configRevision,capabilities,coverage,state,statisticsPending,latestReports,displayingPreviousRevision,historicalAnalysis}`；随后模块传相同 reportRefs。过期不可读版本返回409及重新加载提示，不能静默拼新旧。所有列表 `Page<T>={items:T[],nextCursor:string|null,context}`，limit默认20/最大100，按稳定键排序；分页游标绑定Scope/版本。读接口按以下POST query形式避免复杂URL映射，均只读，不产生模型调用。

`latestReports:{reportId:string,workAccountId:string,revision:number,state:ReportState}[]`描述当前所选账号的最新分析修订；`displayingPreviousRevision:boolean`说明显示的reportRefs仍指向上一可读修订，最新生成进度通过latestReports／生成记录表达，不能把旧数据当作新修订完成。`historicalAnalysis:boolean`在current视图表示已显示报告的启用事实定义版本与当前配置不一致。数据、覆盖和下钻始终使用同一reportRefs，前端分别提示“显示上一可读修订”和“分析沿用历史标准”，不得静默混合新旧版本。

- `GET /scope?channel=...`：`{workAccounts:[{id,name,departmentId?,departmentName?,available,reason?}],departments:[{id,name}],capabilities:{read,evidence,review,config,execute},timeZone:'Asia/Shanghai'}`。工作号按可信权限收敛。
- `POST /overview/query`：Scope → `{context,metrics:MetricValue[],risk:{high,medium,low,unknown},priorities:[{code,count}],highlights:Insight[],suggestions:Insight[],unresolved:ConversationRow[]}`。`Insight={conversationId:string,title:string,evidenceIds:string[],resultVersion:number}`，亮点和建议打开原文时同时携带resultVersion；以上名单有界，更多用列表查询。
- `POST /accounts/query`：Scope+reportRefs+cursor+limit → Page<AccountRow>；行含 `{workAccountId,name,departmentName?,metrics:MetricValue[],dimensions:DimensionSummary[],coverage,state}`。
- `POST /conversations/query`：Scope+reportRefs+cursor+limit+`intention?,servicePriority?,risk?,metricCode?` → Page<ConversationRow>。
- `POST /facts/query`：Scope+reportRefs+cursor+limit+`kind?,factCode?,valueStatus?,severity?,redlineStatus?,reviewStatus?,handlingStatus?,conversationId?,productId?` → Page<FactRow>。问题、红线和维度下钻共用此入口，按固定kind含义过滤，不放任意表达式。
- `POST /products/query`：Scope+reportRefs → `{context,items:[{id,name,category,mentionCount,conversationCount,staffConversationCount,availability}],actions:MetricValue[]}`；零触达由该版目录补齐。
- `POST /standards/query`：Scope+reportRefs → `{context,config,versions,limitations}`，按选定报告完整快照解释。
- `GET /conversations/:id/evidence?resultVersion=...`：`{conversation,messages:[{id,at,direction,type,status,text,parseStatus,automated,actualOperatorId?,reason?}],facts,reviews,coverage}`。重新验证证据权限，原文不混入普通列表。
- `POST /runs/query`：Scope+cursor+limit → Page<RunRow>；包含batchId/reportId与关联task摘要、revision、state、coverage、waitReason、retryAt、failureReason、canRecover，不暴露原文或密钥。

`Coverage={total:number|null,analyzed:number,failed:number,pending:number,unreadable:number,collectionComplete:boolean,gaps:string[]}`。取数未完整时total不能猜测，使用null；已知部分计数不代表完整覆盖。统一state为`not_generated|generating|waiting_quota|partial_failed|failed|no_data|completed`。

`RunRow={id, batchId,reportId,revision,state,coverage,waitReason?,retryAt?,failureReason?,canRecover,tasks?:[{id,state}]}`，id等于reportId；没有真实任务时不伪造task ID。`versions={name:string,version:number}[]`，`limitations:string[]`。

`MetricValue={code,name,value:number|null,unit,numerator?,denominator?,availability:'ready'|'unknown'|'not_applicable'|'not_collected'|'pending',reason?,definitionVersion}`。未知不补0，前端不重新计算统计或风险。

`ConversationRow={id,reportId,workAccountId,workAccountName,customerName,relationId,state,risk,intention:{level,summary,projects?,timeExpressions?,evidenceIds},originalIntention?,servicePriority,unresolvedCount,issueCount,reviewVersion,resultVersion,coverage}`。列表不得带全部消息。

`FactRow={id,reportId,conversationId,workAccountId,customerName,kind,code,name,definitionVersion,resultVersion,status,value?,valueLabel?,unit?,severity,redlineCandidate,redlineConfirmed,redlineStatus,reviewStatus,handlingStatus,evidenceIds,evidencePreview?,reviewVersion,original?}`。判定类型使用`true/false/unknown/not_applicable`四态，数值／枚举的合法值状态为`known`，缺口仍为`unknown/not_applicable`；因此FactRow.status的总枚举为`true|false|known|unknown|not_applicable`，value为boolean/number/string单值。`valueLabel?:string`、`unit?:string`来自与事实definitionVersion匹配的定义，枚举按稳定ID找标签，不用当前新语义猜旧值。

`redlineStatus='none'|'candidate'|'confirmed'|'rejected'`为独立红线认定状态；候选不算已认定。它不能通过严重度、问题reviewStatus或handlingStatus推断：确认问题不自动确认红线，处理完成不自动改变认定，误报问题不能继续保留有效红线。所选事实值按mode读取原始或有效值，独立人工认定状态和审计仍明确展示。

`DimensionSummary={code:string,name:string,definitionVersion:number,source:'ai_original',counts:Partial<Record<'true'|'false'|'known'|'unknown'|'not_applicable',number|null>>,availability:'ready'|'not_collected'}`。判定类型返回四态；数值／枚举返回known、unknown、not_applicable。counts来自该定义版本的原始事实分布，不受人工复核改写；只有ready时为数值，not_collected的空值不得转成0。工作号表行展开显示此分布，不自动增加统计指标列；指标列仍由metrics配置决定。

点击可用维度计数，使用该工作号原reportRef以及`mode='ai'`、`factCode`、`valueStatus`查询事实；valueStatus的枚举同FactRow.status。不得强制`kind='dimension'`，因为问题事实也可能对应该判定维度；未采集项不提供虚构下钻结果。

## 规则及指标

- `GET /config` → `ConfigDTO={revision,value:QualityConfig,limits,operations,sourceOperations,sourceCatalog,warnings}`。
- `PUT /config`：`{expectedRevision,value}` → `ConfigDTO`并附`changeKinds:('display'|'statistics'|'analysis')[]`及`affectedMetricCodes`。只有保存不自动启动模型；同输入无实际变化不升语义版本。冲突409，不静默覆盖。
- `POST /statistics/rebuild`：`{scope,reportRefs,expectedConfigRevision,operationId}` → `{operationId,reportRefs,statisticsPending}`；只按可用事实重算选定工作号日，不调用模型。新语义缺失明确not_collected。

`limits={parameters:{[name:string]:{min:number,max:number}},maxFacts:number,maxMetrics:number,maxProducts:number}`。`operations={judgment:Operation[],number:Operation[],enum:Operation[]}`，Operation取下面MetricDefinition的operation受控枚举；前端按返回值展示可选算法及上限。

`sourceCatalog:SourceCatalogEntry[]`，其中`SourceCatalogEntry={code:string,name:string,type:'judgment'|'number'|'enum',unit:string,source:'program'|'ai',version:number,enabled:boolean,operations:Operation[],options?:[{id:string,label:string,enabled:boolean}]}`。它是服务端支持的统计来源目录，包含既有程序／AI来源及当前事实定义，不是需要再手工维护的一套规则。`sourceOperations:Record<string,Operation[]>`限制特定来源的算法；选择顺序为该code的sourceOperations、catalog条目的operations，新增AI事实才允许回退至operations[type]，未知程序code不开放任意算法。目录和限制只读，保存仍提交`expectedRevision,value`。

后台`QualityDailyConfig.RequiredStatisticsRevision`以BSON字段`required_statistics_revision`随Setting配置CAS持久保存，JSON标记为`-`，不作为ConfigDTO.value的可读／可写前端字段。统计或分析语义变化更新此水位，显示变化保留；后台按它找出尚需重算的报告并分批派发公共任务，保存请求不同步遍历全部历史，不新增集合。

QualityConfig：`facts:FactDefinition[],metrics:MetricDefinition[],parameters,products:ProductDefinition[]`；不含渠道执行开关或Prompt正文。
FactDefinition：`code,name,type:'judgment'|'number'|'enum',source:'ai'|'program',enabled,version,criteria,applicability,evidenceRequired,severity,redline:{enabled,criteria},unit?,precision?,min?,max?,options?:[{id,label,enabled}]`。program来源只能用既有目录code，不能改其实现为自由文本。
MetricDefinition：`code,name,sourceCode,sourceVersion,operation:'count'|'conversation_count'|'sum'|'min'|'max'|'average'|'ratio',denominator?:'all_conversations'|'assessed_conversations',enumValue?,enabled,showCard,order,version`。算法与数据源兼容性由服务端operations/limits声明。事件次数和会话数分别计算；产品目录包含稳定id、name、category、aliases、version、enabled。
parameters：`responseGroupMinutes,timeoutMinutes,deepChatCustomerMessages`，默认5/20/6；合理数值范围在规则服务定义。静态上下限及类型限制由GET /config返回，前端同步展示。

## 复核与执行

- `POST /reviews`：`{targetKind:'fact'|'intention',targetId,resultVersion,expectedReviewVersion,operationId,reason,patch}` → `{targetKind,targetId,reviewVersion,effective,statisticsPending}`。patch仅受控字段：fact `{confirmed?,severity?,redlineConfirmed?,handlingStatus?}`；intention `{level}`。操作先校验当前结果版本/权限，审计与有效状态一致保存；冲突409，重复operationId返回原结果。处理进度不改变问题成立与否；认定红线需要明确字段。
- `POST /generate`：`{channel,date,workAccountIds?:string[],operationId,mode:'generate'|'reanalyze'}` → `{operationId,batchId,reportIds,state}`。无原报告generate沿用该日意图，reanalyze明确创建新修订，冻结当前规则/Prompt/模型；请求只完成有界准入，取数与调用走持久公共任务。
- `POST /reports/:id/recover`：`{operationId}` → `{operationId,batchId,reportId,state,unknownTaskCount:number}`。恢复本报告未完成任务，成功会话不调用，未知外呼保持隔离；规则/Prompt/模型不刷新。

执行只注册一个公共`TaskQualityDaily`任务类型，内部`ExtraSnapshot.daily_phase`为`capture|analysis|statistics|recover`。capture、statistics、recover复用公共本地阶段与持久恢复，analysis才进入公共模型调用及用量链路，不增加日报独立队列／worker。恢复控制任务冻结目标及原execution attempt，未知调用只计入unknownTaskCount并保持隔离；成功任务不重发，失败任务仍使用原模型／Prompt快照与原会话输入，不因当前配置改变转用新模型或新语义。新分析修订由明确的reanalyze请求产生。

统一错误：400非法合同、403无权限、404权限内记录不存在、409版本冲突、422配置依赖或数据缺口不允许操作、503暂时不可用。具体HTTP/业务code按现有errs映射保持一致。所有生成和复核mutation具备稳定operationId及幂等语义。实现时若改路径/字段，先更新同一合同通知两端，不靠前端兼容旧日报大JSON。
