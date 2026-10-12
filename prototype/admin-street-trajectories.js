/* SPEC-SUIYIN-ADMIN-081@1.0.0 — local-only street trajectory presentation. */
'use strict';
window.AdminStreetTrajectories = (() => {
  const ROUTE = 'streetTrajectories', DURATION = 9500, SVG_NS = 'http://www.w3.org/2000/svg';
  const A = window.Admin, previous = window.AdminViews;
  const {node, button} = A;
  const data = () => window.AdminStreetTrajectoryData;
  const initial = data()?.today() || new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let applied = {start:initial,end:initial,name:''}, page = 1, size = 20;
  let root, listForm, listRange, searchInput, tableBody, pager, listError;
  const queryParams = new URLSearchParams(location.search);
  let modal = null, generation = 0, scenario = queryParams.get('qa')==='1' ? queryParams.get('stScenario') || '' : '';
  const timeFormat = new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  const fmtTime = value => Number.isFinite(Date.parse(value)) ? timeFormat.format(new Date(value)).replaceAll('/', '-') : '—';
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value;
  const rangeText = range => range.start === range.end ? range.start : range.start+' 至 '+range.end;
  function icon(name) {
    const paths = {pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',replay:'<path d="M4 10a8 8 0 1 1 .7 7M4 4v6h6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',route:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v5c0 3 12-3 12 2v3"/>'};
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.pin)+'</svg>';
  }
  function svg(tag, attrs = {}) {
    const item = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key,value]) => item.setAttribute(key, String(value)));
    return item;
  }
  function plainButton(label, action, cls) {
    const item = button(label,action,cls); item.querySelector('.button-icon')?.remove(); return item;
  }
  function dateRange(value, context) {
    const wrap = node('div','st-date-field'), label = node('span','','日期范围');
    const host = node('div','source-filter-range st-date-control'); host.dataset.filterGroup = context+'日期范围';
    const start = node('input'), end = node('input');
    [[start,'开始日期','start'],[end,'结束日期','end']].forEach(([input,text,edge]) => {
      input.type='date'; input.value=value[edge]; input.setAttribute('aria-label',context+text); input.dataset.rangeEdge=edge; input.autocomplete='off';
    });
    host.append(start,node('span','source-range-separator','至'),end); wrap.append(label,host);
    return {wrap,host,start,end};
  }
  // The shared enhancer owns one active set of calendars. Rebuild this host on return
  // from a modal rather than retaining listeners that reference a removed popover.
  function restoreListCalendar() {
    if (!listRange || !root?.isConnected) return;
    const replacement = dateRange(applied,'列表'); listRange.wrap.replaceWith(replacement.wrap); listRange=replacement;
    window.AdminFilterCalendars?.enhance(listForm);
  }
  function rangeValue(controls) { return {start:controls.start.value.trim(),end:controls.end.value.trim()}; }
  function validate(range, error) {
    const message = !validDate(range.start)||!validDate(range.end) ? '请选择完整日期范围' : range.start>range.end ? '开始日期不能晚于结束日期' : '';
    error.textContent=message; error.hidden=!message; return !message;
  }
  function failList(message) {
    tableBody.replaceChildren(); const row=node('tr'), cell=node('td','st-list-empty',message); cell.colSpan=3;row.append(cell);tableBody.append(row);pager.replaceChildren();
  }
  function paintPeople() {
    let people;
    try { people=data().people(A.tenant); if (!Array.isArray(people)) throw new Error('people'); }
    catch { failList('当前页面无权访问'); return; }
    const filtered=people.filter(person=>!applied.name||person.name.includes(applied.name));
    const pages=Math.max(1,Math.ceil(filtered.length/size)); page=Math.min(page,pages);
    tableBody.replaceChildren();
    for (const person of filtered.slice((page-1)*size,page*size)) {
      const row=node('tr'); row.dataset.personId=person.id;
      const name=node('td'), identity=node('span','st-person-name',person.name);
      name.append(identity); const action=node('td');
      const show=plainButton('轨迹展示',()=>open(person.id,show),'st-show-trajectory');show.dataset.personId=person.id;
      action.append(show);row.append(name,node('td','',person.department||'—'),action);tableBody.append(row);
    }
    if (!filtered.length) { const row=node('tr'),cell=node('td','st-list-empty',people.length?'暂无符合条件的扫街人员':'暂无扫街人员');cell.colSpan=3;row.append(cell);tableBody.append(row); }
    pager.replaceChildren();const count=node('span','st-total','共 '+filtered.length+' 条'),select=node('select');
    [10,20,50].forEach(n=>select.append(new Option(n+' 条/页',String(n))));select.value=String(size);select.setAttribute('aria-label','每页条数');
    select.onchange=()=>{size=Number(select.value);page=1;paintPeople();};
    const prev=plainButton('‹',()=>{page--;paintPeople();}),next=plainButton('›',()=>{page++;paintPeople();});prev.disabled=page===1;next.disabled=page===pages;prev.setAttribute('aria-label','上一页');next.setAttribute('aria-label','下一页');
    pager.append(count,select,prev);for(let n=1;n<=pages;n++)pager.append(plainButton(String(n),()=>{page=n;paintPeople();},n===page?'selected':''));pager.append(next);
  }
  function render() {
    if(A.route!==ROUTE)return false;
    close(); root=node('section','st-page');
    const header=node('header','st-page-head'),title=node('div');title.append(node('h1','','扫街轨迹'),node('p','','选择扫街人员，查看指定日期内的行动轨迹。'));
    header.append(title,node('span','st-demo-note','轨迹为演示数据'));
    listForm=node('form','st-list-filters');listForm.noValidate=true;listRange=dateRange(applied,'列表');
    const nameField=node('label','st-name-field');searchInput=node('input');searchInput.placeholder='请输入扫街人姓名';searchInput.value=applied.name;searchInput.setAttribute('aria-label','扫街人姓名');nameField.append(node('span','','扫街人'),searchInput);
    const submit=plainButton('查询',()=>{},'primary');submit.type='submit';submit.onclick=null;
    const reset=plainButton('重置',()=>{window.AdminFilterCalendars?.close();applied={start:data()?.today()||initial,end:data()?.today()||initial,name:''};page=1;searchInput.value='';restoreListCalendar();listError.hidden=true;paintPeople();});
    listError=node('p','filter-error st-list-error');listError.setAttribute('role','alert');listError.hidden=true;
    listForm.append(listRange.wrap,nameField,submit,reset,listError);
    listForm.onsubmit=event=>{event.preventDefault();const next=rangeValue(listRange);if(!validate(next,listError))return;window.AdminFilterCalendars?.close();applied={...next,name:searchInput.value.trim()};listRange.start.value=next.start;listRange.end.value=next.end;page=1;paintPeople();};
    const wrap=node('div','st-table-wrap'),table=node('table','st-people-table'),head=node('thead'),heading=node('tr');
    ['姓名','部门','操作'].forEach(label=>heading.append(node('th','',label)));head.append(heading);tableBody=node('tbody');table.append(head,tableBody);wrap.append(table);pager=node('div','st-pager');
    root.append(header,listForm,wrap,pager);A.$('app').replaceChildren(root);window.AdminFilterCalendars?.enhance(listForm);paintPeople();return true;
  }
  function drawMap() {
    const map=svg('svg',{viewBox:'0 0 1000 600',role:'img','aria-label':'扫街行动轨迹示意地图',class:'st-map'});
    map.innerHTML='<defs><pattern id="st-building-grid" x="0" y="0" width="24" height="22" patternUnits="userSpaceOnUse"><rect x="3" y="3" width="16" height="14" rx="2" fill="#e9edeb"/></pattern><filter id="st-marker-shadow" x="-80%" y="-80%" width="260%" height="260%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0b7666" flood-opacity=".24"/></filter></defs>';
    map.append(svg('rect',{width:1000,height:600,fill:'#f2f4f1'}));
    const blocks=svg('g');
    const xs=[18,156,286,436,616,796,916],xe=[124,254,404,584,764,884,982],ys=[18,146,266,396,506],ye=[114,234,364,474,582];
    xs.forEach((x,i)=>ys.forEach((y,j)=>{if((i===3&&j===2)||(i===1&&j===3)||(i===6&&j<5))return;blocks.append(svg('rect',{x,y,width:xe[i]-x,height:ye[j]-y,rx:7,fill:'#ecefec',stroke:'#e0e5e0','stroke-width':1}));blocks.append(svg('rect',{x:x+7,y:y+7,width:xe[i]-x-14,height:ye[j]-y-14,rx:4,fill:'url(#st-building-grid)'}));}));
    map.append(blocks);
    const green=svg('g',{fill:'#dcebd8',stroke:'#ccdccc','stroke-width':1});green.append(svg('rect',{x:434,y:264,width:152,height:102,rx:12}),svg('rect',{x:284,y:394,width:122,height:82,rx:9}),svg('path',{d:'M930 0h70v600h-67q-28-54-1-109t-7-105q-17-61 3-115t-3-90q-14-55 5-181Z',fill:'#d9eceb',stroke:'none'}));map.append(green);
    map.append(svg('path',{d:'M964 0c-20 90 19 124-7 195s27 115-3 192 20 105 5 213',fill:'none',stroke:'#b9dcdf','stroke-width':34}));
    map.append(svg('path',{d:'M450 286c65-20 90 14 120-5m-103 65c30-53 58-25 90-64M300 415c45 43 68 0 88 40',fill:'none',stroke:'#f5f8ef','stroke-width':6}));
    const roads=svg('g',{stroke:'#dce1de','stroke-width':27,fill:'none'}),roadFace=svg('g',{stroke:'#fff','stroke-width':22,fill:'none'});
    [140,270,420,600,780,900].forEach(x=>{roads.append(svg('path',{d:`M${x} 0V600`}));roadFace.append(svg('path',{d:`M${x} 0V600`}));});
    [130,250,380,490].forEach(y=>{roads.append(svg('path',{d:`M0 ${y}H1000`}));roadFace.append(svg('path',{d:`M0 ${y}H1000`}));});
    map.append(roads,roadFace);
    const smallRoads=svg('g',{stroke:'#fff','stroke-width':7,fill:'none'});smallRoads.append(svg('path',{d:'M0 70H128M200 0V115M286 65H404M515 0V115M616 70H764M796 70H884M18 190H124M200 147V233M286 188H404M510 147V233M690 147V233M840 147V233M18 320H124M200 266V364M286 313H404M690 266V364M796 320H884M18 440H124M200 396V474M436 438H584M690 396V474M796 438H884M18 550H124M200 506V600M286 552H404M510 506V600M616 552H764M840 506V600'}));map.append(smallRoads);
    const labels=svg('g',{fill:'#a2aaa5','font-size':12,'font-family':'Microsoft YaHei, sans-serif','text-anchor':'middle'});
    [[345,80,'邻里中心'],[510,190,'街心广场'],[690,320,'生活商圈'],[840,190,'文化街区'],[200,315,'社区中心'],[510,548,'创意街区'],[690,439,'综合服务中心'],[75,315,'住宅区'],[840,550,'办公街区']].forEach(([x,y,text])=>{const t=svg('text',{x,y});t.textContent=text;labels.append(t);});
    [[510,318,'中心公园'],[345,440,'口袋公园']].forEach(([x,y,text])=>{const t=svg('text',{x,y,fill:'#91ad87'});t.textContent=text;labels.append(t);});
    [[350,134,'春景路'],[690,254,'文华路'],[510,384,'中心路'],[350,494,'新城路']].forEach(([x,y,text])=>{const t=svg('text',{x,y,'font-size':11,fill:'#9fa8a3','letter-spacing':4});t.textContent=text;labels.append(t);});
    [[143,320,'梧桐大道'],[783,445,'迎春路']].forEach(([x,y,text])=>{const t=svg('text',{x,y,'font-size':11,fill:'#9fa8a3',transform:`rotate(-90 ${x} ${y})`,'letter-spacing':3});t.textContent=text;labels.append(t);});map.append(labels);
    const layer=svg('g',{class:'st-route-layer'});map.append(layer);
    return {map,layer};
  }
  function normalize(result) {
    const segments=[];let invalidCount=Number(result.invalidCount)||0;
    for (const [index,source] of (result.segments||[]).entries()) {
      let current=[];const flush=()=>{if(current.length){segments.push({id:source.id+'-'+segments.length,date:source.date,points:current});current=[];}};
      for (const point of source.points||[]) {
        const t=Date.parse(point.time);
        if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>1000||point.y<0||point.y>600||!Number.isFinite(t)){invalidCount++;flush();continue;}
        if(current.length && t<current.at(-1).t)flush();
        current.push({...point,t,index});
      }
      flush();
    }
    segments.sort((a,b)=>a.points[0].t-b.points[0].t);
    return {...result,segments,invalidCount,totalPoints:segments.reduce((sum,part)=>sum+part.points.length,0)};
  }
  function buildTimeline(result) {
    let total=0,totalPoints=0;
    const segments=result.segments.map(source=>{
      let distance=0,weight=0;
      const points=source.points.map((point,index)=>{
        if(index){const prev=source.points[index-1];distance+=Math.hypot(point.x-prev.x,point.y-prev.y);weight+=Math.max(1,point.t-prev.t);}
        return {...point,distance,weight};
      });
      const duration=weight||1,part={...source,points,length:distance,weight:duration,start:total,end:total+duration,index:totalPoints};total+=duration;totalPoints+=points.length;return part;
    });
    return {segments,total,totalPoints,movable:segments.some(part=>part.length>0)};
  }
  function stopAnimation(current) { if(!current)return;cancelAnimationFrame(current.raf);current.raf=0;clearTimeout(current.loadTimer);current.loadTimer=0; }
  function setState(current,state) {current.state=state;current.dialog.dataset.state=state;}
  function currentStatus(current, text, detail='', retry=false) {
    current.status.replaceChildren();current.status.hidden=false;
    const graphic=node('div','st-status-icon');graphic.innerHTML=icon(stateIcon(current.state));
    current.status.append(graphic,node('strong','',text));if(detail)current.status.append(node('p','',detail));
    if(retry)current.status.append(plainButton('重新加载',()=>load(current),'st-retry'));
  }
  function stateIcon(state) {return state==='loading'?'route':'pin';}
  function resetVisuals(current) {
    stopAnimation(current);current.result=null;current.timeline=null;current.layer.replaceChildren();current.currentMarker=null;
    current.replay.disabled=true;current.progress.value=0;current.percent.textContent='0%';current.clock.textContent='—';current.summary.textContent='';current.warning.hidden=true;current.status.hidden=true;current.completedSegments=0;
    current.playState.textContent='';current.elapsed=0;
    for(const key of ['totalSegments','totalPoints','completedSegments','completedPoints','progress'])current.dialog.dataset[key]='0';
    delete current.dialog.dataset.playbackDuration;delete current.dialog.dataset.currentSegment;
  }
  function edgeMarker(point,label,cls) {
    const g=svg('g',{class:cls,transform:`translate(${point.x} ${point.y})`});
    g.append(svg('circle',{r:13,fill:cls==='st-start-marker'?'#fff':'#34475a',stroke:'#fff','stroke-width':3}));
    if(cls==='st-start-marker')g.append(svg('circle',{r:10,fill:'#fff',stroke:'#10a88e','stroke-width':2}));
    const t=svg('text',{'text-anchor':'middle','dominant-baseline':'central',fill:cls==='st-start-marker'?'#079f86':'#fff','font-size':11,'font-weight':600});t.textContent=label;g.append(t);return g;
  }
  function prepareRoute(current) {
    const timeline=buildTimeline(current.result);current.timeline=timeline;
    const lines=svg('g',{class:'st-route-lines'}),dots=svg('g',{class:'st-route-points'});current.layer.append(lines,dots);
    for(const part of timeline.segments){
      if(part.points.length>1&&part.length>0){
        part.element=svg('path',{d:part.points.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' '),fill:'none',stroke:'#0aa98f','stroke-width':4.5,'stroke-linecap':'round','stroke-linejoin':'round','stroke-dasharray':part.length,'stroke-dashoffset':part.length,opacity:0});lines.append(part.element);
      }else{part.element=svg('circle',{cx:part.points[0].x,cy:part.points[0].y,r:4.5,fill:'#09a68e',stroke:'#fff','stroke-width':2,opacity:0});dots.append(part.element);}
    }
    const first=timeline.segments[0].points[0],last=timeline.segments.at(-1).points.at(-1);
    current.layer.append(edgeMarker(first,'起','st-start-marker'));if(timeline.totalPoints>1)current.layer.append(edgeMarker(last,'终','st-end-marker'));
    const moving=svg('g',{class:'st-current-marker',transform:`translate(${first.x} ${first.y})`});
    moving.append(svg('circle',{r:19,fill:'#17b598',opacity:.14,class:'st-current-halo'}),svg('circle',{r:10,fill:'#0ca98e',stroke:'#fff','stroke-width':4,filter:'url(#st-marker-shadow)'}),svg('circle',{r:2.5,fill:'#fff'}));current.layer.append(moving);current.currentMarker=moving;
    current.summary.textContent=timeline.segments.length+' 段行程 · '+timeline.totalPoints.toLocaleString('zh-CN')+' 个轨迹点';
    current.warning.hidden=!current.result.invalidCount;current.warning.textContent='部分记录无法展示，缺失处已分段';
    current.dialog.dataset.totalSegments=String(timeline.segments.length);current.dialog.dataset.totalPoints=String(timeline.totalPoints);
    current.replay.disabled=!timeline.movable;
  }
  function renderFrame(current,progress) {
    const timeline=current.timeline;if(!timeline)return;
    const budget=progress*timeline.total;let lo=0,hi=timeline.segments.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(timeline.segments[mid].end<budget)lo=mid+1;else hi=mid;}
    const index=progress>=1?timeline.segments.length-1:lo;
    while(current.completedSegments<index){const complete=timeline.segments[current.completedSegments++];complete.element.setAttribute('opacity','1');complete.element.setAttribute('stroke-dashoffset','0');}
    const part=timeline.segments[index],local=progress>=1?part.weight:Math.max(0,budget-part.start);part.element.setAttribute('opacity','1');
    let a=0,b=part.points.length-1;while(a<b){const mid=(a+b)>>1;if(part.points[mid].weight<local)a=mid+1;else b=mid;}
    const right=part.points[a],left=part.points[Math.max(0,a-1)];const amount=right.weight===left.weight?1:Math.max(0,Math.min(1,(local-left.weight)/(right.weight-left.weight)));
    const x=left.x+(right.x-left.x)*amount,y=left.y+(right.y-left.y)*amount,distance=left.distance+(right.distance-left.distance)*amount;
    part.element.setAttribute('stroke-dashoffset',String(Math.max(0,part.length-distance)));
    current.currentMarker.setAttribute('transform',`translate(${x} ${y})`);current.clock.textContent=fmtTime(new Date(left.t+(right.t-left.t)*amount).toISOString());
    const percent=Math.min(100,Math.floor(progress*100));current.progress.value=percent;current.percent.textContent=percent+'%';
    current.dialog.dataset.completedPoints=String(progress>=1?timeline.totalPoints:part.index+a);current.dialog.dataset.completedSegments=String(progress>=1?timeline.segments.length:current.completedSegments);
    current.dialog.dataset.currentSegment=part.id;current.dialog.dataset.progress=String(progress);
  }
  function play(current=modal) {
    if(!current?.timeline?.movable||current!==modal)return;
    stopAnimation(current);current.completedSegments=0;
    for(const part of current.timeline.segments){part.element.setAttribute('opacity','0');part.element.setAttribute('stroke-dashoffset',String(part.length));}
    setState(current,'playing');current.status.hidden=true;current.playState.textContent='正在回放';current.startedAt=performance.now();current.elapsed=0;
    const token=current.token;renderFrame(current,0);
    const frame=now=>{if(modal!==current||current.token!==token||current.state!=='playing')return;const elapsed=Math.max(0,now-current.startedAt);current.elapsed=elapsed;const progress=Math.min(1,elapsed/DURATION);renderFrame(current,progress);if(progress>=1){setState(current,'completed');current.playState.textContent='已播放完成';current.dialog.dataset.playbackDuration=String(elapsed);current.raf=0;return;}current.raf=requestAnimationFrame(frame);};
    current.raf=requestAnimationFrame(frame);
  }
  function load(current) {
    if(current!==modal)return;resetVisuals(current);current.token=++generation;const token=current.token;
    setState(current,'loading');currentStatus(current,'正在加载轨迹','正在读取所选日期内的行程');current.playState.textContent='加载中';
    current.loadTimer=setTimeout(()=>{
      if(current!==modal||current.token!==token)return;
      try {
        if(scenario==='map-error')throw new Error('map initialization');
        const result=normalize(data().query(A.tenant,current.person.id,current.range.start,current.range.end,{scenario}));
        if(current!==modal||current.token!==token)return;
        if(result.person?.id!==current.person.id)throw new Error('identity mismatch');
        current.result=result;
        if(!result.totalPoints){setState(current,result.invalidCount?'invalid':'empty');currentStatus(current,result.invalidCount?'记录无法展示':'该日期范围暂无轨迹',result.invalidCount?'轨迹记录不完整，请重新加载。':'可以调整日期范围后重新查询。',!!result.invalidCount);current.playState.textContent='无可回放行程';return;}
        current.status.hidden=true;prepareRoute(current);
        if(!current.timeline.movable){setState(current,result.totalPoints===1?'single-point':'isolated-points');renderFrame(current,1);current.playState.textContent=result.totalPoints===1?'仅有一个轨迹点，无法回放行程':'仅有独立轨迹点，无法回放行程';current.currentMarker.classList.add('is-still');return;}
        play(current);
      }catch(error){if(current!==modal||current.token!==token)return;const denied=scenario==='denied'||/denied|forbidden|无权|unknown tenant|unknown person/i.test(error.message||'');setState(current,denied?'denied':'error');currentStatus(current,denied?'当前人员轨迹无权访问':'轨迹加载失败，请重试',denied?'请选择当前租户有权限的扫街人员。':'请重新加载当前人员和日期范围。',!denied);current.playState.textContent='无法回放';}
    },100);
  }
  function open(personId,focus=null) {
    if(A.route!==ROUTE||!root?.isConnected){A.toast('当前页面无权访问');return false;}
    close(false);window.AdminControls?.close();window.AdminFilterCalendars?.close();
    let person;try{person=data().people(A.tenant).find(item=>item.id===personId);}catch{}
    if(!person){A.toast('当前人员轨迹无权访问');return false;}
    const dialog=node('dialog','st-dialog');dialog.setAttribute('aria-labelledby','st-dialog-title');dialog.setAttribute('aria-describedby','st-dialog-description');
    const current={dialog,person,range:{start:applied.start,end:applied.end},focus:focus||document.activeElement,token:++generation,state:'loading',raf:0,loadTimer:0};modal=current;
    const header=node('header','st-dialog-head'),heading=node('div','st-heading');
    const title=node('h2','','行动轨迹');title.id='st-dialog-title';const personLine=node('p','st-dialog-person');personLine.append(node('strong','',person.name),node('span','',person.department||'—'));
    heading.append(title,personLine);const closeButton=plainButton('',()=>close(),'st-dialog-close');closeButton.innerHTML=icon('close');closeButton.setAttribute('aria-label','关闭轨迹展示');header.append(heading,closeButton);
    const filters=node('form','st-dialog-filters');filters.noValidate=true;current.controls=dateRange(current.range,'地图');current.error=node('p','filter-error st-dialog-error');current.error.setAttribute('role','alert');current.error.hidden=true;
    const query=plainButton('查询',()=>{},'primary');query.type='submit';query.onclick=null;const note=node('span','st-demo-note','轨迹为演示数据');
    filters.append(current.controls.wrap,query,note,current.error);
    filters.onsubmit=event=>{event.preventDefault();const next=rangeValue(current.controls);if(!validate(next,current.error))return;window.AdminFilterCalendars?.close();current.range=next;current.controls.start.value=next.start;current.controls.end.value=next.end;applied={...applied,...next};if(listRange){listRange.start.value=next.start;listRange.end.value=next.end;}current.rangeLabel.textContent=rangeText(next);load(current);};
    const mapWrap=node('div','st-map-wrap'),mapData=drawMap();current.layer=mapData.layer;current.map=mapData.map;
    const mapTop=node('div','st-map-caption'),timeBox=node('div','st-record-time');timeBox.append(node('span','','当前记录时间'));current.clock=node('strong','','—');timeBox.append(current.clock);
    const compass=node('div','st-compass');compass.innerHTML='<b>N</b><span>↑</span>';compass.setAttribute('aria-label','地图北向');mapTop.append(timeBox,compass);
    const mapBottom=node('div','st-map-bottom');current.warning=node('span','st-map-warning');current.warning.hidden=true;
    const legend=node('div','st-map-legend');legend.innerHTML='<span><i class="st-legend-start"></i>起点</span><span><i class="st-legend-end"></i>终点</span><span><i class="st-legend-line"></i>行动轨迹</span>';
    mapBottom.append(legend,node('span','st-map-attribution','本地地图示意'));current.status=node('div','st-map-status');current.status.setAttribute('role','status');
    mapWrap.append(current.map,mapTop,current.warning,mapBottom,current.status);
    const footer=node('footer','st-playback'),info=node('div','st-playback-info'),copy=node('div','st-playback-copy');current.playState=node('strong','','');current.rangeLabel=node('span','st-applied-range',rangeText(current.range));current.summary=node('span','st-route-summary','');
    copy.append(current.playState,current.rangeLabel,current.summary);info.append(copy);current.replay=plainButton('重新播放',()=>play(current),'st-replay');current.replay.insertAdjacentHTML('afterbegin',icon('replay'));current.replay.disabled=true;info.append(current.replay);
    const progressRow=node('div','st-progress-row');current.progress=node('progress');current.progress.max=100;current.progress.value=0;current.progress.setAttribute('aria-label','轨迹播放进度');current.percent=node('span','','0%');progressRow.append(current.progress,current.percent);
    const hint=node('p','st-playback-hint','全部行程将在10秒内播放完成');hint.id='st-dialog-description';footer.append(info,progressRow,hint);
    dialog.append(header,filters,mapWrap,footer);document.body.append(dialog);
    const app=A.$('app');current.appStyle=app.style.cssText;current.scroll=scrollY;
    if(window.frameElement){const rect=window.frameElement.getBoundingClientRect();app.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top-current.scroll}px;width:${rect.width}px;height:${rect.height}px;min-height:0;overflow:hidden`;document.body.classList.add('menu-modal-open');window.frameElement.classList.add('menu-dialog-layer');}
    document.body.classList.add('st-modal-open');parent.postMessage({type:'admin-dialog-state',open:true,source:'street-trajectories',dismissOnBackdrop:false},location.origin);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{if(modal===current)close();});
    dialog.showModal();window.AdminFilterCalendars?.enhance(filters);
    // The shared date popover must belong to this modal so dialog inertness does not
    // prevent interaction with its calendar in the top layer.
    filters.querySelectorAll('[aria-controls]').forEach(control=>{const panel=document.getElementById(control.getAttribute('aria-controls'));if(panel?.classList.contains('usage-calendar'))dialog.append(panel);});
    closeButton.focus();load(current);return true;
  }
  function close(restoreFocus=true) {
    if(!modal)return;const current=modal;modal=null;generation++;stopAnimation(current);window.AdminFilterCalendars?.close();
    current.dialog.close();current.dialog.remove();A.$('app').style.cssText=current.appStyle||'';
    document.body.classList.remove('menu-modal-open','st-modal-open');window.frameElement?.classList.remove('menu-dialog-layer');
    parent.postMessage({type:'admin-dialog-state',open:false,source:'street-trajectories'},location.origin);
    if(current.scroll)window.scrollTo(0,current.scroll);restoreListCalendar();if(restoreFocus&&current.focus?.isConnected)current.focus.focus();
  }
  window.addEventListener('message',event=>{if(event.origin!==location.origin)return;const message=event.data;if(message?.type==='admin-page-visibility'&&message.visible===false)close(false);if(message?.type==='admin-trajectory-dispose')close(false);});
  window.addEventListener('pagehide',()=>close(false));
  window.AdminViews={...previous,render(){return render()||previous?.render?.();}};
  return {render,open,close,play,validDate,normalize,buildTimeline,DURATION,setScenario(value){scenario=value||'';},get state(){return modal?{state:modal.state,tenant:A.tenant,personId:modal.person.id,range:{...modal.range},generation:modal.token,totalPoints:modal.result?.totalPoints||0,totalSegments:modal.result?.segments.length||0,elapsed:modal.elapsed||0,startedAt:modal.startedAt||0,progress:Number(modal.dialog.dataset.progress)||0,completedPoints:Number(modal.dialog.dataset.completedPoints)||0,completedSegments:Number(modal.dialog.dataset.completedSegments)||0}: {state:'closed',tenant:A.tenant,applied:{...applied}};}};
})();
