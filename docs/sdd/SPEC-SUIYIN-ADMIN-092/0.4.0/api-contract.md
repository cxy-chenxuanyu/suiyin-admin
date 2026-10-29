# 质检日报实施接口合同 v0.4.0（已确认Plan的工程细化）

适用两渠道 `wecom` / `wechat`；企业由可信请求上下文选择数据库，客户端不传 tenant_id。原Prompt接口与保存保留；这里只定义日报及规则接口。根路径 `/api/v1/ai/quality-daily`，使用既有 ApiResponse envelope。日期格式 YYYY-MM-DD，北京自然日；ID均为不透明字符串。所有result／review／config／definition／analysis／projection的revision或version均为整数。`intention.level`为`level_1`至`level_5`或`unknown`。

## 查询及一致视图

通用 Scope：`channel,date,departmentIds?:string[],workAccountIds?:string[],mode:'ai'|'effective',view:'current'|'original'`。默认 effective/current；空数组只代表用户没有额外筛选，服务器必须先与可信ACL相交；ACL空集永远返回空。

`ReportRef={reportId,workAccountId,analysisRevision,projectionRevision}`。首次 overview 解析各账号当前可读报告，返回 `context={reportRefs,configRevision,capabilities,coverage,state,statisticsPending}`；随后模块传相同 reportRefs。过期不可读版本返回409及重新加载提示，不能静默拼新旧。所有列表 `Page<T>={items:T[],nextCursor:string|null,context}`，limit默认20/最大100，按稳定键排序；分页游标绑定Scope/版本。读接口按以下POST query形式避免复杂URL映射，均只读，不产生模型调用。

- `GET /scope?channel=...`：`{workAccounts:[{id,name,departmentId?,departmentName?,available,reason?}],departments:[{id,name}],capabilities:{read,evidence,review,config,execute},timeZone:'Asia/Shanghai'}`。工作号按可信权限收敛。
- `POST /overview/query`：Scope → `{context,metrics:MetricValue[],risk:{high,medium,low,unknown},priorities:[{code,count}],highlights:[{conversationId,title,evidenceIds}],unresolved:ConversationRow[]}`。以上名单有界；更多用列表查询。
- `POST /accounts/query`：Scope+reportRefs+cursor+limit → Page<AccountRow>；行含 `{workAccountId,name,departmentName?,metrics:MetricValue[],coverage,state}`。
- `POST /conversations/query`：Scope+reportRefs+cursor+limit+`intention?,servicePriority?,risk?,metricCode?` → Page<ConversationRow>。
- `POST /facts/query`：Scope+reportRefs+cursor+limit+`kind?,factCode?,severity?,redlineStatus?,reviewStatus?,handlingStatus?,conversationId?,productId?` → Page<FactRow>。问题、红线和维度下钻共用此入口，按固定kind含义过滤，不放任意表达式。
- `POST /products/query`：Scope+reportRefs → `{context,items:[{id,name,category,mentionCount,conversationCount,staffConversationCount,availability}],actions:MetricValue[]}`；零触达由该版目录补齐。
- `POST /standards/query`：Scope+reportRefs → `{context,config,versions,limitations}`，按选定报告完整快照解释。
- `GET /conversations/:id/evidence?resultVersion=...`：`{conversation,messages:[{id,at,direction,type,status,text,parseStatus,automated,actualOperatorId?,reason?}],facts,reviews,coverage}`。重新验证证据权限，原文不混入普通列表。
- `POST /runs/query`：Scope+cursor+limit → Page<RunRow>；包含batchId/reportId与关联task摘要、revision、state、coverage、waitReason、retryAt、failureReason、canRecover，不暴露原文或密钥。

`Coverage={total:number|null,analyzed:number,failed:number,pending:number,unreadable:number,collectionComplete:boolean,gaps:string[]}`。取数未完整时total不能猜测，使用null；已知部分计数不代表完整覆盖。统一state为`not_generated|generating|waiting_quota|partial_failed|failed|no_data|completed`。

`RunRow={id, batchId,reportId,revision,state,coverage,waitReason?,retryAt?,failureReason?,canRecover,tasks?:[{id,state}]}`，id等于reportId；没有真实任务时不伪造task ID。`versions={name:string,version:number}[]`，`limitations:string[]`。

`MetricValue={code,name,value:number|null,unit,numerator?,denominator?,availability:'ready'|'unknown'|'not_applicable'|'not_collected'|'pending',reason?,definitionVersion}`。未知不补0，前端不重新计算统计或风险。

`ConversationRow={id,reportId,workAccountId,workAccountName,customerName,relationId,state,risk,intention:{level,summary,projects?,timeExpressions?,evidenceIds},originalIntention?,servicePriority,unresolvedCount,issueCount,reviewVersion,resultVersion,coverage}`。列表不得带全部消息。

`FactRow={id,reportId,conversationId,workAccountId,customerName,kind,code,name,definitionVersion,resultVersion,status,value?,severity,redlineCandidate,redlineConfirmed,reviewStatus,handlingStatus,evidenceIds,evidencePreview?,reviewVersion,original?}`。判定四态 `true/false/unknown/not_applicable` 与类型判定分开；value为boolean/number/string单值。红线待认定不当作已认定；展示原始与有效值由mode决定，原始审计可展开。

## 规则及指标

- `GET /config` → `{revision,value:QualityConfig,limits,operations}`。
- `PUT /config`：`{expectedRevision,value}` → `{revision,value,changeKinds:('display'|'statistics'|'analysis')[],affectedMetricCodes,warnings}`。只有保存不自动启动模型；同输入无实际变化不升语义版本。冲突409，不静默覆盖。
- `POST /statistics/rebuild`：`{scope,reportRefs,expectedConfigRevision,operationId}` → `{operationId,reportRefs,statisticsPending}`；只按可用事实重算选定工作号日，不调用模型。新语义缺失明确not_collected。

`limits={parameters:{[name:string]:{min:number,max:number}},maxFacts:number,maxMetrics:number,maxProducts:number}`。`operations={judgment:Operation[],number:Operation[],enum:Operation[]}`，Operation取下面MetricDefinition的operation受控枚举；前端按返回值展示可选算法及上限。

QualityConfig：`facts:FactDefinition[],metrics:MetricDefinition[],parameters,products:ProductDefinition[]`；不含渠道执行开关或Prompt正文。
FactDefinition：`code,name,type:'judgment'|'number'|'enum',source:'ai'|'program',enabled,version,criteria,applicability,evidenceRequired,severity,redline:{enabled,criteria},unit?,precision?,min?,max?,options?:[{id,label,enabled}]`。program来源只能用既有目录code，不能改其实现为自由文本。
MetricDefinition：`code,name,sourceCode,sourceVersion,operation:'count'|'conversation_count'|'sum'|'min'|'max'|'average'|'ratio',denominator?:'all_conversations'|'assessed_conversations',enumValue?,enabled,showCard,order,version`。算法与数据源兼容性由服务端operations/limits声明。事件次数和会话数分别计算；产品目录包含稳定id、name、category、aliases、version、enabled。
parameters：`responseGroupMinutes,timeoutMinutes,deepChatCustomerMessages`，默认5/20/6；合理数值范围在规则服务定义。静态上下限及类型限制由GET /config返回，前端同步展示。

## 复核与执行

- `POST /reviews`：`{targetKind:'fact'|'intention',targetId,resultVersion,expectedReviewVersion,operationId,reason,patch}` → `{targetKind,targetId,reviewVersion,effective,statisticsPending}`。patch仅受控字段：fact `{confirmed?,severity?,redlineConfirmed?,handlingStatus?}`；intention `{level}`。操作先校验当前结果版本/权限，审计与有效状态一致保存；冲突409，重复operationId返回原结果。处理进度不改变问题成立与否；认定红线需要明确字段。
- `POST /generate`：`{channel,date,workAccountIds?:string[],operationId,mode:'generate'|'reanalyze'}` → `{operationId,batchId,reportIds,state}`。无原报告generate沿用该日意图，reanalyze明确创建新修订，冻结当前规则/Prompt/模型；请求只完成有界准入，取数与调用走持久公共任务。
- `POST /reports/:id/recover`：`{operationId}` → `{operationId,batchId,reportId,state}`。恢复本报告未完成任务，成功会话不调用，未知外呼保持隔离；规则/Prompt/模型不刷新。

统一错误：400非法合同、403无权限、404权限内记录不存在、409版本冲突、422配置依赖或数据缺口不允许操作、503暂时不可用。具体HTTP/业务code按现有errs映射保持一致。所有生成和复核mutation具备稳定operationId及幂等语义。实现时若改路径/字段，先更新同一合同通知两端，不靠前端兼容旧日报大JSON。
