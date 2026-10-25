/** Build a public, explicitly synthetic report from AdminQualityModel only.
 * This program never reads private reports, captures, identities or prompts.
 * Usage: node prototype/build_quality_public_demo.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const input=path.join(root,'admin-quality-model.js');
const output=path.join(root,'data/quality-public-demo.json');
const source=fs.readFileSync(input,'utf8');
const sha=value=>createHash('sha256').update(value).digest('hex');
let storageWrites=0,networkCalls=0;
const denyNetwork=()=>{networkCalls++;throw Error('Public fixture build forbids network access');};
const sandbox={
 localStorage:{getItem(){return null;},setItem(){storageWrites++;throw Error('Public fixture build forbids stored overrides');}},
 fetch:denyNetwork,XMLHttpRequest:denyNetwork,WebSocket:denyNetwork,
 document:{dispatchEvent(){}},CustomEvent:function(){},addEventListener(){}
};
sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:input,timeout:5000});
const model=sandbox.AdminQualityModel;
assert.ok(model,'Synthetic model must load');
const tenant='yestar-sz';
const mapping=[['2026-10-22','2026-10-19'],['2026-10-23','2026-10-20']];
const shiftDay=(day,delta)=>new Date(Date.parse(day+'T12:00:00Z')+delta*86400000).toISOString().slice(0,10);
function shiftDates(value,delta){
 if(typeof value==='string')return value.replace(/2026-10-\d{2}/g,day=>shiftDay(day,delta));
 if(Array.isArray(value))return value.map(v=>shiftDates(v,delta));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,shiftDates(v,delta)]));
 return value;
}
function buildReport(channel,fixtureDate,reportDate){
 const original=model.getReport(tenant,channel,fixtureDate);
 assert.equal(original.synthetic,true);
 assert.equal(original.sessions.length,8);
 const report=shiftDates(JSON.parse(JSON.stringify(original)),-3);
 assert.equal(report.meta.date,reportDate);
 report.synthetic=true;
 report.displayMode='public-synthetic';
 report.meta.sourceLabel='公开合成演示：仅来自 AdminQualityModel 预置样本；不是深圳实际会话或模型分析结果。';
 report.meta.scopeLabel='每渠道8个合成会话；日期仅用于页面演示，未知字段保留未知。';
 report.meta.sourceFixtureDate=fixtureDate;
 report.meta.displayDateShiftDays=-3;
 report.meta.inputDigest='synthetic-'+sha(JSON.stringify(report.sessions)).slice(0,16);
 report.snapshot.rules.slaMinutes=report.snapshot.rules.responseMinutes;
 report.snapshot.rules.deepTalkSpeechThreshold=report.snapshot.rules.deepChatCount;
 report.snapshot.rules.customerBurstMinutes=report.snapshot.rules.burstMinutes;
 report.standards=report.standards.map((d,index)=>({...d,sourceId:d.id,id:index+1}));
 const dimensions=new Map(report.standards.map(d=>[d.name,d.id]));
 for(const s of report.sessions){
  s.synthetic=true;
  s.sourceIntentLevel=({'高意向':'有效一级','明确需求':'有效二级','当日未回应':'无效'})[s.aiIntent]||'未判定';
  s.sourceIntentMapping='合成页面分类映射；未提供明确等级对应时保留未判定，不是重新质检。';
  s.intentExplanation=s.summary;
  s.rawBodyMessageCount=s.messages.filter(m=>m.scope==='body').length;
  s.metrics={deepTalk:s.deepChat,customerSpeechMessages:s.customerMessageCount,validMessages:s.validMessageCount};
  s.dimensions=s.dimensions.map(d=>({...d,id:dimensions.get(d.name)}));
  s.messages=s.messages.map((m,index)=>({...m,seq:index+1,synthetic:true,
   senderNickname:m.sender||null,sendPlatform:m.source||'unknown',
   representation:m.parseStatus!=='complete'?'unparsed_source_content':m.type==='voice'?'voice_transcript':m.type==='image'?'ocr_transcript':'original_text',
   avatar:null,avatarStatus:'not_provided',mediaUrl:null,mediaAvailability:'not_provided',
   actualOperatorId:m.direction==='staff'&&s.receiverId!=='unknown'?s.receiverId:null,
   senderIdentityStatus:s.receiverId==='unknown'?'unknown':'synthetic_fixture'
  }));
  const messages=new Map(s.messages.map(m=>[m.id,m]));
  s.responseEvents=s.responseEvents.map(event=>({...event,
   replyAt:event.replyMessageId?messages.get(event.replyMessageId)?.at||null:null,
   waitMinutes:event.minutes??event.waitingMinutes??null,
   waitBasis:event.minutes!==null?'replied_duration':'observation_lower_bound'
  }));
  // Product labels and speakers are already present in this synthetic model's
  // configured rule and message fields. No classification of real text occurs.
  s.business.products=s.business.largeProductMentioned?report.snapshot.rules.largeProducts.filter(p=>s.messages.some(m=>m.scope==='body'&&m.status==='success'&&m.parseStatus==='complete'&&m.text.includes(p))).map(name=>({name,speakers:[...new Set(s.messages.filter(m=>m.scope==='body'&&m.status==='success'&&m.parseStatus==='complete'&&m.text.includes(name)).map(m=>m.direction))],evidenceSeqs:s.messages.filter(m=>m.scope==='body'&&m.status==='success'&&m.parseStatus==='complete'&&m.text.includes(name)).map(m=>m.seq)})):[];
  for(const d of s.dimensions)assert.ok(d.evidenceMessageIds.every(id=>messages.has(id)),'Dimension evidence must stay in its session');
  for(const event of s.responseEvents)assert.ok(event.evidenceMessageIds.every(id=>messages.has(id)),'Response evidence must stay in its session');
 }
 const sessions=new Map(report.sessions.map(s=>[s.id,s]));
 report.issues=report.issues.map(issue=>({...issue,dimensionId:dimensions.get(issue.dimension),
  severity:'待复核',severitySource:'not_separately_assigned_in_fixture',
  occurrences:[{sessionId:issue.sessionId,evidenceMessageIds:[...issue.evidenceMessageIds]}],occurrenceCount:1
 }));
 for(const issue of report.issues){const ids=new Set(sessions.get(issue.sessionId).messages.map(m=>m.id));assert.ok(issue.evidenceMessageIds.every(id=>ids.has(id)));}
 assert.equal(report.sessions.reduce((n,s)=>n+s.rawBodyMessageCount,0),report.summary.rawMessages);
 assert.equal(report.summary.rawMessages,25);
 assert.equal(report.sessions.filter(s=>s.metrics.deepTalk).length,report.summary.deepChatSessions);
 const events=report.sessions.flatMap(s=>s.responseEvents).filter(e=>e.ownerDate===reportDate);
 assert.equal(events.filter(e=>e.timeout).length,report.summary.timeoutEvents);
 assert.equal(new Set(events.filter(e=>e.timeout).map(e=>e.sessionId)).size,report.summary.timeoutSessions);
 assert.equal(report.summary.timeoutEvents,3);
 assert.equal(report.summary.timeoutSessions,2);
 const origin={kind:'synthetic_demo',engine:'none',apiExecuted:false,source:'AdminQualityModel preset fixture',sourceFixtureDate:fixtureDate,displayDateShiftDays:-3,sourcePromptVersion:'合成演示规则',executedAt:null};
 report.origin=origin;
 return {channel,reportDate,origin,report};
}
const result={schemaVersion:'chat-quality-public-demo-v1',tenant,synthetic:true,displayMode:'public-synthetic',
 source:{file:'prototype/admin-quality-model.js',sha256:sha(source),privateInputsRead:0,networkCalls:0,storageWrites:0},
 reports:['wecom','wechat'].flatMap(channel=>mapping.map(([from,to])=>buildReport(channel,from,to)))
};
assert.equal(storageWrites,0);assert.equal(networkCalls,0);
assert.equal(new Set(result.reports.flatMap(r=>r.report.sessions.map(s=>s.id))).size,32);
const bytes=JSON.stringify(result,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(output,'utf8'),bytes,'Public fixture is stale; rebuild from the synthetic model');
else fs.writeFileSync(output,bytes);
console.log(JSON.stringify({ok:true,mode:process.argv.includes('--check')?'check':'build',output:'prototype/data/quality-public-demo.json',reports:4,sessions:32,bodyMessages:100,messageRows:result.reports.reduce((n,r)=>n+r.report.sessions.reduce((a,s)=>a+s.messages.length,0),0),privateInputsRead:0,networkCalls,storageWrites,sha256:sha(bytes)}));
