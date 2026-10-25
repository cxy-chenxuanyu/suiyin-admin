#!/usr/bin/env node
'use strict';
// Local prompt deletion regression: in-memory VM only; no browser/storage/API writes.
// Run: node prototype/checks/quality-daily-prompt-delete-check.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync(path.resolve(__dirname,'../admin-quality-model.js'),'utf8');
const tenant='yestar-sz',prefix='admin-quality:v1:',results=[];
function check(name,run){try{run();results.push({name,ok:true});}catch(_){results.push({name,ok:false});}}
function key(channel){return prefix+tenant+':'+channel;}
function env(existing){
 const storage=existing||new Map(),events=[];let failWrites=false,networkCalls=0,writes=0;
 const context={Date,JSON,Intl,URL,console,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(failWrites)throw Error('quota');writes++;storage.set(k,String(v));}},document:{dispatchEvent:e=>events.push(e.detail)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},addEventListener(){},fetch(){networkCalls++;throw Error('network forbidden');}};
 context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'admin-quality-model.js'});
 return {M:context.AdminQualityModel,storage,events,get writes(){return writes;},get networkCalls(){return networkCalls;},fail:()=>{failWrites=true;}};
}
function seed(e){
 const M=e.M;assert.equal(M.saveModelConfig(tenant,'deepseek-existing',{displayName:'Shared model regression fixture'}).ok,true);
 for(const ch of ['wecom','wechat']){assert(M.savePrompt(tenant,ch,{content:'Local regression fixture for '+ch,enabled:true,modelId:'deepseek-existing'}).ok);assert(M.trialPrompt(tenant,ch).ok);assert(M.publishPrompt(tenant,ch).ok);}
 assert(M.saveRulesDraft(tenant,{responseMinutes:25}).ok);for(const ch of ['wecom','wechat'])assert(M.trialRules(tenant,ch).ok);assert(M.publishRules(tenant).ok);
 for(const ch of ['wecom','wechat']){assert(M.trialRules(tenant,ch).ok);assert(M.rerun(tenant,ch,M.yesterday(),{requestId:'saved-history-'+ch}).ok);}
 e.storage.set('admin-prompt-templates:v1:'+tenant,'legacy-template-storage-sentinel');
}
for(const channel of ['wecom','wechat']){
 const e=env();seed(e);const M=e.M,other=channel==='wecom'?'wechat':'wecom';
 const before=JSON.parse(e.storage.get(key(channel))),otherBefore=e.storage.get(key(other)),rulesBefore=e.storage.get(key('shared')),catalogBefore=e.storage.get(key('models')),reportBefore=JSON.stringify(M.getReport(tenant,channel,M.yesterday())),ruleVersion=M.getRules(tenant).version,version=M.getConfig(tenant,channel).published.version;
 let deleted;
 check(channel+' delete succeeds',()=>{deleted=M.deletePrompt(tenant,channel);assert(deleted.ok);assert.equal(deleted.deleted,true);});
 check(channel+' one stable tombstone retained',()=>{assert(e.storage.has(key(channel)));assert.equal(JSON.parse(e.storage.get(key(channel))).deleted,true);});
 check(channel+' exposed missing state',()=>{const c=M.getConfig(tenant,channel);assert.equal(c.deleted,true);assert.equal(c.error,'template_missing');assert.equal(c.enabled,false);assert.equal(c.templateId,before.templateId);assert.equal(c.scene,before.scene);});
 check(channel+' both prompt states disabled and trial removed',()=>{const c=JSON.parse(e.storage.get(key(channel)));assert.equal(c.draft.enabled,false);assert.equal(c.published.enabled,false);assert.equal(c.trial,null);});
 check(channel+' content versions bindings retained',()=>{const c=JSON.parse(e.storage.get(key(channel)));for(const field of ['content','version','modelId','effectiveAt']){assert.deepEqual(c.draft[field],before.draft[field]);assert.deepEqual(c.published[field],before.published[field]);}assert.equal(M.getConfig(tenant,channel).published.version,version);});
 check(channel+' persisted historical reports and receipts retained',()=>{const c=JSON.parse(e.storage.get(key(channel)));assert.deepEqual(c.reports,before.reports);assert.deepEqual(c.requestReceipts,before.requestReceipts);});
 check(channel+' history remains readable unchanged',()=>assert.equal(JSON.stringify(M.getReport(tenant,channel,M.yesterday())),reportBefore));
 check(channel+' sibling channel unchanged',()=>assert.equal(e.storage.get(key(other)),otherBefore));
 check(channel+' shared rules unchanged',()=>{assert.equal(e.storage.get(key('shared')),rulesBefore);assert.equal(M.getRules(tenant).version,ruleVersion);assert.equal(M.getRules(tenant).current.responseMinutes,25);});
 check(channel+' shared model unchanged',()=>assert.equal(e.storage.get(key('models')),catalogBefore));
 check(channel+' ordinary template storage unchanged',()=>assert.equal(e.storage.get('admin-prompt-templates:v1:'+tenant),'legacy-template-storage-sentinel'));
 check(channel+' shared projections omit deleted channel',()=>{const rules=M.getRules(tenant);assert(!rules.enabledChannels.includes(channel));assert(rules.enabledChannels.includes(other));assert.equal(rules.trials[channel],null);});
 check(channel+' scoped change notification',()=>{const event=e.events.at(-1);assert.equal(event.operation,'deletePrompt');assert.equal(event.tenant,tenant);assert.equal(event.channel,channel);});
 const stale=before.draft,afterDelete=e.storage.get(key(channel)),writes=e.writes;
 const operations=[['stale save',()=>M.savePrompt(tenant,channel,stale)],['prompt trial',()=>M.trialPrompt(tenant,channel)],['prompt publish',()=>M.publishPrompt(tenant,channel)],['rule trial',()=>M.trialRules(tenant,channel)],['new run',()=>M.rerun(tenant,channel,M.yesterday())],['failed retry',()=>M.rerun(tenant,channel,M.yesterday(),{mode:'retry_failed'})]];
 for(const [label,run] of operations)check(channel+' blocks '+label,()=>{const r=run();assert.equal(r.ok,false);assert.equal(r.error,'template_missing');});
 check(channel+' blocked actions cannot resurrect or write',()=>{assert.equal(e.storage.get(key(channel)),afterDelete);assert.equal(e.writes,writes);});
 check(channel+' repeat deletion idempotent',()=>{const n=e.events.length;assert(M.deletePrompt(tenant,channel).ok);assert.equal(e.storage.get(key(channel)),afterDelete);assert.equal(e.events.length,n);assert.equal(e.writes,writes);});
 check(channel+' reload retains deletion and historical report',()=>{const fresh=env(e.storage);assert.equal(fresh.M.getConfig(tenant,channel).deleted,true);assert.equal(JSON.stringify(fresh.M.getReport(tenant,channel,fresh.M.yesterday())),reportBefore);assert.equal(fresh.M.savePrompt(tenant,channel,stale).error,'template_missing');});
 check(channel+' remaining channel can still run',()=>assert(M.rerun(tenant,other,M.yesterday()).ok));
 check(channel+' remaining channel can publish rules alone',()=>{assert(M.saveRulesDraft(tenant,{responseMinutes:26}).ok);assert(M.trialRules(tenant,other).ok);assert(M.publishRules(tenant).ok);assert.equal(M.getConfig(tenant,channel).deleted,true);});
 check(channel+' deleted state not hidden by bad shared config',()=>{e.storage.set(key('shared'),'invalid-json');assert.equal(M.getConfig(tenant,channel).error,'template_missing');});
 check(channel+' no network',()=>assert.equal(e.networkCalls,0));
}
{
 const e=env();seed(e);const before=new Map(e.storage),events=e.events.length;e.fail();
 check('storage failure rejects deletion',()=>{const r=e.M.deletePrompt(tenant,'wecom');assert.equal(r.ok,false);assert.equal(r.error,'storage_failed');});
 check('storage failure leaves every persisted record and event intact',()=>{assert.deepEqual([...e.storage],[...before]);assert.equal(e.events.length,events);assert.equal(e.M.getConfig(tenant,'wecom').published.enabled,true);assert.notEqual(e.M.getConfig(tenant,'wecom').deleted,true);});
}
{
 const e=env();e.storage.set(key('wecom'),'invalid-json');const before=e.storage.get(key('wecom'));
 check('corrupt channel not overwritten by deletion',()=>{assert.equal(e.M.deletePrompt(tenant,'wecom').error,'storage_failed');assert.equal(e.storage.get(key('wecom')),before);assert.equal(e.writes,0);});
 for(const [t,ch] of [['other-tenant','wecom'],[tenant,'shared'],[tenant,'unknown'],[tenant,undefined]])check('invalid scope '+String(t)+' '+String(ch),()=>{assert.equal(e.M.deletePrompt(t,ch).ok,false);assert.equal(e.writes,0);});
}
{
 const e=env();check('uninitialized template deletion does not resurrect at reload',()=>{assert(e.M.deletePrompt(tenant,'wechat').ok);assert.equal(env(e.storage).M.getConfig(tenant,'wechat').deleted,true);});
}
const failed=results.filter(r=>!r.ok).map(r=>r.name),receipt={spec:process.env.QUALITY_CHECK_SPEC||'SPEC-SUIYIN-ADMIN-092@0.3.3',checkedAt:new Date().toISOString(),ok:failed.length===0,checks:results.length,passed:results.length-failed.length,failed:failed.length,failedChecks:failed,sourceSha256:crypto.createHash('sha256').update(source).digest('hex')};if(process.env.QUALITY_CHECK_OUTPUT_DIR){fs.mkdirSync(process.env.QUALITY_CHECK_OUTPUT_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.QUALITY_CHECK_OUTPUT_DIR,'prompt-delete-check.json'),JSON.stringify(receipt,null,2)+'\n');}console.log(JSON.stringify(receipt,null,2));if(failed.length)process.exitCode=1;
