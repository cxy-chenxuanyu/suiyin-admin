/* Public-demo import, loopback fallback and read-only drawer isolation. No HTTP. */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.QUALITY_JSDOM_ROOT||'E:/dev/suiyin-insights/node_modules/jsdom');
const repo=path.resolve(__dirname,'../..'),results=[],files=['admin-quality-report.js','admin-quality-pc-messages.js','admin-quality-chat-drawer.js','admin-quality-real.js'],data=fs.readFileSync(path.join(repo,'prototype/data/quality-public-demo.json')),bundle=JSON.parse(data);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function check(name,fn){try{fn();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:'Assertion failed',code:error.code||error.name});}}
function make(url,channel='wechat',responder){
 const calls=[],errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.name));
 const dom=new JSDOM('<!doctype html><body><main id="app"></main></body>',{url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
 w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.Admin={tenant:'yestar-sz',route:channel+'QualityDaily',esc,$:id=>w.document.getElementById(id),node(tag,cls,text){const el=w.document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}};
 w.AdminViews={render:()=>true};w.fetch=async target=>{calls.push(String(target));return responder?responder(String(target)):{ok:false,status:404};};
 for(const f of files)w.eval(fs.readFileSync(path.join(repo,'prototype',f),'utf8'));
 return {w,dom,calls,errors,M:w.AdminQualityReal};
}
const response=(status,value)=>({ok:status===200,status,json:async()=>structuredClone(value)}),PUBLIC='data/quality-public-demo.json',PRIVATE='data/private/quality-real-yestar-sz-20261019-20.json';
(async()=>{
 check('public artifact has independent synthetic provenance',()=>{assert.equal(bundle.schemaVersion,'chat-quality-public-demo-v1');assert.equal(bundle.synthetic,true);assert.notEqual(bundle.displayMode,'private-original');assert.equal(bundle.reports.length,4);for(const {origin,report} of bundle.reports){assert.equal(origin.kind,'synthetic_demo');assert.equal(origin.engine,'none');assert.equal(origin.apiExecuted,false);assert.equal(origin.executedAt,null);assert.equal(report.synthetic,true);assert.ok(report.sessions.every(s=>s.synthetic===true));}});
 const c=make('https://demo.example.test/admin.html'),M=c.M;
 const reject=(name,change)=>check(name,()=>{const value=structuredClone(bundle);change(value);assert.throws(()=>M.installPublic(value));});
 reject('reject private schema at public entry',b=>b.schemaVersion='chat-quality-real-bundle-v1');
 reject('reject false synthetic claim',b=>b.synthetic=false);
 reject('reject cross-tenant public bundle',b=>b.tenant='other');
 reject('reject real analysis engine in public source',b=>b.reports[0].origin.engine='codex');
 reject('reject fabricated public API execution',b=>b.reports[0].origin.apiExecuted=true);
 reject('reject real origin kind',b=>b.reports[0].origin.kind='real_chat_private_original_analysis');
 reject('reject non-synthetic report',b=>b.reports[0].report.synthetic=false);
 reject('reject duplicated channel date',b=>b.reports.push(structuredClone(b.reports[0])));
 reject('reject cross-channel report',b=>b.reports[0].report.meta.channel='wechat');
 reject('reject foreign report date',b=>b.reports[0].reportDate=b.reports[0].report.meta.date='2026-10-21');
 reject('reject cross-tenant session',b=>b.reports[0].report.sessions[0].tenant='other');
 reject('reject duplicate public message',b=>{const s=b.reports[0].report.sessions[0];s.messages.push(structuredClone(s.messages[0]));});
 reject('reject dimension evidence outside conversation',b=>b.reports[0].report.sessions[0].dimensions.push({evidenceMessageIds:['foreign-evidence']}));
 reject('reject issue evidence outside conversation',b=>b.reports[0].report.issues[0].evidenceMessageIds=['foreign-evidence']);
 reject('reject occurrence evidence outside conversation',b=>b.reports[0].report.issues[0].occurrences=[{sessionId:b.reports[0].report.sessions[0].id,evidenceMessageIds:['foreign-evidence']}]);
 check('valid public artifact accepted without fetch',()=>{assert.equal(M.installPublic(bundle).reports,4);assert.equal(c.calls.length,0);});
 c.dom.window.close();
 for(const channel of ['wecom','wechat']){
  const x=make('https://demo.example.test/admin.html',channel,url=>response(200,bundle));await x.M.load();
  check(channel+' remote default requests public bundle only',()=>assert.deepEqual(x.calls,[PUBLIC]));
  for(const date of ['2026-10-19','2026-10-20']){
   x.M.render();const select=x.w.document.querySelector('#qr-date');select.value=date;select.dispatchEvent(new x.w.Event('change'));
   check(channel+' '+date+' public page keeps seven modules and synthetic labels',()=>{assert.equal(x.w.document.querySelectorAll('[role="tab"]').length,7);assert.match(x.w.document.querySelector('.sub').textContent,/合成演示/);assert.match(x.w.document.querySelector('.sub').textContent,/未调用 AI/);assert.doesNotMatch(x.w.document.querySelector('.sub').textContent,/Codex|DeepSeek|质检范围：深圳已采集/);});
   const r=x.M.getReport(channel,date),issue=r.issues[0],session=r.sessions.find(s=>s.id===issue.sessionId),count=x.calls.length;
   check(channel+' '+date+' synthetic issue opens PC drawer',()=>{assert.equal(x.w.AdminQualityChatDrawer.open({report:r,session,issue}),true);assert.ok(x.w.document.querySelector('.qr-chat-drawer .qr-pc-chat'));assert.match(x.w.document.querySelector('.qr-chat-source').textContent,/合成演示/);});
   await new Promise(resolve=>setImmediate(resolve));
   check(channel+' '+date+' synthetic drawer never requests private sidecar',()=>assert.equal(x.calls.length,count));
   x.w.AdminQualityChatDrawer.close();
  }
  check(channel+' public DOM has no script errors',()=>assert.equal(x.errors.length,0));x.dom.window.close();
 }
 for(const host of ['127.0.0.1','localhost','[::1]']){
  const x=make('http://'+host+':8766/admin.html','wechat',url=>url===PRIVATE?response(404):response(200,bundle));const result=await x.M.load();
  check(host+' local missing private bundle falls back to public',()=>{assert.equal(result.ok,true);assert.deepEqual(x.calls,[PRIVATE,PUBLIC]);assert.equal(x.M.getReport('wechat','2026-10-20').synthetic,true);});x.dom.window.close();
 }
 const privateFixture=structuredClone(bundle);privateFixture.schemaVersion='chat-quality-real-bundle-v1';privateFixture.displayMode='private-original';privateFixture.deidentified=false;privateFixture.localOnly=true;
 for(const e of privateFixture.reports){e.report.synthetic=false;e.origin={kind:'real_chat_private_original_analysis',engine:'codex',apiExecuted:false,evidenceRepresentation:'original_text_with_transcripts'};}
 const preferred=make('http://127.0.0.1:8766/admin.html','wechat',url=>response(200,privateFixture));await preferred.M.load();
 check('local valid private import takes priority',()=>{assert.deepEqual(preferred.calls,[PRIVATE]);assert.equal(preferred.M.getReport('wechat','2026-10-20').synthetic,false);});preferred.dom.window.close();
 for(const status of [403,500]){const x=make('http://localhost:8766/admin.html','wechat',url=>response(status));const result=await x.M.load();check('private HTTP '+status+' is not hidden by public success',()=>{assert.equal(result.ok,false);assert.deepEqual(x.calls,[PRIVATE]);assert.equal(x.M.loaded,false);});x.dom.window.close();}
 const explicit=make('http://localhost:8766/admin.html','wechat',url=>response(404));const result=await explicit.M.load(PRIVATE);
 check('explicit private URL failure never silently falls back',()=>{assert.equal(result.ok,false);assert.deepEqual(explicit.calls,[PRIVATE]);});explicit.dom.window.close();
 const out=process.env.QUALITY_CHECK_OUTPUT_DIR||path.join(repo,'docs/verification/chat-quality-release-20261025');fs.mkdirSync(out,{recursive:true});
 const receipt={spec:process.env.QUALITY_CHECK_SPEC||'SPEC-SUIYIN-ADMIN-092@0.3.3',checkedAt:new Date().toISOString(),ok:results.every(r=>r.ok),checks:results.length,passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,publicBundleSha256:crypto.createHash('sha256').update(data).digest('hex'),sourceSha256:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,'prototype',f))).digest('hex')])),scope:'JSDOM with in-memory fetch responses. No HTTP, private input, Chrome, model/API or production activity.',results};
 fs.writeFileSync(path.join(out,'public-demo-check.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({...receipt,results:results.filter(r=>!r.ok)},null,2));if(!receipt.ok)process.exitCode=1;
})().catch(error=>{console.error(JSON.stringify({ok:false,error:'Public fixture harness failed',code:error.code||error.name}));process.exitCode=1;});
