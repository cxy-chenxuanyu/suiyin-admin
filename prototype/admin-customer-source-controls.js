/* Preserve captured customer-page controls; uncollected expanded states are explicitly unavailable. */
'use strict';
(()=>{
 const A=window.Admin,V=window.AdminViews,previous=V.render,{node,button}=A;
 if(!['customerManagement','yxCustomerList'].includes(A.route))return;
 const text=element=>element.textContent.trim();
 const names=()=>[...new Set((A.source.buttons||[]).map(value=>typeof value==='string'?value:value.text).filter(Boolean))];
 const pending=label=>A.toast('“'+label+'”的展开状态尚未采集，当前仅还原已采集入口。');
 const parityTenants=new Set(['bzds','jbfs','mengzhua','crrm','hqjd','ykjl','ruixi-kh-xiaowen','yzhb','rxxz']);
 let accountDraft=null,accountApplied=null,customerResizeObserver;
 const previousTransform=V.transformRows;
 V.transformRows=(rows,table)=>{rows=previousTransform?.(rows,table)||rows;if(A.route!=='customerManagement'||!parityTenants.has(A.tenant)||accountApplied===null)return rows;const index=table.headers.indexOf('所在账号');return index<0?rows:rows.filter(row=>accountApplied.includes(row.cells[index]));};
 function ordinaryParity(root,filter,top){
  // Geometry is verified against each listed tenant's 2026-09-27 capture.
  if(!parityTenants.has(A.tenant))return;
  root.classList.add('customer-source-aligned');
  if(top){
   top.querySelectorAll('button').forEach(control=>{if(control.dataset.customerParity)return;control.dataset.customerParity='true';const label=control.dataset.customerSourceAction||text(control);
    if(/^(全部好友|来源信息|好友信息|用户信息|购买信息)/.test(label)){control.classList.add('customer-source-menu');control.replaceChildren();const caption=node('span');const count=label.match(/^(全部好友)\s*\((\d+)\s*人\)$/);if(count){caption.append(document.createTextNode(count[1]+' '),node('span','customer-count','('+count[2]+' 人)'));control.style.setProperty('--customer-count-width',(176.85+(count[2].length-3)*8.9)+'px');}else caption.textContent=label;control.append(caption,node('span','customer-menu-arrow'));}
    if(label==='创建虚拟好友')control.classList.add('customer-create');
   });
  }
  if(!filter.dataset.customerParity){
   filter.dataset.customerParity='true';
   filter.querySelectorAll(':scope>.field').forEach(field=>{field.dataset.customerField=field.querySelector(':scope>span')?.textContent||'';});
   const accountPage=A.pageData('wechatStatus'),accountTable=A.tenant!=='bzds'&&accountPage?.tenant===A.tenant&&accountPage?.sampleTenant===A.tenant&&accountPage.state==='captured'?accountPage.tables?.[0]:null,accountName=accountTable?.headers.indexOf('人设名称');
   const sampleAccounts=A.source.sampleTenant===A.tenant&&A.source.state!=='reference'?A.getTable().rows.map(row=>row.cells[A.getTable().headers.indexOf('所在账号')]):[];
   const ownAccounts=[...new Set([...sampleAccounts,...(accountName>=0?accountTable.rows.map(row=>row.cells[accountName]):[])].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
   // Only this tenant's local sample accounts are offered. Selection is applied on 查询.
   accountDraft=[...ownAccounts];accountApplied=null;
   if(!filter.querySelector('[data-customer-field="微信号"]')){
    const field=node('div','field customer-account-field'),box=node('div','customer-account-picker'),trigger=button('',()=>{}),panel=node('div','customer-account-options');
    field.dataset.customerField='微信号';field.append(node('span','','微信号'));trigger.className='live-select-trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-label','微信号');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-haspopup','listbox');panel.hidden=true;panel.setAttribute('role','listbox');panel.setAttribute('aria-multiselectable','true');
    let groupCheck,lastClicked=-1;
    const draw=()=>{trigger.replaceChildren(node('span','live-select-caption',accountDraft.length?'已选 '+accountDraft.length+' 个人设':'请选择'),node('span','live-select-arrow'));if(groupCheck){groupCheck.checked=accountDraft.length===ownAccounts.length;groupCheck.indeterminate=accountDraft.length>0&&accountDraft.length<ownAccounts.length;}};
    const update=()=>{accountDraft=[...panel.querySelectorAll('input[data-account-option]:checked')].map(c=>c.value);draw();};
    const close=()=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false');};
    let accountList=panel;
    if(A.tenant==='bzds'){
     panel.classList.add('customer-account-groups');const groups=node('div','customer-account-group-list'),group=node('label','check-field'),body=node('div','customer-account-group-body'),tools=node('div','customer-account-tools'),search=node('input'),clear=button('取消全选',()=>{panel.querySelectorAll('input[data-account-option]').forEach(c=>c.checked=false);update();},'link');
     groupCheck=node('input');groupCheck.type='checkbox';groupCheck.checked=true;groupCheck.setAttribute('aria-label','默认分组全选');groupCheck.onchange=()=>{panel.querySelectorAll('input[data-account-option]').forEach(c=>c.checked=groupCheck.checked);update();};group.append(groupCheck,node('span','','默认分组'),node('small','',String(ownAccounts.length)),node('span','customer-account-group-arrow','›'));groups.append(group);
     search.type='search';search.placeholder='搜索人设';search.setAttribute('aria-label','搜索人设');search.oninput=()=>accountList.querySelectorAll('label').forEach(label=>label.hidden=!label.dataset.accountName.includes(search.value.trim()));tools.append(search,clear);accountList=node('div','customer-account-group-options');body.append(tools,node('div','customer-account-hint','单击勾选；按住 Shift 点击可批量勾选区间'),accountList);panel.append(groups,body);
    }
    ownAccounts.forEach((value,index)=>{const label=node('label','check-field'),input=node('input');label.dataset.accountName=value;input.type='checkbox';input.dataset.accountOption='';input.checked=true;input.value=value;input.setAttribute('aria-label',value);input.onchange=update;input.onclick=e=>{if(e.shiftKey&&lastClicked>=0){const options=[...panel.querySelectorAll('input[data-account-option]')];for(let i=Math.min(lastClicked,index);i<=Math.max(lastClicked,index);i++)options[i].checked=input.checked;update();}lastClicked=index;};label.append(input,document.createTextNode(value));if(A.tenant==='bzds')label.append(node('span','customer-account-online','在线'));accountList.append(label);});
    if(!ownAccounts.length){trigger.disabled=true;panel.append(node('span','hint','当前租户没有账号样本'));}
    trigger.onclick=()=>{panel.hidden=!panel.hidden;trigger.setAttribute('aria-expanded',String(!panel.hidden));};
    box.onkeydown=e=>{if(e.key==='Escape'){close();trigger.focus();}if(e.key==='ArrowDown'&&e.target===trigger){e.preventDefault();panel.hidden=false;trigger.setAttribute('aria-expanded','true');panel.querySelector('input')?.focus();}};
    box.addEventListener('focusout',e=>{if(!box.contains(e.relatedTarget))close();});
    filter.addEventListener('submit',()=>{accountApplied=[...accountDraft];close();},true);
    const outside=e=>{if(!box.isConnected){document.removeEventListener('pointerdown',outside);return;}if(!box.contains(e.target))close();};document.addEventListener('pointerdown',outside);
    box.append(trigger,panel);field.append(box);filter.querySelector('[data-customer-field="关键词"]')?.after(field);draw();
   }
   filter.querySelectorAll('.filter-actions button').forEach(control=>{if(text(control)==='重置'){control.querySelector('.button-icon')?.remove();control.addEventListener('click',()=>{accountApplied=null;},true);}});
  }
  const batch=[...root.querySelectorAll('.source-toolbar:not(.customer-batch-footer) > button')].find(control=>text(control)==='批量删除');
  if(batch){let footer=root.querySelector('.customer-batch-footer');if(!footer){footer=node('div','customer-batch-footer source-toolbar');root.append(footer);}batch.querySelector('.button-icon')?.remove();footer.append(batch);}
  root.querySelectorAll('.source-toolbar:not(.customer-batch-footer)').forEach(toolbar=>{if(!toolbar.querySelector('button'))toolbar.hidden=true;});
  const headers=A.getTable().headers;
  root.querySelectorAll('#results tbody tr:not([data-customer-parity])').forEach(tr=>{
   tr.dataset.customerParity='true';const checkbox=tr.querySelector('input[type=checkbox]'),row=A.getTable().rows.find(r=>checkbox?.getAttribute('aria-label')==='选择记录 '+r.id);if(!row)return;
   const cells=[...tr.cells],nick=headers.indexOf('微信昵称'),basic=headers.indexOf('基本信息'),source=headers.indexOf('来源信息');
   if(cells[nick]){const group=node('div','customer-nickname'),avatar=node('img','customer-avatar');avatar.src='assets/avatar-default.png';avatar.alt='';avatar.width=avatar.height=40;const link=button(row.cells[nick],()=>A.details(row),'link customer-name');link.title=row.cells[nick];group.append(avatar,link);cells[nick].replaceChildren(group);}
   if(cells[basic]){const info=node('div','customer-basic');const parts=String(row.cells[basic]||'').split(/\n/).map(p=>p.trim()).filter(Boolean);for(let i=0;i<parts.length;i++){const match=parts[i].match(/^(性别|生日|省市区)\s*[:：]\s*(.*)$/);if(!match){info.append(node('div','',parts[i]));continue;}const value=match[2]||parts[++i]||'-',line=node('div','customer-info-line');line.append(node('span','customer-info-key',match[1]+':'),node('span',match[1]==='性别'&&/^(男|女)$/.test(value)?'status small':'customer-info-value',value));info.append(line);}cells[basic].replaceChildren(info);}
   if(cells[source]){const info=node('div','customer-source-info');String(row.cells[source]||'').split('\n').filter(Boolean).forEach(part=>{const match=part.match(/^([^:：]+)[:：]\s*(.*)$/),line=node('div','customer-info-line');if(match)line.append(node('span','customer-info-key',match[1]+':'),node('span','customer-info-value',match[2]));else line.textContent=part;info.append(line);});cells[source].replaceChildren(info);}
   const actions=tr.querySelector('.actions-cell');actions?.querySelectorAll('button').forEach(control=>{if(text(control)===A.uiText('专属销售'))control.classList.add('customer-exclusive');if(text(control)==='记录')control.classList.add('customer-record');});
  });
  const wrap=root.querySelector('.table-wrap');if(wrap&&!wrap.dataset.customerScrollbar){wrap.dataset.customerScrollbar='true';customerResizeObserver?.disconnect();customerResizeObserver=new ResizeObserver(()=>wrap.style.setProperty('--customer-scrollbar',(wrap.offsetWidth-wrap.clientWidth)+'px'));customerResizeObserver.observe(wrap);}
 }
 function yestarParity(root,filter,top){
  if(!['yestar-sz','yestar','yestar-bj','yestar-gz','yestar-hz','yestar-jx'].includes(A.tenant))return;
  root.classList.add('customer-source-aligned','yx-source-aligned');
  if(!String(A.source.pagination||'').trim()){A.source.pagination='20条/页 · 当前本地样本';for(const label of ['批量删除','批量分组'])if(!A.source.buttons.includes(label))A.source.buttons.push(label);A.renderResults();}
  if(!filter.dataset.yxParity){
   filter.dataset.yxParity='true';
   filter.querySelectorAll(':scope>.field').forEach(field=>{
    const caption=field.querySelector(':scope>span'),key=caption?.textContent.replace(/[:：]$/,'');if(!key)return;caption.textContent=key+':';if(key==='申请时间')return;
    const old=field.querySelector('input[data-filter],button.source-uncollected-select');if(!old)return;
    const select=node('select');select.append(new Option('请选择',''));const column=A.getTable().headers.indexOf(key),own=A.source.sampleTenant===A.tenant&&A.source.state!=='reference';
    const choices=A.optionsFor(key);const values=choices.length?choices:own&&column>=0?[...new Set(A.getTable().rows.map(r=>r.cells[column]).filter(v=>v&&v.length<65))]:[];
    values.forEach(value=>select.append(new Option(value,value)));select.dataset.filter=old.dataset.filter||key;select.setAttribute('aria-label',key);select.disabled=!values.length;
    if(A.tenant==='yestar-bj'&&['等级(AI)','第一需求(AI)','状态'].includes(key)){select.replaceChildren(new Option('未配置客户标签模板',''));select.disabled=true;}
    if(!values.length)select.title='该筛选选项尚未采集';old.replaceWith(A.searchableSelect(select,key));
   });
   const actions=filter.querySelector('.filter-actions');actions?.querySelectorAll('button').forEach(control=>{if(text(control)==='重置')control.querySelector('.button-icon')?.remove();});
   if(A.tenant==='yestar-bj'){const note=node('div','yx-label-template-note');note.append(document.createTextNode('当前企业未配置客户标签模板'),button('重试',()=>A.toast('当前为已采集的模板未配置状态；本地不连接后台重试。'),'link'));filter.prepend(note);}
  }
  const keyword=filter.querySelector('.customer-keyword-row');if(keyword&&!keyword.dataset.yxParity){keyword.dataset.yxParity='true';keyword.querySelector('.field>span').textContent='搜索好友';keyword.style.cssText='';keyword.querySelector('button .button-icon')?.remove();}
  const batch=[...root.querySelectorAll('.source-toolbar:not(.customer-batch-footer)>button')].filter(control=>/^批量(删除|分组)$/.test(text(control)));
  if(A.tenant==='yestar-bj')root.querySelectorAll('.source-toolbar>button').forEach(control=>{if(text(control)==='重试')control.remove();});
  if(batch.length){let footer=root.querySelector('.customer-batch-footer');if(!footer){footer=node('div','customer-batch-footer source-toolbar');root.append(footer);}batch.forEach(control=>{control.querySelector('.button-icon')?.remove();footer.append(control);});}
  let footer=root.querySelector('.customer-batch-footer');if(!footer){footer=node('div','customer-batch-footer source-toolbar');root.append(footer);}for(const label of ['批量删除','批量分组'])if(![...footer.querySelectorAll('button')].some(control=>text(control)===label))footer.append(button(label,()=>label==='批量分组'?pending(label):A.action(label)));footer.querySelectorAll('button').forEach(control=>{control.disabled=!A.selectedRows.length;control.querySelector('.button-icon')?.remove();});
  root.querySelectorAll('.source-toolbar:not(.customer-batch-footer)').forEach(toolbar=>{if(!toolbar.querySelector('button'))toolbar.hidden=true;});
  const table=root.querySelector('#results table');
  const fitColumns=()=>{if(!table)return;const hasRequestTime=A.getTable().headers.includes('申请时间'),base=hasRequestTime?1935:1775,width=Math.max(base,root.clientWidth);if(table.dataset.yxWidth===String(width))return;table.dataset.yxWidth=String(width);const extra=width-base,widths=[55,200+extra*45/143,140,160+extra*35/143,140+extra*30/143,160,120,100,100,100,120,150+extra*33/143,230];if(hasRequestTime)widths.splice(A.getTable().headers.indexOf('申请时间'),0,160);table.querySelectorAll('col').forEach((col,i)=>col.style.width=widths[i]+'px');table.style.width=width+'px';};fitColumns();
  const headers=A.getTable().headers,nick=headers.indexOf('微信昵称');
  root.querySelectorAll('#results tbody tr:not([data-yx-parity])').forEach(tr=>{tr.dataset.yxParity='true';const checkbox=tr.querySelector('input[type=checkbox]'),row=A.getTable().rows.find(r=>checkbox?.getAttribute('aria-label')==='选择记录 '+r.id);if(!row)return;
   const group=node('div','customer-nickname'),avatar=node('img','customer-avatar');avatar.src='assets/avatar-default.png';avatar.alt='';avatar.width=avatar.height=40;const link=button(row.cells[nick],()=>A.details(row),'link customer-name');link.title=row.cells[nick];group.append(avatar,link);tr.cells[nick].replaceChildren(group);
   tr.querySelectorAll('.status').forEach(status=>{if(text(status)==='-')status.replaceWith(document.createTextNode('-'));});
   tr.querySelectorAll('.actions-cell button').forEach(control=>{if(text(control)==='改派')control.classList.add('customer-exclusive');if(text(control)==='记录')control.classList.add('yx-record');});
  });
  const wrap=root.querySelector('.table-wrap');if(wrap&&!wrap.dataset.customerScrollbar){wrap.dataset.customerScrollbar='true';customerResizeObserver?.disconnect();customerResizeObserver=new ResizeObserver(()=>{fitColumns();wrap.style.setProperty('--customer-scrollbar',(wrap.offsetWidth-wrap.clientWidth)+'px');});customerResizeObserver.observe(wrap);}
 }
 function enhance(){
  const root=document.querySelector('#app > .page'),filter=root?.querySelector('.filter-panel');if(!root||!filter)return;
  const labels=names(),ordinary=A.route==='customerManagement';
  const topLabels=labels.filter(label=>ordinary?/^(全部好友|来源信息$|好友信息$|用户信息$|购买信息$|创建虚拟好友$|全部记录$)/.test(label):/^(导出表格|全部记录)$/.test(label));
  let top=root.querySelector('.customer-source-top');if(!top&&topLabels.length){top=node('div','card toolbar customer-source-top');top.setAttribute('aria-label','好友管理顶部操作');filter.before(top);}
  if(top){for(const label of topLabels){let control=[...top.querySelectorAll('button')].find(item=>item.dataset.customerSourceAction===label);if(!control){control=[...root.querySelectorAll('.source-toolbar > button')].find(item=>text(item)===label);if(!control)control=button(label,()=>/^(全部好友|来源信息|好友信息|用户信息|购买信息)/.test(label)?pending(label):A.action(label),/^创建/.test(label)?'primary':'');control.dataset.customerSourceAction=label;if(/^(全部好友|来源信息|好友信息|用户信息|购买信息)/.test(label)){control.onclick=()=>pending(label);control.setAttribute('aria-expanded','false');control.title='此入口的展开状态尚未采集';}top.append(control);}
    root.querySelectorAll('.source-toolbar > button').forEach(item=>{if(text(item)===label)item.remove();});
   }
   root.querySelectorAll('.source-toolbar').forEach(toolbar=>{if(!toolbar.querySelector('button'))toolbar.hidden=true;});
  }
  if(ordinary){ordinaryParity(root,filter,top);return;}
  let actions=filter.querySelector('.filter-actions');if(!actions){actions=node('div','filter-actions');filter.append(actions);}
  for(const label of ['重置','执行筛选','搜索'].filter(name=>labels.includes(name))){let control=[...filter.querySelectorAll('button')].find(item=>text(item)===label);if(!control){control=[...root.querySelectorAll('.source-toolbar > button')].find(item=>text(item)===label)||button(label,()=>{},label==='重置'?'':'primary');if(label==='重置'){control.type='button';control.onclick=()=>A.action('重置');}else{control.type='submit';control.onclick=null;}actions.append(control);}root.querySelectorAll('.source-toolbar > button').forEach(item=>{if(text(item)===label)item.remove();});}
  if(labels.includes('展开')&&!actions.querySelector('[data-customer-expand]')){const expand=button('展开',()=>pending('展开'),'link');expand.dataset.customerExpand='';expand.setAttribute('aria-expanded','false');expand.title='高级筛选展开状态尚未采集';actions.prepend(expand);}
  const sourceInput=(A.source.inputs||[]).find(input=>input.placeholder&&/昵称.*备注名.*手机号.*卡号/.test(input.placeholder));
  if(sourceInput){
   let input=[...filter.querySelectorAll('input')].find(control=>control.placeholder===sourceInput.placeholder);if(!input){const field=node('div','field');field.append(node('span','','搜索好友'));input=node('input');input.type='text';input.placeholder=sourceInput.placeholder;input.setAttribute('aria-label','搜索好友');input.dataset.filter='搜索好友';input.value=sourceInput.value||'';field.append(input);filter.append(field);}
   let row=filter.querySelector('.customer-keyword-row');if(!row){row=node('div','customer-keyword-row');row.style.cssText='display:flex;align-items:center;gap:12px;width:100%';if(actions)actions.after(row);else filter.append(row);}
   const field=input.closest('.field')||input;if(field.parentElement!==row)row.append(field);
   const search=[...filter.querySelectorAll('button')].find(control=>text(control)==='搜索');if(search&&search.parentElement!==row)row.append(search);
  }
  yestarParity(root,filter,top);
 }
 V.render=()=>{if(['customerManagement','yxCustomerList'].includes(A.route)){if(!previous())A.renderTablePage();enhance();return true;}return previous();};
 const observer=new MutationObserver(()=>enhance());observer.observe(A.$('app'),{childList:true,subtree:true});
 window.AdminCustomerSource={enhance};
})();
