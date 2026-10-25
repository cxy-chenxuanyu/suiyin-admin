/* SPEC-SUIYIN-ADMIN-092@0.2.1 — isolated view-state regression checks.
 * Executes the actual model and view sources in a Node VM with a minimal DOM
 * adapter. No browser, network, real model call or application storage is used.
 * Only the verification result below is written. Layout requires browser QA.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const resultPath=process.env.QUALITY_CHECK_OUTPUT_DIR?path.resolve(process.env.QUALITY_CHECK_OUTPUT_DIR,'view-check.json'):path.join(root,'docs/verification/chat-quality-daily-20261024/view-check.json');
const sourceFiles=['prototype/admin-quality-model.js','prototype/admin-quality-daily.js'];
const checks=[],cases=[];
function save(result){fs.mkdirSync(path.dirname(resultPath),{recursive:true});fs.writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n','utf8');return result;}
function check(name,run){try{run();checks.push({name,ok:true});}catch(error){checks.push({name,ok:false,error:error.message});}}
function fatal(error){save({spec:process.env.QUALITY_CHECK_SPEC || 'SPEC-SUIYIN-ADMIN-092@0.2.1',ok:false,checkedAt:new Date().toISOString(),checks,error:String(error.stack||error).slice(0,6000)});console.error(error.stack||error);process.exitCode=1;}
process.on('uncaughtException',fatal);

// The adapter records generated HTML and event handlers. It does not emulate
// CSS, browser layout, focus, or the HTML parser and makes no claim about them.
class Element {
 constructor(tag='div'){this.tagName=tag;this._html='';this.queries=new Map();this.children=[];this.classList={add(){},remove(){}};}
 set innerHTML(value){this._html=String(value);this.queries.clear();}
 get innerHTML(){return this._html;}
 querySelector(selector){if(!this.queries.has(selector))this.queries.set(selector,new Element(selector));return this.queries.get(selector);}
 querySelectorAll(){return [];}
 replaceChildren(...children){this.children=children;}
 append(...children){this.children.push(...children);}
 addEventListener(){}
}
function environment(channel){
 const storage=new Map(),nodes=new Map();
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const A={tenant:'yestar-sz',route:channel==='wecom'?'wecomQualityDaily':'wechatQualityDaily',esc,node:tag=>new Element(tag),$:id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);}};
 const context={console,Date,Intl,URL,structuredClone,Admin:A,AdminViews:{},location:{origin:'http://local.invalid',href:'http://local.invalid/'},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},addEventListener(){},dispatchEvent(){},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},setTimeout(){},innerWidth:1400};
 context.window=context;context.parent=context;vm.createContext(context);
 for(const file of sourceFiles)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
 const model=context.AdminQualityModel,realGetReport=model.getReport;
 let reportOverride=null,lastReport=null;
 model.getReport=(...args)=>{lastReport=reportOverride?structuredClone(reportOverride):realGetReport(...args);return lastReport;};
 let projectedView=null;
 const realFilter=model.filterReport;
 model.filterReport=(report,filters)=>{projectedView=realFilter(report,filters);return projectedView;};
 context.AdminQualityDaily.render();
 const page=()=>A.$('app').children[0];
 return {
  context,model,storage,
  original:()=>realGetReport('yestar-sz',channel,'2026-10-23','latest'),
  override:report=>{reportOverride=report;},
  scenario:value=>page().querySelector('#qd-scenario').onchange({target:{value}}),
  tab:value=>page().onclick({target:{closest:()=>({disabled:false,dataset:{qaction:'tab',id:value}})},preventDefault(){}}),
  refresh:()=>context.AdminQualityDaily.refresh(),
  view:()=>projectedView,
  originalReturned:()=>lastReport,
  html:()=>page().innerHTML,
  content:()=>page().querySelector('.qd-content').innerHTML
 };
}
function record(name,e){const v=e.view(),c=v.coverage||{};cases.push({name,status:v.meta?.status,late:v.meta?.late??null,actualFinish:v.meta?.actualFinish??null,expected:c.expected??null,success:c.success??null,failed:c.failed??null,pending:c.pending??null,displayedExpected:/应分析会话：未知/.test(e.html())?'unknown':c.expected??null,showsProgress:/qd-progress/.test(e.html()),showsReportMetrics:/qd-cards|qd-table/.test(e.content()),headline:(e.html().match(/<section class="qd-status[^>]*>.*?<strong>(.*?)<\/strong>/s)||[])[1]||null});}

try{
 const wechat=environment('wechat');
 check('baseline is partial with one failed session',()=>{assert.equal(wechat.view().meta.status,'partial');assert.equal(wechat.view().coverage.failed,1);});
 const original=JSON.stringify(wechat.original());
 wechat.scenario('late');
 check('late preserves partial status',()=>assert.equal(wechat.view().meta.status,'partial'));
 check('late preserves incomplete coverage',()=>{assert.equal(wechat.view().coverage.expected,8);assert.equal(wechat.view().coverage.success,7);assert.equal(wechat.view().coverage.failed,1);});
 check('late does not manufacture a partial finish time',()=>assert.equal(wechat.view().meta.actualFinish,null));
 check('partial title remains distinct from late badge',()=>{assert.match(wechat.html(),/<strong>部分完成<\/strong>/);assert.match(wechat.html(),/qd-badge warn[^>]*>超过 08:00 目标时间/);});
 check('scenario projection does not mutate original report',()=>assert.equal(JSON.stringify(wechat.original()),original));
 record('wechat late remains partial',wechat);

 wechat.scenario('empty');
 check('empty has consistent empty status and zero counts',()=>{const r=wechat.view();assert.equal(r.meta.status,'empty');for(const key of ['expected','success','failed','pending','unparsedVoice','unparsedImage'])assert.equal(r.coverage[key],0,key);assert.equal(r.summary.sessions,0);assert.equal(r.sessions.length,0);assert.equal(r.issues.length,0);});
 check('empty clears stale late flag and has completion metadata',()=>{const m=wechat.view().meta;assert.equal(m.late,false);assert.equal(m.actualStart,m.plannedStart);assert.equal(m.actualFinish,m.targetFinish);assert.ok(Number.isFinite(Date.parse(m.actualFinish)));});
 check('empty header and content agree',()=>{assert.match(wechat.html(),/<strong>采集完整 · 无数据<\/strong>/);assert.match(wechat.content(),/采集完整，当日无有效消息/);assert.doesNotMatch(wechat.html(),/超过 08:00 目标时间/);assert.doesNotMatch(wechat.content(),/读取失败|生成失败/);});
 record('wechat complete collection with no data',wechat);

 wechat.scenario('failed');
 check('failure projection accounts for every failed session',()=>{const r=wechat.view();assert.equal(r.meta.status,'failed');assert.equal(r.coverage.success,0);assert.equal(r.coverage.failed,r.coverage.expected);assert.equal(r.meta.actualFinish,null);});
 check('failure projection clears inherited late flag',()=>assert.equal(wechat.view().meta.late,false));
 check('failure heading is generation failure',()=>{assert.match(wechat.html(),/<strong>生成失败<\/strong>/);assert.match(wechat.content(),/本渠道生成失败/);});
 record('wechat failed projection',wechat);

 const lateFailure=wechat.original();lateFailure.meta.status='failed';lateFailure.meta.late=true;lateFailure.meta.actualFinish=null;lateFailure.sessions.forEach(s=>s.analysisStatus='failed');lateFailure.issues=[];
 wechat.override(lateFailure);wechat.scenario('auto');
 check('actual failure title survives an independent late flag',()=>{assert.match(wechat.html(),/<strong>生成失败<\/strong>/);assert.match(wechat.html(),/qd-badge warn[^>]*>超过 08:00 目标时间/);assert.match(wechat.content(),/本渠道生成失败/);assert.doesNotMatch(wechat.html(),/<strong>超过 08:00/);});
 record('actual failed report is also late',wechat);

 const wecom=environment('wecom');wecom.scenario('late');
 check('late completed report preserves completed status',()=>{assert.equal(wecom.view().meta.status,'completed');assert.equal(wecom.view().coverage.success,wecom.view().coverage.expected);assert.equal(wecom.view().meta.actualFinish,'2026-10-24T08:30:00+08:00');});
 check('completed late report shows separate status and time badge',()=>{assert.match(wecom.html(),/<strong>报告已完成<\/strong>/);assert.match(wecom.html(),/qd-badge warn[^>]*>超过 08:00 目标时间/);});
 record('wecom completed report is late',wecom);

 for(const channel of ['wecom','wechat']){
  const e=environment(channel);
  for(const [scenario,title,body] of [['unconnected','本渠道尚未接入','渠道尚未接入，暂无可分析数据'],['unsynced','工作号采集不完整','采集不完整，暂不能生成完整日报']]){
   e.scenario(scenario);
   check(channel+' '+scenario+' has its own status and explanation',()=>{assert.ok(e.html().includes('<strong>'+title+'</strong>'));assert.ok(e.content().includes(body));assert.doesNotMatch(e.content(),/采集完整，当日无有效消息/);});
   check(channel+' '+scenario+' shows unknown expected count without progress',()=>{assert.match(e.html(),/应分析会话：未知/);assert.doesNotMatch(e.html(),/qd-progress|<progress|<strong>报告已完成<\/strong>|<strong>采集完整 · 无数据<\/strong>/);});
   check(channel+' '+scenario+' keeps all report tabs free of metrics',()=>{for(const tab of ['overview','intent','staff','issues','risk','business','standards']){e.tab(tab);assert.ok(e.content().includes(body),tab);assert.doesNotMatch(e.content(),/qd-cards|qd-table|有效日会话|有效消息|待复核候选问题|客户意向分布/,tab);}});
   record(channel+' '+scenario+' has unknown coverage',e);
  }
  e.storage.set('admin-quality:v1:yestar-sz:'+channel,'{');
  for(const scenario of ['empty','late','failed','generating','partial','unconnected','unsynced']){
   e.scenario(scenario);
   check(channel+' read error survives '+scenario+' projection',()=>{const r=e.view();assert.equal(r.meta.status,'error');assert.equal(r.summary,null);assert.equal(r.coverage,null);assert.match(e.html(),/<strong>本地演示记录读取失败<\/strong>/);assert.match(e.content(),/本地记录读取失败/);assert.doesNotMatch(e.content(),/采集完整，当日无有效消息|本渠道生成失败|正在分析昨日会话|渠道尚未接入，暂无可分析数据|采集不完整，暂不能生成完整日报/);assert.doesNotMatch(e.html(),/qd-progress/);});
   record(channel+' read error with '+scenario+' selected',e);
  }
  check(channel+' corrupt source is not silently overwritten',()=>assert.equal(e.storage.get('admin-quality:v1:yestar-sz:'+channel),'{'));
 }
 const result=save({spec:process.env.QUALITY_CHECK_SPEC || 'SPEC-SUIYIN-ADMIN-092@0.2.1',ok:checks.every(c=>c.ok),checkedAt:new Date().toISOString(),checkCount:checks.length,passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length,baselineRevision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),nodeVersion:process.version,files:sourceFiles.map(file=>({path:file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),scope:'Actual model and daily view executed in an isolated Node VM with a minimal DOM adapter; covers scenario events, report projection, generated headings and content branches. Not browser/layout/accessibility validation.',checks,cases});
 console.log(JSON.stringify({ok:result.ok,checks:result.checkCount,passed:result.passed,failed:result.failed,resultFile:resultPath,failures:checks.filter(c=>!c.ok)}));
 if(!result.ok)process.exitCode=1;
}catch(error){fatal(error);}
