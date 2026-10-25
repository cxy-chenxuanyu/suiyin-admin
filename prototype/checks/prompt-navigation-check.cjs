/* SPEC-SUIYIN-ADMIN-092@0.3.0: additive Prompt/model navigation, public metadata only. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),cp=require('child_process');
const root=path.resolve(__dirname,'../..'),proto=path.join(root,'prototype'),routes=['promptTemplate','aiEntModelConfig'],ids=['huamei-xian','aoli-xian','jbfs','hqjd'];
const nav=JSON.parse(fs.readFileSync(path.join(proto,'data/navigation-snapshot.json'),'utf8')),results=[];
const clone=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>assert.deepEqual(clone(a),clone(b));
function check(id,description,fn){fn();results.push({id,description,passed:true});}
function head(file){return JSON.parse(cp.execFileSync('git',['show','HEAD:prototype/'+file],{cwd:root,encoding:'utf8',maxBuffer:30*1024*1024}));}
function environment(){const storage=new Map(),w={URLSearchParams,structuredClone,location:{search:''},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},AdminAccountProfile:{normalizePage:x=>x,normalizeOverride:x=>x},fetch:async relative=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(proto,relative),'utf8'))})};w.window=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(proto,'admin-menu-state.js'),'utf8'),w);return{w,storage};}
const leaves=items=>items.flatMap(item=>item.children?leaves(item.children):[item.route]).filter(Boolean);
(async()=>{
 const oldNav=head('data/navigation-snapshot.json');
 for(const id of ids){
  const tenant=nav.tenants.find(t=>t.id===id),prior=oldNav.tenants.find(t=>t.id===id),data=JSON.parse(fs.readFileSync(path.join(proto,'data/content/'+id+'.json'),'utf8')),old=head('data/content/'+id+'.json');
  check(id+'-preserved','Existing tenant menus and unrelated page contents remain unchanged.',()=>{same(tenant.menu.filter(g=>g.id!=='aiManagePrompt092'),prior.menu);same(Object.fromEntries(Object.entries(data).filter(([key])=>key!=='menu'&&!routes.includes(key))),Object.fromEntries(Object.entries(old).filter(([key])=>key!=='menu')));same(data.menu.tables[0].rows.filter(row=>!routes.concat('aiManagePrompt092').includes(row.tree?.key)),old.menu.tables[0].rows);});
  check(id+'-metadata','Observed and awaiting-login evidence remain distinct and tenant-local.',()=>{assert.equal(tenant.promptCaptureMenuMigration.liveObserved,['huamei-xian','aoli-xian'].includes(id));for(const route of routes){assert.equal(data[route].tenant,id);assert.equal(data[route].sampleTenant,id);assert.equal(data[route].tables[0].rows.length,0);}assert.equal(new Set(data.menu.tables[0].rows.map(r=>r.id)).size,data.menu.tables[0].rows.length);});
  const e=environment();await e.w.AdminPlatformMenu.load();await e.w.AdminTenantMenu.load(id);
  const resolve=override=>e.w.AdminTenantMenu.resolve(tenant,e.w.AdminTenantMenu.read(id),e.w.AdminMenuState.migrate(tenant,override));
  check(id+'-fresh','Fresh effective sidebar contains both new local entry points.',()=>{const visible=leaves(resolve(null).visible);routes.forEach(route=>assert(visible.includes(route)));});
  const defaults=e.w.AdminMenuState.defaultEnabled(prior);
  check(id+'-legacy','Legacy visible menu gains only the newly requested routes without changing label or order decisions.',()=>{const oldOverride={enabled:defaults,labels:{[defaults[0]]:'自定义名称'},order:{[defaults[0]]:19}},migrated=e.w.AdminMenuState.migrate(tenant,oldOverride);routes.forEach(route=>assert(migrated.enabled.includes(route)));same(migrated.labels,oldOverride.labels);same(migrated.order,oldOverride.order);});
  check(id+'-hidden','An explicitly hidden route or new parent stays hidden.',()=>{assert(!leaves(resolve({enabled:defaults,display:{promptTemplate:'隐藏'}}).visible).includes('promptTemplate'));const hidden=leaves(resolve({enabled:defaults,display:{aiManagePrompt092:'隐藏'}}).visible);routes.forEach(route=>assert(!hidden.includes(route)));});
  check(id+'-all-hidden','An existing all-hidden menu is not revived by the migration.',()=>{const migrated=e.w.AdminMenuState.migrate(tenant,{enabled:[]});routes.forEach(route=>assert(!migrated.enabled.includes(route)));});
  const legacy=clone(old.menu);legacy.tables[0].rows[0].cells[0]='本地自定义菜单名';e.storage.set(e.w.AdminTenantMenu.key(id),JSON.stringify(legacy));
  check(id+'-stored-menu','Saved menu migration retains edited names and adds the requested entries.',()=>{const merged=e.w.AdminTenantMenu.read(id);assert.equal(merged.tables[0].rows.find(row=>row.id===legacy.tables[0].rows[0].id).cells[0],'本地自定义菜单名');routes.forEach(route=>assert(merged.tables[0].rows.some(row=>row.tree?.key===route)));});
 }
})().then(()=>finish('passed')).catch(error=>{process.exitCode=1;finish('failed',error.message);});
function finish(status,error){const receipt={spec:process.env.QUALITY_CHECK_SPEC || 'SPEC-SUIYIN-ADMIN-092@0.3.0',status,checkedAt:new Date().toISOString(),boundaries:{networkCalls:0,privatePromptsRead:false,productionWrites:0},summary:{total:results.length,passed:results.length},results,error};const file=process.env.QUALITY_CHECK_OUTPUT_DIR?path.resolve(process.env.QUALITY_CHECK_OUTPUT_DIR,'prompt-navigation-check.json'):path.join(root,'docs/verification/prompt-templates-20261024/navigation-check.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status,total:results.length,error,file}));}
