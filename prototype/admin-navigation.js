/* SPEC-SUIYIN-ADMIN-050@1.0.0 — local navigation snapshot. */
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const params=new URLSearchParams(location.search);
const navStorageKey=id=>(params.get('qa')==='1'?'admin-qa-nav:':'admin-nav-override:')+id;
let data,tenant,sourceTenant,leaves=[],tabs=[],active,expanded=new Set();
let shellView=null,restoringShellView=false,navRefresh=0,shellViewTimer;
const shellViewKey=id=>(params.get('qa')==='1'?'admin-qa-shell-view:v1:':'admin-shell-view:v1:')+id;
// The captured language page reserves a scrollbar lane only for overflowing menus.
function syncLanguageNavigation(){const nav=$('navigation'),enabled=active==='languageManage';document.body.classList.toggle('language-shell',enabled);nav.classList.toggle('nav-has-overflow',enabled&&nav.clientHeight>0&&nav.scrollHeight>nav.clientHeight+1);}
function saveShellView(){
 if(!tenant||restoringShellView)return;
 shellView={expanded:[...expanded],tabs:[...tabs],active,sidebarTop:$('navigation').scrollTop,navCollapsed:document.body.classList.contains('nav-collapsed')};
 try{localStorage.setItem(shellViewKey(tenant.id),JSON.stringify(shellView));}catch{}
}
function loadShellView(){
 try{const saved=JSON.parse(localStorage.getItem(shellViewKey(tenant.id))||'null');if(saved&&Array.isArray(saved.expanded)&&Array.isArray(saved.tabs)){shellView=saved;expanded=new Set(saved.expanded);document.body.classList.toggle('nav-collapsed',!!saved.navCollapsed);}}catch{}
}
const legacyPages={sales:'销售管理','expert-info':'专家信息','friend-list':'好友列表','group-list':'群列表','friend-add':'添加好友','friend-review':'删退审核','friend-tag':'好友标签',script:'话术管理',product:'商品管理',massmsg:'群发管理',pyq:'PYQ管理','reward-detail':'分佣明细','reward-total':'分佣合计','reward-topup':'充值确认','reward-prepay':'预付确认','reward-income':'收入确认','stats-referral':'拉新记录','stats-sales':'销售统计','stats-rank':'销售排名','stats-revisit':'回访统计','stats-shift':'上班记录','stats-msgratio':'消息占比统计','stats-viewlog':'数据查看日志','stats-retention':'留存统计','stats-mass':'群发统计','stats-pyq':'朋友圈统计','stats-saleuse':'销售使用统计','stats-script':'话术统计','stats-ai-assist':'AI辅助统计','stats-invite':'群邀请提及率','chat-all':'全部聊天','chat-assign':'分配记录','chat-saleban':'销售词控','chat-cusban':'客户词控','chat-ai-analysis':'智能分析','wechat-account':'帐号状态','wechat-acquire':'拉新文案','wechat-buddy':'通友管理','ai-prompt':'AI提示词库','ai-model':'AI模型管理','sys-role':'角色管理','sys-menu':'菜单管理','sys-tagtpl':'标签模板管理','sys-config':'系统设置'};
// Project system terminology only at display boundaries. Stable labels still resolve legacy links.
function menuText(item,field='label'){
 const value=item?.[field]||'';
 if(field==='label'){
  const key=item.route||item.id,all=items=>(items||[]).flatMap(g=>[g,...all(g.children)]),source=all(sourceTenant?.menu).find(g=>(g.route||g.id)===key);
  const override=window.AdminMenuState.read(sourceTenant,navStorageKey(tenant.id));
  if(!source||value!==source.label||Object.hasOwn(override?.labels||{},key))return value;
 }
 return window.AdminAccountProfile.displayText(tenant.id,value);
}
function icon(markup){const span=el('span','nav-icon');if(markup){const svg=new DOMParser().parseFromString(markup,'image/svg+xml').documentElement;if(svg.tagName==='svg'&&!svg.querySelector('script,foreignObject,image,use')&&![...svg.querySelectorAll('*'),svg].some(n=>[...n.attributes].some(a=>/^on|href/i.test(a.name)))){svg.setAttribute('aria-hidden','true');span.append(document.importNode(svg,true));}}return span;}
function state(title,detail,retry){const box=el('section','shell-state');box.append(el('h2','',title),el('p','',detail));if(retry){const b=el('button','primary','重新载入');b.onclick=()=>location.reload();box.append(b);}return box;}
function closeUser(){ $('userPanel').hidden=true;$('userTrigger').setAttribute('aria-expanded','false'); }
function toggleUser(){const opening=$('userPanel').hidden;$('userPanel').hidden=!opening;$('userTrigger').setAttribute('aria-expanded',String(opening));if(opening){$('tenantSearch').value='';renderTenants();$('tenantSearch').focus();}}
function renderTenants(){const needle=$('tenantSearch').value.trim().toLowerCase();const list=$('tenantList');list.replaceChildren();const selected=data.tenants.filter(t=>[t.name,t.brand,t.domain,t.id].join(' ').toLowerCase().includes(needle));selected.forEach(t=>{const li=el('li'),b=el('button','tenant-choice');b.append(el('span','',t.name));b.disabled=t.id===tenant?.id;b.setAttribute('aria-label',t.name+(b.disabled?'，当前企业':''));b.append(el('small','',b.disabled?'当前企业':'↗'));b.onclick=()=>switchTenant(t);li.append(b);list.append(li)});if(!selected.length)list.append(el('li','no-match','没有找到企业'));}
function switchTenant(target){const url=new URL(location.href);url.search='';url.searchParams.set('tenant',target.id);const targetLeaves=menuLeaves(target.menu);url.searchParams.set('page',targetLeaves.some(l=>l.route===active)?active:targetLeaves[0].route);const win=window.open(url.href,'_blank');if(win){win.opener=null;$('popupFallback').hidden=true;closeUser();}else{const box=$('popupFallback');box.replaceChildren(document.createTextNode('浏览器未打开新页签。'));const link=el('a','','点击打开 '+target.name);link.href=url.href;link.target='_blank';link.rel='noopener';const close=el('button','','×');close.setAttribute('aria-label','关闭提示');close.onclick=()=>box.hidden=true;box.append(link,close);box.hidden=false;}}
function menuLeaves(items){return items.flatMap(item=>item.children?menuLeaves(item.children):item.route?[item]:[]);}
function renderNav(){
 const top=$('navigation').children.length?$('navigation').scrollTop:Math.max(0,Number(shellView?.sidebarTop)||0);
 function branch(items){const list=el('ul');for(const g of items){const li=el('li');if(g.children){const d=el('details','nav-group');d.dataset.group=g.id;d.open=expanded.has(g.id);const summary=el('summary');summary.append(icon(g.icon||window.AdminLiveUI?.menuIcons[g.label]),el('span','',menuText(g)));d.append(summary,branch(g.children));d.addEventListener('toggle',()=>{if(!d.isConnected)return;d.open?expanded.add(g.id):expanded.delete(g.id);saveShellView();syncLanguageNavigation();});li.append(d);}else if(g.route)li.append(navButton(g));list.append(li);}return list;}
 $('navigation').replaceChildren(branch(tenant.menu));$('navigation').scrollTop=top;syncLanguageNavigation();
}
function revealMenu(route,items=tenant.menu){for(const item of items){if(!item.children)continue;revealMenu(route,item.children);if(menuLeaves(item.children).some(child=>child.route===route)){expanded.add(item.id);const details=[...$('navigation').querySelectorAll('[data-group]')].find(node=>node.dataset.group===item.id);if(details)details.open=true;}}}
function navButton(item){const b=el('button','nav-button'+(item.route===active?' active':''));b.dataset.route=item.route;b.title=menuText(item,'platformLabel');b.append(icon(item.icon||window.AdminLiveUI?.menuIconsByRoute?.[item.route]||window.AdminLiveUI?.menuIcons[item.label]),el('span','',menuText(item)));if(item.route===active)b.setAttribute('aria-current','page');b.onclick=()=>{openPage(item.route);document.body.classList.remove('nav-mobile-open');};return b;}
function pageLabel(item){return leaves.filter(l=>l.label===item.label).length>1?menuText(item,'platformLabel'):menuText(item);}
function save(){try{sessionStorage.setItem('admin-nav:'+tenant.id,JSON.stringify(tabs));}catch{}saveShellView();}
function renderTabs(){syncLanguageNavigation();const bar=$('tabs');bar.replaceChildren();tabs.forEach(route=>{const item=leaves.find(l=>l.route===route),wrap=el('div','tab'+(route===active?' selected':'')),b=el('button');b.id='tab-'+route;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(route===active));b.setAttribute('aria-controls','panel-'+route);b.tabIndex=route===active?0:-1;b.title=menuText(item,'platformLabel');b.append(icon(item.icon||window.AdminLiveUI?.menuIconsByRoute?.[item.route]||window.AdminLiveUI?.menuIcons[item.label]),el('span','',pageLabel(item)));b.onclick=()=>openPage(route);b.onkeydown=e=>{const i=tabs.indexOf(route);let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();openPage(tabs[next]);$('tab-'+tabs[next]).focus();}if(e.key==='Delete'){e.preventDefault();closePage(route);$('tab-'+active)?.focus();}};wrap.append(b);{const c=el('button','close-tab','×');c.setAttribute('aria-label','关闭 '+pageLabel(item));c.onclick=()=>closePage(route);wrap.append(c);}bar.append(wrap)});$('tab-'+active)?.scrollIntoView({block:'nearest',inline:'nearest'});}
function closePage(route){const i=tabs.indexOf(route);tabs=tabs.filter(x=>x!==route);$('panel-'+route)?.remove();if(active===route)active=tabs[Math.min(i,tabs.length-1)];save();if(!tabs.length){active=null;renderTabs();$('navigation').querySelectorAll('.active').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});const url=new URL(location.href);url.searchParams.delete('page');history.replaceState(null,'',url);return;}openPage(active);}
function makeFrame(item){const wrap=el('section','frame-wrap');wrap.id='panel-'+item.route;wrap.setAttribute('role','tabpanel');wrap.setAttribute('aria-labelledby','tab-'+item.route);const frame=el('iframe','page-frame');frame.title=tenant.name+' · '+pageLabel(item);const p=new URLSearchParams({tenant:tenant.id,route:item.route,tenantName:tenant.name,pageName:pageLabel(item),capturedAt:tenant.capturedAt,status:item.contentStatus});if(params.get('qa')==='1')p.set('qa','1');p.set('v','092-0.3.1-original');frame.src='admin-content.html?'+p;const fail=()=>{wrap.replaceChildren(state('页面读取失败','请重新加载本地页面。'));const b=el('button','primary','重试');b.onclick=()=>wrap.replaceWith(makeFrame(item));wrap.firstChild.append(b);};frame.onerror=fail;frame.onload=()=>{try{if(!frame.contentDocument?.querySelector('#app,.filter-bar'))fail();}catch{fail();}};wrap.append(frame);return wrap;}
function openPage(route,{reveal=true}={}){const item=leaves.find(l=>l.route===route);if(!item){$('pages').replaceChildren(state('本租户没有这个页面入口','请从左侧菜单选择要查看的页面。'));active=null;renderTabs();return;}active=route;if(!tabs.includes(route))tabs.push(route);if(reveal)revealMenu(route);$('pages').querySelector('.shell-state')?.remove();if(!$('panel-'+route))$('pages').append(makeFrame(item));$('pages').querySelectorAll('.frame-wrap').forEach(w=>w.hidden=w.id!=='panel-'+route);$('navigation').querySelectorAll('.nav-button').forEach(b=>{b.classList.toggle('active',b.dataset.route===route);if(b.dataset.route===route)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});const url=new URL(location.href);url.searchParams.set('tenant',tenant.id);url.searchParams.set('page',route);history.replaceState(null,'',url);renderTabs();save();}
function applyLocalMenu(){const override=window.AdminMenuState.read(sourceTenant,navStorageKey(tenant.id));tenant.menu=window.AdminTenantMenu.resolve(sourceTenant,window.AdminTenantMenu.read(tenant.id),override).visible;}
function refreshNavigation(){
 navRefresh=0;if(!tenant)return;const previous=active;saveShellView();applyLocalMenu();leaves=menuLeaves(tenant.menu);
 const visible=new Set(leaves.map(l=>l.route));tabs=tabs.filter(route=>{if(visible.has(route))return true;$('panel-'+route)?.remove();return false;});
 renderNav();const next=visible.has(previous)?previous:tabs.at(-1)||leaves[0]?.route;
 if(next)openPage(next,{reveal:next!==previous});else{active=null;$('pages').replaceChildren(state('当前菜单均已隐藏','已保留本地配置，可在仍打开的菜单配置窗口恢复显示。'));renderTabs();save();}
}
function scheduleNavigation(){if(!navRefresh){navRefresh=1;queueMicrotask(refreshNavigation);}}
window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(e.data?.type==='admin-platform-menu-updated'||(e.data?.type==='admin-navigation-updated'&&e.data.tenant===tenant?.id))scheduleNavigation();});
window.addEventListener('storage',e=>{if(e.key===navStorageKey(tenant?.id)||e.key===window.AdminPlatformMenu.key||e.key===window.AdminTenantMenu.key(tenant?.id)||e.key===null)scheduleNavigation();});
async function init(){try{await window.AdminPlatformMenu.load();const response=await fetch('data/navigation-snapshot.json');if(!response.ok)throw new Error('snapshot unavailable');data=await response.json();data.tenants?.forEach(t=>window.AdminAccountProfile.normalizeTenant(t));if(!Array.isArray(data.tenants)||!data.tenants.length)throw new Error('invalid snapshot');const requested=params.get('tenant')||'yestar-sz';sourceTenant=data.tenants.find(t=>t.id===(data.aliases[requested]||requested));tenant=sourceTenant?structuredClone(sourceTenant):null;$('userTrigger').disabled=false;renderTenants();if(!tenant){$('brandName').textContent='管理后台';$('pages').replaceChildren(state('此企业不在本次对照范围','请通过右上角企业列表选择已保留的企业。'));return;}await window.AdminTenantMenu.load(tenant.id);restoringShellView=true;loadShellView();$('brandName').textContent=tenant.brand;if(tenant.clientVersion)document.querySelector('.client-note small').textContent=tenant.clientVersion;$('brandLogo').hidden=!tenant.brand;$('brandLogo').src=tenant.brandLogo||'assets/siyu-logo.png';$('brandLogo').style.width=(tenant.brandLogoWidth||40)+'px';$('brandLogo').style.height=(tenant.brandLogoHeight||40)+'px';$('brandLogo').style.objectFit='contain';document.title=(tenant.brand||tenant.name)+' · 管理后台原型';applyLocalMenu();leaves=menuLeaves(tenant.menu);let route=params.get('page')||shellView?.active||(tenant.id==='yestar-sz'?'wechatStatus':leaves[0]?.route);if(route==='sales')route='salesManage';if(legacyPages[route])route=leaves.find(l=>l.label===legacyPages[route])?.route||route;try{const savedTabs=shellView?.tabs||JSON.parse(sessionStorage.getItem('admin-nav:'+tenant.id)||'[]');tabs=savedTabs.filter((r,i,a)=>a.indexOf(r)===i&&leaves.some(l=>l.route===r));}catch{tabs=[];}renderNav();$('pages').replaceChildren();/* Keep restored tab state; openPage creates only the active iframe. Other tabs load on first visit. */if(leaves.length)openPage(leaves.some(l=>l.route===route)?route:leaves[0].route,{reveal:!shellView});else{$('pages').append(state('当前菜单均已隐藏','本地配置已保留，请从已打开的菜单配置窗口恢复显示。'));renderTabs();}const top=Math.max(0,Number(shellView?.sidebarTop)||0);requestAnimationFrame(()=>{$('navigation').scrollTop=top;restoringShellView=false;saveShellView();});}catch(error){restoringShellView=false;$('pages').replaceChildren(state('导航读取失败','请确认本地预览服务已启动，然后重新载入。',true));}}
new ResizeObserver(syncLanguageNavigation).observe($('navigation'));
window.addEventListener('pagehide',saveShellView);$('navigation').addEventListener('scroll',()=>{clearTimeout(shellViewTimer);shellViewTimer=setTimeout(saveShellView,80);},{passive:true});
new MutationObserver(saveShellView).observe(document.body,{attributes:true,attributeFilter:['class']});
function syncSidebar(){const small=matchMedia('(max-width:760px)').matches;const shown=small?document.body.classList.contains('nav-mobile-open'):!document.body.classList.contains('nav-collapsed');document.querySelector('.sidebar').inert=!shown;$('collapse').setAttribute('aria-expanded',String(shown));}
new MutationObserver(syncSidebar).observe(document.body,{attributes:true,attributeFilter:['class']});window.addEventListener('resize',syncSidebar);syncSidebar();
$('userTrigger').onclick=toggleUser;$('tenantSearch').oninput=renderTenants;$('collapse').onclick=()=>{const small=matchMedia('(max-width:760px)').matches;document.body.classList.toggle(small?'nav-mobile-open':'nav-collapsed');$('collapse').setAttribute('aria-expanded',String(small?document.body.classList.contains('nav-mobile-open'):!document.body.classList.contains('nav-collapsed')));};$('scrim').onclick=()=>document.body.classList.remove('nav-mobile-open');$('closeOthers').onclick=()=>{if(!active)return;tabs.filter(r=>r!==active).forEach(r=>$('panel-'+r)?.remove());tabs=[active];save();renderTabs();};document.addEventListener('click',e=>{if(!$('userPanel').contains(e.target)&&!$('userTrigger').contains(e.target))closeUser();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('userPanel').hidden){closeUser();$('userTrigger').focus();}document.body.classList.remove('nav-mobile-open');}});init();

const sourceHeaderIcons=window.AdminLiveUI?.headerIcons||[];if(sourceHeaderIcons[0])$('collapse').innerHTML=sourceHeaderIcons[0];if(sourceHeaderIcons[1])document.querySelector('.chevron').innerHTML=sourceHeaderIcons.at(-1);window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='admin-dialog-state')document.body.classList.toggle('has-dialog',e.data.open);});$('dialogScrim').onclick=()=>document.querySelector('.frame-wrap:not([hidden]) iframe')?.contentWindow.postMessage({type:'admin-dialog-close'},location.origin);


/* SPEC-SUIYIN-ADMIN-073: preserve guide drafts before shell navigation. */
(()=>{
 let pending=false,executing=false,deferredRefresh=false;
 const declinedRefreshPages=new WeakSet();
 const currentFrames=()=>[document.querySelector('.frame-wrap:not([hidden]) iframe')].filter(Boolean);
 function syncDialogScrim(){
  const open=currentFrames().some(frame=>{try{return !!frame.contentDocument?.querySelector('dialog[open]');}catch{return false;}});
  document.body.classList.toggle('has-dialog',open);
 }
 function perform(action){const previous=executing;executing=true;try{return action();}finally{executing=previous;syncDialogScrim();}}
 function resumeRefresh(){if(deferredRefresh){deferredRefresh=false;scheduleNavigation();}}
 function guard(action,frames=currentFrames(),refresh=false){
  if(executing)return action();
  if(pending){if(refresh)deferredRefresh=true;return;}
  const pages=frames.flatMap(frame=>{try{const win=frame.contentWindow;return [win?.AdminGuideLinesPage,win?.AdminQualityPrompts,win?.AdminPromptTemplates].filter(page=>page?.isDirty?.()||page?.hasDirty?.());}catch{return [];}});
  // A cancelled background refresh waits for a save or an explicit leave attempt.
  // Repeated menu/storage events must not reopen the same confirmation immediately.
  if(refresh&&pages.some(page=>declinedRefreshPages.has(page))){deferredRefresh=true;return false;}
  if(!pages.length){if(refresh)deferredRefresh=false;const result=perform(action);if(!refresh)resumeRefresh();return result;}
  pending=true;
  return (async()=>{let accepted=false;try{
   for(const page of pages)if(!await page.requestLeave()){
    if(refresh||deferredRefresh){deferredRefresh=true;pages.forEach(page=>declinedRefreshPages.add(page));}
    return false;
   }
   accepted=true;pages.forEach(page=>declinedRefreshPages.delete(page));if(refresh)deferredRefresh=false;
   return perform(action);
  }finally{pending=false;if(accepted)resumeRefresh();}})();
 }
 const open=openPage,close=closePage,switchTo=switchTenant,refresh=refreshNavigation;
 openPage=function(route,options){if(route===active)return open(route,options);return guard(()=>open(route,options));};
 closePage=function(route){return guard(()=>close(route),[document.querySelector('#panel-'+route+' iframe')].filter(Boolean));};
 switchTenant=function(target){return guard(()=>switchTo(target));};
 const oldCloseOthers=$('closeOthers').onclick;
 $('closeOthers').onclick=function(){const frames=[...document.querySelectorAll('.frame-wrap iframe')].filter(frame=>frame.closest('.frame-wrap').id!=='panel-'+active);return guard(()=>oldCloseOthers(),frames);};
 refreshNavigation=function(){
  navRefresh=0;if(!tenant)return;
  const override=window.AdminMenuState.read(sourceTenant,navStorageKey(tenant.id));
  const nextMenu=window.AdminTenantMenu.resolve(sourceTenant,window.AdminTenantMenu.read(tenant.id),override).visible;
  const visible=new Set(menuLeaves(nextMenu).map(item=>item.route));
  const removing=tabs.filter(route=>!visible.has(route)).map(route=>document.querySelector('#panel-'+route+' iframe')).filter(Boolean);
  return guard(()=>refresh(),removing,true);
 };
 // An iframe's successful local save emits storage in the shell document. Resume a
 // deferred menu refresh only after the draft has become clean; failed saves do not.
 window.addEventListener('storage',e=>{const key=(params.get('qa')==='1'?'admin-qa-guide-lines:v1:':'admin-guide-lines:v1:')+tenant?.id;if(deferredRefresh&&e.key===key)scheduleNavigation();});
})();

/* SPEC-SUIYIN-ADMIN-081: a hidden street-map page must stop its old playback. */
(() => {
 const route='streetTrajectories';
 function stop(frame){
  try{frame?.contentWindow?.AdminStreetTrajectories?.close?.();}catch{}
  frame?.contentWindow?.postMessage({type:'admin-page-visibility',visible:false},location.origin);
 }
 function check(){const panel=$('panel-'+route);if(panel?.hidden)stop(panel.querySelector('iframe'));}
 new MutationObserver(check).observe($('pages'),{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 const oldSwitch=switchTenant;
 switchTenant=function(target){stop($('panel-'+route)?.querySelector('iframe'));return oldSwitch(target);};
 window.addEventListener('pagehide',()=>stop($('panel-'+route)?.querySelector('iframe')));
})();

/* SPEC-SUIYIN-ADMIN-092: route links stay inside this tenant shell and honor draft guards. */
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.type!=='admin-quality-navigate')return;
 const route=event.data.route;
 if(!['wecomQualityDaily','wechatQualityDaily','promptTemplate','aiEntModelConfig'].includes(route))return;
 if(![...document.querySelectorAll('.frame-wrap iframe')].some(frame=>frame.contentWindow===event.source))return;
 if(!leaves.some(item=>item.route===route))return;
 Promise.resolve(openPage(route)).then(()=>{
  if(active===route)document.querySelector('#panel-'+route+' iframe')?.contentWindow?.postMessage({type:'admin-page-visibility',visible:true},location.origin);
 });
});
