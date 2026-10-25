/* SPEC-SUIYIN-ADMIN-092 — read-only local reports and separately declared public fixtures.
 * No API/model calls, localStorage writes or inferred findings.
 */
'use strict';
window.AdminQualityReal=(()=>{
 const A=window.Admin,previous=window.AdminViews;
 const routes={wecomQualityDaily:'wecom',wechatQualityDaily:'wechat'},channel=routes[A?.route];
 const sourceURL='data/private/quality-real-yestar-sz-20261019-20.json';
 const publicSourceURL='data/quality-public-demo.json';
 const esc=A?.esc||((v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
 const copy=v=>structuredClone(v),tabs=[['overview','今日概览'],['intent','客户意向'],['staff','员工与工作号'],['issues','问题明细'],['risk','高风险待复核'],['business','大单品与老带新'],['standards','质检标准']];
 let bundle=null,loadError='',loading=false,pending=null,root=null;
 const state={mode:'real',date:'2026-10-20',revision:'latest',accountId:'',receiverId:'',tab:'overview'};
 const count=n=>n===null||n===undefined?'未知':Number.isFinite(Number(n))?Number(n).toLocaleString('zh-CN'):'未知';
 const fmt=v=>{if(!v)return '未提供';const d=new Date(v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(d):String(v);};
 const risk=v=>({high:'高风险',medium:'中风险',low:'低风险'}[v]||v||'待复核');
 const btn=(text,action,id='')=>'<button class="qd-btn" data-real-action="'+action+'" data-id="'+esc(id)+'">'+esc(text)+'</button>';
 const badge=(text,cls='')=>'<span class="qd-badge '+cls+'">'+esc(text)+'</span>';
 const opt=(value,label,selected)=>'<option value="'+esc(value)+'"'+(String(value)===String(selected)?' selected':'')+'>'+esc(label)+'</option>';
 const table=(headers,rows)=>'<div class="qd-tablewrap"><table class="qd-table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.join(''):'<tr><td colspan="'+headers.length+'"><div class="qd-empty">当前范围没有已提供的记录</div></td></tr>')+'</tbody></table></div>';
 const baseSessions=r=>r?.sessions||[];
 function install(value){
  if(value?.schemaVersion!=='chat-quality-real-bundle-v1'||value.tenant!=='yestar-sz'||!((value.displayMode==='private-original'&&value.localOnly===true&&value.deidentified===false)||(!value.displayMode&&value.deidentified===true))||!Array.isArray(value.reports))throw Error('真实报告封装或本机展示声明不符合导入合同');
  const keys=new Set();
  for(const item of value.reports){
   const r=item.report,o=item.origin,c=item.channel||r?.meta?.channel,date=item.reportDate||r?.meta?.date;
   if(!r||r.synthetic!==false||!['wecom','wechat'].includes(c)||!['2026-10-19','2026-10-20'].includes(date)||r.meta?.tenant!=='yestar-sz'||r.meta?.channel!==c||r.meta?.date!==date)throw Error('报告租户、渠道或日期不一致');
   if(o?.kind!==(value.displayMode==='private-original'?'real_chat_private_original_analysis':'real_chat_deidentified_analysis')||value.displayMode==='private-original'&&o.evidenceRepresentation!=='original_text_with_transcripts'||!['codex','deepseek'].includes(o.engine)||o.engine==='codex'&&o.apiExecuted!==false||o.engine==='deepseek'&&o.apiExecuted!==true)throw Error('分析引擎来源不完整');
   const key=c+':'+date+':'+(r.meta.revision||1);if(keys.has(key))throw Error('报告修订身份重复');keys.add(key);
   const sessions=new Map();
   for(const s of baseSessions(r)){
    if(sessions.has(s.id))throw Error('会话身份重复');
    if(s.channel&&s.channel!==c||s.tenant&&s.tenant!=='yestar-sz')throw Error('会话超出报告范围');
    const ids=new Set((s.messages||[]).map(m=>m.id||m.messageId));
    if(ids.size!==(s.messages||[]).length||ids.has(undefined))throw Error('会话消息身份缺失或重复');
    for(const d of s.dimensions||[])if((d.evidenceMessageIds||[]).some(id=>!ids.has(id)))throw Error('维度引用了会话之外的证据');
    sessions.set(s.id,ids);
   }
   for(const issue of r.issues||[]){
    if(!sessions.has(issue.sessionId)||(issue.evidenceMessageIds||[]).some(id=>!sessions.get(issue.sessionId).has(id)))throw Error('问题引用了会话之外的证据');
    for(const occurrence of issue.occurrences||[])if(!sessions.has(occurrence.sessionId)||(occurrence.evidenceMessageIds||[]).some(id=>!sessions.get(occurrence.sessionId).has(id)))throw Error('同文案问题引用了会话之外的证据');
   }
  }
  bundle=copy(value);loadError='';loading=false;
  if(!getDates(channel).includes(state.date))state.date=getDates(channel)[0]||'2026-10-20';
  if(root&&state.mode==='real')paint();
  return {ok:true,reports:bundle.reports.length};
 }
 function installPublic(value){
  if(value?.schemaVersion!=='chat-quality-public-demo-v1'||value.tenant!=='yestar-sz'||value.synthetic!==true||!Array.isArray(value.reports))throw Error('合成演示封装不符合导入合同');
  const keys=new Set();
  for(const item of value.reports){
   const r=item.report,o=item.origin,key=item.channel+':'+item.reportDate;
   if(keys.has(key)||!['wecom','wechat'].includes(item.channel)||!['2026-10-19','2026-10-20'].includes(item.reportDate)||r?.synthetic!==true||r.meta?.tenant!=='yestar-sz'||r.meta.channel!==item.channel||r.meta.date!==item.reportDate||o?.kind!=='synthetic_demo'||o.engine!=='none'||o.apiExecuted!==false)throw Error('合成演示身份或来源不一致');keys.add(key);
   const sessions=new Map();
   for(const s of r.sessions||[]){
    const ids=new Set((s.messages||[]).map(m=>m.id||m.messageId));
    if(!s.id||sessions.has(s.id)||ids.size!==(s.messages||[]).length||ids.has(undefined)||s.channel&&s.channel!==item.channel||s.tenant&&s.tenant!=='yestar-sz')throw Error('合成会话身份不一致');
    for(const d of s.dimensions||[])if((d.evidenceMessageIds||[]).some(id=>!ids.has(id)))throw Error('合成维度引用了会话之外的证据');
    sessions.set(s.id,ids);
   }
   for(const issue of r.issues||[]){
    for(const occurrence of [issue,...issue.occurrences||[]])if(!sessions.has(occurrence.sessionId)||(occurrence.evidenceMessageIds||[]).some(id=>!sessions.get(occurrence.sessionId).has(id)))throw Error('合成问题引用了会话之外的证据');
   }
  }
  bundle=copy(value);bundle.displayMode='synthetic-demo';loadError='';loading=false;
  if(!getDates(channel).includes(state.date))state.date=getDates(channel)[0]||'2026-10-20';
  if(root&&state.mode==='real')paint();
  return {ok:true,reports:bundle.reports.length,synthetic:true};
 }
 function load(url){
  if(pending)return pending;
  loading=true;
  const host=window.location?.hostname||'',local=['127.0.0.1','localhost','[::1]'].includes(host),target=url||(local?sourceURL:publicSourceURL);
  const readPublic=()=>fetch(publicSourceURL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('合成演示读取失败（HTTP '+r.status+'）');return r.json();}).then(installPublic);
  pending=(target===publicSourceURL?readPublic():fetch(target,{cache:'no-store'}).then(r=>{if(r.status===404&&target===sourceURL&&!url)return null;if(!r.ok)throw Error(r.status===404?'真实分析结果尚未导入':'真实报告读取失败（HTTP '+r.status+'）');return r.json();}).then(value=>value===null?readPublic():install(value))).catch(error=>{loading=false;loadError=error.message||'报告读取失败';if(root&&state.mode==='real')paint();return{ok:false,error:loadError};}).finally(()=>pending=null);
  return pending;
 }
 function getDates(ch=channel){return [...new Set((bundle?.reports||[]).filter(e=>(e.channel||e.report?.meta?.channel)===ch).map(e=>e.reportDate||e.report.meta.date))].sort().reverse();}
 function getReport(ch,date,revision='latest'){
  const items=(bundle?.reports||[]).filter(e=>(e.channel||e.report?.meta?.channel)===ch&&(e.reportDate||e.report?.meta?.date)===date).sort((a,b)=>(a.report.meta.revision||1)-(b.report.meta.revision||1));
  const item=revision==='latest'?items.at(-1):items.find(e=>String(e.report.meta.revision||1)===String(revision));if(!item)return null;
  return {...copy(item.report),displayMode:bundle.displayMode||'deidentified',origin:copy(item.origin),revisions:items.map(e=>({revision:e.report.meta.revision||1,status:e.report.meta.status,createdAt:e.origin.executedAt}))};
 }
 function filterReport(report,filters={}){
  if(!report)return null;
  const result=copy(report),all=baseSessions(report);result.sessions=all.filter(s=>(!filters.accountId||s.accountId===filters.accountId)&&(!filters.receiverId||(s.receiverId||'unknown')===filters.receiverId));
  if(!filters.accountId&&!filters.receiverId)return result;
  const ids=new Set(result.sessions.map(s=>s.id));result.issues=(report.issues||[]).flatMap(issue=>{
   const occurrences=(issue.occurrences||[{sessionId:issue.sessionId,evidenceMessageIds:issue.evidenceMessageIds||[]}]).filter(o=>ids.has(o.sessionId));
   if(!occurrences.length)return [];
   const first=occurrences[0],baseTitle=issue.baseTitle||issue.title.replace(/（同文案覆盖 \d+ 会话）$/,'');
   return [{...copy(issue),sessionId:first.sessionId,evidenceMessageIds:copy(first.evidenceMessageIds),occurrences:copy(occurrences),occurrenceCount:occurrences.length,baseTitle,title:baseTitle+(occurrences.length>1?'（同文案覆盖 '+occurrences.length+' 会话）':'')}];
  });
  result.intents=(report.intents||[]).filter(i=>ids.has(i.sessionId)).map(copy);
  const sum=(field)=>result.sessions.reduce((n,s)=>n+Number(s[field]??s.metrics?.[field]??0),0);
  const events=result.sessions.flatMap(s=>s.responseEvents||[]).filter(e=>e.ownerDate===report.meta.date);
  const timingProvided=result.sessions.every(s=>Array.isArray(s.responseEvents));
  const timed=new Set(events.filter(e=>e.timeout===true).map(e=>e.sessionId));
  const applicable=new Set(events.map(e=>e.sessionId));
  result.summary={...report.summary,sessions:result.sessions.length,rawMessages:sum('rawBodyMessageCount')||result.sessions.reduce((n,s)=>n+(s.messages||[]).filter(m=>m.scope==='body').length,0),validMessages:null,candidateIssues:result.issues.length,candidateOccurrences:result.issues.reduce((n,i)=>n+(i.occurrences?.length||1),0),confirmedIssues:result.issues.filter(i=>i.reviewStatus==='confirmed').length,riskSessions:new Set(result.issues.flatMap(i=>(i.occurrences||[{sessionId:i.sessionId}]).map(o=>o.sessionId))).size,timeoutEvents:timingProvided?events.filter(e=>e.timeout===true).length:null,timeoutSessions:timingProvided?timed.size:null,applicableSessions:timingProvided?applicable.size:null,unknownTailGroups:timingProvided?events.filter(e=>e.timeout===null).length:null};
  result.coverage={...report.coverage,expected:Number.isFinite(report.coverage?.expected)?result.sessions.filter(s=>s.analysisStatus!=='excluded').length:null,excluded:result.sessions.filter(s=>s.analysisStatus==='excluded').length,success:result.sessions.filter(s=>s.analysisStatus==='success').length,failed:result.sessions.filter(s=>s.analysisStatus==='failed').length,pending:result.sessions.filter(s=>!['success','failed','excluded'].includes(s.analysisStatus)).length,accounts:(report.coverage?.accounts||[]).filter(a=>result.sessions.some(s=>s.accountId===(a.id||a.accountId))),unparsedVoice:result.sessions.reduce((n,s)=>n+(s.messages||[]).filter(m=>m.scope==='body'&&m.type==='voice'&&m.parseStatus!=='complete').length,0),unparsedImage:result.sessions.reduce((n,s)=>n+(s.messages||[]).filter(m=>m.scope==='body'&&m.type==='image'&&m.parseStatus!=='complete').length,0)};
  result.meta.scopeLabel='当前筛选内已采集会话；未提供的发送状态保持未知';
  return result;
 }
 function empty(title,note){return '<div class="qd-empty"><div class="qd-empty-symbol">◷</div><h2>'+esc(title)+'</h2><p>'+esc(note)+'</p>'+btn('重新读取','reload')+'</div>';}
 function sourceSwitch(){return '<div class="qd-demo qr-source"><span>'+(state.mode==='real'?(bundle?.displayMode==='private-original'?'深圳实际会话 · 真实名称与原文 · 本机只读':'深圳实际会话 · 脱敏回算 · 只读报告'):'合成示例 · 本地交互演示')+'</span><div class="qd-actions">'+btn(state.mode==='real'?'查看合成示例':'返回真实报告','source')+'</div></div>';}
 function render(){
  if(!channel||A.tenant!=='yestar-sz')return previous?.render?.()||false;
  if(state.mode==='synthetic'){document.body.classList.remove('qr-report-page');const done=previous?.render?.();const bar=A.node('div','qr-source-return');bar.innerHTML=sourceSwitch();bar.onclick=e=>{if(e.target.closest('[data-real-action=source]')){state.mode='real';render();}};A.$('app').prepend(bar);return done||true;}
  root=A.node('section','qd-page qr-page');A.$('app').replaceChildren(root);
  root.onclick=onClick;if(!bundle&&!loading&&!loadError)load();paint();
  return true;
 }
 function paint(){
  if(!root)return;
  const report=getReport(channel,state.date,state.revision),view=filterReport(report,state);
  const c=view?.coverage||{},o=view?.origin||{};
  const synthetic=view?.synthetic===true;
  document.body.classList.add('qr-report-page');
  root.className='qr-report';
  root.innerHTML='<div class="wrap"><div class="qr-heading"><h1>深圳艺星 '+(channel==='wecom'?'企微':'个微')+'会话质检日报 <select class="qr-date-title" id="qr-date" aria-label="统计日期">'+['2026-10-20','2026-10-19'].map(d=>opt(d,d,state.date)).join('')+'</select></h1></div>'+
   '<div class="sub">'+(synthetic?'合成演示 · '+count(c.success)+' 个示例会话 · 未调用 AI，不代表深圳实际业务结果':'质检范围：深圳已采集单聊 '+count(c.success)+' 会话 ｜ 标准：提示词 '+esc(o.sourcePromptVersion||'v1.4')+' ｜ 生成：'+esc(fmt(o.executedAt||view?.meta.actualFinish)))+'</div>'+
   (view?window.AdminQualityReport.content(view,state):empty(loading?'正在读取真实报告':loadError||'该日期尚未导入真实分析','当前没有可展示的实际分析结果。'))+
   '<details class="qr-report-info"><summary>数据来源与分析说明</summary>'+(synthetic?'<p>此页使用独立合成样例演示已确认的日报与聊天抽屉。没有发布深圳真实会话、完整生产提示词或客户信息。</p><p>'+esc(view?.meta.sourceLabel||'')+'</p>':'<p>深圳实际会话 · 真实名称与原文 · 本机只读。'+esc(view?.meta.sourceLabel||'')+'</p><p>应分析 '+count(c.expected)+' · 已分析 '+count(c.success)+' · 排除系统消息会话 '+count(c.excluded)+' · 待分析 '+count(c.pending)+' · 失败 '+count(c.failed)+'。语音未解析 '+count(c.unparsedVoice)+'，图片未解析 '+count(c.unparsedImage)+'。</p><p>'+esc(view?.meta.scopeLabel||'')+'</p><p>观察截至 '+esc(fmt(view?.meta.observationCutoff))+'；响应时效为已采范围下界，未知尾组不按合格计。历史回算不代表每日自动任务已运行。</p><p>消息数为来源可见消息；发送/撤回状态与实际接待身份未知时保持未知。问题为 AI 候选，尚待人工复核。</p>'+btn('查看合成示例','source'))+'</details></div>';
  root.querySelector('#qr-date').onchange=e=>{state.date=e.target.value;state.revision='latest';state.accountId='';state.receiverId='';paint();};
  if(view)window.AdminQualityReport.bind(root);
 }
 function onClick(e){const b=e.target.closest('[data-real-action]');if(!b)return;e.preventDefault();const action=b.dataset.realAction,id=b.dataset.id;
  if(action==='source'){state.mode='synthetic';render();}else if(action==='reload'){loadError='';load();paint();}else if(action==='tab'){state.tab=id;paint();}else if(action==='session'||action==='evidence')evidence(id,action==='session',b.dataset.sessionId);
 }
 function evidence(id,isSession,selectedSessionId){
  const r=filterReport(getReport(channel,state.date,state.revision),state),issue=isSession?null:r?.issues?.find(i=>i.id===id);
  const occurrence=selectedSessionId?issue?.occurrences?.find(o=>o.sessionId===selectedSessionId):null;
  if(selectedSessionId&&!occurrence)return;
  const s=r?.sessions?.find(s=>s.id===(isSession?id:occurrence?.sessionId||issue?.sessionId));if(!s)return;
  window.AdminQualityChatDrawer.open({report:r,session:s,issue,occurrence,focus:document.activeElement});
 }
 window.AdminViews={...previous,render};
 return {install,installPublic,load,getDates,getReport,filterReport,render,sourceURL,publicSourceURL,get state(){return {...state};},get loaded(){return !!bundle;},get error(){return loadError;}};
})();

