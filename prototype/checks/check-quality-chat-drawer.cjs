/* SPEC-092 — read-only evidence drawer guards.
 * Run: node prototype/checks/check-quality-chat-drawer.cjs
 * Reads the two ignored Shenzhen local fixtures; never emits their contents/IDs.
 * Executes the real drawer in a VM. A sentinel stops valid open() calls at the
 * first DOM node, so this does not claim browser layout, focus or animation QA.
 * No fixture writes, network, model/API calls, application storage or dialogs.
 * Stdout is a count-only receipt; failure names are static, non-PII test labels.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const sourcePath=path.join(root,'prototype/admin-quality-chat-drawer.js');
const bundlePath=path.join(root,'prototype/data/private/quality-real-yestar-sz-20261019-20.json');
const viewPath=path.join(root,'prototype/data/private/quality-chat-view-yestar-sz-20261019-20.json');
const counts={reports:0,sessions:0,views:0,validatedSessions:0,importedMessages:0,displayMessages:0,scopeRejections:0,originalFieldRejections:0,messageShapeRejections:0,allowedOpenGuards:0,rejectedOpenGuards:0,networkCalls:0,checksPassed:0,checksFailed:0};
const failures=[];
function check(name,run){try{run();counts.checksPassed++;}catch(_){counts.checksFailed++;if(!failures.includes(name))failures.push(name);}}
function ensure(value){if(!value)throw Error('check_failed');}
function clone(value){return structuredClone(value);}
function altered(value){if(value===null||value===undefined)return '__guard_test__';if(typeof value==='number')return value+1;if(typeof value==='boolean')return !value;if(typeof value==='string')return value+'__guard_test__';if(Array.isArray(value))return value.concat('__guard_test__');return Object.assign({},value,{__guardTest:true});}
function environment(code,channel){
 const boundary=Object.freeze({boundary:true}),stats={nodes:0,controls:0};
 const ctx={location:{origin:'http://local.invalid'},Admin:{tenant:'yestar-sz',route:channel==='wecom'?'wecomQualityDaily':'wechatQualityDaily',esc:v=>String(v??''),node:()=>{stats.nodes++;throw boundary;}},AdminQualityPCMessages:{render:()=>'',bind:()=>()=>{}},AdminControls:{close:()=>{stats.controls++;}},addEventListener(){},fetch(){counts.networkCalls++;throw Error('network_forbidden');},URL,Date,Intl,Map,Set,JSON,scrollY:0};
 ctx.window=ctx;ctx.parent=ctx;vm.createContext(ctx);vm.runInContext(code,ctx,{filename:'admin-quality-chat-drawer.js'});
 return {api:ctx.AdminQualityChatDrawer,ctx,stats,boundary};
}
function denied(env,args){const nodes=env.stats.nodes,controls=env.stats.controls;ensure(env.api.open(args)===false);ensure(env.stats.nodes===nodes&&env.stats.controls===controls);counts.rejectedOpenGuards++;}
function allowed(env,args){const nodes=env.stats.nodes;let reached=false;try{env.api.open(args);}catch(error){if(error===env.boundary)reached=true;else throw error;}ensure(reached&&env.stats.nodes===nodes+1);counts.allowedOpenGuards++;}
function fixture(report){const issue=report.issues.find(i=>i.occurrences?.length),session=report.sessions.find(s=>s.id===issue.sessionId),occurrence=issue.occurrences[0],occurrenceSession=report.sessions.find(s=>s.id===occurrence.sessionId);return {report,issue,session,occurrence,occurrenceSession};}
try{
 const code=fs.readFileSync(sourcePath,'utf8'),bundleBytes=fs.readFileSync(bundlePath),bundle=JSON.parse(bundleBytes),views=JSON.parse(fs.readFileSync(viewPath,'utf8'));
 const reports=bundle.reports.map(item=>item.report),env=environment(code,'wecom');
 counts.reports=reports.length;counts.sessions=reports.reduce((n,r)=>n+r.sessions.length,0);counts.views=Object.keys(views.sessions).length;
 check('fixture_count_and_local_scope',()=>{ensure(counts.reports===4&&counts.sessions===3466&&counts.views===3466);ensure(bundle.tenant==='yestar-sz'&&bundle.localOnly===true&&views.tenant==='yestar-sz'&&views.localOnly===true);});
 check('supplement_tied_to_current_bundle',()=>ensure(views.sourceBundleSha256===crypto.createHash('sha256').update(bundleBytes).digest('hex')));
 check('all_session_ids_unique',()=>ensure(new Set(reports.flatMap(r=>r.sessions.map(s=>s.id))).size===counts.sessions));
 for(const report of reports){
  for(const session of report.sessions){
   const view=views.sessions[session.id];counts.importedMessages+=(session.messages||[]).length;counts.displayMessages+=(view?.messages||[]).length;
   check('all_views_preserve_original_messages',()=>{ensure(env.api.validateView(view,session,report)===view);counts.validatedSessions++;});
   for(const field of ['tenant','channel','date','accountId'])check('reject_cross_'+field,()=>{ensure(env.api.validateView({...view,[field]:'__outside_scope__'},session,report)===null);counts.scopeRejections++;});
   const original=session.messages?.[0];
   if(original&&view){
    const index=view.messages.findIndex(m=>m.id===(original.id||original.messageId));
    for(const field of Object.keys(original))check('reject_original_'+field+'_tamper',()=>{const changed={...view,messages:view.messages.slice()};changed.messages[index]={...view.messages[index],[field]:altered(original[field])};ensure(env.api.validateView(changed,session,report)===null);counts.originalFieldRejections++;});
    check('reject_missing_original_message',()=>{const changed={...view,messages:view.messages.filter((_,i)=>i!==index)};ensure(env.api.validateView(changed,session,report)===null);counts.messageShapeRejections++;});
    check('reject_duplicate_message_id',()=>{const changed={...view,messages:view.messages.concat({...view.messages[index]})};ensure(env.api.validateView(changed,session,report)===null);counts.messageShapeRejections++;});
    check('reject_invalid_direction',()=>{const changed={...view,messages:view.messages.slice()};changed.messages[index]={...view.messages[index],direction:'__invalid__'};ensure(env.api.validateView(changed,session,report)===null);counts.messageShapeRejections++;});
   }
  }
  const e=environment(code,report.meta.channel),f=fixture(report);
  check('allow_canonical_session',()=>allowed(e,{report,session:f.session}));
  check('allow_canonical_issue',()=>allowed(e,{report,session:f.session,issue:f.issue}));
  check('allow_canonical_occurrence',()=>allowed(e,{report,session:f.occurrenceSession,issue:f.issue,occurrence:f.occurrence}));
  check('reject_missing_report',()=>denied(e,{report:null,session:f.session}));
  check('reject_missing_report_metadata',()=>denied(e,{report:{sessions:report.sessions,issues:report.issues},session:f.session}));
  check('reject_foreign_tenant_report',()=>denied(e,{report:{...report,meta:{...report.meta,tenant:'__foreign_tenant__'}},session:f.session}));
  check('reject_foreign_session_object',()=>denied(e,{report,session:clone(f.session)}));
  check('reject_same_id_account_tamper',()=>denied(e,{report,session:{...f.session,accountId:'__foreign_account__'}}));
  check('reject_same_id_channel_tamper',()=>denied(e,{report,session:{...f.session,channel:'__foreign_channel__'}}));
  check('reject_same_id_date_tamper',()=>denied(e,{report,session:{...f.session,date:'__foreign_date__'}}));
  check('reject_same_id_message_tamper',()=>denied(e,{report,session:{...f.session,messages:[]}}));
  check('reject_session_from_other_report',()=>denied(e,{report,session:reports.find(r=>r!==report).sessions[0]}));
  check('reject_fabricated_issue',()=>denied(e,{report,session:f.session,issue:{...f.issue,id:'__foreign_issue__'}}));
  check('reject_cloned_issue',()=>denied(e,{report,session:f.session,issue:clone(f.issue)}));
  check('reject_issue_wrong_session',()=>denied(e,{report,session:report.sessions.find(s=>s.id!==f.issue.sessionId),issue:f.issue}));
  check('reject_occurrence_without_issue',()=>denied(e,{report,session:f.occurrenceSession,occurrence:f.occurrence}));
  check('reject_cloned_occurrence',()=>denied(e,{report,session:f.occurrenceSession,issue:f.issue,occurrence:clone(f.occurrence)}));
  check('reject_occurrence_wrong_session',()=>denied(e,{report,session:report.sessions.find(s=>s.id!==f.occurrence.sessionId),issue:f.issue,occurrence:f.occurrence}));
  check('reject_occurrence_from_other_issue',()=>{const r=clone(report),c=fixture(r),foreign={...c.occurrence};r.issues.push({id:'__other_issue__',sessionId:c.session.id,occurrences:[foreign],evidenceMessageIds:[]});denied(e,{report:r,session:c.occurrenceSession,issue:c.issue,occurrence:foreign});});
  for(const type of ['missing','not_array']){
   check('reject_issue_evidence_'+type,()=>{const c=fixture(clone(report));c.issue.evidenceMessageIds=type==='missing'?['__not_in_session__']:'__not_array__';denied(e,{report:c.report,session:c.session,issue:c.issue});});
   check('reject_occurrence_evidence_'+type,()=>{const c=fixture(clone(report));c.occurrence.evidenceMessageIds=type==='missing'?['__not_in_session__']:'__not_array__';denied(e,{report:c.report,session:c.occurrenceSession,issue:c.issue,occurrence:c.occurrence});});
  }
  check('reject_missing_renderer',()=>{const previous=e.ctx.AdminQualityPCMessages;e.ctx.AdminQualityPCMessages=null;try{denied(e,{report,session:f.session});}finally{e.ctx.AdminQualityPCMessages=previous;}});
 }
 check('all_views_actually_visited',()=>ensure(counts.validatedSessions===3466));
 check('network_never_called',()=>ensure(counts.networkCalls===0));
}catch(_){counts.checksFailed++;failures.push('unable_to_complete_fixture_or_source_load');}
const receipt={spec:process.env.QUALITY_CHECK_SPEC||'SPEC-SUIYIN-ADMIN-092@0.3.3',checkedAt:new Date().toISOString(),ok:counts.checksFailed===0,counts,failedChecks:failures,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex')};if(process.env.QUALITY_CHECK_OUTPUT_DIR){fs.mkdirSync(process.env.QUALITY_CHECK_OUTPUT_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.QUALITY_CHECK_OUTPUT_DIR,'chat-drawer-check.json'),JSON.stringify(receipt,null,2)+'\n');}console.log(JSON.stringify(receipt,null,2));
if(counts.checksFailed)process.exitCode=1;
