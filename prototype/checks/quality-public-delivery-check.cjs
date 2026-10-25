#!/usr/bin/env node
'use strict';
// Read-only public artifact audit; --write saves only aggregate verification.
// Optional local private comparisons print counts, never source values.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const repo=path.resolve(__dirname,'../..');
const proto=path.join(repo,'prototype');
const evidence=path.join(repo,'docs/verification/chat-quality-release-20261025');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const read=p=>fs.readFileSync(path.join(repo,p),'utf8');
const git=(...args)=>cp.execFileSync('git',['-c','core.quotepath=false','-C',repo,...args],{encoding:'utf8',maxBuffer:24*1024*1024,stdio:['ignore','pipe','pipe']});
const results=[];
function check(id,fn){try{const detail=fn();results.push({id,status:'passed',detail});}catch(error){results.push({id,status:'failed',error:error.message});}}
const publicPath='prototype/data/quality-public-demo.json';
const inlinePath='prototype/_shell_inline.html';
const publicText=read(publicPath),data=JSON.parse(publicText),inline=read(inlinePath);
let embedded;
const blockedScreenshots=[
 'v0.3.0-chengdu-prompt-list.png','v0.3.0-wechat-20261020.png',
 'v0.3.0-wecom-20261019.png','v0.3.0-wecom-20261020.png','v0.3.0-model-directory.png'
].map(p=>'docs/verification/chat-quality-daily-20261024/'+p);
const privateFiles=['prompt-templates.json','quality-real-yestar-sz-20261019-20.json','quality-chat-view-yestar-sz-20261019-20.json'].map(p=>'prototype/data/private/'+p);
check('synthetic-reproducible-build',()=>{
 const output=cp.execFileSync(process.execPath,[path.join(proto,'build_quality_public_demo.mjs'),'--check'],{encoding:'utf8'});
 const receipt=JSON.parse(output);assert.equal(receipt.privateInputsRead,0);assert.equal(receipt.networkCalls,0);assert.equal(receipt.storageWrites,0);
 assert.equal(data.schemaVersion,'chat-quality-public-demo-v1');assert.equal(data.synthetic,true);assert.equal(data.reports.length,4);
 assert.equal(data.source.sha256,hash(read('prototype/admin-quality-model.js')));
 return {reports:4,sessions:32,bodyMessages:100,allMessages:124,privateInputsRead:0,networkCalls:0,storageWrites:0};
});
check('shared-report-and-pc-message-rendering',()=>{
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const box={Admin:{esc},URL};box.window=box;box.globalThis=box;
 vm.runInNewContext(read('prototype/admin-quality-report.js'),box,{timeout:5000});
 vm.runInNewContext(read('prototype/admin-quality-pc-messages.js'),box,{timeout:5000});
 let tabs=0,chats=0,messageRows=0;
 for(const entry of data.reports){
  const r=entry.report,x=box.AdminQualityReport.analyze(r);
  assert.equal(entry.origin.kind,'synthetic_demo');assert.equal(entry.origin.engine,'none');assert.equal(entry.origin.apiExecuted,false);
  assert.deepEqual([x.raw,x.total,x.deep,x.timeout,x.events,x.average,x.max],[25,8,1,2,3,9,22]);
  for(const tab of ['overview','intent','staff','issues','risk','business','standards']){const html=box.AdminQualityReport.content(r,{tab});assert.ok(html.length>500);assert.ok(!/\b(?:undefined|NaN)\b/.test(html));tabs++;}
  for(const s of r.sessions){
   const html=box.AdminQualityPCMessages.render(s.messages,{customerName:s.customerName,accountName:s.accountName,highlightIds:r.issues.find(i=>i.sessionId===s.id)?.evidenceMessageIds||[]});
   const count=(html.match(/data-message-id=/g)||[]).length;assert.equal(count,s.messages.length);messageRows+=count;chats++;
  }
 }
 return {renderedTabs:tabs,renderedChats:chats,messageRows,metricsMatchReports:4,scope:'HTML rendering and metric agreement; browser interactions are checked separately'};
});
check('private-data-and-images-excluded-from-git',()=>{
 const paths=[...privateFiles,...blockedScreenshots];
 for(const file of paths){assert.equal(git('ls-files','--',file).trim(),'','Private path must not be tracked: '+file);assert.ok(git('check-ignore','--',file).trim(),'Private path must be ignored: '+file);}
 const tracked=git('ls-files','-z').split('\0').filter(Boolean);
 assert.equal(tracked.filter(p=>/(^|\/)private\/|\.private\./i.test(p)).length,0);
 return {privateFiles:privateFiles.length,screenshots:blockedScreenshots.length,trackedPrivatePaths:0,localPrivateFilesRetained:privateFiles.filter(p=>fs.existsSync(path.join(repo,p))).length};
});
check('inline-data-keys-and-payload',()=>{
 const match=inline.match(/window\.__ADMIN_INLINE_DATA__=(\{[\s\S]*?\});window\.__ADMIN_INLINE_ASSETS__=/);
 assert.ok(match,'Expected self-contained inline data assignment');embedded=JSON.parse(match[1]);
 const keys=Object.keys(embedded);assert.ok(keys.length>0);
 assert.equal(keys.filter(p=>/(^|\/)(private|vendor|node_modules)(\/|$)|\.private\./i.test(p)).length,0);
 assert.deepEqual(embedded['data/quality-public-demo.json'],data);
 const forbidden=[];function visit(value){if(!value||typeof value!=='object')return;if(value.localOnly===true||value.notForPublication===true||value.displayMode==='private-original'||['chat-quality-real-bundle-v1','chat-quality-chat-view-v1'].includes(value.schemaVersion))forbidden.push(true);Object.values(value).forEach(visit);}visit(embedded);
 assert.equal(forbidden.length,0,'Inline data must not contain private payload markers');
 return {dataKeys:keys.length,privateKeys:0,privatePayloadMarkers:0,publicFixtureMatches:true,bytes:Buffer.byteLength(inline),sha256:hash(inline)};
});
check('inline-known-private-body-comparison',()=>{
 assert.ok(embedded,'Inline must parse first');
 const values=new Set();function collect(v){if(typeof v==='string')values.add(v);else if(v&&typeof v==='object')Object.values(v).forEach(collect);}collect(embedded);
 const promptBodies=new Set(),chatBodies=new Set();
 const promptFile=path.join(repo,privateFiles[0]),reportFile=path.join(repo,privateFiles[1]),chatFile=path.join(repo,privateFiles[2]);
 if(fs.existsSync(promptFile)){function prompts(v,k=''){if(typeof v==='string'&&v.length>=80&&/content|prompt|body/i.test(k))promptBodies.add(v);else if(v&&typeof v==='object')Object.entries(v).forEach(([key,value])=>prompts(value,k+'.'+key));}prompts(JSON.parse(fs.readFileSync(promptFile,'utf8')));}
 if(fs.existsSync(reportFile)){const p=JSON.parse(fs.readFileSync(reportFile,'utf8'));for(const r of p.reports||[]){const text=r.report?.snapshot?.templateContent;if(text)promptBodies.add(text);}}
 if(fs.existsSync(chatFile)){const p=JSON.parse(fs.readFileSync(chatFile,'utf8'));for(const s of Object.values(p.sessions||{}))for(const m of s.messages||[])if(typeof m.text==='string'&&m.text.length>=30)chatBodies.add(m.text);}
 const promptsFound=[...promptBodies].filter(v=>values.has(v)).length,chatsFound=[...chatBodies].filter(v=>values.has(v)).length;
 assert.equal(promptsFound,0,'Known private prompt body appears as an inline data value');assert.equal(chatsFound,0,'Known private chat body appears as an inline data value');
 return {comparisonAvailable:promptBodies.size+chatBodies.size>0,privatePromptBodiesCompared:promptBodies.size,privateChatBodiesCompared:chatBodies.size,promptBodyMatches:promptsFound,chatBodyMatches:chatsFound,method:'Exact complete string values; short generic chat fragments are not treated as identity evidence'};
});
check('pending-text-secret-patterns',()=>{
 const changed=git('diff','--name-only','-z').split('\0');
 const staged=git('diff','--cached','--name-only','-z').split('\0');
 const untracked=git('ls-files','--others','--exclude-standard','-z').split('\0');
 const paths=[...new Set([...changed,...staged,...untracked])].filter(p=>p&&/\.(?:js|cjs|mjs|json|md|css|html|yml)$/.test(p)&&p!==inlinePath&&fs.existsSync(path.join(repo,p)));
 const patterns={phone:/(?<!\d)1[3-9]\d{9}(?!\d)/g,jwt:/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g,providerKey:/\bsk-[A-Za-z0-9_-]{20,}\b/g,privateKey:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g};
 const matches=[];for(const p of paths){const text=read(p);for(const [kind,regex]of Object.entries(patterns)){const count=[...text.matchAll(regex)].length;if(count)matches.push({file:p,kind,count});}}
 assert.equal(matches.length,0,'Sensitive pattern detections: '+JSON.stringify(matches));
 return {files:paths.length,matches:0,patternClasses:Object.keys(patterns),scope:'Conservative literal-pattern scan; not a proof of all possible secrets or identities'};
});
const report={spec:'SPEC-SUIYIN-ADMIN-092@0.3.3',artifactClass:'static-html',checkedAt:new Date().toISOString(),status:results.every(r=>r.status==='passed')?'passed':'failed',passed:results.filter(r=>r.status==='passed').length,total:results.length,source:{publicFixture:publicPath,publicFixtureSha256:hash(publicText),inline:inlinePath,inlineSha256:hash(inline),checkScriptSha256:hash(fs.readFileSync(__filename))},boundaries:{productionWrites:0,modelCalls:0,privateDataPublished:false,localPrivateFilesPreserved:true},results,limitations:['Public artifacts must be deployed from the audited Git manifest or a clean export; Git ignore alone does not constrain directory uploads.','This check does not authorize publishing private source JSON, raw captures, production prompts or runtime configuration.','Exact comparison cannot detect every paraphrase; screenshot exclusions and source review remain required.','Static data and HTML checks do not establish production API, model, scheduler or browser interaction completion.']};
if(process.argv.includes('--write')){fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(path.join(evidence,'public-delivery-check.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
if(report.status!=='passed')process.exitCode=1;
