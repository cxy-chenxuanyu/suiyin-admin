/* SPEC-SUIYIN-ADMIN-092@0.2.0 — local synthetic daily quality report. */
'use strict';
window.AdminQualityDaily = (() => {
 const A=window.Admin, previous=window.AdminViews;
 const channels={wecomQualityDaily:'wecom',wechatQualityDaily:'wechat'};
 const channel=channels[A.route], label=channel==='wecom'?'企微':'个微', M=()=>window.AdminQualityModel, esc=A.esc;
 const tabs=[['overview','今日概览'],['intent','客户意向'],['staff','员工与工作号'],['issues','问题明细'],['risk','高风险待复核'],['business','大单品与老带新'],['standards','质检标准']];
 const reviewLabels={pending:'待复核',confirmed:'确认问题',false_positive:'误报'},handlingLabels={unhandled:'未处理',in_progress:'处理中',resolved:'已处理'};
 const riskName=v=>({high:'高风险',medium:'中风险',low:'低风险'}[v]||v);
 const statusLabels={completed:'报告已完成',partial:'部分完成',failed:'生成失败',generating:'正在生成',no_report:'尚无日报',disabled:'未启用',error:'读取失败',empty:'采集完整 · 无数据'};
 let state={date:'2026-10-23',revision:'latest',accountId:'',receiverId:'',tab:'overview',scenario:'auto'}, root,report,view;
 const opt=(v,l,selected)=>'<option value="'+esc(v)+'"'+(String(v)===String(selected)?' selected':'')+'>'+esc(l)+'</option>';
 const badge=(text,type='')=>'<span class="qd-badge '+type+'">'+esc(text)+'</span>';
 const button=(text,action,id='',cls='')=>'<button class="qd-btn '+cls+'" data-qaction="'+action+'"'+(id?' data-id="'+esc(id)+'"':'')+'>'+esc(text)+'</button>';
 const fmt=value=>{if(!value)return '—';const date=new Date(value);if(!Number.isFinite(date.getTime()))return String(value);return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date);};
 const safe=n=>Number.isFinite(Number(n))?Number(n):0;
 const amount=n=>safe(n).toLocaleString('zh-CN');
 const pct=n=>n!==null&&n!==undefined&&Number.isFinite(Number(n))?Number(n).toFixed(1).replace('.0','')+'%':'不适用';
 function navigate(route){if(parent!==window)parent.postMessage({type:'admin-quality-navigate',route},location.origin);else{const u=new URL(location.href);u.searchParams.set('route',route);location.href=u;}}
 function table(headers,rows,empty='暂无符合条件的记录'){return '<div class="qd-tablewrap"><table class="qd-table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.join(''):'<tr><td colspan="'+headers.length+'"><div class="qd-empty">'+esc(empty)+'</div></td></tr>')+'</tbody></table></div>';}
 function errorBox(title,description,action='refresh'){return '<div class="qd-empty"><div class="qd-empty-symbol">◷</div><h2>'+esc(title)+'</h2><p>'+esc(description)+'</p>'+button(action==='reset'?'清空筛选':'重新载入',action)+'</div>';}
 function options(items,selected,first){return opt('',first,selected)+items.map(x=>opt(x.id,x.name,selected)).join('');}
 function filterData(r){return M().filterReport?M().filterReport(r,{accountId:state.accountId,receiverId:state.receiverId}):r;}
 function projectScenario(r){
  if(!r.summary||!['generating','partial','failed','empty','late'].includes(state.scenario))return r;
  const projected=structuredClone(r),scenario=state.scenario;
  if(scenario!=='late'){projected.meta.status=scenario;projected.meta.late=false;}
  if(scenario==='empty'){projected.sessions=[];projected.issues=[];projected.meta.actualStart=projected.meta.plannedStart;projected.meta.actualFinish=projected.meta.targetFinish;}
  if(['generating','partial','failed'].includes(scenario)){
   projected.meta.actualFinish=null;
   projected.sessions.forEach((s,i)=>s.analysisStatus=scenario==='failed'?'failed':scenario==='generating'?(i<3?'success':'pending'):(i===projected.sessions.length-1?'failed':'success'));
   const successful=new Set(projected.sessions.filter(s=>s.analysisStatus==='success').map(s=>s.id));
   projected.issues=projected.issues.filter(i=>successful.has(i.sessionId));
  }
  if(scenario==='late'){const next=new Date(Date.parse(state.date+'T00:00:00Z')+86400000).toISOString().slice(0,10);if(projected.meta.status==='completed')projected.meta.actualFinish=next+'T08:30:00+08:00';projected.meta.late=true;}
  return projected;
 }
 function reportedStatus(){return report.meta?.status||'no_report';}
 function statusHTML(){
  const meta={...(report.meta||{})},c={...(view.coverage||{})},status=reportedStatus(),late=meta.late||status==='late';
  if(state.scenario==='permission'||state.scenario==='disabled')return '<section class="qd-status warn"><strong>'+ (state.scenario==='permission'?'当前无日报访问权限':'本渠道分析尚未启用')+'</strong><span class="qd-note">情景演示 · 不展示生成覆盖和报告内容</span></section>';
  if(state.scenario==='readonly')return '<section class="qd-status warn"><strong>仅可查看汇总</strong><span class="qd-note">情景演示 · 原文、复核及配置操作受限</span></section>';
  if(status==='error')return '<section class="qd-status bad"><strong>本地演示记录读取失败</strong><span>没有把读取失败计为零问题。</span></section>';
  if(['unconnected','unsynced'].includes(state.scenario))return '<section class="qd-status warn"><strong>'+(state.scenario==='unconnected'?'本渠道尚未接入':'工作号采集不完整')+'</strong><p>应分析会话：未知。'+(state.scenario==='unconnected'?'渠道接入并完成同步后才能分析。':'工作号离线或同步未完成，当前无法确认完整消息范围。')+' 不计作已分析，不展示虚假完成率。</p></section>';
  const color=['partial','generating','late'].includes(status)?'warn':status==='failed'?'bad':'';
  const expected=c.expected===null||c.expected===undefined?'未知':c.expected;
  const text=statusLabels[status]||'报告状态';
  const success=safe(c.success),missing=safe(c.failed)+safe(c.pending);
  return '<section class="qd-status '+color+'"><div><strong>'+esc(text)+'</strong> '+badge('本地演示',color?'warn':'teal')+(late?' '+badge('超过 08:00 目标时间','warn'):'')+
   '<div class="qd-meta"><span>统计日 '+esc(state.date)+'</span><span>观察截至 '+esc(fmt(meta.observationCutoff))+'</span><span>04:00 启动 · 08:00 前出报</span></div>'+
   '<p>实际启动 '+esc(fmt(meta.actualStart))+'　完成 '+esc(fmt(meta.actualFinish))+'　 ·　规则 '+esc(meta.ruleVersion||'r1')+' / 提示词 '+esc(meta.templateVersion||'p1')+' / 修订 '+esc(meta.revision||'—')+'</p>'+
   (status==='partial'?'<p>仍有 '+missing+' 个会话未完成，'+safe(c.unparsedVoice)+' 条语音、'+safe(c.unparsedImage)+' 张图片未解析；受影响维度显示证据不足。</p>':'')+
   (late?'<p>保留实际完成时间；耗时小于 4 小时也不能替代按时出报。</p>':'')+
   '</div><div class="qd-progress">已分析 '+success+' / '+esc(expected)+' 个会话<progress max="'+(Number(expected)||1)+'" value="'+success+'"></progress><span>失败 '+safe(c.failed)+' · 待处理 '+safe(c.pending)+'</span></div></section>';
 }
 function overview(){
  const s=view.summary||{},issues=view.issues||[],intents=view.intents||[],sessions=view.sessions||[];
  const data=[
   ['有效日会话',amount(s.sessions),'按工作号＋客户关系去重',''],
   ['有效消息',amount(s.validMessages),'原始 '+amount(s.rawMessages)+' · 排除 '+amount(s.excludedMessages),''],
   ['待复核候选问题',amount(issues.filter(i=>i.reviewStatus==='pending').length),'AI候选 '+amount(s.candidateIssues)+' · 人工确认 '+amount(s.confirmedIssues),'attention'],
   ['超时会话',amount(s.timeoutSessions),'适用 '+amount(s.applicableSessions)+' 个会话 · '+pct(s.applicableTimeoutRate),'attention']
  ];
  const cards='<div class="qd-cards">'+data.map(([name,n,desc,cls])=>'<div class="qd-card '+cls+'"><div class="qd-card-label">'+esc(name)+'</div><div class="qd-value">'+n+'</div><div class="qd-caption">'+esc(desc)+'</div></div>').join('')+'</div>';
  const intentOptions=M().intentOptions||['高意向','明确需求','初步了解','当日未回应','未判定'];
  const bars=intentOptions.map(name=>{const count=intents.filter(i=>i.intent===name).length;return '<div class="qd-bar"><span>'+esc(name)+'</span><div class="qd-track"><span style="width:'+Math.round(100*count/Math.max(1,intents.length))+'%"></span></div><span>'+count+' 会话</span></div>';}).join('');
  const pending=issues.filter(i=>i.reviewStatus!=='false_positive').slice(0,4);
  return cards+'<div class="qd-two"><section class="qd-panel"><div class="qd-panel-head"><h2>客户意向分布</h2>'+button('查看全部','tab','intent','link')+'</div><div class="qd-bars">'+bars+'</div><p class="qd-note">按日会话统计；当日未回应独立显示，售后处理优先级不由购买意向决定。</p></section>'+
   '<section class="qd-panel"><div class="qd-panel-head"><h2>优先关注</h2><small>候选结论 · 需人工复核</small></div><div class="qd-list">'+(pending.length?pending.map(i=>'<div class="qd-list-item"><div>'+badge(riskName(i.risk)||'待复核',/高|high|严重/.test(i.risk)?'bad':'warn')+' '+esc(i.title)+'<small>'+esc(sessions.find(s=>s.id===i.sessionId)?.customerName||'')+' · '+esc(i.dimension)+'</small></div>'+button('看证据','evidence',i.id,'link')+'</div>').join(''):'<p class="qd-note">当前没有待关注的候选问题。</p>')+'</div></section></div>'+
   '<section class="qd-panel"><div class="qd-panel-head"><h2>数据覆盖</h2><small>未同步、未解析和无问题分别呈现</small></div>'+coverageTable()+'</section>'+
   '<p class="qd-note">全量会话超时占比 '+pct(s.allTimeoutRate)+'（'+safe(s.timeoutSessions)+' / '+safe(s.sessions)+'）；适用会话超时率 '+pct(s.applicableTimeoutRate)+'（'+safe(s.timeoutSessions)+' / '+safe(s.applicableSessions)+'）。超时事件 '+safe(s.timeoutEvents)+' 次，与超时会话数分开统计。</p>';
 }
 function coverageTable(){return table(['工作号','接入与采集','应分析会话','已分析','缺失／未完成'],(view.coverage?.accounts||[]).map(a=>'<tr><td>'+esc(a.name)+'</td><td>'+badge(!a.connected?'未接入':a.complete?'采集完整':'采集不完整',a.connected&&a.complete?'good':'warn')+'</td><td>'+esc(a.expected??'未知')+'</td><td>'+safe(a.success)+'</td><td>'+safe(a.missing)+'</td></tr>'),'当前范围没有工作号');}
 function intentTable(){return table(['客户／工作号','购买意向','服务优先级','判断来源','操作'],(view.intents||[]).map(i=>{const s=view.sessions.find(s=>s.id===i.sessionId);return '<tr><td>'+esc(i.customerName)+'<small>'+esc(s?.accountName)+'</small></td><td>'+badge(i.intent,i.intent==='高意向'?'good':'')+'</td><td>'+esc(i.priority||'常规')+'</td><td>'+esc(i.history?.length?'已人工更正':'AI建议')+'</td><td><div class="qd-actions">'+button('看原文','session',i.sessionId,'link')+button('更正意向','intent',i.sessionId,'link')+'</div></td></tr>';}));}
 function staffTable(){return '<p class="qd-note">按可核实的接待身份汇总；工作号、实际发言者与当前归属人分别记录。未知身份不猜测、不自动记个人失职。</p>'+table(['接待人','日会话','适用响应会话','超时会话','AI候选问题','人工确认','操作人未知'],(view.staff||[]).map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+safe(p.sessionCount)+'</td><td>'+safe(p.applicableSessions)+'</td><td>'+safe(p.timeoutSessions)+'</td><td>'+safe(p.candidateIssues)+'</td><td>'+safe(p.confirmedIssues)+'</td><td>'+safe(p.unknownOperatorSessions)+'</td></tr>'));}
 function issuesTable(high=false){
  const all=(view.issues||[]).filter(i=>!high||/高|high|严重/.test(i.risk));
  return '<div class="qd-panel-head"><h2>'+ (high?'高风险待复核':'全部候选问题')+'</h2><small>'+all.length+' 条问题 · 确认与误报保留原记录</small></div>'+table(['客户／工作号','问题与维度','风险','复核','处理','操作'],all.map(i=>{const s=view.sessions.find(s=>s.id===i.sessionId);return '<tr><td>'+esc(s?.customerName)+'<small>'+esc(s?.accountName)+'</small></td><td class="wrap">'+esc(i.title)+'<small>'+esc(i.dimension)+'</small></td><td>'+badge(riskName(i.risk),/高|high|严重/.test(i.risk)?'bad':'warn')+'</td><td>'+badge(reviewLabels[i.reviewStatus]||i.reviewStatus,i.reviewStatus==='confirmed'?'bad':i.reviewStatus==='false_positive'?'':'warn')+'</td><td>'+esc(handlingLabels[i.handlingStatus]||i.handlingStatus)+'</td><td>'+button('证据与复核','evidence',i.id,'link')+'</td></tr>';}));
 }
 function businessTable(){return '<p class="qd-note">使用本租户共同业务规则。客户提及与员工主动提及分别计算；未配置或不适用不记违规。</p>'+table(['重点动作','适用会话','提及会话','客户提及','员工提及','证据不足'],(view.business||[]).map(b=>'<tr><td>'+esc(b.name)+'</td><td>'+safe(b.applicableSessions)+'</td><td>'+safe(b.mentionedSessions)+'</td><td>'+safe(b.customerMentionedSessions)+'</td><td>'+safe(b.staffMentionedSessions)+'</td><td>'+safe(b.unknownSessions)+'</td></tr>'))+'<div style="margin-top:18px">'+table(['客户','工作号','场景','原文'],(view.sessions||[]).map(s=>'<tr><td>'+esc(s.customerName)+'</td><td>'+esc(s.accountName)+'</td><td>'+esc(s.summary)+'</td><td>'+button('查看','session',s.id,'link')+'</td></tr>'))+'</div>';}
 function standards(){
  const rules=report.snapshot?.rules||{},frozen='<section class="qd-panel"><h2>历史规则快照 · '+esc(rules.version||report.meta?.ruleVersion)+'</h2><p>响应超时 &gt; '+esc(rules.responseMinutes)+' 分钟　连续消息 ≤ '+esc(rules.burstMinutes)+' 分钟　客户深聊 ≥ '+esc(rules.deepChatCount)+' 条</p><p>重点动作最低双方消息数：'+esc(rules.businessMinMessages)+' 条</p><p>重点项目：'+esc((rules.largeProducts||[]).join('、')||'未配置')+'</p><p>老带新适用条件：'+esc(rules.referralCondition||'未配置')+'</p><p class="qd-note" style="white-space:pre-wrap">'+esc(rules.content)+'</p><details><summary>查看本日报使用的专用提示词</summary><pre style="white-space:pre-wrap;max-height:260px;overflow:auto;font:12px/1.8 inherit">'+esc(report.snapshot?.templateContent||'未提供')+'</pre></details></section>';
  return frozen+'<section class="qd-panel"><div class="qd-panel-head"><h2>当前日报采用的规则</h2>'+button('打开提示词管理','prompts','','link')+'</div><p>共用规则 '+badge(report.meta?.ruleVersion||'—','teal')+'　'+esc(label)+'专用提示词 '+badge(report.meta?.templateVersion||'—')+'</p><p class="qd-note">这是当前报告的历史快照。网页修改提示词只作用于后续批次，原报告保持；两渠道使用独立提示词及分析方式。</p><div class="qd-standards">'+(view.standards||[]).map(s=>'<div class="qd-standard"><h3>'+esc(s.name)+'</h3><p>'+esc(s.description)+'</p></div>').join('')+'</div></section><section class="qd-panel"><h2>计数与证据口径</h2><p class="qd-note">消息数和响应时长由程序计算；AI判断语义并引用稳定消息ID。统计主体与跨日上下文分离。无数据、证据不足、不适用和真正无问题分别保存。</p><p class="qd-note">凌晨04:00启动，目标08:00前完成昨日自然日的分析。耗时与费用需本地功能版实测，本页没有执行真实AI或定时任务。</p></section>';
 }
 function paint(){
  if(!root)return;
  report=projectScenario(M().getReport(A.tenant,channel,state.date,state.revision));
  view=filterData(report);
  const meta=report.meta||{},allSessions=report.sessions||[],accounts=[...new Map(allSessions.map(s=>[s.accountId,{id:s.accountId,name:s.accountName}])).values()];
  const receivers=[...new Map(allSessions.map(s=>[s.receiverId||'unknown',{id:s.receiverId||'unknown',name:s.receiverName||'待核实'}])).values()];
  const scenarios=[['auto','使用报告本身的状态'],['generating','生成中'],['partial','部分完成'],['failed','模型或采集失败'],['empty','完整采集无数据'],['unconnected','渠道未接入'],['unsynced','工作号采集不完整'],['disabled','未启用'],['readonly','仅汇总可读'],['permission','无权限'],['late','超过目标时间']];
  root.innerHTML='<header class="qd-head"><div><h1>'+label+'会话质检日报</h1><p>查看昨日会话质量，定位需要跟进的客户和问题。</p></div><div class="qd-head-actions">'+button('提示词与共用规则','prompts')+button('本渠道重新生成','rerun','','primary')+'</div></header>'+
   '<div class="qd-demo"><span>演示数据 · 使用合成会话及南京样例规则；操作仅保存在当前浏览器。</span><details><summary>情景演示</summary><div class="qd-scenarios"><label>切换页面状态<select id="qd-scenario">'+scenarios.map(([v,l])=>opt(v,l,state.scenario)).join('')+'</select></label><p class="qd-note">用于验证异常反馈，不改变真实数据。</p></div></details></div>'+
   '<form class="qd-filter"><label>统计日期<input id="qd-date" type="date" value="'+esc(state.date)+'" max="'+esc(M().yesterday?.()||'2026-10-23')+'" required></label><label>工作号<select id="qd-account">'+options(accounts,state.accountId,'全部工作号')+'</select></label><label>接待人<select id="qd-receiver">'+options(receivers,state.receiverId,'全部接待人')+'</select></label><label>报告版本<select id="qd-version">'+opt('latest','最新修订',state.revision)+(report.revisions||[]).map(r=>opt(r.revision,'修订 '+r.revision+' · '+(statusLabels[r.status]||r.status),state.revision)).join('')+'</select></label>'+button('查询','query','','primary')+button('重置','reset')+'</form>'+
   statusHTML()+'<div class="qd-tabbar" role="tablist" aria-label="日报模块">'+tabs.map(([key,name])=>'<button role="tab" aria-selected="'+(key===state.tab)+'" data-qaction="tab" data-id="'+key+'">'+name+'</button>').join('')+'</div><div class="qd-content" role="tabpanel"></div><div class="qd-foot">'+label+'独立报告 · 共用规则 '+esc(meta.ruleVersion||'—')+' · '+esc(meta.modelName||'现有 DeepSeek 配置（演示）')+'</div>';
  const area=root.querySelector('.qd-content'),status=reportedStatus();
  if(['permission','readonly'].includes(state.scenario))root.querySelectorAll('[data-qaction=rerun],[data-qaction=prompts]').forEach(b=>b.disabled=true);
  if(state.scenario==='permission')area.innerHTML=errorBox('当前账号无权查看此日报','请使用具备当前租户及工作号范围的账号查看。');
  else if(state.scenario==='disabled')area.innerHTML=errorBox('本渠道尚未启用分析','在现有提示词管理中配置专用提示词，试跑通过后启用。历史演示结果不会触发真实定时任务。');
  else if(status==='error')area.innerHTML=errorBox('本地记录读取失败','已保留原数据，请重新载入；无法读取不能当作无数据。');
  else if(state.scenario==='unconnected')area.innerHTML=errorBox('渠道尚未接入，暂无可分析数据','先完成本渠道接入并同步授权范围；不能把未接入显示为无问题。');
  else if(state.scenario==='unsynced')area.innerHTML=errorBox('采集不完整，暂不能生成完整日报','工作号离线或同步中。完成同步后重新读取，再按原统计日与观察范围生成修订。');
  else if(status==='empty')area.innerHTML=errorBox('采集完整，当日无有效消息','“无数据”与“未接入、未同步”分开显示。');
  else if(status==='failed')area.innerHTML=errorBox('本渠道生成失败','模型返回或采集发生异常；不能将失败当作零问题。另一渠道日报不受影响。');
  else if(status==='generating')area.innerHTML=errorBox('正在分析昨日会话','取数、解析、模型分析和汇总分别记录进度；尚未完成的结果不会显示为无问题。');
  else if(status==='no_report')area.innerHTML=errorBox('这个日期尚无日报','请选择已有演示日期，或在模板启用后模拟生成。');
  else if(!view.sessions?.length)area.innerHTML=errorBox('没有符合筛选条件的会话','调整工作号、接待人或日期后重新查询。','reset');
  else area.innerHTML=({overview,intent:intentTable,staff:staffTable,issues:()=>issuesTable(false),risk:()=>issuesTable(true),business:businessTable,standards}[state.tab]||overview)();
  if(['permission','readonly'].includes(state.scenario))root.querySelectorAll('[data-qaction=rerun],[data-qaction=prompts]').forEach(b=>b.disabled=true);
  if(state.scenario==='permission')root.querySelectorAll('.qd-filter,.qd-tabbar,.qd-foot').forEach(el=>el.hidden=true);
  root.querySelector('#qd-scenario').onchange=e=>{state.scenario=e.target.value;paint();};
  root.querySelector('form').onsubmit=e=>{e.preventDefault();query();};
  root.querySelector('#qd-version').onchange=e=>{state.revision=e.target.value==='latest'?'latest':Number(e.target.value);paint();};
  root.querySelectorAll('[role=tab]').forEach(b=>b.onkeydown=e=>{const i=tabs.findIndex(t=>t[0]===state.tab);if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();state.tab=tabs[(i+(e.key==='ArrowRight'?1:6))%7][0];paint();root.querySelector('[aria-selected=true]')?.focus();});
 }
 function query(){const d=root.querySelector('#qd-date');if(!d.reportValidity())return;state.date=d.value;state.accountId=root.querySelector('#qd-account').value;state.receiverId=root.querySelector('#qd-receiver').value;paint();}
 function reset(){state={...state,date:M().yesterday?.()||'2026-10-23',revision:'latest',accountId:'',receiverId:''};paint();}
 function showResult(result){if(!result?.ok){A.toast(result?.message||result?.error||'未保存，请重试');return false;}A.toast(result.message||'已保存到本地演示');return true;}
 function evidence(id,isSession=false){
  const issue=isSession?null:report.issues?.find(i=>i.id===id),sessionId=isSession?id:issue?.sessionId;
  if(['readonly','permission'].includes(state.scenario)){A.showDialog('原文访问受限',A.node('p','qd-note','当前情景仅可查看汇总，无本工作号原文权限。'),[{label:'关闭',run:A.closeDialog}]);return;}
  const result=M().getEvidence(A.tenant,channel,state.date,report.meta.revision,sessionId);
  if(!result.ok){A.toast(result.message||'证据不可用');return;}
  const {session,messages}=result.data,content=A.node('div');
  content.innerHTML='<p class="qd-note">'+esc(session.customerName)+' · '+esc(session.accountName)+'　事发接待：'+esc(session.receiverName||'待核实')+'　实际发言者：'+esc(session.speakerName||'未知')+'　当前归属：'+esc(session.currentOwner||'未知')+'</p><div class="qd-detail-grid"><section><div class="qd-panel-head"><h3>会话原文</h3><small>标亮为当前问题引用证据</small></div><div class="qd-conversation">'+messages.map(m=>{const id=m.messageId||m.id,marked=issue?.evidenceMessageIds?.includes(id);return '<article class="qd-message '+(m.direction==='customer'||m.direction==='incoming'||m.role==='customer'||m.sender==='customer'?'customer ':'')+(marked?'marked':'')+'" data-message-id="'+esc(id)+'"><header><span>'+esc(m.senderName||m.sender||m.role||m.direction||'消息')+' · '+esc(fmt(m.at||m.time||m.sourceTime||m.timestamp))+'</span><span>'+esc(id)+'</span></header><p>'+esc(m.content||m.text||'[内容未解析]')+'</p><small>'+esc(messageNote(m))+'</small></article>';}).join('')+'</div></section><section class="qd-review">'+(issue?'<h3>'+esc(issue.title)+'</h3><p>'+esc(issue.explanation)+'</p><div>'+badge(issue.dimension)+' '+badge(riskName(issue.risk),'warn')+'</div><label>复核结论<select id="qd-review-status">'+Object.entries(reviewLabels).map(([v,l])=>opt(v,l,issue.reviewStatus)).join('')+'</select></label><label>处理状态<select id="qd-handling">'+Object.entries(handlingLabels).map(([v,l])=>opt(v,l,issue.handlingStatus)).join('')+'</select></label><label>本次说明<textarea id="qd-reason" placeholder="记录判断依据或处理进展，便于后续回看" required></textarea></label><p class="qd-note">人工确认与AI原始候选分别保留。标记已处理不等于客户诉求已自动解决。</p><div class="qd-review-log">'+(issue.history||[]).map(h=>'<p>'+esc(fmt(h.at||h.time))+' '+esc(h.reason||h.message)+'</p>').join('')+'</div>':'<h3>会话摘要</h3><p>'+esc(session.summary)+'</p><p class="qd-note">仅展示本次输入范围内的合成原文。未同步、未解析和身份未知均保留状态。</p>')+'</section></div>';
  if(session.dimensions?.length){const dimensionBox=A.node('details','qd-dimensions');dimensionBox.innerHTML='<summary>查看十四维度判断 · 合成演示</summary>'+table(['维度','适用性','证据','结论'],session.dimensions.map(d=>'<tr><td>'+esc(d.name)+'<small>'+esc(d.explanation)+'</small></td><td>'+esc(d.applicability==='not_applicable'?'不适用':'适用')+'</td><td>'+esc(d.evidenceStatus==='sufficient'?'充分':'不足')+'</td><td>'+esc(({no_issue:'未发现问题',candidate:'候选问题',not_applicable:'不适用',insufficient:'证据不足'})[d.conclusion]||'待核实')+'</td></tr>'));content.append(dimensionBox);}
  A.$('dialog').classList.add('qd-evidence');
  const actions=[{label:'关闭',run:A.closeDialog}];
  if(issue)actions.push({label:'保存复核',cls:'primary',run:()=>{const reason=content.querySelector('#qd-reason');if(!reason.value.trim()){reason.reportValidity();reason.focus();return;}if(showResult(M().reviewIssue(A.tenant,channel,state.date,report.meta.revision,issue.id,{reviewStatus:content.querySelector('#qd-review-status').value,handlingStatus:content.querySelector('#qd-handling').value,reason:reason.value.trim()}))){A.closeDialog();paint();}}});
  A.showDialog(issue?'问题证据与复核':'会话证据',content,actions);
  const d=A.$('dialog'),width=Math.min(1090,innerWidth-32);if(window.frameElement){const r=window.frameElement.getBoundingClientRect();d.style.setProperty('--dialog-left',Math.max(16,(parent.innerWidth-width)/2-r.left)+'px');}
  setTimeout(()=>content.querySelector('.qd-message.marked')?.scrollIntoView({block:'nearest'}),30);
 }
 function messageNote(m){const states={withdrawn:'已撤回 · 不计有效内容',failed:'发送失败 · 不计有效内容',recalled:'已撤回 · 不计有效内容'};if(states[m.status])return states[m.status];if(m.direction==='system'||m.type==='system')return '系统消息 · 不计有效内容';if(m.parseStatus&&!['parsed','complete'].includes(m.parseStatus))return '内容未解析 · 相关维度证据不足';return m.scope==='context'||m.isContext?'跨日上下文，不计主体条数':m.automatic?'已识别自动触达 · 不计有效响应':'统计日主体消息';}
 function editIntent(id){
  if(['readonly','permission'].includes(state.scenario)){A.toast('当前情景没有更正权限');return;}
  const current=report.intents.find(i=>i.sessionId===id),form=A.node('form','qd-review');
  form.innerHTML='<p>'+esc(current.customerName)+' · AI建议：'+esc(current.aiIntent)+'</p><label>人工意向<select id="qd-intent">'+M().intentOptions.map(v=>opt(v,v,current.intent)).join('')+'</select></label><label>更正理由<textarea id="qd-intent-reason" required></textarea></label>';
  A.showDialog('更正客户意向',form,[{label:'取消',run:A.closeDialog},{label:'保存',cls:'primary',run:()=>{if(!form.reportValidity())return;if(showResult(M().updateIntent(A.tenant,channel,state.date,report.meta.revision,id,{intent:form.querySelector('#qd-intent').value,reason:form.querySelector('#qd-intent-reason').value.trim()}))){A.closeDialog();paint();}}}]);
 }
 function rerun(){
  const cfg=M().getConfig(A.tenant,channel),rules=M().getRules(A.tenant),box=A.node('div','qd-review');
  box.innerHTML='<p>仅重新生成 <strong>'+label+'</strong> '+esc(state.date)+' 的报告，另一渠道不变。</p><p>模板 '+esc(cfg.published?.version)+'　共用规则 '+esc(rules.version)+'</p><p class="qd-note">主动重跑使用当前生效配置，观察截至点仍为统计日次日04:00。所有分析均为本地模拟。</p><label>操作方式<select id="qd-run-mode"><option value="new_revision">重新生成，保留新修订</option><option value="retry_failed">恢复原批次失败项</option></select></label><label><input id="qd-run-fail" type="checkbox"> 演示本次执行失败</label>';
  if(!cfg.published?.enabled)box.append(A.node('p','qd-error','本渠道模板尚未启用。请先在提示词管理试跑并启用；已有报告为历史演示。'));
  const actions=[{label:'取消',run:A.closeDialog},{label:cfg.published?.enabled?'确认模拟执行':'去配置提示词',cls:'primary',run:()=>{if(!cfg.published?.enabled){A.closeDialog();navigate('promptTemplate');return;}const result=M().rerun(A.tenant,channel,state.date,{mode:box.querySelector('#qd-run-mode').value,simulateFailure:box.querySelector('#qd-run-fail').checked});if(showResult(result)){A.closeDialog();state.revision='latest';paint();}}}];
  A.showDialog('重新生成'+label+'日报',box,actions);
 }
 function render(){
  if(!channel)return false;
  if(!M()?.isEnabledTenant(A.tenant)){A.$('app').replaceChildren(A.node('div','qd-empty','当前租户尚未启用会话质检日报'));return true;}
  state.date=state.date||M().yesterday();
  root=A.node('section','qd-page');A.$('app').replaceChildren(root);paint();
  root.onclick=e=>{const b=e.target.closest('[data-qaction]');if(!b||b.disabled)return;const action=b.dataset.qaction,id=b.dataset.id;e.preventDefault();
   if(['readonly','permission'].includes(state.scenario)&&['prompts','rerun'].includes(action)){A.toast('当前情景没有配置或重跑权限');return;}
   if(action==='tab'){state.tab=id;paint();}
   else if(action==='query')query();else if(action==='reset')reset();else if(action==='refresh')paint();
   else if(action==='prompts')navigate('promptTemplate');else if(action==='evidence')evidence(id);
   else if(action==='session')evidence(id,true);else if(action==='intent')editIntent(id);else if(action==='rerun')rerun();
  };return true;
 }
 window.AdminViews={...previous,render(){return render()||previous?.render?.();}};
 A.$('dialog').addEventListener('close',()=>A.$('dialog').classList.remove('qd-evidence'));
 window.addEventListener('storage',e=>{if(channel&&root&&(!e.key||/quality/.test(e.key)))paint();});
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='admin-page-visibility'&&e.data.visible===true&&root)paint();});
 return {render,get state(){return {...state};},refresh:paint};
})();

