/* Shared local menu visibility. Full inventory stays separate from visible navigation. */
'use strict';
/* SPEC-SUIYIN-ADMIN-073: a folder replaces the old root slot; the page keeps its identity. */
window.AdminToolsMenu=(()=>{
 const version='tools-menu-v1',clone=value=>structuredClone(value);
 const supports=tenant=>tenant?.capabilities?.guideLineManage===true;
 function prepare(source,saved){
  if(source?.toolsMenuMigration?.version!==version||saved?.toolsMenuMigration?.version===version)return null;
  const config=source.toolsMenuMigration,table=source.tables[0],templates=new Map(table.rows.map(row=>[row.id,row]));
  const revision=source.menuRefresh.baselines?.[saved.dataRevision];
  const baseline={route:source.route,tables:[{headers:revision?.headers||source.menuRefresh.previousHeaders||table.headers,rows:revision?.rows||source.menuRefresh.previousRows}]};
  function transform(model){
   const next=clone(model),rows=next.tables[0].rows,language=rows.find(row=>row.id===config.languageRowId);
   const folder=clone(templates.get(config.toolsRowId)),guide=templates.get(config.guideRowId),headers=next.tables[0].headers;
   // The new folder has its own visibility. Old page hiding/permissions stay on the old page.
   const orderIndex=headers.indexOf('排序');if(language&&orderIndex>=0)folder.cells[orderIndex]=language.cells[orderIndex];
   let insertion=language?rows.indexOf(language):-1,descendants=[];
   const oldDepth=Number(language?.tree?.depth)||0;
   if(language){let end=insertion+1;while(end<rows.length&&(Number(rows[end].tree?.depth)||0)>oldDepth)end++;descendants=rows.slice(insertion+1,end);rows.splice(insertion,end-insertion);}
   if(insertion<0||oldDepth>0){const baselineRows=baseline.tables[0].rows,start=baselineRows.findIndex(row=>row.id===config.languageRowId);const after=baselineRows.slice(start+1).find(row=>(Number(row.tree?.depth)||0)===0&&rows.some(item=>item.id===row.id&&(Number(item.tree?.depth)||0)===0));insertion=after?rows.findIndex(row=>row.id===after.id):rows.length;}
   if(language){
    // Existing children of the old page become children of the replacement folder.
    for(const row of descendants){
     row.tree={...row.tree,depth:(Number(row.tree.depth)||0)-oldDepth};
     if(row.tree.parentId===language.id)row.tree.parentId=folder.id;
     if(row.tree.parentKey==='languageManage')row.tree.parentKey='toolsManage';
    }
    language.tree={...language.tree,depth:1,parentId:folder.id,parentKey:source.route==='menu'?'toolsManage':null,hasChildren:false};
    delete language.tree.menuOriginParentKey;delete language.tree.menuOriginDepth;
    if(language.extra&&Object.hasOwn(language.extra,'parentId'))language.extra.parentId=folder.id;
    if(orderIndex>=0)language.cells[orderIndex]='1';
   }
   rows.splice(insertion,0,folder,...(language?[language]:[]),...(guide&&!rows.some(row=>row.id===guide.id)?[clone(guide)]:[]),...descendants);
   if(next.menuLayout){
    const layout=next.menuLayout;
    for(const [key,parent]of Object.entries(layout.parents||{}))if(parent==='languageManage')layout.parents[key]='toolsManage';
    if(layout.parents)delete layout.parents.languageManage;
    if(layout.orders){
     for(const [parent,ids]of Object.entries(layout.orders))if(Array.isArray(ids))layout.orders[parent]=ids.map(id=>id==='languageManage'?'toolsManage':id);
     const oldChildren=layout.orders.languageManage;delete layout.orders.languageManage;
     if(oldChildren)layout.orders.toolsManage=['languageManage',...(guide?['guideLineManage']:[]),...oldChildren.filter(id=>id!=='toolsManage'&&id!=='guideLineManage')];
    }
   }
   return next;
  }
  const effective=clone(source),prior=transform(baseline),local=transform(saved);
  effective.menuRefresh.baselines={...effective.menuRefresh.baselines,[saved.dataRevision]:prior.tables[0]};
  return {source:effective,saved:local};
 }
 return {version,supports,prepare};
})();
/* Refresh only captured defaults; browser-local edits remain a separate layer. */
window.AdminMenuRefresh=(()=>{
 const clone=value=>structuredClone(value),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function accepts(source,saved){return ['menu','allMenu'].includes(source?.route)&&source.menuRefresh?.previousRows&&saved?.tenant===source.tenant&&saved?.route===source.route&&saved.dataRevision!==source.dataRevision&&Array.isArray(saved.tables?.[0]?.rows);}
 function index(rows){const map=new Map(),groups=new Map(),stack=[];for(const [position,row]of rows.entries()){const depth=Number(row.tree?.depth)||0;while(stack.length&&stack.at(-1).depth>=depth)stack.pop();const parent=stack.at(-1)?.row.id||'',entry={row,parent,depth,position};map.set(row.id,entry);if(!groups.has(parent))groups.set(parent,[]);groups.get(parent).push(row.id);stack.push(entry);}return {map,groups};}
 function merge(source,saved){
  if(!accepts(source,saved))return clone(saved?.dataRevision===source?.dataRevision?saved:source);
  const retiredPreview=window.AdminStreetTrajectoryMenu?.retirePreview(source,saved);if(retiredPreview)return retiredPreview;
  const toolsMigration=window.AdminToolsMenu.prepare(source,saved);if(toolsMigration){source=toolsMigration.source;saved=toolsMigration.saved;}
  // Compare local edits with the defaults from their own revision when a later
  // additive page follows a capture refresh; retain the older migration fallback.
  const revision=source.menuRefresh.baselines?.[saved.dataRevision];
  const before=index(revision?.rows||source.menuRefresh.previousRows),current=index(source.tables[0].rows),local=index(saved.tables[0].rows),nodes=new Map();
  const headers=source.tables[0].headers,oldHeaders=revision?.headers||source.menuRefresh.previousHeaders||headers,localHeaders=saved.tables[0].headers;
  for(const [id,next]of current.map){
   const prior=before.map.get(id),edit=local.map.get(id);
   // Missing old rows represent a local deletion. Newly captured rows have no old id.
   if(prior&&!edit)continue;
   let row=clone(next.row),parent=next.parent;
   if(edit){
    row={...clone(edit.row),...row};
    row.cells=headers.map((label,column)=>{const oldColumn=oldHeaders.indexOf(label),localColumn=localHeaders.indexOf(label),previous=prior?.row.cells[oldColumn];let value=edit.row.cells[localColumn];if(source.route==='menu'&&label==='菜单名称'&&edit.row.tree?.menuResolved&&edit.row.tree.menuRenderedLabel===value)value=edit.row.tree.menuLocalLabel??previous;return localColumn>=0&&(!prior||!same(value,previous))?value:next.row.cells[column];});
    if(edit.row.extra)row.extra=clone(edit.row.extra);
    // Resolved tenant rows include platform-derived parents, which are not tenant decisions.
    if(prior&&!edit.row.tree?.menuResolved&&(edit.parent!==prior.parent||edit.depth!==prior.depth)){parent=edit.parent;row.tree={...row.tree,...clone(edit.row.tree)};}
    else if(edit.row.tree?.menuResolved){row.tree={...row.tree,menuResolved:true,menuOriginParentKey:next.row.tree?.parentKey||null,menuOriginDepth:next.depth,menuLocalLabel:row.cells[0],menuRenderedLabel:row.cells[0]};}
   }
   nodes.set(id,{row,parent,index:next.position});
  }
  // Local-only additions keep their identity and fields; retired captured defaults do not reappear.
  for(const [id,entry]of local.map)if(!current.map.has(id)&&!before.map.has(id))nodes.set(id,{row:clone(entry.row),parent:entry.parent,index:current.map.size+entry.position});
  let removed;do{removed=false;for(const [id,node]of nodes)if(node.parent&&!nodes.has(node.parent)&&!before.map.has(id)&&!local.map.has(id)){nodes.delete(id);removed=true;}}while(removed);
  const groups=new Map();for(const [id,node]of nodes){if(!groups.has(node.parent))groups.set(node.parent,[]);groups.get(node.parent).push(id);}
  for(const [parent,ids]of groups){
   ids.sort((a,b)=>nodes.get(a).index-nodes.get(b).index);
   const was=before.groups.get(parent)||[],edited=local.groups.get(parent)||[],common=new Set(was.filter(id=>edited.includes(id)&&nodes.has(id)));
   const oldOrder=was.filter(id=>common.has(id)),localOrder=edited.filter(id=>common.has(id));
   if(same(oldOrder,localOrder))continue;
   const ordered=edited.filter(id=>ids.includes(id));
   for(const id of ids.filter(id=>!ordered.includes(id))){const sourceOrder=current.groups.get(parent)||[],at=sourceOrder.indexOf(id),after=sourceOrder.slice(at+1).find(candidate=>ordered.includes(candidate));if(after)ordered.splice(ordered.indexOf(after),0,id);else ordered.push(id);}
   groups.set(parent,ordered);
  }
  const rows=[],visited=new Set();function emit(parent,depth){for(const id of groups.get(parent)||[]){if(visited.has(id))continue;visited.add(id);const node=nodes.get(id),row=node.row;row.tree={...row.tree,depth,parentId:parent,hasChildren:!!groups.get(id)?.length};if(source.route==='menu')row.tree.parentKey=parent?(nodes.get(parent)?.row.tree?.key||null):null;rows.push(row);emit(id,depth+1);}}
  emit('',0);
  // Keep orphaned local rows for repair rather than promoting their old children into navigation.
  for(const [id,node]of nodes)if(!visited.has(id))rows.push(node.row);
  const result={...clone(saved),...clone(source),tables:[{...clone(source.tables[0]),rows},...clone(source.tables.slice(1))],previousSampleRevision:saved.dataRevision,menuRefreshApplied:source.dataRevision};
  for(const field of ['history','auditRecords','menuLayout','config'])if(Object.hasOwn(saved,field))result[field]=clone(saved[field]);
  return result;
 }
 return {accepts,merge};
})();
window.AdminMenuState={
 defaultEnabled(tenant){return tenant.menu.filter(g=>g.display!=='隐藏').flatMap(g=>g.children?g.children.filter(c=>c.display!=='隐藏').map(c=>c.route):[g.route]);},
 migrate(tenant,override){
  const migration='sales-voice-stats-v1',route='salesVoiceStats';
  if(override?.appliedMigrations?.[migration])return override;
  const saved=structuredClone(override||{}),parent=tenant.menu.find(g=>g.children?.some(c=>c.route===route));
  const hadEnabled=Array.isArray(saved.enabled);
  if(!hadEnabled)saved.enabled=this.defaultEnabled(tenant);
  if(parent&&hadEnabled&&!saved.enabled.includes(route)&&saved.display?.[route]!=='隐藏'){
   const parentKey=parent.route||parent.id,parentShown=(saved.display?.[parentKey]??parent.display)!=='隐藏';
   // A legacy selection with no enabled children means this branch was hidden.
   const hasVisibleSibling=parent.children.some(c=>c.route!==route&&saved.enabled.includes(c.route)&&(saved.display?.[c.route]??c.display)!=='隐藏');
   if(parentShown&&hasVisibleSibling)saved.enabled.push(route);
  }
  saved.appliedMigrations={...saved.appliedMigrations,[migration]:true};
  saved.menuDataRevision=tenant.menuDataRevision||'2026-09-20-menu-sales-voice-stats-v1';
  return saved;
 },
 read(tenant,storageKey){
  let saved;try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
  const migrated=window.AdminAccountProfile.normalizeOverride(this.migrate(tenant,saved));
  if(JSON.stringify(migrated)!==JSON.stringify(saved)){try{localStorage.setItem(storageKey,JSON.stringify(migrated));}catch{}}
  return migrated;
 },
 visible(tenant,override){
  override=this.migrate(tenant,override);
  const enabled=new Set(override.enabled),shown=item=>(override.display?.[item.route||item.id]??item.display)!=='隐藏';
  const decorate=item=>({...item,label:override.labels?.[item.route||item.id]||item.label});
  const order=items=>items.map(decorate).sort((a,b)=>{const av=override.order?.[a.route||a.id],bv=override.order?.[b.route||b.id];return av===undefined&&bv===undefined?0:(bv??b.sort??0)-(av??a.sort??0);});
  return order(tenant.menu).filter(shown).map(g=>g.children?{...g,children:order(g.children).filter(c=>shown(c)&&enabled.has(c.route))}:g).filter(g=>g.children?g.children.length:enabled.has(g.route));
 }
};

/* SPEC-SUIYIN-ADMIN-058: ai-cost-stats-v1 migration. */
(() => {
 const state=window.AdminMenuState,previous=state.migrate;
 state.migrate=function(tenant,override){
  const migrated=previous.call(this,tenant,override),migration='ai-cost-stats-v1',route='aiCostStats';
  if(migrated?.appliedMigrations?.[migration])return migrated;
  const parent=tenant.menu.find(group=>group.children?.some(child=>child.route===route));
  if(!parent)return migrated;
  const saved=structuredClone(migrated||{}),hadEnabled=Array.isArray(override?.enabled);
  const wasEnabled=hadEnabled&&override.enabled.includes(route);
  if(!Array.isArray(saved.enabled))saved.enabled=this.defaultEnabled(tenant);
  if(!wasEnabled){
   saved.enabled=saved.enabled.filter(item=>item!==route);
   const parentKey=parent.route||parent.id,parentShown=(saved.display?.[parentKey]??parent.display)!=='隐藏';
   const child=parent.children.find(item=>item.route===route),childShown=(saved.display?.[route]??child.display)!=='隐藏';
   const siblingShown=parent.children.some(item=>item.route!==route&&saved.enabled.includes(item.route)&&(saved.display?.[item.route]??item.display)!=='隐藏');
   if(parentShown&&childShown&&(!hadEnabled||siblingShown))saved.enabled.push(route);
  }
  saved.appliedMigrations={...saved.appliedMigrations,[migration]:true};
  saved.menuDataRevision=tenant.menuDataRevision||'2026-09-20-menu-ai-cost-stats-v1';
  return saved;
 };
})();

/* Newly captured pages join old default selections without reviving an explicitly hidden branch. */
(()=>{
 const state=window.AdminMenuState,previous=state.migrate;
 state.migrate=function(tenant,override){
  const saved=previous.call(this,tenant,override),migration='live-menu-refresh-20260927';
  if(!tenant.menuRefreshAddedRoutes||saved.appliedMigrations?.[migration])return saved;
  const next=structuredClone(saved),oldEnabled=override?.enabled,oldRoutes=new Set(tenant.menuRefreshPreviousRoutes||[]),added=new Set(tenant.menuRefreshAddedRoutes);
  if(Array.isArray(oldEnabled)){
   const previousDefaults=tenant.menuRefreshPreviousDefaults||[];
   const untouched=oldEnabled.length===previousDefaults.length&&previousDefaults.every(route=>oldEnabled.includes(route));
   if(untouched&&!Object.keys(override.display||{}).length)next.enabled=this.defaultEnabled(tenant);
   else for(const group of tenant.menu){
    const children=group.children||[group],parentShown=(next.display?.[group.route||group.id]??group.display)!=='隐藏';
    const newBranch=children.every(child=>!oldRoutes.has(child.route));
    const siblingShown=children.some(child=>oldRoutes.has(child.route)&&next.enabled.includes(child.route)&&(next.display?.[child.route]??child.display)!=='隐藏');
    for(const child of children)if(added.has(child.route)&&!next.enabled.includes(child.route)&&parentShown&&(next.display?.[child.route]??child.display)!=='隐藏'&&(newBranch||siblingShown))next.enabled.push(child.route);
   }
  }
  next.appliedMigrations={...next.appliedMigrations,[migration]:true};next.menuDataRevision=tenant.menuDataRevision;return next;
 };
})();

/* SPEC-SUIYIN-ADMIN-071@1.2.0: add the existing Yestar tenants without reviving hidden menus. */
(()=>{
 const state=window.AdminMenuState,previous=state.migrate;
 state.migrate=function(tenant,override){
  const saved=previous.call(this,tenant,override),migration='revisit-rules-v1',route='revisitRules';
  if(!['yestar-sz','yestar','yestar-bj','yestar-gz','yestar-hz','yestar-jx'].includes(tenant.id)||saved.appliedMigrations?.[migration])return saved;
  const parent=tenant.menu.find(group=>group.children?.some(child=>child.route===route));
  if(!parent)return saved;
  const next=structuredClone(saved),child=parent.children.find(item=>item.route===route);
  const parentShown=(next.display?.[parent.route||parent.id]??parent.display)!=='隐藏';
  const childShown=(next.display?.[route]??child.display)!=='隐藏';
  const hadEnabled=Array.isArray(override?.enabled);
  const siblingShown=parent.children.some(item=>item.route!==route&&next.enabled.includes(item.route)&&(next.display?.[item.route]??item.display)!=='隐藏');
  if(!next.enabled.includes(route)&&parentShown&&childShown&&(!hadEnabled||siblingShown))next.enabled.push(route);
  next.appliedMigrations={...next.appliedMigrations,[migration]:true};
  next.menuDataRevision=tenant.menuDataRevision;
  return next;
 };
})();

/* Keep legacy navigation preferences attached to the stable page, and move its root order to the folder. */
(()=>{
 const state=window.AdminMenuState,previous=state.migrate;
 state.migrate=function(tenant,override){
  const saved=previous.call(this,tenant,override),migration=window.AdminToolsMenu.version;
  if(tenant.toolsMenuMigration!==migration||saved.appliedMigrations?.[migration])return saved;
  const next=structuredClone(saved);
  if(next.order?.languageManage!==undefined){next.order.toolsManage=next.order.languageManage;delete next.order.languageManage;}
  if(window.AdminToolsMenu.supports(tenant)&&next.display?.guideLineManage!=='隐藏'&&next.display?.toolsManage!=='隐藏'&&!next.enabled.includes('guideLineManage'))next.enabled.push('guideLineManage');
  if(!window.AdminToolsMenu.supports(tenant))next.enabled=next.enabled.filter(route=>route!=='guideLineManage');
  next.appliedMigrations={...next.appliedMigrations,[migration]:true};next.menuDataRevision=tenant.menuDataRevision;
  return next;
 };
})();

/* SPEC-SUIYIN-ADMIN-081@1.1.0: medical profiles only, without reviving hidden menus.
 * Existing medical tenants keep their recruitment anchor; newly approved medical
 * skeletons receive only the necessary data group and this page. */
window.AdminStreetTrajectoryMenu=(()=>{
 const route='streetTrajectories',migration='street-trajectories-medical-v2';
 const supports=tenant=>tenant?.industry==='medical-aesthetics'&&tenant?.capabilities?.streetTrajectories===true;
 function retirePreview(source,saved){
  // The unpublished broader preview only added this row to the same released
  // menu. Retire it without storing duplicate full-table snapshots per tenant.
  if(source.route!=='menu'||source.tables[0].rows.some(row=>row.tree?.key===route)||!['street-trajectories-v1',migration].some(version=>saved.dataRevision===source.dataRevision+'-'+version))return null;
  const next={...structuredClone(saved),...structuredClone(source),tables:structuredClone(saved.tables),previousSampleRevision:saved.dataRevision,menuRefreshApplied:source.dataRevision};
  next.tables[0].rows=next.tables[0].rows.filter(row=>row.tree?.key!==route);
  for(const field of ['history','auditRecords','menuLayout','config'])if(Object.hasOwn(saved,field))next[field]=structuredClone(saved[field]);
  if(next.menuLayout){delete next.menuLayout.parents?.[route];for(const [parent,order]of Object.entries(next.menuLayout.orders||{}))if(Array.isArray(order))next.menuLayout.orders[parent]=order.filter(id=>id!==route);}
  return next;
 }
 const state=window.AdminMenuState,previous=state.migrate;
 state.migrate=function(tenant,override){
  const saved=previous.call(this,tenant,override);
  if(!supports(tenant)){
   if(!saved.enabled?.includes(route))return saved;
   const next=structuredClone(saved);next.enabled=next.enabled.filter(item=>item!==route);
   next.appliedMigrations={...next.appliedMigrations,[migration]:true};return next;
  }
  const parent=tenant.menu.find(group=>group.children?.some(child=>child.route===route));
  if(!parent||saved.appliedMigrations?.[migration])return saved;
  const next=structuredClone(saved),child=parent.children.find(item=>item.route===route);
  const parentShown=(next.display?.[parent.route||parent.id]??parent.display)!=='隐藏';
  const childShown=(next.display?.[route]??child.display)!=='隐藏';
  const hadEnabled=Array.isArray(override?.enabled);
  const previouslyHidden=override?.appliedMigrations?.['street-trajectories-v1']&&hadEnabled&&!override.enabled.includes(route)&&tenant.streetTrajectoriesNewParent!==true;
  const siblingShown=parent.children.some(item=>item.route!==route&&next.enabled.includes(item.route)&&(next.display?.[item.route]??item.display)!=='隐藏');
  if(!previouslyHidden&&!next.enabled.includes(route)&&parentShown&&childShown&&(!hadEnabled||siblingShown||tenant.streetTrajectoriesNewParent===true))next.enabled.push(route);
  next.appliedMigrations={...next.appliedMigrations,[migration]:true};next.menuDataRevision=tenant.menuDataRevision;
  return next;
 };
 function placeDefault(tenant,list,baseline,current){
  const anchor=tenant.streetTrajectoriesAnchor,at=list.findIndex(node=>node.key===route),anchorAt=list.findIndex(node=>node.key===anchor);
  if(at<0||anchorAt<0||!anchor)return;
  const original=baseline?.byRoute.get(route),present=current?.byRoute.get(route);
  if(original&&present){
   if(original.parentId!==present.parentId)return;
   // A platform reorder across this slot is an explicit decision and wins.
   for(const node of baseline.nodes.values())if(node.id!==original.id&&node.parentId===original.parentId){
    const live=current.nodes.get(node.id);
    if(live?.parentId===present.parentId&&(node.index<original.index)!==(live.index<present.index))return;
   }
  }
  const [item]=list.splice(at,1);list.splice(list.findIndex(node=>node.key===anchor)+1,0,item);
 }
 return {placeDefault,supports,retirePreview};
})();

/* SPEC-SUIYIN-ADMIN-060@1.1.0: one local platform definition, all tenant sidebars.
 * Project only existing tenant routes; never copy another tenant's page inventory. */
window.AdminPlatformMenu=(()=>{
 const qa=new URLSearchParams(location.search).get('qa')==='1';
 const key=(qa?'admin-qa:v1:':'admin-content:v1:')+'bzds:allMenu';
 let baseline,baselineModel,pending;
 function tree(model){
  window.AdminAccountProfile.normalizePage(model);
  const table=model?.tables?.[0];if(!Array.isArray(table?.rows)||!Array.isArray(table.headers))return null;
  const column=label=>table.headers.indexOf(label),routeColumn=column('菜单路由'),statusColumn=column('菜单状态');
  if(routeColumn<0||statusColumn<0)return null;
  const nodes=new Map(),byRoute=new Map(),stack=[];
  for(const [index,row]of table.rows.entries()){
   if(!row?.id||!Array.isArray(row.cells)||nodes.has(row.id))return null;
   const depth=row.tree?.depth??0;while(stack.length&&stack.at(-1).depth>=depth)stack.pop();
   const parent=stack.at(-1),item={id:row.id,parentId:parent?.id||'',rootId:parent?.rootId||row.id,depth,index,route:row.cells[routeColumn]||'',label:row.cells[0],display:row.cells[statusColumn]};
   nodes.set(item.id,item);if(item.route)byRoute.set(item.route,item);stack.push(item);
  }
  return {nodes,byRoute};
 }
 async function load(){
  if(!pending)pending=fetch('data/content/bzds.json').then(r=>{if(!r.ok)throw Error('平台菜单配置读取失败');return r.json();}).then(data=>{baselineModel=data.allMenu;baseline=tree(data.allMenu);if(!baseline)throw Error('平台菜单配置无效');});
  return pending;
 }
 function read(){try{let saved=JSON.parse(localStorage.getItem(key)||'null');if(window.AdminMenuRefresh.accepts(baselineModel,saved)){saved=window.AdminMenuRefresh.merge(baselineModel,saved);try{localStorage.setItem(key,JSON.stringify(saved));}catch{}}return saved?.tenant==='bzds'&&saved?.route==='allMenu'?tree(saved):null;}catch{return null;}}
 function project(tenant,visible,override={}){
  const current=read();if(!baseline||!current)return visible;
  const templates=new Map(),groupIds=new Map();
  for(const group of tenant.menu){
   // Snapshot group ids are tenant-local. Resolve them through their original route inventory.
   let id=baseline.byRoute.get(group.route)?.id;
   if(!id&&group.children){
    const votes=new Map();for(const child of group.children){const root=baseline.byRoute.get(child.route)?.rootId;if(root)votes.set(root,(votes.get(root)||0)+1);}
    const ranked=[...votes].sort((a,b)=>b[1]-a[1]);if(ranked[0]&&(!ranked[1]||ranked[0][1]>ranked[1][1]))id=ranked[0][0];
   }
   if(id){templates.set(id,group);groupIds.set(group.id,id);}
  }
  const buckets=new Map(),original=[];
  function bucket(id,fallback){
   if(buckets.has(id))return buckets.get(id);
   const definition=current.nodes.get(id),template=templates.get(id)||fallback;
   const base=definition?baseline.nodes.get(id):null;
   const group=template?{...template}:{id:'platform-'+id,label:definition.label,platformLabel:definition.label};
   if(definition&&(!base||definition.label!==base.label))group.label=definition.label;
   const result={id,group,definition,children:[],self:null};buckets.set(id,result);original.push(result);return result;
  }
  function shown(definition){
   const seen=new Set();while(definition){if(seen.has(definition.id)||definition.display==='隐藏')return false;seen.add(definition.id);if(!definition.parentId)return true;definition=current.nodes.get(definition.parentId);if(!definition)return false;}return false;
  }
  for(const group of visible){
   const groupId=groupIds.get(group.id);
   for(const leaf of group.children||[group]){
    const base=baseline.byRoute.get(leaf.route),definition=base?current.nodes.get(base.id):null;
    if(base&&(!definition||!shown(definition)))continue;
    const targetId=definition?.rootId||groupId||'tenant:'+group.id;
    const targetDefinition=current.nodes.get(targetId);
    if(targetDefinition&&!shown(targetDefinition))continue;
    const template=templates.get(targetId);
    if(template&&(override.display?.[template.route||template.id]??template.display)==='隐藏')continue;
    const target=bucket(targetId,groupId===targetId||!definition?group:null);
    const item={...leaf};if(definition&&definition.label!==base.label)item.label=definition.label;
    const entry={item,index:definition?.index??Number.MAX_SAFE_INTEGER};
    if(definition&&!definition.parentId&&!group.children)target.self=entry;
    else if(!definition&&!group.children&&!groupId)target.self=entry;
    else target.children.push(entry);
   }
  }
  // Keep unmatched tenant-specific groups in their slots; order known groups by the platform tree.
  const sorted=original.filter(b=>b.definition).sort((a,b)=>a.definition.index-b.definition.index);let next=0;
  return original.map(b=>b.definition?sorted[next++]:b).map(b=>{
   const children=b.children.sort((a,c)=>a.index-c.index).map(e=>e.item);
   if(b.self&&!children.length)return b.self.item;
   // A leaf can receive children. Retain its own page as the first entry in that group.
   if(b.self)children.unshift(b.self.item);
   const group={...b.group,children};delete group.route;return group;
  }).filter(g=>!g.children||g.children.length);
 }
 // Read-only definitions for the tenant resolver. The legacy 060 projection stays intact.
 function definition(){return {baseline,current:read()};}
 return {key,load,project,definition};
})();

/* SPEC-SUIYIN-ADMIN-068: the table and sidebar share one complete effective tree.
 * A saved layout records only explicit tenant decisions, never a frozen platform tree.
 * Persistence belongs to the content model's single storage key. These helpers are pure. */
window.AdminTenantMenu=(()=>{
 const qa=new URLSearchParams(location.search).get('qa')==='1',sources=new Map(),pending=new Map();
 const key=id=>(qa?'admin-qa:v1:':'admin-content:v1:')+id+':menu';
 const clone=value=>structuredClone(value),identity=row=>String(row.tree?.key||row.id);
 async function load(id){
  if(!pending.has(id))pending.set(id,fetch('data/content/'+encodeURIComponent(id)+'.json').then(r=>{if(!r.ok)throw Error('租户菜单配置读取失败');return r.json();}).then(data=>{if(!Array.isArray(data.menu?.tables?.[0]?.rows))throw Error('租户菜单配置无效');window.AdminAccountProfile.normalizePage(data.menu);sources.set(id,clone(data.menu));return clone(data.menu);}).catch(error=>{pending.delete(id);throw error;}));
  await pending.get(id);return clone(sources.get(id));
 }
 function read(id){
  let saved;try{saved=JSON.parse(localStorage.getItem(key(id))||'null');}catch{}
  window.AdminAccountProfile.normalizePage(saved);
  if(window.AdminMenuRefresh.accepts(sources.get(id),saved)){saved=window.AdminMenuRefresh.merge(sources.get(id),saved);try{localStorage.setItem(key(id),JSON.stringify(saved));}catch{}}
  return saved?.tenant===id&&saved?.route==='menu'&&Array.isArray(saved.tables?.[0]?.rows)?saved:clone(sources.get(id)||null);
 }
 function structure(rows){
  const nodes=new Map(),groups=new Map(),duplicates=[],stack=[];
  for(const [index,row]of rows.entries()){
   const id=identity(row),depth=Number(row.tree?.depth)||0;
   while(stack.length&&stack.at(-1).depth>=depth)stack.pop();
   const parent=stack.at(-1)?.key||'',node={key:id,row,index,depth,parent};
   if(nodes.has(id))duplicates.push(id);else nodes.set(id,node);
   if(!groups.has(parent))groups.set(parent,[]);groups.get(parent).push(id);stack.push(node);
  }
  return {nodes,groups,duplicates};
 }
 function captureMove(beforeRows,afterRows,oldLayout,movedId){
  const before=structure(beforeRows),after=structure(afterRows),layout=clone(oldLayout||{});
  layout.version=1;layout.parents??={};layout.orders??={};
  const moved=afterRows.find(row=>row.id===movedId),id=moved&&identity(moved),previous=id&&before.nodes.get(id),current=id&&after.nodes.get(id);
  if(!previous||!current)return layout;
  if(previous.parent!==current.parent)layout.parents[id]=current.parent;
  for(const parent of new Set([previous.parent,current.parent])){
   const was=before.groups.get(parent)||[],next=after.groups.get(parent)||[];
   if(JSON.stringify(was)!==JSON.stringify(next))layout.orders[parent||'$root']=next;
  }
  return layout;
 }
 function resolve(tenant,model,navOverride={}){
  const table=model?.tables?.[0],warnings=[],conflicts=[],conflictIds=[];
  if(!Array.isArray(table?.rows))return {rows:[],visible:[],warnings,conflicts,conflictIds};
  const original=sources.get(tenant.id)||model,baseTable=original.tables[0],base=structure(baseTable.rows),input=structure(table.rows),layout=model.menuLayout;
  const override=window.AdminMenuState.migrate(tenant,navOverride),enabled=new Set(override.enabled||[]);
  const indices={name:table.headers.indexOf('菜单名称'),display:table.headers.indexOf('菜单状态'),super:table.headers.indexOf('超级权限'),order:table.headers.indexOf('排序')};
  const nav=new Map(),routeKeys=new Map(),navParents=new Map(),navOrder=new Map();
  function collect(items,parent=''){
   for(const item of items){const id=item.route||item.id;navOrder.set(id,navOrder.size);nav.set(id,item);navParents.set(id,parent);if(item.route){if(!routeKeys.has(item.route))routeKeys.set(item.route,[]);routeKeys.get(item.route).push(id);}if(item.children)collect(item.children,id);}
  }
  collect(tenant.menu);
  const ambiguous=new Set(input.duplicates),rowIds=new Map();
  for(const row of table.rows){if(!rowIds.has(row.id))rowIds.set(row.id,[]);rowIds.get(row.id).push(identity(row));}
  for(const id of input.duplicates)conflicts.push('菜单配置存在重复身份：'+id);
  for(const [id,keys]of rowIds)if(keys.length>1){conflicts.push('菜单配置存在重复行标识：'+id);keys.forEach(key=>ambiguous.add(key));}
  for(const [route,ids]of routeKeys)if(ids.length>1){conflicts.push('菜单配置存在重复路由：'+route);ids.forEach(id=>ambiguous.add(id));}
  if(conflicts.length){
   // Keep every raw row for repair, but never let a malformed tree bypass platform
   // restrictions or discard an already-saved layout. Ambiguous branches have no
   // safe navigation identity; resolve the remaining inventory with the same rules.
   const stack=[],safeRows=table.rows.filter(row=>{const depth=Number(row.tree?.depth)||0;while(stack.length&&stack.at(-1).depth>=depth)stack.pop();const blocked=ambiguous.has(identity(row))||!!stack.at(-1)?.blocked;stack.push({depth,blocked});return !blocked;});
   const safeItems=items=>items.filter(item=>!ambiguous.has(item.route||item.id)).map(item=>item.children?{...item,children:safeItems(item.children)}:item);
   const safeTenant={...tenant,menu:safeItems(tenant.menu)},safeModel={...model,tables:[{...table,rows:safeRows},...model.tables.slice(1)]};
   const safe=resolve(safeTenant,safeModel,override);
   // Until the complete tree is unambiguous, no drag may report a successful save
   // against a different table inventory than the sidebar's safe projection.
   conflictIds.push(...table.rows.map(row=>row.id));
   return {rows:clone(table.rows),visible:safe.visible,warnings:['菜单配置存在冲突，暂不能调整顺序；原数据已保留',...safe.warnings],conflicts,conflictIds};
  }
  const {baseline,current}=window.AdminPlatformMenu.definition(),platform=!!(baseline&&current);
  const nodes=new Map(),rootByPlatform=new Map(),platformByRoot=new Map();
  function platformRoot(group){
   let id=baseline?.byRoute.get(group.route)?.rootId;
   if(!id&&group.children){const votes=new Map();for(const child of group.children){const root=baseline?.byRoute.get(child.route)?.rootId;if(root)votes.set(root,(votes.get(root)||0)+1);}const ranked=[...votes].sort((a,b)=>b[1]-a[1]);if(ranked[0]&&(!ranked[1]||ranked[0][1]>ranked[1][1]))id=ranked[0][0];}
   return id;
  }
  for(const group of tenant.menu){const id=platformRoot(group),groupKey=group.route||group.id;if(id&&input.nodes.has(groupKey)){rootByPlatform.set(id,groupKey);platformByRoot.set(groupKey,id);}}
  const legacyOrder=node=>Number(override.order?.[node.key]??nav.get(node.key)?.sort??base.nodes.get(node.key)?.row.cells[indices.order]??0);
  for(const [id,entry]of input.nodes){
    // Retired unpublished 081 scope must not survive as a local-only menu row.
    if(id==='streetTrajectories'&&!window.AdminStreetTrajectoryMenu.supports(tenant))continue;
   // Generated folders only exist while their platform definition still exists.
   if(entry.row.tree?.menuSynthetic&&!current?.nodes.has(entry.row.tree.platformId))continue;
   const source=base.nodes.get(id),item=nav.get(id),row=clone(entry.row);
   // Legacy edits may already contain a deeper branch. Remember its original relation,
   // separately from the last rendered platform relation, without losing that branch.
   const origin=Object.hasOwn(row.tree||{},'menuOriginParentKey')?{parent:row.tree.menuOriginParentKey||'',depth:row.tree.menuOriginDepth}:!row.tree?.menuResolved&&!layout?entry:source||entry,parent=origin.parent;
   const previousLabel=row.tree?.menuRenderedLabel,localLabel=override.labels?.[id]??(row.tree?.menuResolved&&previousLabel===row.cells[indices.name]?row.tree.menuLocalLabel??source?.row.cells[indices.name]??row.cells[indices.name]:row.cells[indices.name]);
   const node={key:id,row,item,parent,originParent:parent,originDepth:origin.depth,depth:origin.depth,index:source?.index??entry.index,definition:null,platformAllowed:true,synthetic:!!row.tree?.menuSynthetic,localLabel};
   if(indices.name>=0)row.cells[indices.name]=localLabel;
   if(indices.display>=0&&override.display?.[id]!==undefined)row.cells[indices.display]=override.display[id];
   if(indices.super>=0&&override.superPermission?.[id]!==undefined)row.cells[indices.super]=override.superPermission[id]?'是':'否';
   nodes.set(id,node);
  }
  function allowed(definition){
   const seen=new Set();while(definition){if(seen.has(definition.id)||definition.display==='隐藏')return false;seen.add(definition.id);if(!definition.parentId)return true;definition=current.nodes.get(definition.parentId);}return false;
  }
  function ensureRoot(platformId){
   const existing=rootByPlatform.get(platformId);if(existing&&nodes.has(existing))return existing;
   const definition=current.nodes.get(platformId);if(!definition)return '';
   const id='platform-'+platformId;
   if(!nodes.has(id)){
    const cells=table.headers.map(()=>''),put=(index,value)=>{if(index>=0)cells[index]=value;};put(indices.name,override.labels?.[id]||definition.label);put(indices.display,override.display?.[id]||'显示');put(indices.super,override.superPermission?.[id]?'是':'否');put(table.headers.indexOf('操作'),'编辑 删除 记录');
    const row={id:'tenant-'+id,cells,actions:['编辑','删除','记录'],tree:{key:id,depth:0,parentKey:null,parentId:'',hasChildren:true,menuSynthetic:true,platformId}};
    nodes.set(id,{key:id,row,item:null,parent:'',originParent:'',originDepth:0,depth:0,index:table.rows.length+definition.index,definition,platformAllowed:allowed(definition),synthetic:true,localLabel:cells[indices.name]});
   }
   rootByPlatform.set(platformId,id);platformByRoot.set(id,platformId);return id;
  }
  const deepRoots=new Set();
  for(const node of nodes.values())if(node.originDepth>1){let root=node,seen=new Set();while(root.originParent&&nodes.has(root.originParent)&&!seen.has(root.key)){seen.add(root.key);root=nodes.get(root.originParent);}deepRoots.add(root.key);}
  const deepBranch=node=>{const seen=new Set();while(node&&!seen.has(node.key)){if(deepRoots.has(node.key))return true;seen.add(node.key);node=nodes.get(node.originParent);}return false;};
  if(platform){
   for(const node of [...nodes.values()]){
    const route=node.item?.route,baseDefinition=route&&baseline.byRoute.get(route),rootId=platformByRoot.get(node.key)||node.row.tree?.platformId;
    node.definition=baseDefinition?current.nodes.get(baseDefinition.id):rootId?current.nodes.get(rootId):null;
    if(baseDefinition||rootId)node.platformAllowed=!!node.definition&&allowed(node.definition);
    const oldDefinition=baseDefinition||baseline.nodes.get(rootId);
    if(node.definition&&node.definition.label!==oldDefinition?.label&&override.labels?.[node.key]===undefined&&indices.name>=0)node.row.cells[indices.name]=node.definition.label;
    // Preserve historical deeper branches. Their controls are deliberately disabled.
    if(deepBranch(node))continue;
    if(baseDefinition&&node.definition&&(node.definition.parentId||node.originDepth>0)){const target=ensureRoot(node.definition.rootId);if(target&&target!==node.key){node.parent=target;node.depth=1;}}
   }
  }
  // Invalid destinations stay in the layout but are suspended until they return.
  for(const [id,parent]of Object.entries(layout?.parents||{})){
   const node=nodes.get(id),target=nodes.get(parent);
   if(!node)continue;
   if(deepBranch(node)||(node.originDepth!==1&&!node.item?.route)||!target||target.parent||target.key===id||(platform&&platformByRoot.has(parent)&&!current.nodes.has(platformByRoot.get(parent)))){warnings.push('菜单「'+node.row.cells[indices.name]+'」的目标一级菜单暂不可用，已跟随当前默认归属');continue;}
   node.parent=parent;node.depth=1;
  }
  const groups=new Map();
  for(const node of nodes.values()){
   if(node.parent&&!nodes.has(node.parent)){
    // A locally deleted parent cannot silently promote its old child to a new page.
    node.platformAllowed=false;node.parent='';node.depth=0;
   }
   if(!groups.has(node.parent))groups.set(node.parent,[]);groups.get(node.parent).push(node);
  }
  for(const [parent,list]of groups){
   list.sort((a,b)=>a.index-b.index);
   // Old numeric values remain descending only on the old baseline, never 1..N output.
   list.sort((a,b)=>override.order?.[a.key]===undefined&&override.order?.[b.key]===undefined?0:legacyOrder(b)-legacyOrder(a));
   if(platform){
    if(parent){list.sort((a,b)=>(a.definition?.index??Number.MAX_SAFE_INTEGER)-(b.definition?.index??Number.MAX_SAFE_INTEGER));}
    else {const known=list.filter(node=>node.definition).sort((a,b)=>a.definition.index-b.definition.index);let offset=0;for(let i=0;i<list.length;i++)if(list[i].definition)list[i]=known[offset++];}
   }
   const order=layout?.orders?.[parent||'$root'];
    if(!Array.isArray(order)&&!list.some(node=>override.order?.[node.key]!==undefined))window.AdminStreetTrajectoryMenu.placeDefault(tenant,list,baseline,current);
   if(Array.isArray(order)){const ranks=new Map(order.map((id,i)=>[id,i]));list.sort((a,b)=>(ranks.get(a.key)??Number.MAX_SAFE_INTEGER)-(ranks.get(b.key)??Number.MAX_SAFE_INTEGER));}
  }
  const rows=[],visited=new Set();
  function emit(parent,depth){
   for(const [position,node]of (groups.get(parent)||[]).entries()){
    if(visited.has(node.key))continue;visited.add(node.key);
    const children=groups.get(node.key)||[],row=node.row;
    row.tree={...row.tree,key:node.key,depth,parentKey:parent||null,parentId:parent?nodes.get(parent).row.id:'',hasChildren:children.length>0,menuResolved:true,menuOriginParentKey:node.originParent||null,menuOriginDepth:node.originDepth,menuLocalLabel:node.localLabel,menuRenderedLabel:row.cells[indices.name]};
    if(indices.order>=0)row.cells[indices.order]=String(position+1);if(row.extra&&Object.hasOwn(row.extra,'排序'))row.extra['排序']=String(position+1);
    if(row.extra&&Object.hasOwn(row.extra,'parentId'))row.extra.parentId=row.tree.parentId;
    rows.push(row);emit(node.key,depth+1);
   }
  }
  emit('',0);
  const shown=node=>node.platformAllowed&&(node.row.cells[indices.display]??node.item?.display)!=='隐藏';
  function navChildren(parent){const list=groups.get(parent)||[];if(platform||layout?.orders?.[parent||'$root']||list.some(node=>override.order?.[node.key]!==undefined))return list;return [...list].sort((a,b)=>(navOrder.get(a.key)??a.index)-(navOrder.get(b.key)??b.index));}
  function navigation(node){
   if(!shown(node))return null;
   const children=navChildren(node.key).map(navigation).filter(Boolean),item=node.item;
   const own=item?.route&&enabled.has(item.route)?{...item,label:node.row.cells[indices.name],display:node.row.cells[indices.display],superPermission:node.row.cells[indices.super]==='是'}:null;
   if(!children.length)return own;
   if(own)children.unshift(own);
   const group={...(item||{}),id:item?.id||node.key,label:node.row.cells[indices.name],children};delete group.route;return group;
  }
  const visible=navChildren('').map(navigation).filter(Boolean);
  return {rows,visible,warnings:[...new Set(warnings)],conflicts,conflictIds};
 }
 return {key,load,read,resolve,captureMove};
})();
