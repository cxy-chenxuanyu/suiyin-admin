/** Prepare captured UI samples for public static delivery without publishing identities.
 * First use: node prototype/sanitize-public-data.mjs --backup-dir <private-local-directory>
 * Verify only: node prototype/sanitize-public-data.mjs --check
 * The private backup must be outside this repository and is never linked by the prototype.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const base=path.dirname(fileURLToPath(import.meta.url)),repo=path.dirname(base),dataDir=path.join(base,'data');
const policy='public-demo-identities-v1',checkOnly=process.argv.includes('--check');
const arg=process.argv.indexOf('--backup-dir'),backupDir=arg>=0?path.resolve(process.argv[arg+1]||''):null;
const walkFiles=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>/^(private|vendor|node_modules)$/i.test(e.name)||/\.private\./i.test(e.name)?[]:e.isDirectory()?walkFiles(path.join(dir,e.name)):[path.join(dir,e.name)]);
// Navigation is a business contract (tenant/brand/menu identity), never customer data.
const navigationFile=path.join(dataDir,'navigation-snapshot.json');
const jsonFiles=walkFiles(dataDir).filter(f=>f.endsWith('.json')&&f!==navigationFile);
const navigation=JSON.parse(fs.readFileSync(navigationFile,'utf8'));
const brandNames=new Set(navigation.tenants.flatMap(t=>[t.name,t.brand,t.id]).filter(Boolean));
const docs=jsonFiles.map(file=>({file,data:JSON.parse(fs.readFileSync(file,'utf8'))}));
const languageFile=path.join(dataDir,'language-manage.json'),languagePolicy='public-language-templates-v1';
const profileFile=path.join(dataDir,'live-ui-reference.js');
const profileText=fs.readFileSync(profileFile,'utf8');
const profile=JSON.parse(profileText.slice(profileText.indexOf('window.AdminLiveUI=')+'window.AdminLiveUI='.length).replace(/;\s*$/,''));
const pages=docs.flatMap(d=>Object.values(d.data).filter(p=>p&&typeof p==='object'&&p.route&&p.tenant&&Array.isArray(p.tables)).map(p=>({file:d.file,page:p})));
const demo=/^(?:演示(?:客户|好友|群组|工作账号|备注|宠物)|匿名|\[已隐藏\]|客户样本)/;
const nonIdentity=/^(?:\s*|[-—]+|无|未知|暂无|未设置|未填写|无补充备注|全部|未分配|待分配|未命名|是|否|\d+(?:\.\d+)?|1[3-9]\d\*{4}\d{4})$/;
const publicStaffRoutes=new Set(['salesManage','wechatStatus','expertList','medicalDoctors','caseLibraryDoctors','role']);
function identityKind(route,header){
  if(publicStaffRoutes.has(route))return null;
  if(route==='allWeChatStatus'&&/^(在线帐号|掉线帐号)$/.test(header))return '工作账号';
  if(header==='群昵称'||header==='群/好友昵称')return '群组';
  if(header==='微信备注')return '备注';
  if(header==='宠物')return '宠物';
  if(/^(?:客户姓名|客户名称|客户|微信昵称|好友名称|头像昵称|头像\/微信昵称\/手机号|来自客户\(微信昵称\/姓名\)|房客|食客|老客户)$/.test(header))return '客户';
  if(route==='allocationRecord'&&header==='昵称')return '客户';
  if(/(?:prepayment|topUp|IncomeConfirm|incomeConfirm)/i.test(route)&&header==='备注')return '备注';
  return null;
}
const fingerprint=value=>crypto.createHash('sha256').update('suiyin-public-sample-v1\0'+value).digest('hex').slice(0,8).toUpperCase();
const alias=(value,kind)=>demo.test(value)?value:'演示'+kind+' '+fingerprint(value);
const replacements=new Map();
let identityCells=0,platformAccountCells=0;
function remember(value,kind){
  if(typeof value!=='string'||demo.test(value)||nonIdentity.test(value))return;
  if(!replacements.has(value))replacements.set(value,alias(value,kind));
}
for(const {page:p}of pages)for(const table of p.tables)for(const row of table.rows||[])table.headers.forEach((h,i)=>{
  const kind=identityKind(p.route,h),value=row.cells[i];if(!kind||!value)return;
  if(p.route==='allWeChatStatus'){platformAccountCells++;return;}
  identityCells++;remember(value,kind);
  // Also cover the same name repeated inside a multiline detail or an opened selector.
  for(const token of String(value).split(/\n/).map(x=>x.trim()))remember(token,kind);
});
const sorted=[...replacements].sort((a,b)=>b[0].length-a[0].length);
const safeFields=new Set(['tenant','tenantName','brand','brandName','companyName','environmentName','name','route','label','headers','id','source','sampleSource','schemaSource','capturedAt','state','sampleTenant','routeEvidence','evidence','contentStatus','dataRevision','publicDataPolicy']);
const identityField=/客户|好友|昵称|备注|群名|群组|房客|食客|宠物/;
const staffField=/销售|人设|工作账号|所在账号|接待|医生|专家|创建人|编辑人/;
function replaceString(value,allowEmbedded=true){
  if(demo.test(value)||brandNames.has(value)||/^(?:https?:\/\/|data:|assets\/|<svg\b)/i.test(value))return value;
  if(replacements.has(value))return replacements.get(value);
  if(!allowEmbedded)return value;
  let result=value;
  for(const [from,to]of sorted)if(from.length>=3&&!brandNames.has(from)&&result.includes(from))result=result.split(from).join(to);
  return result;
}
function sanitizeObject(v,key='',protectedValue=false){
  if(typeof v==='string')return safeFields.has(key)||protectedValue||staffField.test(key)&&!identityField.test(key)?v:replaceString(v);
  if(Array.isArray(v))return v.map(x=>sanitizeObject(x,key,protectedValue));
  if(!v||typeof v!=='object')return v;
  const label=String(v.label||v.name||''),staff=staffField.test(label)&&!identityField.test(label);
  return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,sanitizeObject(x,k,protectedValue||staff&&['value','text','default','options'].includes(k))]));
}
function sanitizeFormTree(v,identityContext=false){
  if(typeof v==='string')return identityContext?replaceString(v):v;
  if(Array.isArray(v))return v.map(x=>sanitizeFormTree(x,identityContext));
  if(!v||typeof v!=='object')return v;
  const label=String(v.label||''),identity=identityContext||/客户|好友|群昵称|群名|微信备注|房客|食客|宠物/.test(label);
  const staff=staffField.test(label)&&!identityField.test(label);
  return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,safeFields.has(k)?x:sanitizeFormTree(x,identity&&!staff)]));
}
function makePageText(p){
  // Legacy language page.text is not the structured language-manage.json source.
  // That separate tenant-scoped capture is validated below and never retemplated.
  if(p.route==='languageManage')return [p.label,'演示话术分类','初次咨询','服务介绍','预约安排','到店指引','项目答疑','活动说明','复诊关怀','日常问候'].join('\n');
  return [p.label,...p.tables.flatMap(t=>[t.headers.join('\t'),...(t.rows||[]).map(r=>r.cells.join('\t'))])].join('\n');
}
function transformPage(p){
  const transformed=sanitizeObject(p);
  for(const key of ['forms','inputs','expandedForms'])if(p[key])transformed[key]=sanitizeFormTree(p[key]);
  transformed.tables=p.tables.map(table=>({...sanitizeObject(table),headers:table.headers,rows:table.rows.map(row=>{
    const result=sanitizeObject(row);result.cells=row.cells.map((value,i)=>{
      const h=table.headers[i],kind=identityKind(p.route,h);
      if(p.route==='allWeChatStatus'&&kind)return String(value).split('\n').map(token=>token.trim()?alias(token.trim(),'工作账号'):token).join('\n');
      if(kind&&value&&!nonIdentity.test(String(value)))return alias(String(value),kind);
      if(publicStaffRoutes.has(p.route)||/租户|企业|公司|品牌|环境/.test(h)||staffField.test(h)&&!identityField.test(h))return value;
      return typeof value==='string'?replaceString(value):value;
    });return result;
  })}));
  transformed.text=makePageText(transformed);
  transformed.publicDataPolicy=policy;
  if(!String(transformed.dataRevision||'').includes(policy))transformed.dataRevision=(transformed.dataRevision||'2026-09-19')+'-'+policy;
  return transformed;
}
function count(){return {tenants:new Set(pages.map(({page:p})=>p.tenant)).size,pages:pages.length,rows:pages.reduce((n,{page:p})=>n+p.tables.reduce((m,t)=>m+t.rows.length,0),0)};}
function audit(){
  const failures=[];let checkedIdentityCells=0,checkedSecrets=0;
  const language=docs.find(d=>d.file===languageFile)?.data;
  if(language){
    const fail=issue=>failures.push({file:path.relative(repo,languageFile),issue});
    if(language.schemaVersion!==1||language.publicDataPolicy!==languagePolicy)fail('language-policy-or-schema');
    const forbidden=new Set(['key','parent','html','outerHTML','innerHTML','fields','buttons','svg','geometry','url','src','href','sourceKey','sourceId']);
    const visit=(value,key='',inIcons=false)=>{
      if(forbidden.has(key))fail('language-raw-source-field:'+key);
      if(typeof value==='string'){
        if(inIcons){if(/<(?:script|style|foreignObject|image|iframe)\b|\son[a-z]+\s*=|(?:javascript|data):/i.test(value)||/(?:xlink:)?href=["'](?!#)/i.test(value))fail('language-unsafe-svg');return;}
        if(key==='sourceUrl'){try{const u=new URL(value);if(u.protocol!=='https:'||u.search||u.hash||u.username||u.password||!u.pathname.endsWith('/languageManage'))fail('language-source-url');}catch{fail('language-source-url');}return;}
        if(/<\/?(?:html|div|span|input|textarea|svg|script)\b|\b[a-f0-9]{24}\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?<!\d)\d{16,19}[\dXx]?(?!\d)/i.test(value))fail('language-private-content');
      }else if(Array.isArray(value))value.forEach(v=>visit(v,key,inIcons));
      else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>visit(v,k,inIcons||k==='icons'));
    };
    visit(language);
    for(const [tenantId,tenant]of Object.entries(language.tenants||{})){
      if(tenantId!==tenant.tenant||!['captured','not-captured'].includes(tenant.status))fail('language-tenant-status');
      const nodeIds=new Set((tenant.nodes||[]).map(n=>n.id));
      for(const node of tenant.nodes||[])if(!/^n\d+$/.test(node.id)||node.parentId!==null&&!nodeIds.has(node.parentId))fail('language-node-identity');
      for(const [nodeId,category]of Object.entries(tenant.categories||{})){
        if(!nodeIds.has(nodeId)||!['captured','not-captured'].includes(category.status))fail('language-category-status');
        if(category.status==='not-captured'&&(category.total!==null||category.rows?.length))fail('language-unknown-as-empty');
        for(const row of category.rows||[]){
          if(!['captured','not-captured'].includes(row.detailsStatus)||row.detailsStatus==='not-captured'&&row.contents?.length)fail('language-detail-status');
          for(const content of row.contents||[]){if(!['文本','图片','视频'].includes(content.type))fail('language-content-type');if(content.type!=='文本'&&(content.placeholder!==true||content.text))fail('language-media-not-placeholder');}
        }
      }
    }
  }
  for(const {file,page:p}of pages){
    if(p.publicDataPolicy!==policy)failures.push({file:path.relative(repo,file),route:p.route,issue:'missing-public-policy'});
    if(p.text!==makePageText(p))failures.push({file:path.relative(repo,file),route:p.route,issue:'raw-text-not-rebuilt'});
    for(const t of p.tables)for(const row of t.rows){assert.equal(row.cells.length,t.headers.length);t.headers.forEach((h,i)=>{
      const value=String(row.cells[i]??''),kind=identityKind(p.route,h);
      if(kind&&value){checkedIdentityCells++;const tokens=p.route==='allWeChatStatus'?value.split('\n'):[value];if(tokens.some(s=>s&&!nonIdentity.test(s)&&!demo.test(s)))failures.push({file:path.relative(repo,file),route:p.route,column:h,issue:'identity-not-anonymized'});}
      if(/密钥|Secret|密码|Token$/i.test(h)&&!/最大/.test(h)){checkedSecrets++;if(value&&value!=='[已隐藏]')failures.push({file:path.relative(repo,file),route:p.route,column:h,issue:'secret-not-hidden'});}
    });}
  }
  for(const file of walkFiles(dataDir)){const text=fs.readFileSync(file,'utf8');for(const [kind,regex]of Object.entries({phone:/(?<!\d)1[3-9]\d{9}(?!\d)/g,jwt:/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g,providerKey:/\bsk-[A-Za-z0-9_-]{20,}\b/g,privateKey:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g})){const matches=[...text.matchAll(regex)];if(matches.length)failures.push({file:path.relative(repo,file),kind,count:matches.length});}}
  return {...count(),checkedIdentityCells,checkedSecrets,failures};
}
if(checkOnly){const result=audit();console.log(JSON.stringify(result,null,2));process.exitCode=result.failures.length?1:0;}
else{
  const before=count();
  if(pages.some(({page:p})=>p.publicDataPolicy!==policy)){
    assert.ok(backupDir,'First transformation requires --backup-dir outside the repository.');
    const relativeBackup=path.relative(repo,backupDir);assert.ok(relativeBackup.startsWith('..'+path.sep)||path.isAbsolute(relativeBackup),'Backup must be outside the repository.');
    for(const file of [...jsonFiles,profileFile,...[1,2].map(i=>path.join(base,'assets',`source-case-${i}.jpg`)).filter(fs.existsSync)]){
      const dest=path.join(backupDir,path.relative(base,file));fs.mkdirSync(path.dirname(dest),{recursive:true});if(!fs.existsSync(dest))fs.copyFileSync(file,dest);
    }
  }
  for(const d of docs){if(d.file===languageFile){assert.equal(d.data.publicDataPolicy,languagePolicy,'Language samples must be built by the private capture sanitizer.');continue;}d.data=/[\\/](?:forms|options)\.json$/.test(d.file)?sanitizeFormTree(d.data):Array.isArray(d.data)?sanitizeObject(d.data):Object.fromEntries(Object.entries(d.data).map(([key,p])=>[key,p?.route&&p?.tenant&&Array.isArray(p.tables)?transformPage(p):sanitizeObject(p,key)]));fs.writeFileSync(d.file,JSON.stringify(d.data,null,2)+'\n');}
  const publicProfile=sanitizeObject(profile);
  for(const config of Object.values(publicProfile.profiles||{}))if(config.edit?.sampleImages)config.edit.sampleImages=config.edit.sampleImages.map(src=>src.replace(/(source-case-[12])\.jpg$/,'$1.svg'));
  fs.writeFileSync(profileFile,'/* Read-only UI reference; public sample identities are anonymized. */\nwindow.AdminLiveUI='+JSON.stringify(publicProfile)+';\n');
  for(const [index,width,height]of [[1,800,1422],[2,1440,1919]]){
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="匿名案例展示示意"><rect width="100%" height="100%" fill="#f2f7f7"/><circle cx="${width/2}" cy="${height*.36}" r="${width*.15}" fill="#b7d8d5"/><path d="M ${width*.18} ${height*.79} Q ${width*.18} ${height*.5} ${width*.5} ${height*.5} Q ${width*.82} ${height*.5} ${width*.82} ${height*.79} Z" fill="#b7d8d5"/><text x="50%" y="90%" text-anchor="middle" font-family="sans-serif" font-size="${width*.035}" fill="#567672">案例图片 · 匿名示意</text></svg>\n`;
    fs.writeFileSync(path.join(base,'assets',`source-case-${index}.svg`),svg);
    const jpg=path.join(base,'assets',`source-case-${index}.jpg`);if(fs.existsSync(jpg)){assert.ok(backupDir&&fs.existsSync(path.join(backupDir,'assets',`source-case-${index}.jpg`)),'Private original image must be backed up first.');fs.unlinkSync(jpg);}
  }
  console.log(JSON.stringify({policy,...before,identifiedValues:replacements.size,identityCells,platformAccountCells,imagesReplaced:2,note:'Run --check in a fresh process to validate the written public files.'},null,2));
}
