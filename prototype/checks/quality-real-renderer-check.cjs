/* Current report presentation + PC evidence drawer regression.
 * Synthetic fixtures only; no private input, browser, HTTP or storage writes.
 * Replaces the pre-redesign qr-account/filter-dialog expectations with the approved
 * seven modules, module-local search, and the read-only right-hand PC chat drawer.
 */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.QUALITY_JSDOM_ROOT||'E:/dev/suiyin-insights/node_modules/jsdom');
const repo=path.resolve(__dirname,'../..'),results=[],sources=['admin-quality-report.js','admin-quality-pc-messages.js','admin-quality-chat-drawer.js','admin-quality-real.js'];
const copy=v=>structuredClone(v),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const check=(name,fn)=>{try{fn();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:'Assertion failed; fixture diagnostics only',code:error.code||error.name});}};
function message(id,seq,direction,type,text){return {id,seq,at:'2026-10-20T12:0'+seq+':00+08:00',direction,type,text,scope:'body',status:'unknown',actualOperatorId:null,parseStatus:type==='image'?'unparsed':'complete',representation:type==='voice'?'voice_transcript':'original_text'};}
function fixture(){
 const m1=message('m-one',1,'customer','text','测试原文 <script>test()</script>\n第二行'),m2=message('m-two',2,'staff','voice','测试转写'),m3=message('m-three',3,'customer','image','[图片]');
 const s={id:'s-one',tenant:'yestar-sz',channel:'wechat',accountId:'a-one',accountName:'测试人设 <b>A</b>',customerName:'测试备注 <b>C</b>',customerNickname:'测试昵称',customerRemark:'测试备注',receiverId:null,receiverName:'事发接待未知',analysisStatus:'success',sourceIntentLevel:'有效二级',rawBodyMessageCount:3,messages:[m1,m2,m3],dimensions:[{id:1,name:'测试维度',applicability:'unknown',evidenceStatus:'insufficient',conclusion:'insufficient',evidenceMessageIds:['m-one'],explanation:'保存的结论 <img src=x>'}]};
 const s2={...copy(s),id:'s-two',accountId:'a-two',accountName:'第二个测试工作号',customerName:'第二个测试客户',sourceIntentLevel:'未判定',rawBodyMessageCount:1,messages:[message('m-other',1,'customer','text','第二会话测试原文')],dimensions:[]};
 const excluded={...copy(s2),id:'s-excluded',customerName:'系统占位客户',analysisStatus:'excluded',messages:[message('m-system',1,'system','notify','系统测试事件')]};
 const issue={id:'issue-shared',sessionId:s.id,dimension:'测试维度',dimensionId:1,baseTitle:'重复素材候选',title:'重复素材候选（同文案覆盖 2 会话）',explanation:'AI 摘要 <script>test()</script>',risk:'low',severity:'轻微',reviewStatus:'pending',evidenceMessageIds:['m-one'],occurrenceCount:2,occurrences:[{sessionId:s.id,evidenceMessageIds:['m-one']},{sessionId:s2.id,evidenceMessageIds:['m-other']}]};
 return {schemaVersion:'chat-quality-real-bundle-v1',tenant:'yestar-sz',displayMode:'private-original',localOnly:true,notForPublication:true,deidentified:false,reports:[{channel:'wechat',reportDate:'2026-10-20',origin:{kind:'real_chat_private_original_analysis',engine:'codex',apiExecuted:false,evidenceRepresentation:'original_text_with_transcripts',sourcePromptVersion:'v1.4',executedAt:'2026-10-24T12:00:00+08:00'},report:{synthetic:false,meta:{tenant:'yestar-sz',channel:'wechat',date:'2026-10-20',revision:1,status:'completed',sourceLabel:'Codex 会话分析；未调用 DeepSeek',observationCutoff:'2026-10-21T04:00:00+08:00'},coverage:{expected:2,success:2,excluded:1,failed:0,pending:0,accounts:[],unparsedVoice:0,unparsedImage:1},summary:{sessions:3,rawMessages:5,validMessages:null,timeoutSessions:null,applicableSessions:null},sessions:[s,s2,excluded],issues:[issue],standards:[{id:1,name:'测试维度',description:'测试口径'}],intents:[],staff:[],business:[],snapshot:{rules:{slaMinutes:20,deepTalkSpeechThreshold:5,customerBurstMinutes:5},templateContent:'合成测试提示词'}}}]};
}
function context(){
 const errors=[],fetches=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error.name));
 const dom=new JSDOM('<!doctype html><body style="overflow:auto"><main id="app" style="color:teal"></main></body>',{url:'http://127.0.0.1:8766/admin.html?tenant=yestar-sz&route=wechatQualityDaily',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 const w=dom.window;let writes=0,previous=0;
 w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='true';};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 Object.defineProperty(w,'localStorage',{value:{getItem(){return null;},setItem(){writes++;throw Error('Storage write forbidden');},removeItem(){writes++;throw Error('Storage write forbidden');}}});
 w.fetch=async url=>{fetches.push(String(url));return {ok:false,status:404};};
 w.Admin={tenant:'yestar-sz',route:'wechatQualityDaily',esc,$:id=>w.document.getElementById(id),node(tag,cls,text){const n=w.document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}};
 w.AdminViews={render(){previous++;w.Admin.$('app').innerHTML='<p>合成示例旧入口</p>';return true;}};
 for(const file of sources)w.eval(fs.readFileSync(path.join(repo,'prototype',file),'utf8'));
 return {dom,w,errors,fetches,get writes(){return writes;},get previous(){return previous;}};
}
(async()=>{
 const c=context(),{w}=c,M=w.AdminQualityReal,d=w.document,p=fixture(),item=p.reports[0];
 const reject=(name,mutate)=>check(name,()=>{const bad=copy(p);mutate(bad);assert.throws(()=>M.install(bad));});
 reject('reject wrong tenant',v=>v.tenant='other');
 reject('reject inconsistent report channel',v=>v.reports[0].report.meta.channel='wecom');
 reject('reject out-of-scope date',v=>v.reports[0].reportDate=v.reports[0].report.meta.date='2026-10-21');
 reject('reject fabricated Codex API execution',v=>v.reports[0].origin.apiExecuted=true);
 reject('reject false DeepSeek execution',v=>v.reports[0].origin.engine='deepseek');
 reject('reject duplicate revisions',v=>v.reports.push(copy(v.reports[0])));
 reject('reject duplicate session identity',v=>v.reports[0].report.sessions.push(copy(v.reports[0].report.sessions[0])));
 reject('reject duplicate message identity',v=>v.reports[0].report.sessions[0].messages.push(copy(v.reports[0].report.sessions[0].messages[0])));
 reject('reject cross-session dimension evidence',v=>v.reports[0].report.sessions[0].dimensions[0].evidenceMessageIds=['m-other']);
 reject('reject cross-session issue evidence',v=>v.reports[0].report.issues[0].evidenceMessageIds=['m-other']);
 reject('reject cross-session occurrence evidence',v=>v.reports[0].report.issues[0].occurrences[1].evidenceMessageIds=['m-one']);
 reject('reject private mode without local-only flag',v=>v.localOnly=false);
 check('install validated private-original fixture',()=>assert.equal(M.install(p).reports,1));
 check('import does not fetch or persist',()=>{assert.equal(c.fetches.length,0);assert.equal(c.writes,0);});
 check('available dates and absent-date stay separate',()=>{assert.equal(JSON.stringify(M.getDates('wechat')),JSON.stringify(['2026-10-20']));assert.equal(M.getReport('wechat','2026-10-19'),null);});
 check('getReport returns detached records',()=>{const r=M.getReport('wechat','2026-10-20');r.sessions[0].dimensions[0].conclusion='changed';assert.equal(M.getReport('wechat','2026-10-20').sessions[0].dimensions[0].conclusion,'insufficient');});
 const r=M.getReport('wechat','2026-10-20'),filtered=M.filterReport(r,{accountId:'a-two'});
 check('account projection retains member issue evidence',()=>{assert.equal(filtered.issues.length,1);assert.equal(filtered.issues[0].sessionId,'s-two');assert.equal(filtered.issues[0].evidenceMessageIds[0],'m-other');assert.equal(filtered.issues[0].occurrenceCount,1);assert.equal(filtered.issues[0].title,'重复素材候选');});
 check('projection excludes system-only denominator and deduplicates risk sessions',()=>{assert.equal(filtered.coverage.expected,1);assert.equal(filtered.coverage.excluded,1);assert.equal(filtered.summary.riskSessions,1);assert.equal(filtered.summary.timeoutSessions,null);});
 check('projection does not mutate source membership',()=>assert.equal(r.issues[0].occurrences.length,2));
 check('unknown coverage and response metrics remain unknown',()=>{const u=copy(r);u.coverage.expected=null;const v=M.filterReport(u,{accountId:'a-one'});assert.equal(v.coverage.expected,null);assert.equal(v.summary.applicableSessions,null);});
 check('presentation excludes system-only intent and preserves actual unknown',()=>{const a=w.AdminQualityReport.analyze(r);assert.equal(a.total,2);assert.equal(a.unknown,1);assert.equal(a.levels[1],1);});
 check('real page renders seven modules and selected date',()=>{assert.equal(M.render(),true);assert.equal(d.querySelectorAll('[role="tab"]').length,7);assert.equal(d.querySelector('#qr-date').value,'2026-10-20');});
 check('removed top-level filters remain absent',()=>{assert.equal(d.querySelector('.qr-options'),null);assert.equal(d.querySelector('#qr-account'),null);});
 check('private status and unknown provenance visible',()=>{assert.match(d.body.textContent,/本机只读/);assert.match(d.body.textContent,/Codex/);assert.match(d.body.textContent,/实际接待身份未知/);});
 const clickTab=id=>d.querySelector('[role="tab"][data-id="'+id+'"]').click();
 for(const id of ['overview','intent','staff','issues','risk','business','standards'])check('module '+id+' renders',()=>{clickTab(id);assert.equal(d.querySelector('[role="tab"][aria-selected="true"]').dataset.id,id);assert.ok(d.querySelector('[role="tabpanel"]'));});
 clickTab('intent');
 check('intent details omit excluded session',()=>{assert.equal(d.querySelector('[data-real-action="session"][data-id="s-excluded"]'),null);assert.match(d.body.textContent,/未判定 1 个/);assert.match(d.body.textContent,/系统消息会话不参与意向分级/);});
 check('module-local search filters and restores rows',()=>{const area=[...d.querySelectorAll('.qr-search-area')].at(-1),input=area.querySelector('.qr-list-search');input.value='no-matching-fixture';input.dispatchEvent(new w.Event('input'));assert.ok([...area.querySelectorAll('[data-qr-search-row]')].every(row=>row.hidden));input.value='';input.dispatchEvent(new w.Event('input'));assert.equal([...area.querySelectorAll('[data-qr-search-row]')].filter(row=>!row.hidden).length,2);});
 clickTab('issues');
 const evidence=[...d.querySelectorAll('[data-real-action="evidence"]')].find(b=>b.dataset.sessionId==='s-one');
 check('issue entry exists for occurrence',()=>assert.ok(evidence));
 const appStyle=d.getElementById('app').style.cssText; evidence?.click();await new Promise(resolve=>setImmediate(resolve));
 check('evidence opens right-hand PC drawer',()=>{assert.equal(w.AdminQualityChatDrawer.isOpen,true);assert.ok(d.querySelector('dialog.qr-chat-drawer[open] .qr-pc-chat'));});
 check('issue highlights only linked messages',()=>{assert.equal(d.querySelectorAll('.qr-chat-drawer .qr-pc-message').length,3);assert.equal(d.querySelectorAll('.qr-chat-drawer [data-highlighted="true"]').length,1);assert.equal(d.querySelector('.qr-chat-drawer [data-highlighted="true"]').dataset.messageId,'m-one');});
 check('customer left and staff right templates retained',()=>{assert.ok(d.querySelector('[data-message-id="m-one"].is-received'));assert.ok(d.querySelector('[data-message-id="m-two"].is-sent'));});
 check('raw evidence escapes markup and preserves newline',()=>{assert.equal(d.querySelector('.qr-chat-drawer script'),null);assert.equal(d.querySelector('.qr-pc-text').textContent,item.report.sessions[0].messages[0].text);});
 check('AI summary separate and escaped',()=>{assert.match(d.querySelector('.qr-chat-details').textContent,/AI 分析摘要/);assert.equal(d.querySelector('.qr-chat-details script'),null);assert.match(d.querySelector('.qr-chat-details').textContent,/AI 摘要 <script>/);});
 check('voice transcript and saved conclusions collapse by default',()=>{assert.ok(d.querySelector('details.qr-pc-transcript'));assert.equal(d.querySelector('details.qr-pc-transcript').open,false);assert.equal(d.querySelector('.qr-chat-details').open,false);assert.match(d.querySelector('.qr-chat-details').textContent,/各项保存结论（1项）/);});
 check('missing media and identity are explicit without fake playback or portraits',()=>{const drawer=d.querySelector('.qr-chat-drawer');assert.equal(drawer.querySelectorAll('audio,video,iframe').length,0);assert.equal(drawer.querySelectorAll('img.qr-pc-avatar').length,0);assert.match(drawer.textContent,/原始媒体未取得/);assert.match(drawer.textContent,/实际操作人未知|事发接待未知/);});
 check('optional local supplement failure leaves imported messages',()=>{assert.ok(c.fetches.every(url=>url===w.AdminQualityChatDrawer.viewURL));assert.equal(d.querySelectorAll('.qr-chat-drawer .qr-pc-message').length,3);});
 w.AdminQualityChatDrawer.close();
 check('closing drawer restores page and focus',()=>{assert.equal(d.querySelector('.qr-chat-drawer'),null);assert.equal(d.body.style.overflow,'auto');assert.equal(d.getElementById('app').style.cssText,appStyle);assert.equal(d.body.classList.contains('qr-chat-open'),false);});
 const second=[...d.querySelectorAll('[data-real-action="evidence"]')].find(b=>b.dataset.sessionId==='s-two');second?.click();await new Promise(resolve=>setImmediate(resolve));
 check('second occurrence opens only its own conversation',()=>{assert.ok(second);assert.equal(d.querySelectorAll('.qr-chat-drawer .qr-pc-message').length,1);assert.equal(d.querySelector('.qr-chat-drawer [data-highlighted="true"]').dataset.messageId,'m-other');});
 w.dispatchEvent(new w.Event('pagehide'));
 check('page hide closes evidence',()=>assert.equal(w.AdminQualityChatDrawer.isOpen,false));
 clickTab('intent');d.querySelector('[data-real-action="session"][data-id="s-one"]').click();await new Promise(resolve=>setImmediate(resolve));
 check('conversation entry retains complete imported evidence without issue highlight',()=>{assert.equal(d.querySelectorAll('.qr-chat-drawer .qr-pc-message').length,3);assert.equal(d.querySelectorAll('.qr-chat-drawer [data-highlighted="true"]').length,0);});
 w.AdminQualityChatDrawer.close();
 check('readonly rendering has no storage writes or jsdom errors',()=>{assert.equal(c.writes,0);assert.equal(c.errors.length,0);});
 c.dom.window.close();
 const out=process.env.QUALITY_CHECK_OUTPUT_DIR||path.join(repo,'docs/verification/chat-quality-release-20261025');fs.mkdirSync(out,{recursive:true});
 const receipt={spec:process.env.QUALITY_CHECK_SPEC||'SPEC-SUIYIN-ADMIN-092@0.3.3',checkedAt:new Date().toISOString(),ok:results.every(r=>r.ok),checks:results.length,passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,sourceSha256:Object.fromEntries(sources.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,'prototype',file))).digest('hex')])),scope:'JSDOM synthetic fixtures; fetch stub only; no private input, HTTP, model/API calls or storage writes',results};
 fs.writeFileSync(path.join(out,'real-renderer-check.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({...receipt,results:results.filter(r=>!r.ok)},null,2));if(!receipt.ok)process.exitCode=1;
})().catch(error=>{console.error(JSON.stringify({ok:false,error:'Fixture harness failed',code:error.code||error.name}));process.exitCode=1;});
