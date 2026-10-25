/* SPEC-SUIYIN-ADMIN-092@0.3.0 — repeatable read-only navigation VM checks.
 * Compares the four integration sources against Git HEAD and only writes its
 * own verification result. No browser, model, network or application storage.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),proto=path.join(root,'prototype'),clone=structuredClone;
const resultFile=process.env.QUALITY_CHECK_OUTPUT_DIR?path.resolve(process.env.QUALITY_CHECK_OUTPUT_DIR,'menu-check.json'):path.join(root,'docs/verification/chat-quality-daily-20261024/menu-check.json');
function saveResult(value){fs.mkdirSync(path.dirname(resultFile),{recursive:true});fs.writeFileSync(resultFile,JSON.stringify(value,null,2)+'\n','utf8');return value;}
process.on('uncaughtException',error=>{saveResult({spec:process.env.QUALITY_CHECK_SPEC || 'SPEC-SUIYIN-ADMIN-092@0.3.0',ok:false,checkedAt:new Date().toISOString(),error:String(error.stack||error).slice(0,6000)});console.error(error.stack||error);process.exitCode=1;});
const rel=['data/navigation-snapshot.json','data/content/yestar-sz.json','data/content/bzds.json'];
const now=Object.fromEntries(rel.map(p=>[p,JSON.parse(fs.readFileSync(path.join(proto,p),'utf8'))]));
const old=Object.fromEntries(rel.map(p=>[p,JSON.parse(cp.execFileSync('git',['show','HEAD:prototype/'+p],{cwd:root,encoding:'utf8',maxBuffer:30*1024*1024}))]));
const routes=['wecomQualityDaily','wechatQualityDaily'];let checks=0;
function eq(a,b,m){assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;}
function ok(a,m){assert.ok(a,m);checks++;}
const nav=now[rel[0]],before=old[rel[0]],tenant=nav.tenants.find(t=>t.id==='yestar-sz'),oldTenant=before.tenants.find(t=>t.id==='yestar-sz');
const promptCaptureTenants=['huamei-xian','aoli-xian','jbfs','hqjd'];
eq(nav.tenants.filter(t=>t.id!=='yestar-sz'&&!promptCaptureTenants.includes(t.id)),before.tenants.filter(t=>t.id!=='yestar-sz'&&!promptCaptureTenants.includes(t.id)),'Other tenants outside approved Prompt capture scope unchanged');
const scrubTenant=t=>{const v=clone(t);delete v.menuDataRevision;delete v.capabilities.chatQualityDaily;v.menu.forEach(g=>{if(g.children)g.children=g.children.filter(c=>!routes.includes(c.route));});return v;};
eq(scrubTenant(tenant),scrubTenant(oldTenant),'Existing Shenzhen navigation unchanged');
for(const [file,field]of [[rel[1],'menu'],[rel[2],'allMenu']]){
 const current=now[file],prior=old[file];eq(Object.fromEntries(Object.entries(current).filter(([k])=>k!==field&&!routes.includes(k))),Object.fromEntries(Object.entries(prior).filter(([k])=>k!==field)),'Unrelated content unchanged: '+file);
 eq(current[field].tables[0].rows.filter(r=>!routes.includes(r.tree?.key)),prior[field].tables[0].rows,'Old menu rows unchanged: '+file);
 eq(current[field].menuRefresh.baselines[prior[field].dataRevision],{headers:prior[field].tables[0].headers,rows:prior[field].tables[0].rows},'Migration baseline pinned');
 eq(Object.fromEntries(Object.keys(prior[field].menuRefresh.baselines).map(k=>[k,current[field].menuRefresh.baselines[k]])),prior[field].menuRefresh.baselines,'Older baselines preserved');
 const aiBaseline=current[field].menuRefresh.baselines[current[field].menuRefresh.previousRevision];
 ok(routes.every(route=>aiBaseline.rows.find(row=>row.tree?.key===route)?.tree.parentId===(field==='menu'?'0-54':'0-65')),'Pre-move AI baseline retained');
 ok(new Set(current[field].tables[0].rows.map(r=>r.id)).size===current[field].tables[0].rows.length,'Unique row IDs');
}
for(const route of routes){ok(now[rel[1]][route].state==='mock'&&now[rel[1]][route].tables.length===0,'Dedicated renderer source');ok(!now[rel[2]][route],'No bzds business page');}
const source=fs.readFileSync(path.join(proto,'admin-menu-state.js'),'utf8');
function env(){
 const storage=new Map();
 const context={console,URLSearchParams,structuredClone,location:{search:''},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},AdminAccountProfile:{normalizePage:x=>x,normalizeOverride:x=>x},fetch:async p=>({ok:true,json:async()=>clone(now[p]||JSON.parse(fs.readFileSync(path.join(proto,p),'utf8')))})};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);return {w:context,storage};
}
const leaves=items=>items.flatMap(i=>i.children?leaves(i.children):[i.route]).filter(Boolean);
const chat=items=>items.find(item=>item.id==='group-10');
const legacyAI=(file,field)=>{const page=clone(now[file][field]),revision=page.menuRefresh.previousRevision,baseline=page.menuRefresh.baselines[revision];page.dataRevision=revision;page.tables[0]={...page.tables[0],...clone(baseline)};delete page.qualityDailyMenuMigration;return page;};
const oldDefaults=oldTenant.menu.filter(g=>g.display!=='隐藏').flatMap(g=>g.children?g.children.filter(c=>c.display!=='隐藏').map(c=>c.route):[g.route]);
async function resolve(setup){
 const e=env();await e.w.AdminPlatformMenu.load();await e.w.AdminTenantMenu.load('yestar-sz');await setup?.(e);
 const override=e.w.AdminMenuState.read(tenant,'admin-nav-override:yestar-sz');
 return {e,override,result:e.w.AdminTenantMenu.resolve(tenant,e.w.AdminTenantMenu.read('yestar-sz'),override)};
}
(async()=>{
 let r=await resolve();for(const route of routes)ok(leaves(r.result.visible).includes(route),'Fresh route visible');
 eq(chat(r.result.visible).children.slice(-2).map(c=>c.route),routes,'Daily reports append to Chat Management');
 ok(!r.result.visible.find(g=>g.id==='group-12').children.some(c=>routes.includes(c.route)),'No daily report remains in AI Management');
 eq(r.result.visible.find(g=>g.id==='group-12').children.map(c=>c.route),oldTenant.menu.find(g=>g.id==='group-12').children.map(c=>c.route),'Existing AI entries retain their order and parent');
 eq(leaves(r.result.visible).filter(x=>!routes.includes(x)),leaves((await (async()=>{const e=env();await e.w.AdminPlatformMenu.load();await e.w.AdminTenantMenu.load('yestar-sz');return e.w.AdminTenantMenu.resolve(oldTenant,old[rel[1]].menu,e.w.AdminMenuState.migrate(oldTenant,null));})()).visible),'Old visible order retained');
 r=await resolve(({storage})=>storage.set('admin-nav-override:yestar-sz',JSON.stringify({enabled:oldDefaults,labels:{promptTemplate:'我的提示词'},order:{promptTemplate:99},superPermission:{promptTemplate:true}})));
 for(const route of routes)ok(leaves(r.result.visible).includes(route),'Legacy enabled cache gains route');
 eq(r.override.labels,{promptTemplate:'我的提示词'},'Custom labels preserved');eq(r.override.order,{promptTemplate:99},'Custom order preserved');eq(r.override.superPermission,{promptTemplate:true},'Permissions preserved');
 r=await resolve(({storage})=>storage.set('admin-nav-override:yestar-sz',JSON.stringify({enabled:oldDefaults,display:{'group-10':'隐藏'}})));
 ok(!routes.some(x=>leaves(r.result.visible).includes(x)),'Hidden Chat parent stays hidden');
 const chatRoutes=oldTenant.menu.find(g=>g.id==='group-10').children.map(c=>c.route);
 r=await resolve(({storage})=>storage.set('admin-nav-override:yestar-sz',JSON.stringify({enabled:oldDefaults.filter(x=>!chatRoutes.includes(x))})));
 ok(!routes.some(x=>leaves(r.result.visible).includes(x)),'Legacy disabled branch stays disabled');
 r=await resolve(({storage})=>storage.set('admin-nav-override:yestar-sz',JSON.stringify({enabled:oldDefaults,display:{wecomQualityDaily:'隐藏'}})));
 ok(!leaves(r.result.visible).includes(routes[0])&&leaves(r.result.visible).includes(routes[1]),'Per-route hidden override preserved');
 const once=r.override;once.enabled=once.enabled.filter(x=>x!==routes[1]);const twice=r.e.w.AdminMenuState.migrate(tenant,once);
 ok(!twice.enabled.includes(routes[1]),'Migration only once');eq(twice,once,'Idempotent migration');
 for(const which of ['tenant-hide','tenant-delete','platform-hide','platform-delete']){
  r=await resolve(({storage,w})=>{
   const platform=which.startsWith('platform'),model=clone(old[platform?rel[2]:rel[1]][platform?'allMenu':'menu']);
   const parentId=platform?'0-53':'0-42',at=model.tables[0].rows.findIndex(x=>x.id===parentId);let end=at+1;while(end<model.tables[0].rows.length&&model.tables[0].rows[end].tree.depth>0)end++;
   if(which.endsWith('hide'))model.tables[0].rows[at].cells[model.tables[0].headers.indexOf('菜单状态')]='隐藏';else model.tables[0].rows.splice(at,end-at);
   storage.set(platform?w.AdminPlatformMenu.key:w.AdminTenantMenu.key('yestar-sz'),JSON.stringify(model));
  });
  ok(!routes.some(x=>leaves(r.result.visible).includes(x)),which+' respected after cache merge');
 }
 for(const t of nav.tenants.filter(t=>t.id!=='yestar-sz')){
  const e=env();await e.w.AdminPlatformMenu.load();await e.w.AdminTenantMenu.load(t.id);const result=e.w.AdminTenantMenu.resolve(t,e.w.AdminTenantMenu.read(t.id),e.w.AdminMenuState.read(t,'admin-nav-override:'+t.id));
  ok(!routes.some(x=>leaves(result.visible).includes(x)),'No feature entry for '+t.id);
 }
 r=await resolve(({storage,w})=>{const model=clone(now[rel[2]].allMenu);model.tables[0].rows.find(x=>x.tree?.key===routes[0]).cells[4]='隐藏';storage.set(w.AdminPlatformMenu.key,JSON.stringify(model));});
 ok(!leaves(r.result.visible).includes(routes[0])&&leaves(r.result.visible).includes(routes[1]),'Platform child hide honored');
 r=await resolve(({storage,w})=>{
  const model=legacyAI(rel[1],'menu');model.menuLayout={version:1,parents:{wecomQualityDaily:'group-12',wechatQualityDaily:'group-12'},orders:{'group-12':['promptTemplate',...routes],'group-10':['salesReceptionQuery','allChat',...chatRoutes.filter(x=>!['salesReceptionQuery','allChat'].includes(x))]}};
  const row=model.tables[0].rows.find(x=>x.tree?.key===routes[0]);row.cells[0]='我的企微日报';row.cells[1]='是';
  storage.set(w.AdminTenantMenu.key('yestar-sz'),JSON.stringify(model));storage.set(w.AdminPlatformMenu.key,JSON.stringify(legacyAI(rel[2],'allMenu')));
  storage.set('admin-nav-override:yestar-sz',JSON.stringify({enabled:[...oldDefaults,...routes],appliedMigrations:{'chat-quality-daily-v1':true},order:{wecomQualityDaily:99,promptTemplate:42},labels:{allChat:'我的聊天'}}));
 });
 eq(chat(r.result.visible).children.slice(-2).map(c=>c.route),routes,'Opened AI-layout cache moves reports to Chat tail');
 eq(chat(r.result.visible).children.slice(0,2).map(c=>c.route),['salesReceptionQuery','allChat'],'Pre-existing chat custom order preserved');
 eq(chat(r.result.visible).children.slice(-2).map(c=>({route:c.route,label:c.label,superPermission:c.superPermission})),[{route:routes[0],label:'我的企微日报',superPermission:true},{route:routes[1],label:'个微会话质检日报',superPermission:false}],'Moved report custom label and permission retained');
 eq(r.override.order,{promptTemplate:42},'Only former report-position override retired');
 ok(routes.every(route=>leaves(r.result.visible).filter(x=>x===route).length===1),'Move does not duplicate routes');
 const migrated=r.e.w.AdminTenantMenu.read('yestar-sz'),again=r.e.w.AdminTenantMenu.read('yestar-sz');eq(again,migrated,'Cached relocation is idempotent');
 ok(routes.every(route=>migrated.menuLayout.parents[route]==='group-10')&&!migrated.menuLayout.orders['group-12'].some(x=>routes.includes(x)),'Stale AI layout parents and orders removed');
 r=await resolve(({storage})=>storage.set('admin-nav-override:yestar-sz',JSON.stringify({enabled:[...oldDefaults,...routes],appliedMigrations:{'chat-quality-daily-v1':true},display:{'group-12':'隐藏'}})));
 ok(!routes.some(x=>leaves(r.result.visible).includes(x)),'Previously installed reports stay hidden when old AI override was hidden');
 for(const which of ['tenant','platform']){
  r=await resolve(({storage,w})=>{const platform=which==='platform',model=legacyAI(platform?rel[2]:rel[1],platform?'allMenu':'menu'),parentId=platform?'0-65':'0-54';model.tables[0].rows.find(row=>row.id===parentId).cells[model.tables[0].headers.indexOf('菜单状态')]='隐藏';storage.set(platform?w.AdminPlatformMenu.key:w.AdminTenantMenu.key('yestar-sz'),JSON.stringify(model));});
  ok(!routes.some(x=>leaves(r.result.visible).includes(x)),which+' old AI-hidden reports do not gain visibility when moved');
 }
 r=await resolve(({storage,w})=>{const model=legacyAI(rel[1],'menu');model.tables[0].rows=model.tables[0].rows.filter(row=>row.tree?.key!==routes[0]);storage.set(w.AdminTenantMenu.key('yestar-sz'),JSON.stringify(model));});
 ok(!leaves(r.result.visible).includes(routes[0])&&leaves(r.result.visible).includes(routes[1]),'Previously deleted report stays deleted during relocation');
 for(const which of ['tenant','platform']){
  r=await resolve(({storage,w})=>{const platform=which==='platform',model=legacyAI(platform?rel[2]:rel[1],platform?'allMenu':'menu'),rows=model.tables[0].rows,parentId=platform?'0-53':'0-42',at=rows.findIndex(row=>row.id===parentId);let end=at+1;while(end<rows.length&&rows[end].tree.depth>0)end++;rows.splice(at,end-at);storage.set(platform?w.AdminPlatformMenu.key:w.AdminTenantMenu.key('yestar-sz'),JSON.stringify(model));});
  ok(!routes.some(x=>leaves(r.result.visible).includes(x)),which+' removed destination does not reappear during relocation');
 }
 r=await resolve(({storage})=>storage.set('admin-nav-override:yestar-sz',JSON.stringify({enabled:[...oldDefaults,...routes],appliedMigrations:{'chat-quality-daily-v1':true},order:{allChat:-99}})));
 eq(chat(r.result.visible).children.slice(-2).map(c=>c.route),routes,'Reports append even with unrelated legacy numeric chat order');
 const crypto=require('node:crypto');
 const files=[...rel,'admin-menu-state.js'].map(file=>({path:'prototype/'+file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(proto,file))).digest('hex')}));
 const result=saveResult({spec:process.env.QUALITY_CHECK_SPEC || 'SPEC-SUIYIN-ADMIN-092@0.3.0',ok:true,checkedAt:new Date().toISOString(),checks,routes,demoTenant:'yestar-sz',location:'Chat Management / group-10, appended after existing entries',otherTenants:nav.tenants.length-1,baselineRevision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),nodeVersion:process.version,files,scope:'JSON semantic invariants plus isolated menu VM; browser checks remain with main integration',checksInclude:['unchanged tenants outside approved Prompt scope and unrelated page content','unchanged pre-existing menu rows and route order','pinned historical cache baselines including the prior AI parent','unique menu identities and dedicated mock sources','fresh and legacy-enabled route registration','custom labels, order and permissions','hidden or deleted tenant and platform parents','per-route visibility and one-time migration','all other tenant visible menu trees','existing AI cache and stale layout parents moved to Chat tail without duplicates','old hidden or deleted reports do not gain access during relocation','deleted destination groups remain absent']});
 console.log(JSON.stringify(result));
})().catch(e=>{saveResult({spec:process.env.QUALITY_CHECK_SPEC || 'SPEC-SUIYIN-ADMIN-092@0.3.0',ok:false,checkedAt:new Date().toISOString(),checks,error:String(e.stack||e).slice(0,6000)});console.error(e.stack);process.exitCode=1;});
