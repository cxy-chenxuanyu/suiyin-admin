# 质检日报实施接口合同 v0.4.0（已确认Plan的工程细化）

2026-10-30上线纠正以[live-corrections Plan/AC](live-corrections-20261030.md)为增补：Coverage追加可缺省captureComplete表示本地取数结束，collectionComplete继续表达完整性；原文追加reportDate及消息scope（day/before/after），FactRow追加sourceKind与reviewable，RunRow.tasks追加安全的phase/customerName/conversationId/errorMsg/waitReason/retryAt。程序统计不可提交严重度/红线复核；实际字段约束随本轮Swagger更新。未知历史字段不补完成，不新增环境变量。

适用两渠道 `wecom` / `wechat`；企业由可信请求上下文选择数据库，客户端不传 tenant_id。原Prompt接口与保存保留；这里只定义日报及规则接口。根路径 `/api/v1/ai/quality-daily`，使用既有 ApiResponse envelope。日期格式 YYYY-MM-DD，北京自然日；ID均为不透明字符串。所有result／review／config／definition／analysis／projection的revision或version均为整数。`intention.level`为`level_1`至`level_5`或`unknown`。

## 查询及一致视图

通用 Scope：`channel,date,departmentIds?:string[],workAccountIds?:string[],mode:'ai'|'effective',view:'current'|'original'`。默认 effective/current；空数组只代表用户没有额外筛选，服务器必须先与可信ACL相交；ACL空集永远返回空。

`ReportRef={reportId,workAccountId,analysisRevision,projectionRevision}`。首次 overview 解析各账号当前可读报告，返回 `context={reportRefs,configRevision,capabilities,coverage,state,statisticsPending,latestReports,displayingPreviousRevision,historicalAnalysis}`；随后模块传相同 reportRefs。过期不可读版本返回409及重新加载提示，不能静默拼新旧。所有列表 `Page<T>={items:T[],nextCursor:string|null,context}`，limit默认20/最大100，按稳定键排序；分页游标绑定Scope/版本。读接口按以下POST query形式避免复杂URL映射，均只读，不产生模型调用。

`latestReports:{reportId:string,workAccountId:string,revision:number,state:ReportState}[]`描述当前所选账号的最新分析修订；`displayingPreviousRevision:boolean`说明显示的reportRefs仍指向上一可读修订，最新生成进度通过latestReports／生成记录表达，不能把旧数据当作新修订完成。`historicalAnalysis:boolean`在current视图表示已显示报告的启用事实定义版本与当前配置不一致。数据、覆盖和下钻始终使用同一reportRefs，前端分别提示“显示上一可读修订”和“分析沿用历史标准”，不得静默混合新旧版本。

- `GET /scope?channel=...`：`{workAccounts:[{id,name,departmentId?,departmentName?,available,reason?}],departments:[{id,name}],capabilities:{read,evidence,review,config,execute},timeZone:'Asia/Shanghai'}`。工作号按可信权限收敛。
- `POST /overview/query`：Scope → `{context,metrics:MetricValue[],risk:{high,medium,low,unknown},priorities:[{code,count}],highlights:Insight[],suggestions:Insight[],unresolved:ConversationRow[]}`。`Insight={conversationId:string,title:string,evidenceIds:string[],resultVersion:number}`，亮点和建议打开原文时同时携带resultVersion；以上名单有界，更多用列表查询。
- `POST /accounts/query`：Scope+reportRefs+cursor+limit → Page<AccountRow>；行含 `{workAccountId,name,departmentName?,metrics:MetricValue[],dimensions:DimensionSummary[],coverage,state}`。
- `POST /conversations/query`：Scope+reportRefs+cursor+limit+`intention?,servicePriority?,risk?,metricCode?` → Page<ConversationRow>。
- `POST /facts/query`：Scope+reportRefs+cursor+limit+`kind?,factCode?,valueStatus?,severity?,redlineStatus?,reviewStatus?,handlingStatus?,conversationId?,productId?` → `FactPage=Page<FactRow>&{summary?:RedlineSummary}`。问题、红线和维度下钻共用此入口，按固定kind含义过滤，不放任意表达式。红线查询参数`redlineStatus`为`all|candidate|confirmed|rejected`；省略或空字符串不返回summary，其余非法值拒绝。
- `POST /products/query`：Scope+reportRefs → `{context,items:[{id,name,category,mentionCount:number|null,conversationCount:number|null,staffConversationCount:number|null,availability}],actions:MetricValue[]}`。三种数量在数据不可用时可为null，需结合availability显示缺口，不转成0；仅已采集且确无触达才显示合法0，目录中未采集的产品仍须与零触达区分。
- `POST /standards/query`：Scope+reportRefs → `{context,config,versions,limitations}`。view=current返回当前规则配置；view=original且有选定报告时，返回reportRefs所指报告的执行配置快照（可为重新分析后的修订，不限定为初次报告）。所选报告执行配置不一致时，original返回409并提示按单个工作号查看，不能把其中一份配置冒充所有报告的标准；没有选定报告时返回当前配置，但不称其为报告执行快照。versions始终列出所选报告的执行配置版本，页面标题及说明随view区分当前规则和执行快照。
- `GET /conversations/:id/evidence?resultVersion=...`：`{conversation,messages:QualityDailyMessage[],facts:FactRow[],reviews:ReviewRecord[],reviewsHasMore:boolean,coverage}`。重新验证证据权限，原文不混入普通列表。
- `POST /runs/query`：Scope+cursor+limit → Page<RunRow>；包含batchId/reportId与关联task摘要、revision、state、coverage、waitReason、retryAt、failureReason、canRecover，不暴露原文或密钥。

`QualityDailyMessage={id:string,at:string,direction:'customer'|'staff'|'unknown',type:'text'|'voice'|'image'|'video'|'other',status:'success'|'failed'|'withdrawn'|'unknown',text:string,parseStatus:'parsed'|'unparsed',automated:'yes'|'no'|'unknown',system:boolean,actualOperatorId?:string,reason?:string}`。at为消息时间（RFC3339）；receivedAt只供后台采集使用，不对外返回。automated是三态字符串，不能按布尔真值判断（'no'和'unknown'也都是非空字符串）；system独立表达系统记录，不与自动发送状态合并。方向、发送状态及解析状态按各自枚举显示，unknown不猜成客户／员工／发送成功，unparsed不当作“无消息”；actualOperatorId缺失时不推断真实操作者。

`Coverage={total:number|null,eligible:number|null,analyzed:number,skipped:number|null,failed:number,pending:number,paused:number|null,skipReasons:{code:string,count:number}[],unreadable:number,collectionComplete:boolean,gaps:string[]}`。所有响应中的coverage.gaps统一为string[]，没有缺口时返回[]，不返回null；取数未完整时total不能猜测，使用null，已知部分计数不代表完整覆盖。统一state为`not_generated|generating|waiting_quota|paused|partial_failed|failed|no_data|completed`。

`RunRow={id, batchId,reportId,revision,state,coverage,waitReason?,retryAt?,failureReason?,canRecover,tasks?:[{id,state}]}`，id等于reportId；没有真实任务时不伪造task ID。`versions={name:string,version:number}[]`，`limitations:string[]`。

`MetricValue={code:string,name:string,value:number|null,unit:string,numerator:number,denominator:number|null,availability:'ready'|'unknown'|'not_applicable'|'not_collected'|'pending',reason:string,definitionVersion:number,sourceCode:string,operation:Operation,denominatorBasis?:'all_conversations'|'assessed_conversations',unknown:number,notApplicable:number}`，对应后端metricDTO；reason无说明时为空字符串，numerator／denominator及unknown／notApplicable均实际返回，不是可省略字段。unknown与notApplicable是统计缺口计数，不是展示结果value的替代值。

展示以服务端value是否为null判断是否有数值，并结合availability／reason说明缺口；合法0必须展示为0，null不补0。普通count／conversation_count／sum／min／max的denominator=0并不表示指标不可用，不能用统一“分母为0”规则隐藏这些数值。仅operation为ratio或average时，numerator／denominator用于展示比率或均值的计算依据；零分母由服务端给出null与not_applicable等适用状态。ratio的value已经是百分数，不再乘100；前端不得重算统计或平均各工作号比率。

`ConversationRow={id,reportId,workAccountId,workAccountName,customerName,relationId,state,analysisReason?,risk,intention:{level,summary,projects?,timeExpressions?,evidenceIds},originalIntention?,servicePriority,unresolvedCount,issueCount,reviewVersion,resultVersion,coverage}`。列表不得带全部消息。

`FactRow={id,reportId,conversationId,workAccountId,customerName,kind,code,name,definitionVersion,resultVersion,status,value?,valueLabel?,unit?,severity,redlineCandidate,redlineConfirmed,redlineStatus,reviewStatus,handlingStatus,evidenceIds,evidencePreview?,reviewVersion,original?}`。判定类型使用`true/false/unknown/not_applicable`四态，数值／枚举的合法值状态为`known`，缺口仍为`unknown/not_applicable`；因此FactRow.status的总枚举为`true|false|known|unknown|not_applicable`，value为boolean/number/string单值。`valueLabel?:string`、`unit?:string`来自与事实definitionVersion匹配的定义，枚举按稳定ID找标签，不用当前新语义猜旧值。

`FactRow.original:ValueSnapshot`仅为模型原始判定值快照，`ValueSnapshot={status:FactStatus,boolean?:boolean,number?:number,enum?:string,severity:string,redlineConfirmed:boolean}`。这里使用boolean／number／enum受控字段，不是FactRow的副本，不包含redlineCandidate；原AI候选标记读取FactRow顶层redlineCandidate，不能由original.redlineConfirmed=false推断“AI未命中红线”。

`ReviewRecord={id:string,reportId:string,targetKind:'fact'|'intention',targetId:string,resultVersion:number,reviewVersion:number,operationId:string,actor:string,reason:string,before:ReviewSnapshot,after:ReviewSnapshot,createdAt:string}`，createdAt是实际审计时间（RFC3339）。该形状对应持久化QualityDailyReview的JSON字段，requestDigest不对外返回，不提供patch或at字段。

before／after是受控字段完整前后快照，不是提交patch：fact目标为`{value:ValueSnapshot,reviewStatus:string,handlingStatus:string,redlineReviewStatus:string}`；intention目标为`{level:IntentionLevel,summary:string,projects?:string[],timeExpressions?:string[],evidenceIds:string[]}`。意向复核首版只改level，但前后快照保留整个意向对象。界面按targetKind解读前后值，展示操作者、实际时间和理由，不能从请求补造审计内容。

原文接口的reviews按createdAt倒序有界读取，当前最多200条；reviewsHasMore=true时明确提示仅显示部分记录，不能将已读取项冒称完整审计历史，首版不据此虚构一个未定义的分页接口。

`redlineStatus='none'|'candidate'|'confirmed'|'rejected'`为独立红线认定状态；候选不算已认定。它不能通过严重度、问题reviewStatus或handlingStatus推断：确认问题不自动确认红线，处理完成不自动改变认定，误报问题不能继续保留有效红线。所选事实值按mode读取原始或有效值，独立人工认定状态和审计仍明确展示。

`RedlineSummary={scope:'report_scope',availability:'ready'|'not_collected',total:number|null,statuses:{candidate:number|null,confirmed:number|null,rejected:number|null},handling:{pending:number|null,processing:number|null,resolved:number|null},statisticsPending:boolean}`。

summary只随页头日期、部门、工作号、reportRefs及当前可信ACL收敛，表示所选报告范围内的红线事件总数。列表的factCode、严重度、红线认定、问题复核、处理状态、其他明细条件及分页不缩小这组汇总；前端不能对当前页items求和代替总数。total包含candidate、confirmed、rejected，排除none，且应同时等于statuses三项之和及handling三项之和。问题复核和处理完成不能替代独立红线认定／否定；`ai/effective × current/original`四种视图中的红线分类都表达相同的独立人工认定状态，不把“原判视图”解释成忽略人工红线结论。

六项计数复用既有quality_daily_stat内的`__redline_status`和`__redline_handling`两组投影，不新增表或可编辑指标配置。只有每个reportRef都有同一已发布投影中的全部六项、全部ready且两组总数一致时返回ready数值。任一报告缺项、未采集、尚无投影或两组不一致，则summary整体not_collected，total和六个计数全部null；不拿其余报告局部结果补零。取数完成且确无消息的完整投影可返回合法0。完整旧投影等待重算时可保留旧数并返回statisticsPending=true，通过既有统计重算补齐，不改变模型分析范围。

`DimensionSummary={code:string,name:string,definitionVersion:number,source:'ai_original',counts:Partial<Record<'true'|'false'|'known'|'unknown'|'not_applicable',number|null>>,availability:'ready'|'not_collected'}`。判定类型返回四态；数值／枚举返回known、unknown、not_applicable。counts来自该定义版本的原始事实分布，不受人工复核改写；只有ready时为数值，not_collected的空值不得转成0。工作号表行展开显示此分布，不自动增加统计指标列；指标列仍由metrics配置决定。

点击可用维度计数，使用该工作号原reportRef以及`mode='ai'`、`factCode`、`valueStatus`查询事实；valueStatus的枚举同FactRow.status。不得强制`kind='dimension'`，因为问题事实也可能对应该判定维度；未采集项不提供虚构下钻结果。

## 规则及指标

- `GET /config` → `ConfigDTO={revision,value:QualityConfig,limits,operations,sourceOperations,sourceCatalog,warnings}`。
- `PUT /config`：`{expectedRevision,value}` → `ConfigDTO`并附必返数组`changeKinds:('display'|'statistics'|'analysis')[]`及`affectedMetricCodes:string[]`。同输入无实际变化不升语义版本，仍返回这两个字段，空内容为[]，不省略或返回null；客户端对缺字段的稳健防护不改变服务端合同。只有保存不自动启动模型。冲突409，不静默覆盖。
- `POST /statistics/rebuild`：`{scope,reportRefs,expectedConfigRevision,operationId}` → `{operationId,reportRefs,statisticsPending}`；只按可用事实重算选定工作号日，不调用模型。新语义缺失明确not_collected。相同operationId与相同原始请求可重放：即使首次接受后projectionRevision已推进，也复用原统计任务并返回当前可用reportRefs／等待状态，不重复创建分析或外呼；仍重新验证当前ACL及原analysisRevision。同operationId改为不同scope、reportRefs或expectedConfigRevision须冲突，不能据旧操作身份接受另一请求。

`limits={parameters:{[name:string]:{min:number,max:number}},maxFacts:number,maxMetrics:number,maxProducts:number}`。`operations={judgment:Operation[],number:Operation[],enum:Operation[]}`，Operation取下面MetricDefinition的operation受控枚举；前端按返回值展示可选算法及上限。

`sourceCatalog:SourceCatalogEntry[]`，其中`SourceCatalogEntry={code:string,name:string,type:'judgment'|'number'|'enum',unit:string,source:'program'|'ai',version:number,enabled:boolean,operations:Operation[],options?:[{id:string,label:string,enabled:boolean}]}`。它是服务端支持的统计来源目录，包含既有程序／AI来源及当前事实定义，不是需要再手工维护的一套规则。`sourceOperations:Record<string,Operation[]>`限制特定来源的算法；选择顺序为该code的sourceOperations、catalog条目的operations，新增AI事实才允许回退至operations[type]，未知程序code不开放任意算法。目录和限制只读，保存仍提交`expectedRevision,value`。

后台`QualityDailyConfig.RequiredStatisticsRevision`以BSON字段`required_statistics_revision`随Setting配置CAS持久保存，JSON标记为`-`，不作为ConfigDTO.value的可读／可写前端字段。统计或分析语义变化更新此水位，显示变化保留；后台按它找出尚需重算的报告并分批派发公共任务，保存请求不同步遍历全部历史，不新增集合。

QualityConfig：`facts:FactDefinition[],metrics:MetricDefinition[],parameters,products:ProductDefinition[]`；不含渠道执行开关或Prompt正文。
FactDefinition：`code,name,type:'judgment'|'number'|'enum',source:'ai'|'program',enabled,version,criteria,applicability,evidenceRequired,severity,redline:{enabled,criteria},unit?,precision?,min?,max?,options?:[{id,label,enabled}]`。program来源只能用既有目录code，不能改其实现为自由文本。
MetricDefinition：`code,name,sourceCode,sourceVersion,operation:'count'|'conversation_count'|'sum'|'min'|'max'|'average'|'ratio',denominator?:'all_conversations'|'assessed_conversations',enumValue?,enabled,showCard,order,version`。算法与数据源兼容性由服务端operations/limits声明。事件次数和会话数分别计算；产品目录包含稳定id、name、category、aliases、version、enabled。
parameters：`responseGroupMinutes,timeoutMinutes,deepChatCustomerMessages`，默认5/20/6；合理数值范围在规则服务定义。静态上下限及类型限制由GET /config返回，前端同步展示。

## 复核与执行

- `POST /reviews`：`{targetKind:'fact'|'intention',targetId,resultVersion,expectedReviewVersion,operationId,reason,patch}` → `{targetKind,targetId,reviewVersion,effective,statisticsPending}`。patch仅受控字段：fact `{confirmed?,severity?,redlineConfirmed?,handlingStatus?}`；intention `{level}`。操作先校验当前结果版本/权限，审计与有效状态一致保存；冲突409，重复operationId返回原结果。处理进度不改变问题成立与否；认定红线需要明确字段。
- `POST /generate`：`{channel,date,workAccountIds?:string[],operationId,mode:'generate'|'reanalyze'}` → `{operationId,batchId,reportIds,state}`。无原报告generate沿用该日意图，reanalyze明确创建新修订，冻结当前规则/Prompt/模型；请求只完成有界准入，取数与调用走持久公共任务。手动请求未选工作号时，“全部”只表示当前操作者可见工作号，先解析并冻结实际范围，不能占用租户自动调度的全企业空范围批次身份；无可见号不扩为全租户。准入成功时批次和各工作号报表元数据已经持久可读，异步采集尚未完成也显示generating及覆盖缺口；取数失败／中断须落报表失败状态和原因（采集未完成为partial_failed），不能让已提交任务从生成记录消失或显示为无消息。
- `POST /reports/:id/recover`：`{operationId}` → `{operationId,batchId,reportId,state,unknownTaskCount:number}`。恢复本报告未完成任务，成功会话不调用，未知外呼保持隔离；规则/Prompt/模型不刷新。

执行只注册一个公共`TaskQualityDaily`任务类型，内部`ExtraSnapshot.daily_phase`为`scan|capture|analysis|statistics|recover`。capture、statistics、recover复用公共本地阶段与持久恢复，analysis才进入公共模型调用及用量链路，不增加日报独立队列／worker。恢复控制任务冻结目标及原execution attempt，未知调用只计入unknownTaskCount并保持隔离；成功任务不重发，失败任务仍使用原模型／Prompt快照与原会话输入，不因当前配置改变转用新模型或新语义。新分析修订由明确的reanalyze请求产生。

统一错误：400非法合同、403无权限、404权限内记录不存在、409版本冲突、422配置依赖或数据缺口不允许操作、503暂时不可用。具体HTTP/业务code按现有errs映射保持一致。所有生成和复核mutation具备稳定operationId及幂等语义。实现时若改路径/字段，先更新同一合同通知两端，不靠前端兼容旧日报大JSON。


## 2026-10-30 准入与暂停增补

准入、定时和六条AC以[调整Plan](adjustment-20261030.md)为准。Coverage中total收集完成后=eligible+skipped，eligible=analyzed+failed+pending+paused；新增eligible/skipped/paused在未采集历史上为null，不能补0；新报告已确认的计数返回number。eligible是本报告来源下的分析准入（明确手动可免自动5+5），未采集历史及尚未判定时可null。unreadable与上述状态可以重叠，不相加。每个skipped只存一个主analysisReason，skipReasons按该主因计数，合计等于skipped。已采集但不足门槛保留程序事实，AI保持unknown。全跳过状态completed，analyzed=0且skipped=total，不能显示no_data或全员合格；no_data只表示完整范围确认0会话。无消息、未采齐和客户身份查询出错不同。

ConversationRow.state可为skipped|paused，analysisReason受控code首版为message_threshold|no_readable_content|cron_disabled|eligibility_changed；值不能作为模型原文输出。暂停同时沿RunRow.waitReason说明模板关闭及明确补跑要求。缺字段表示历史未采集，前端不得猜0。context数据及coverage继续属于其reportRefs；displayingPreviousRevision时最新生成进度只在RunRow/最新修订提示表达，不能与旧可读指标相加。

ratio的MetricValue.denominatorBasis必返all_conversations或assessed_conversations，后者是该指标明确评估的会话数（真+假／已知），不是总AI完成数。其他操作可省略。前端据此展示“全部纳入会话”或“已明确评估会话”，仍直接使用服务端value/分子/分母。手动generate/reanalyze保留当前权限，recover沿原快照来源；无新增业务开关、设置页或集合。

定时只创建持久本地扫描Task，模型调用仍由已创建的公共Task负责。模板关闭停止新业务会话派发，既有Task继续完成所有阶段与记账；重开不自动重跑旧暂停批次。UTC Cron为0 20 * * *，无timeZone，启动请求295秒/Job330秒/2次curl重试及既有0-4分钟错峰。Cron资源不由admin部署流水线自动下发，实际集群覆盖和四小时容量尚未验证。


2026-10-30 独立审查增补（原六条AC内）：采集未完成且coverage.total=null时，all_conversations比例的value=null、denominator=null、availability=unknown，保留已知numerator并说明“全部会话数尚未确认”；不能用当前已采集数冒充全量。assessed_conversations仍按该指标明确评估样本计算。跨工作号合并含未知全量时同样不发布全量比例；分母已确认0才显示合法0与not_applicable。首次创建会话AI任务前复核当前正式客户、有效非Purged关联及启用工作号；已入队任务继续。失去资格但已保存的会话保留程序事实，state=skipped、analysisReason=eligibility_changed。原capture阶段遇持久暂停不自动恢复，明确recover才可续派；已有新版五表运行快照通过原可信定时操作标识识别自动来源，不把缺字段默认为手动，不读取六旧集合。普通任务创建拒绝日报/沟通进度专用scene/type与未注册scene，保留既有合法语音和内部场景。


## 2026-10-31 已批准运营工作流增补

以[运营工作流Plan／六条AC](operator-workflow-20261031.md)为本轮最小补充；未涉及字段保留。普通手动generate/reanalyze新批次与自动生成执行相同准入（当天双方有效消息各至少5条且有可读内容）；Automatic仍表达来源和定时暂停，不将手动冒充自动。已有报告recover保留原冻结快照，不反向重写旧批次准入。上述约束取代旧文“手动免5+5”的说明。

- `FactRow`补充`workAccountName:string`，正式声明已有`explanation:string`。AI判断理由展示explanation，evidencePreview仅在真实引用可用时展示，不将解释冒充原话。名称沿可见reportRefs批量映射，不逐行取消息或跨企业找身份。
- `Insight`补充`workAccountId,workAccountName,customerName`；概览需跟进对象使用已有事实中的真实未解决问题说明，不拿意向摘要冒充问题。名单保持有界。
- conversations查询增加可选`analysisState:'all'|'assessed'|'unassessed'|'failed'|'skipped'|'paused'`，缺省all；assessed精确定义为state=completed且resultVersion>0，unassessed为其补集。筛选在服务端分页前执行并绑定游标，前端显式选已分析优先，不对当前页过滤冒充全量。
- 自动生成开关只读展示沿已有Prompt场景配置；不得从某份报告状态猜测。若因权限或历史数据不能获得，不假设已开启。规则配置不新增第二个开关。
- standards沿既有original执行快照查询；报告多版本不一致时明确提示并引导按单工作号查看，不能以当前配置解释旧日报。无需新增标准分组表/API。
- FactDefinition增加可选`examples:{positive?:string,negative?:string}`；分类options条目增加可选`criteria:string`。它们与criteria/applicability同一份冻结定义、输入和版本，无单独发布或模板绑定表。空值可省略；服务端受控长度、分类非空可用选项、名称标准、数值范围、红线依赖校验仍必须通过。
- AI项目名称、分类标签和分类标准、示例、产品名称/类别等进入模型的内容变化计入分析版本；纯指标标题/排序/卡片显示不触发模型。旧定义和长标准不自动截断或批量替换。
- 处理进度沿原reviews仅提交handlingStatus和必填reason；未提交的confirmed/severity/redlineConfirmed保持原值。无法判断留待复核时不发送confirmed=false。

任务状态收敛与统计恢复使用原公共AI Task及现有集合；capture success不能等同captureComplete。取数未完成且任务终态、没有明确恢复时应准确显示未完成原因，不能强写游标完成。相同版本已终态统计任务不得形成永久空转；本地投影恢复不重发模型、不改通用任务终态。

实际04:00调度与08:00容量需要独立运行证据。旧文“Cron资源不由admin流水线自动下发”不再作为现状结论：当前流水线包含清单下发，实际集群对象仍须按权限读回，不能把仓库YAML或部署成功冒充自动执行已验证。本轮不修改Cron清单、开关或价格。

本轮处理进度补充：`FactRow.handleable:boolean`与已有`reviewable`分开。真实AI问题或AI未解决诉求（原始status=true、当前结果版本）可提交仅handlingStatus的补丁和必填reason；request不可提交confirmed/severity/redlineConfirmed。问题复核能力仍仅适用于已有AI问题，不扩大为程序事实复核。处理完成不篡改AI原判或将诉求status强置false，原始识别与人工处理状态分别解释。概览unresolved对象的真实问题说明使用`requestSummary?:string`，可处理目标使用`requestFactId?:string,handlingStatus?:string`；缺少对应事实时明确无可更新目标，不造内容。

当前自动开关读数明确为`context.automaticEnabled:boolean|null`、`automaticReason?:string`：当前渠道0个启用模板=false，恰1个=true，多于1个=null并提示配置冲突；多模板冲突不冒称正常开启，也不阻断已有日报阅读。真实读取失败沿服务错误返回，不静默当关闭。当前开关按scene查询，不按旧报告PromptSnapshot.ID推测。意向页默认已分析筛选只适用于普通浏览；程序指标下钻清除该默认，保留未分析会话的程序统计结果。

数值展示沿已有定义补充`FactRow.precision?:number`，只从与definitionVersion匹配的冻结定义返回；程序response_minutes缺自定义定义时默认1位，其他固定计数为0位。仅格式化显示，不舍入覆盖原值，不将所有minutes强制一位。新配置的number仍沿原0–6精度能力，不新增计算方法。

`context.historicalAnalysis`同时比较启用事实定义与启用产品id/version。产品统计已有版本隔离；新语义not_collected等非ready状态禁止以新产品名称下钻旧事实，original视图保留原定义的合法下钻。不新增产品版本表或新统计算法。

程序事实重算后的原文精度沿同租户可证实的定义：先按报告配置匹配，必要时从当前配置只补code/definitionVersion完全匹配的precision，不重贴名字或判定标准。仅内建definitionVersion=1的程序response_minutes允许缺定义时默认1位；自定义/重算版无可匹配定义时省略precision，前端保留原数值，不能强用1位或拿不匹配新版猜测。不新增事实字段、集合或历史重写。

状态维护扫描轮转：报告增一个JSON隐藏的可选`progress_checked_at`维护检查时间，按它与_id在原每15秒恢复器中有界轮转；用$max防并发检查时间回退，配现有报告集合索引，不改业务updated_at/DataVersion或dirty。用于避免前20份无变化活跃报告永久占满扫描窗口，既不伪造业务进度，也不饿死后续旧孤儿报告。不新增表、监听、队列或定时任务；旧报告缺字段按尚未检查进入轮转，无数据迁移/历史付费补跑。


## 2026-10-31 页面分布与证据入口小修（已批准）

Overview增`distributionCoverage:{assessed:number,unassessed:number}`，均为当前授权reportRefs/工作号范围中实际已保存会话的计数。assessed精确定义与conversations的analysisState=assessed一致；unassessed是同范围已保存会话中的补集，不代表尚未取得的上游全量。risk/priorities只来自assessed。mode=ai读取original_risk，effective读取risk；服务优先级沿service_priority。空值/缺失/非法类别保留为unknown，unknown下钻使用同一归一边界。无报告返回0个已保存会话，但UI继续未生成/未采集，不宣称0风险。

该分布与新鲜度来自当前已保存会话；原投影统计卡片继续保留原配置与上次完整统计语义。读取只做一次有权限范围的聚合，不读取消息正文，不执行RebuildStats/更新旧投影、不调用模型。FactRow沿原evidenceIds与证据抽屉，页面取消未赋值的evidencePreview列；DTO及持久字段不作无关清理。
