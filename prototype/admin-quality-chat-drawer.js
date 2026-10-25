/* SPEC-092 R008/R026: read-only evidence drawer using the PC message renderer. */
'use strict';
window.AdminQualityChatDrawer=(()=>{
 const A=window.Admin,esc=A.esc;
 const viewURL='data/private/quality-chat-view-yestar-sz-20261019-20.json';
 let current=null,viewPromise=null,generation=0;
 const origin=location.origin;
 const node=(tag,cls,text)=>A.node(tag,cls,text);
 function loadViews(){
  if(!viewPromise)viewPromise=fetch(viewURL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('记录未补充');return r.json();}).then(data=>{
   if(data.schemaVersion!=='chat-quality-chat-view-v1'||data.tenant!=='yestar-sz'||data.localOnly!==true||!data.sessions||Array.isArray(data.sessions))throw Error('记录来源不匹配');return data;
  }).catch(error=>{viewPromise=null;throw error;});
  return viewPromise;
 }
 function validateView(view,s,r){
  if(!view||view.tenant!==r.meta.tenant||view.channel!==r.meta.channel||view.date!==r.meta.date||view.accountId!==s.accountId||!Array.isArray(view.messages))return null;
  const byId=new Map();
  for(const m of view.messages){if(!m.id||byId.has(m.id)||!['customer','staff','system','unknown'].includes(m.direction))return null;byId.set(m.id,m);}
  for(const old of s.messages||[]){const m=byId.get(old.id||old.messageId);if(!m||Object.keys(old).some(key=>JSON.stringify(m[key])!==JSON.stringify(old[key])))return null;}
  return view;
 }
 function timeOrder(messages){return messages.map((m,i)=>({m,i})).sort((a,b)=>{const at=Date.parse(a.m.at||a.m.timestamp),bt=Date.parse(b.m.at||b.m.timestamp);return Number.isFinite(at)&&Number.isFinite(bt)?at-bt||a.i-b.i:a.i-b.i;}).map(v=>v.m);}
 function notify(open){if(window.parent!==window)parent.postMessage({type:'admin-dialog-state',open,source:'quality-chat-drawer'},origin);}
 function close(restoreFocus=true){
  if(!current)return;const c=current;current=null;generation++;c.unbind?.();
  if(c.dialog.open)c.dialog.close();c.dialog.remove();
  A.$('app').style.cssText=c.appStyle;document.body.style.overflow=c.bodyOverflow;
  document.body.classList.remove('qr-chat-open');
  if(!c.hadModalClass)document.body.classList.remove('menu-modal-open');
  if(c.frame&&!c.hadFrameClass)c.frame.classList.remove('menu-dialog-layer');
  notify(false);window.scrollTo(0,c.scroll);
  if(restoreFocus&&c.focus?.isConnected)c.focus.focus({preventScroll:true});
 }
 function jump(c,index){
  const matches=[...c.list.querySelectorAll('[data-highlighted="true"]')];
  if(!matches.length){c.counter.textContent='未取得关联原文';c.previous.disabled=c.next.disabled=true;return;}
  c.index=(index+matches.length)%matches.length;c.counter.textContent='关联消息 '+(c.index+1)+' / '+matches.length;
  c.previous.disabled=c.next.disabled=matches.length<2;
  matches[c.index].scrollIntoView({block:'center',behavior:'auto'});
 }
 function renderMessages(c,view,extended){
  if(current!==c)return;c.unbind?.();
  const s=c.session,messages=timeOrder(view.messages||[]),highlightIds=c.highlightIds;
  c.list.innerHTML=window.AdminQualityPCMessages.render(messages,{customerName:s.customerName||s.customerAlias,customerNickname:view.customerNickname||s.customerNickname,customerAvatar:view.customerAvatar||s.customerAvatar,accountName:s.accountName||s.accountAlias,accountAvatar:view.accountAvatar||s.accountAvatar,highlightIds});
  c.unbind=window.AdminQualityPCMessages.bind(c.list);
  c.count.textContent=(c.report.synthetic?'示例 ':'已采集 ')+messages.length+' 条';
  c.source.textContent=(c.report.synthetic?'合成演示会话':extended?'显示本机已采集的会话原文':'显示本次分析已导入的消息')+' · '+c.report.meta.date+' · 仅查看';
  if(highlightIds.length)jump(c,0);else c.list.scrollTop=c.list.scrollHeight;
 }
 function button(label,aria,fn){const b=node('button','qr-chat-tool',label);b.type='button';b.setAttribute('aria-label',aria||label);b.title=aria||label;b.onclick=fn;return b;}
 function open({report,session,issue=null,occurrence=null,focus=null}){
  if(!report||report.meta?.tenant!=='yestar-sz'||!session||!report.sessions?.includes(session)||!window.AdminQualityPCMessages)return false;
  if(issue&&!report.issues?.includes(issue))return false;
  if(occurrence&&(!issue||!issue.occurrences?.includes(occurrence)||occurrence.sessionId!==session.id))return false;
  const ids=occurrence?.evidenceMessageIds||issue?.evidenceMessageIds||[];
  if(issue&&!occurrence&&issue.sessionId!==session.id)return false;
  if(!Array.isArray(ids)||ids.some(id=>!session.messages?.some(m=>(m.id||m.messageId)===id)))return false;
  close(false);window.AdminControls?.close();
  const dialog=node('dialog','qr-chat-drawer'),c={dialog,report,session,issue,highlightIds:[...ids],focus:focus||document.activeElement,scroll:scrollY,frame:window.frameElement,appStyle:A.$('app').style.cssText,bodyOverflow:document.body.style.overflow,hadModalClass:document.body.classList.contains('menu-modal-open'),generation:++generation,index:0};current=c;
  dialog.setAttribute('aria-labelledby','qr-chat-title');dialog.setAttribute('aria-describedby','qr-chat-subtitle');
  const header=node('header','qr-chat-header'),identity=node('div','qr-chat-heading'),title=node('h2','',session.customerName||session.customerAlias||'聊天记录');title.id='qr-chat-title';
  const sub=node('p','qr-chat-subtitle','与 '+(session.accountName||session.accountAlias||'工作号未知')+' 的聊天 · '+(report.meta.channel==='wecom'?'企微':'个微'));sub.id='qr-chat-subtitle';identity.append(title,sub);header.append(identity,button('×','关闭聊天记录',()=>close()));
  const toolbar=node('div','qr-chat-toolbar');c.count=node('span','qr-chat-count','正在读取聊天记录…');toolbar.append(c.count);
  const tools=node('div','qr-chat-tools');
  if(issue){c.counter=node('span','qr-chat-counter');c.previous=button('‹','上一条关联消息',()=>jump(c,c.index-1));c.next=button('›','下一条关联消息',()=>jump(c,c.index+1));tools.append(c.previous,c.counter,c.next);}
  tools.append(button('↑','回到会话开头',()=>{c.list.scrollTop=0;}),button('↓','查看最新消息',()=>{c.list.scrollTop=c.list.scrollHeight;}));toolbar.append(tools);
  c.list=node('div','qr-chat-messages');c.list.setAttribute('role','log');c.list.setAttribute('aria-label','聊天记录，客户在左，我方在右');c.list.tabIndex=0;
  const footer=node('footer','qr-chat-footer');c.source=node('span','qr-chat-source');footer.append(c.source);
  const details=node('details','qr-chat-details');details.innerHTML='<summary>'+(issue?'问题与分析依据':'会话信息与分析结论')+'</summary><div class="qr-chat-details-body">'+(issue?'<strong>'+esc(issue.title)+'</strong><p><b>AI 分析摘要：</b>'+esc(issue.explanation||'未提供')+'</p>':'')+'<p>客户备注：'+esc(session.customerRemark||'未提供')+'<br>客户昵称：'+esc(session.customerNickname||'未提供')+'<br>人设工作号：'+esc(session.accountName||session.accountAlias||'未知')+'<br>实际操作人：'+esc(session.receiverName||'来源未记录')+'</p><p>头像和发送来源只显示已有记录；语音文字为来源转写，未取得的媒体保持缺失。当前记录仅涵盖已采集范围。</p><details><summary>查看各项保存结论（'+(session.dimensions||[]).length+'项）</summary>'+(session.dimensions||[]).map(d=>'<div class="qr-chat-dimension"><b>'+esc(d.name)+'</b><p>'+esc(d.explanation||'未提供')+'</p></div>').join('')+'</details></div>';
  dialog.append(header,toolbar,details,c.list,footer);document.body.append(dialog);
  if(c.frame){const rect=c.frame.getBoundingClientRect();c.hadFrameClass=c.frame.classList.contains('menu-dialog-layer');A.$('app').style.cssText='position:fixed;left:'+rect.left+'px;top:'+(rect.top-c.scroll)+'px;width:'+rect.width+'px;height:'+rect.height+'px;min-height:0;overflow:hidden';document.body.classList.add('menu-modal-open');c.frame.classList.add('menu-dialog-layer');}
  document.body.style.overflow='hidden';document.body.classList.add('qr-chat-open');notify(true);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{if(current===c)close();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  dialog.showModal();renderMessages(c,session,false);header.querySelector('button').focus({preventScroll:true});
  if(!report.synthetic)loadViews().then(data=>{if(current!==c)return;const view=validateView(data.sessions[session.id],session,report);if(view)renderMessages(c,view,true);}).catch(()=>{/* Existing imported evidence remains visible when the display supplement is unavailable. */});
  return true;
 }
 window.addEventListener('message',event=>{if(event.origin!==origin||event.source!==parent)return;if(event.data?.type==='admin-dialog-close')close();if(event.data?.type==='admin-page-visibility'&&event.data.visible===false)close(false);});
 window.addEventListener('pagehide',()=>close(false));
 return {open,close,validateView,viewURL,get isOpen(){return !!current;}};
})();
