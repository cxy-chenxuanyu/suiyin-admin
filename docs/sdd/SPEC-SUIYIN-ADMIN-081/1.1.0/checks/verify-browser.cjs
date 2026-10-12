/* SPEC-081 local acceptance: isolated Chrome, synthetic data, no user profile or writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
let playwright;
try { playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
catch { playwright = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const workspace = path.resolve(__dirname, '../../../..');
const repo = path.join(workspace, '佰智德三/碎银原型/suiyin-admin');
const route = 'streetTrajectories';
const tenants = ['yestar-sz','yestar','yestar-bj','yestar-gz','yestar-hz','yestar-jx','huamei-xian','aoli-xian'];
const excluded = ['bzds','jbfs','mengzhua','crrm','hqjd','ykjl','ruixi-kh-xiaowen','rxxz','yzhb'];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(__dirname, 'evidence', stamp);
fs.mkdirSync(output, {recursive:true});
const results = [], errors = [], external = [], geoCalls = [];
let browser, context, server, base, page;
const flatten = items => (items || []).flatMap(item => [item, ...flatten(item.children)]);
const routeRows = (table, key) => (table?.rows || []).filter(row => row.tree?.key === key || row.cells?.[table.headers.indexOf('菜单路由')] === key);
const read = name => JSON.parse(fs.readFileSync(path.join(repo, 'prototype/data', name), 'utf8'));
async function check(name, body) {
  const start = Date.now();
  try { const details = await body(); results.push({name, status:'PASS', elapsedMs:Date.now()-start, ...details}); console.log('PASS ' + name); }
  catch(error) { results.push({name, status:'FAIL', elapsedMs:Date.now()-start, error:error.stack}); console.error('FAIL '+name+': '+error.message); await page?.screenshot({path:path.join(output, 'failure-'+results.length+'.png')}).catch(()=>{}); }
}
async function serve() {
  const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
  server = http.createServer((req,res) => {
    let file; try { file = path.resolve(repo, '.'+decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); } catch { res.writeHead(400).end(); return; }
    if(!file.startsWith(repo+path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => { if(error) { res.writeHead(404).end(); return; } res.writeHead(200, {'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes); });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base = 'http://127.0.0.1:'+server.address().port+'/prototype/';
}
async function newPage() {
  const p = await context.newPage(); p.setDefaultTimeout(8000);
  p.on('pageerror',error=>errors.push({url:p.url(),error:error.message}));
  return p;
}
async function open(tenant='yestar-sz', target=route) {
  await page.goto(base+'_shell.html?tenant='+tenant+'&page='+target+'&qa=1');
  const iframe = page.locator('#panel-'+target+' iframe'); await iframe.waitFor();
  const frame = await (await iframe.elementHandle()).contentFrame();
  await frame.locator('body[data-content-ready="true"]').waitFor();
  return frame;
}
async function sourceMatrix() {
  const nav = read('navigation-snapshot.json');
  for(const id of [...tenants,...excluded]) {
    const tenant = nav.tenants.find(t=>t.id===id), items = flatten(tenant.menu), data = read('content/'+id+'.json');
    const expected = tenants.includes(id) ? 1 : 0;
    assert.equal(items.filter(item=>item.route===route).length, expected, id+' navigation uniqueness');
    assert.equal(routeRows(data.menu.tables[0],route).length, expected, id+' menu uniqueness');
    if(expected) {
      const group = tenant.menu.find(g=>g.children?.some(c=>c.route===route));
      assert.equal(group.label,'数据展示',id+' data group');
      const anchor = group.children.find(c=>c.route==='newAddedRecords');
      if(anchor) assert.equal(group.children.findIndex(c=>c.route===route),group.children.findIndex(c=>c.route===anchor.route)+1,id+' source adjacency');
      else {assert.ok(['huamei-xian','aoli-xian'].includes(id));assert.ok(!items.some(item=>['newAddedRecords','salesStatsReferral'].includes(item.route)),id+' no fabricated recruitment page');}
      assert.ok(data[route],id+' content registration');
    }
  }
  assert.equal(routeRows(read('content/bzds.json').allMenu.tables[0],route).length,1,'platform definition uniqueness');
  return {approvedTenants:tenants.length, excludedTenants:excluded.length};
}
async function dataContract() {
  const sandbox={window:{}}; vm.runInNewContext(fs.readFileSync(path.join(repo,'prototype/data/street-trajectories.js'),'utf8'),sandbox);
  const api=sandbox.window.AdminStreetTrajectoryData,today=api.today(),samples=[];
  for(const days of [1,7,30,365]) {
    const start=api.addDays(today,1-days), result=api.query('yestar-sz','demo-01',start,today);
    assert.equal(result.segments.length,days*2,'whole selected date range');
    assert.ok(result.totalPoints>days*2);
    assert.ok(result.segments.every(segment=>segment.points.every(point=>Date.parse(point.time)>=Date.parse(start+'T00:00:00+08:00')&&Date.parse(point.time)<Date.parse(api.addDays(today,1)+'T00:00:00+08:00'))));
    samples.push({days,segments:result.segments.length,points:result.totalPoints});
  }
  assert.equal(api.query('yestar-sz','demo-23',today,today).totalPoints,0);
  assert.equal(api.query('yestar-sz','demo-24',today,today).totalPoints,1);
  assert.equal(api.query('yestar-sz','demo-01','1900-01-01','1900-01-01').totalPoints,0);
  for(const tenant of excluded)assert.throws(()=>api.query(tenant,'demo-01',today,today),/无权/);
  for(const tenant of ['huamei-xian','aoli-xian'])assert.equal(api.query(tenant,'demo-01',today,today).tenantId,tenant);
  assert.throws(()=>api.query('yestar-sz','missing',today,today),/无权/);
  assert.throws(()=>api.query('yestar-sz','demo-01',today,api.addDays(today,-1)),/开始日期/);
  const first=api.query('yestar-sz','demo-01',today,today),other=api.query('yestar','demo-01',today,today),invalid=api.query('yestar-sz','demo-01',today,today,{scenario:'invalid'});
  assert.notEqual(first.segments[0].id,other.segments[0].id);
  assert.notDeepEqual(JSON.parse(JSON.stringify(first.segments)),JSON.parse(JSON.stringify(other.segments)));
  assert.equal(invalid.invalidCount,1); assert.equal(invalid.segments.length,first.segments.length+1,'bad point breaks the segment');
  const dense=api.query('yestar-sz','demo-01',today,today,{scenario:'dense'});assert.ok(dense.totalPoints>first.totalPoints*20);
  return {samples,densePoints:dense.totalPoints};
}
async function browserMatrix() {
  const counts=[];
  for(const tenant of tenants) {
    const frame=await open(tenant);
    const nav=await page.locator('#navigation [data-route]').evaluateAll(nodes=>nodes.map(n=>n.dataset.route));
    assert.equal(nav.filter(r=>r===route).length,1,tenant+' live navigation');
    if(nav.includes('newAddedRecords'))assert.equal(nav.indexOf(route),nav.indexOf('newAddedRecords')+1,tenant+' live adjacency');
    else assert.ok(['huamei-xian','aoli-xian'].includes(tenant),'only newly covered Xi’an tenants have no recruitment anchor');
    assert.match(await frame.locator('body').innerText(),/扫街轨迹/);
    const menu=await open(tenant,'menu');
    const table=await menu.evaluate(()=>structuredClone(Admin.getTable()));
    assert.equal(routeRows(table,route).length,1,tenant+' live menu');
    counts.push({tenant,navCount:1,menuCount:1});
  }
  const platform=await open('bzds','allMenu');
  assert.equal(routeRows(await platform.evaluate(()=>structuredClone(Admin.getTable())),route).length,1,'live platform definition uniqueness');
  for(const tenant of excluded) {
    await page.goto(base+'_shell.html?tenant='+tenant+'&page='+route+'&qa=1');
    await page.locator('#navigation [data-route]').first().waitFor();
    assert.equal(await page.locator('#navigation [data-route="'+route+'"]').count(),0,tenant+' live exclusion');
    assert.equal(await page.locator('#panel-'+route).count(),0,tenant+' excluded route not rendered');
  }
  return {tenants:counts};
}
async function xianMigration() {
  const nav=read('navigation-snapshot.json'), proofs=[];
  for(const tenant of ['huamei-xian','aoli-xian']) {
    const registered=nav.tenants.find(item=>item.id===tenant),group=registered.menu.find(item=>item.children?.some(child=>child.route===route)),source=read('content/'+tenant+'.json').menu;
    const oldRevision='2026-09-30-admin076-pending-capture-v1-public-demo-identities-v1';
    const baseline=source.menuRefresh?.baselines?.[oldRevision];
    assert.ok(baseline,'retain actual pre-081 Xi’an menu baseline');
    const saved=structuredClone(source);saved.dataRevision=oldRevision;saved.tables[0]={...saved.tables[0],headers:baseline.headers||source.tables[0].headers,rows:structuredClone(baseline.rows)};
    const original=saved.tables[0].rows.find(row=>row.tree?.key==='salesManage');original.cells[0]='本机保留名称';original.extra={...original.extra,qaPreserve081:'keep-this-field'};
    // Reproduce an older explicit sidebar selection which predates the new parent.
    const override={enabled:['salesManage','menu','setting'],display:{},labels:{},order:{},appliedMigrations:{}};
    await page.goto(base+'_shell.html?tenant='+tenant+'&page=menu&qa=1');
    await page.evaluate(({tenant,saved,override})=>{localStorage.setItem('admin-qa:v1:'+tenant+':menu',JSON.stringify(saved));localStorage.setItem('admin-qa-nav:'+tenant,JSON.stringify(override));}, {tenant,saved,override});
    let frame=await open(tenant,'menu');
    let table=await frame.evaluate(()=>structuredClone(Admin.getTable()));
    assert.equal(routeRows(table,route).length,1,'old model receives route');
    assert.equal(routeRows(table,'salesManage')[0].cells[0],'本机保留名称','old local label preserved');
    assert.equal(routeRows(table,'salesManage')[0].extra.qaPreserve081,'keep-this-field','old custom metadata preserved');
    assert.equal(await page.locator('#navigation [data-route="'+route+'"]').count(),1,'new Xi’an parent accepts child for old default navigation');
    frame=await open(tenant);assert.equal(await frame.locator('.st-show-trajectory').count(),20);
    // Hide the newly introduced parent through the same persisted visibility model.
    await page.evaluate(({tenant,parent})=>{const key='admin-qa-nav:'+tenant,value=JSON.parse(localStorage.getItem(key));value.display={...value.display,[parent]:'隐藏'};localStorage.setItem(key,JSON.stringify(value));},{tenant,parent:group.route||group.id});
    await page.goto(base+'_shell.html?tenant='+tenant+'&page=menu&qa=1');await page.locator('#navigation [data-route="menu"]').waitFor({state:'attached'});
    assert.equal(await page.locator('#navigation [data-route="'+route+'"]').count(),0,'hidden parent suppresses child navigation');
    await page.goto(base+'admin-content.html?tenant='+tenant+'&route='+route+'&qa=1');await page.locator('body[data-content-ready="error"]').waitFor();
    assert.equal(await page.locator('.st-show-trajectory,.st-dialog').count(),0,'hidden parent also blocks direct route');
    assert.match(await page.locator('body').innerText(),/无权查看/);
    await page.evaluate(tenant=>{localStorage.removeItem('admin-qa:v1:'+tenant+':menu');localStorage.removeItem('admin-qa-nav:'+tenant);},tenant);
    frame=await open(tenant);assert.equal(await frame.locator('.st-show-trajectory').count(),20,'restored default works');
    proofs.push({tenant,parent:group.route||group.id,oldRevision,localFieldPreserved:true,parentHiddenBlocksDirect:true});
  }
  return {migrations:proofs};
}
async function retiredPreviewCaches() {
  const nav=read('navigation-snapshot.json'),proofs=[];
  for(const tenant of excluded)for(const suffix of ['street-trajectories-v1','street-trajectories-medical-v2']) {
    const source=read('content/'+tenant+'.json').menu,saved=structuredClone(source),registered=nav.tenants.find(item=>item.id===tenant);
    saved.dataRevision=source.dataRevision+'-'+suffix;
    const original=saved.tables[0].rows.find(row=>row.tree?.key&&!row.tree.hasChildren);
    assert.ok(original);const preserveKey=original.tree.key;original.cells[0]='缓存本地名称';original.extra={...original.extra,qaPreserve081:suffix};
    saved.config={...saved.config,qaPreserve081:suffix};
    const anchor=saved.tables[0].rows.find(row=>['newAddedRecords','salesStatsReferral'].includes(row.tree?.key));
    assert.ok(anchor,'retired broader preview tenant had a recruitment anchor');
    const retired=structuredClone(anchor);retired.id=tenant+'-street-trajectory-preview';retired.tree.key=route;retired.cells[0]='扫街轨迹';
    saved.tables[0].rows.splice(saved.tables[0].rows.indexOf(anchor)+1,0,retired);
    const enabled=flatten(registered.menu).filter(item=>item.route&&item.display!=='隐藏').map(item=>item.route);enabled.push(route);
    const override={enabled,display:{},labels:{},order:{},appliedMigrations:{'street-trajectories-v1':true,'street-trajectories-medical-v2':suffix.endsWith('v2')}};
    await page.goto(base+'_shell.html?tenant='+tenant+'&page=menu&qa=1');
    await page.evaluate(({tenant,saved,override})=>{localStorage.setItem('admin-qa:v1:'+tenant+':menu',JSON.stringify(saved));localStorage.setItem('admin-qa-nav:'+tenant,JSON.stringify(override));},{tenant,saved,override});
    const frame=await open(tenant,'menu'),table=await frame.evaluate(()=>structuredClone(Admin.getTable()));
    assert.equal(routeRows(table,route).length,0,'retired cached route removed from menu');
    assert.equal(routeRows(table,preserveKey)[0].cells[0],'缓存本地名称','unrelated cached label preserved');
    assert.equal(routeRows(table,preserveKey)[0].extra.qaPreserve081,suffix,'unrelated cached row field preserved');
    assert.equal(await frame.evaluate(()=>Admin.model.config.qaPreserve081),suffix,'unrelated cached configuration preserved');
    assert.equal(await page.locator('#navigation [data-route="'+route+'"]').count(),0,'retired enabled cache cannot grant route');
    await page.goto(base+'admin-content.html?tenant='+tenant+'&route='+route+'&qa=1');await page.locator('body[data-content-ready="error"]').waitFor();assert.equal(await page.locator('.st-show-trajectory,.st-dialog').count(),0,'retired cache cannot enable direct content access');
    await page.evaluate(tenant=>{localStorage.removeItem('admin-qa:v1:'+tenant+':menu');localStorage.removeItem('admin-qa-nav:'+tenant);},tenant);
    proofs.push({tenant,retiredRevision:saved.dataRevision,localFieldsPreserved:true,directAccessDenied:true});
  }
  return {retiredCaches:proofs};
}

// UI-specific acceptance below uses rendered controls and SVG evidence, not product test hooks.
async function setDates(frame, scope, start, end) {
  await frame.getByLabel(scope+'开始日期',{exact:true}).fill(start);
  await frame.getByLabel(scope+'结束日期',{exact:true}).fill(end);
  await frame.locator(scope==='地图'?'.st-dialog-filters':'.st-list-filters').getByRole('button',{name:'查询',exact:true}).click();
}
async function showAllPeople(frame) {
  await frame.getByRole('combobox',{name:'每页条数',exact:true}).click();
  await frame.getByRole('option',{name:'50 条/页',exact:true}).click();
}
async function expected(frame, days=1, personId='demo-01') {
  return frame.evaluate(({days,personId})=>{const api=AdminStreetTrajectoryData,end=api.today(),start=api.addDays(end,1-days);return api.query(Admin.tenant,personId,start,end);},{days,personId});
}
async function completeEvidence(frame,result) {
  const observed=await frame.locator('.st-dialog').evaluate(dialog=>({
    ...dialog.dataset,
    paths:[...dialog.querySelectorAll('.st-route-lines path')].map(p=>({d:p.getAttribute('d'),offset:p.getAttribute('stroke-dashoffset'),opacity:p.getAttribute('opacity')})),
    marker:dialog.querySelector('.st-current-marker')?.getAttribute('transform'),
    text:dialog.innerText
  }));
  assert.equal(observed.state,'completed');assert.equal(Number(observed.progress),1);
  assert.equal(Number(observed.completedSegments),result.segments.length);
  assert.equal(Number(observed.completedPoints),result.totalPoints);
  assert.ok(Number(observed.playbackDuration)<=10000,'one total playback <=10 sec');
  assert.equal(observed.paths.length,result.segments.length,'each disconnected segment has its own path');
  for(const [i,part] of result.segments.entries()) {
    assert.equal(observed.paths[i].d,part.points.map((p,index)=>(index?'L':'M')+p.x+' '+p.y).join(' '),'no omitted points or fabricated cross-segment lines');
    assert.equal(Number(observed.paths[i].offset),0);assert.equal(Number(observed.paths[i].opacity),1);
  }
  const last=result.segments.at(-1).points.at(-1);assert.equal(observed.marker,`translate(${last.x} ${last.y})`);
  assert.match(observed.text,/已播放完成/);
  return {segments:result.segments.length,points:result.totalPoints,playbackMs:Number(observed.playbackDuration)};
}
async function uiChecks() {
  let frame;
  await check('人员列表、同名ID、姓名搜索、分页及默认今天',async()=>{
    frame=await open();await frame.locator('.st-page').waitFor();
    assert.equal(await frame.locator('.st-show-trajectory').count(),20);
    const today=await frame.evaluate(()=>AdminStreetTrajectoryData.today());
    assert.equal(await frame.getByLabel('列表开始日期',{exact:true}).inputValue(),today);
    assert.equal(await frame.getByLabel('列表结束日期',{exact:true}).inputValue(),today);
    await showAllPeople(frame);
    assert.equal(await frame.locator('.st-show-trajectory').count(),24);
    const firstTwo=await frame.locator('.st-people-table tbody tr').evaluateAll(rows=>rows.slice(0,2).map(row=>({name:row.cells[0].textContent,id:row.dataset.personId})));
    assert.equal(firstTwo[0].name,firstTwo[1].name);assert.notEqual(firstTwo[0].id,firstTwo[1].id);
    await frame.getByLabel('扫街人姓名',{exact:true}).fill(firstTwo[0].name);await frame.locator('.st-list-filters').getByRole('button',{name:'查询',exact:true}).click();
    assert.equal(await frame.locator('.st-show-trajectory').count(),2);
    await frame.locator('.st-list-filters').getByRole('button',{name:'重置',exact:true}).click();
    await page.screenshot({path:path.join(output,'01-list.png')});
    return {people:24,defaultDate:today,sameNameIds:firstTwo.map(p=>p.id)};
  });
  await check('1日真实时钟回放：动态中间态、全部片段及终点在10秒内',async()=>{
    frame=await open();const result=await expected(frame);
    await frame.evaluate(()=>{
      window.__stObserved={};const observer=new MutationObserver(()=>{const state=document.querySelector('.st-dialog')?.dataset.state;if(state==='playing'&&!window.__stObserved.started)window.__stObserved.started=performance.now();if(state==='completed'&&!window.__stObserved.completed){window.__stObserved.completed=performance.now();observer.disconnect();}});observer.observe(document.body,{attributes:true,childList:true,subtree:true});
    });
    await frame.locator('.st-show-trajectory[data-person-id="demo-01"]').click();
    await frame.locator('.st-dialog[data-state="playing"]').waitFor();
    await page.waitForTimeout(800);
    const progress=await frame.locator('.st-dialog').getAttribute('data-progress');assert.ok(Number(progress)>0&&Number(progress)<1,'visible intermediate animation');
    await page.screenshot({path:path.join(output,'02-map-playing.png')});
    await frame.locator('.st-dialog[data-state="completed"]').waitFor({timeout:12000});
    const proof=await completeEvidence(frame,result),clock=await frame.evaluate(()=>window.__stObserved);
    assert.ok(clock.completed-clock.started<=10000);assert.ok(clock.completed-clock.started>=9000,'not instantly displaying the result');
    await page.screenshot({path:path.join(output,'03-map-completed.png')});
    await frame.getByRole('button',{name:'关闭轨迹展示',exact:true}).click();
    return {...proof,clock:'real browser performance.now / MutationObserver',observedMs:clock.completed-clock.started};
  });
  await check('地图日历可操作、Escape取消草稿及关闭后列表日历恢复',async()=>{
    frame=await open();const today=await frame.getByLabel('列表开始日期',{exact:true}).inputValue();
    await frame.locator('.st-show-trajectory[data-person-id="demo-01"]').click();
    await frame.locator('.st-dialog-filters [data-date-open]').click();
    let calendar=frame.locator('.st-dialog .usage-calendar:not([hidden])');await calendar.waitFor();
    await page.screenshot({path:path.join(output,'06-map-calendar.png')});
    await calendar.locator('.usage-calendar-day').first().click();await page.keyboard.press('Escape');
    assert.equal(await frame.locator('.st-dialog').count(),1,'Escape closes calendar before the map');
    assert.equal(await frame.getByLabel('地图开始日期',{exact:true}).inputValue(),today);
    await frame.locator('.st-dialog-filters [data-date-open]').click();calendar=frame.locator('.st-dialog .usage-calendar:not([hidden])');
    await calendar.locator('.usage-calendar-day').nth(0).click();await calendar.locator('.usage-calendar-day').nth(2).click();
    assert.ok((await frame.getByLabel('地图开始日期',{exact:true}).inputValue()).endsWith('-01'));
    assert.ok((await frame.getByLabel('地图结束日期',{exact:true}).inputValue()).endsWith('-03'));
    assert.equal(await frame.locator('.st-applied-range').innerText(),today,'picking calendar dates does not silently query');
    await frame.getByRole('button',{name:'关闭轨迹展示',exact:true}).click();
    assert.equal(await frame.getByLabel('列表开始日期',{exact:true}).inputValue(),today,'unsubmitted dialog draft discarded');
    await frame.locator('.st-list-filters [data-date-open]').click();await frame.locator('.usage-calendar:not([hidden])').waitFor();await page.keyboard.press('Escape');
  });
  await check('7/30/365日可控时钟回放：同一10秒预算覆盖全部行程',async()=>{
    frame=await open();await page.clock.install({time:new Date()});await page.clock.pauseAt(new Date(Date.now()+200));
    const proofs=[];
    for(const days of [7,30,365]) {
      const result=await expected(frame,days);await setDates(frame,'列表',result.start,result.end);
      await frame.locator('.st-show-trajectory[data-person-id="demo-01"]').click();await page.clock.runFor(128);
      assert.equal(await frame.locator('.st-dialog').getAttribute('data-state'),'playing');
      await page.clock.fastForward(4800);
      if(days===7)await page.screenshot({path:path.join(output,'04-multiday-playing.png')});
      const mid=Number(await frame.locator('.st-dialog').getAttribute('data-progress'));assert.ok(mid>.4&&mid<.7);
      await page.clock.fastForward(4900);proofs.push({days,...await completeEvidence(frame,result)});
      if(days===365)await page.screenshot({path:path.join(output,'05-year-completed.png')});
      await frame.getByRole('button',{name:'关闭轨迹展示',exact:true}).click();
    }
    return {clock:'Playwright controlled browser clock',ranges:proofs};
  });
  await check('日期草稿不改变结果；反向/缺失输入不提交；重播从头且不循环',async()=>{
    const result=await expected(frame,1);await setDates(frame,'列表',result.start,result.end);
    await frame.locator('.st-show-trajectory[data-person-id="demo-01"]').click();await page.clock.runFor(128);
    const applied=await frame.locator('.st-applied-range').innerText();
    await frame.getByLabel('地图开始日期',{exact:true}).fill('2099-01-01');
    assert.equal(await frame.locator('.st-applied-range').innerText(),applied);
    await frame.locator('.st-dialog-filters').getByRole('button',{name:'查询',exact:true}).click();
    assert.match(await frame.locator('.st-dialog-error').innerText(),/开始日期不能晚于结束日期/);
    assert.equal(await frame.locator('.st-applied-range').innerText(),applied);
    await frame.getByLabel('地图开始日期',{exact:true}).fill('');await frame.locator('.st-dialog-filters').getByRole('button',{name:'查询',exact:true}).click();assert.match(await frame.locator('.st-dialog-error').innerText(),/请选择完整日期范围/);
    await page.clock.fastForward(9700);await completeEvidence(frame,result);
    await frame.locator('.st-replay').click();assert.equal(Number(await frame.locator('.st-dialog').getAttribute('data-progress')),0);
    await page.clock.fastForward(9700);const proof=await completeEvidence(frame,result);await page.clock.fastForward(15000);assert.equal(await frame.locator('.st-dialog').getAttribute('data-state'),'completed');
    await frame.getByRole('button',{name:'关闭轨迹展示',exact:true}).click();
    assert.equal(await frame.getByLabel('列表开始日期',{exact:true}).inputValue(),result.start);
    return proof;
  });
  await check('无点/单点状态无伪造路线；范围超出样本为空',async()=>{
    await showAllPeople(frame);
    for(const [id,state,message,count] of [['demo-23','empty','该日期范围暂无轨迹',0],['demo-24','single-point','仅有一个轨迹点',1]]) {
      await frame.locator('.st-show-trajectory[data-person-id="'+id+'"]').click();await page.clock.runFor(128);
      assert.equal(await frame.locator('.st-dialog').getAttribute('data-state'),state);assert.match(await frame.locator('.st-dialog').innerText(),new RegExp(message));
      assert.equal(await frame.locator('.st-route-lines path').count(),0);assert.equal(await frame.locator('.st-route-points circle').count(),count);assert.ok(await frame.locator('.st-replay').isDisabled());
      await page.screenshot({path:path.join(output,state+'.png')});await frame.getByRole('button',{name:'关闭轨迹展示',exact:true}).click();
    }
    await setDates(frame,'列表','1900-01-01','1900-01-02');await frame.locator('.st-show-trajectory[data-person-id="demo-01"]').click();await page.clock.runFor(128);assert.equal(await frame.locator('.st-dialog').getAttribute('data-state'),'empty');await frame.getByRole('button',{name:'关闭轨迹展示',exact:true}).click();
  });
  await check('播放中查询新范围、关闭和同名换人清理旧结果',async()=>{
    const result=await expected(frame,1);await setDates(frame,'列表',result.start,result.end);
    await frame.locator('.st-show-trajectory[data-person-id="demo-01"]').click();await page.clock.fastForward(2000);
    await setDates(frame,'地图','1900-01-01','1900-01-01');assert.equal(await frame.locator('.st-route-lines path').count(),0);await page.clock.fastForward(10000);assert.equal(await frame.locator('.st-dialog').getAttribute('data-state'),'empty');assert.equal(await frame.locator('.st-route-lines path').count(),0);
    await setDates(frame,'地图',result.start,result.end);await page.clock.fastForward(1000);await frame.getByRole('button',{name:'关闭轨迹展示',exact:true}).click();await page.clock.fastForward(11000);assert.equal(await frame.locator('.st-dialog').count(),0);
    assert.equal(await frame.evaluate(()=>document.activeElement?.dataset.personId),'demo-01','focus restored to clicked row');
    await frame.locator('.st-show-trajectory[data-person-id="demo-02"]').click();await page.clock.runFor(128);const other=await expected(frame,1,'demo-02');await page.clock.fastForward(9700);await completeEvidence(frame,other);await frame.getByRole('button',{name:'关闭轨迹展示',exact:true}).click();
  });
  await check('读取失败/坏点/全部无效/无权及高密度结果',async()=>{
    for(const [scenario,state] of [['error','error'],['all-invalid','invalid'],['denied','denied']]) {
      await frame.evaluate(s=>AdminStreetTrajectories.setScenario(s),scenario);await frame.locator('.st-show-trajectory[data-person-id="demo-01"]').click();await page.clock.runFor(128);assert.equal(await frame.locator('.st-dialog').getAttribute('data-state'),state);assert.equal(await frame.locator('.st-route-lines path').count(),0);
      if(scenario==='error'){await frame.evaluate(()=>AdminStreetTrajectories.setScenario(''));await frame.locator('.st-retry').click();await page.clock.runFor(128);assert.equal(await frame.locator('.st-dialog').getAttribute('data-state'),'playing');}
      await frame.getByRole('button',{name:'关闭轨迹展示',exact:true}).click();
    }
    for(const scenario of ['invalid','dense']) {
      await frame.evaluate(s=>AdminStreetTrajectories.setScenario(s),scenario);const result=await frame.evaluate(s=>{const api=AdminStreetTrajectoryData,d=api.today();return api.query(Admin.tenant,'demo-01',d,d,{scenario:s});},scenario);
      await frame.locator('.st-show-trajectory[data-person-id="demo-01"]').click();await page.clock.runFor(128);
      if(scenario==='invalid')assert.match(await frame.locator('.st-map-warning').innerText(),/部分记录无法展示/);
      await page.clock.fastForward(9700);await completeEvidence(frame,result);await frame.getByRole('button',{name:'关闭轨迹展示',exact:true}).click();
    }
    await frame.evaluate(()=>AdminStreetTrajectories.setScenario(''));
  });
  await check('切页签取消旧回放；新租户人员/路线独立；非适用直达不泄露',async()=>{
    await frame.locator('.st-show-trajectory[data-person-id="demo-01"]').click();await page.clock.runFor(128);
    // A shell page transition is exercised via its existing navigation click, even while the modal covers it.
    await page.locator('#navigation [data-route="newAddedRecords"]').evaluate(element=>element.click());await page.clock.runFor(200);
    assert.equal(await frame.locator('.st-dialog').count(),0,'hidden iframe cancels animation');
    await page.locator('#navigation [data-route="'+route+'"]').click();await page.clock.fastForward(11000);assert.equal(await frame.locator('.st-dialog').count(),0);
    frame=await open('yestar');await page.clock.runFor(200);const result=await expected(frame);
    assert.equal(result.tenantId,'yestar');await frame.locator('.st-show-trajectory[data-person-id="demo-01"]').click();await page.clock.runFor(128);await page.clock.fastForward(9700);await completeEvidence(frame,result);assert.match(await frame.locator('.st-dialog-person').innerText(),new RegExp(result.person.name));
    await frame.getByRole('button',{name:'关闭轨迹展示',exact:true}).click();
    await page.clock.resume();
    for(const tenant of [...excluded,'not-a-tenant']) {
      await page.goto(base+'admin-content.html?tenant='+tenant+'&route='+route+'&qa=1');
      await page.locator('body').waitFor();await page.waitForTimeout(250);
      assert.equal(await page.locator('.st-show-trajectory,.st-dialog').count(),0,tenant+' direct content guard');
    }
  });
}

(async()=>{
  try {
    await serve();
    browser = await playwright.chromium.launch({channel:'chrome',headless:true});
    context = await browser.newContext({viewport:{width:1580,height:1000},timezoneId:'Asia/Shanghai'});
    await context.route('**/*', async request => {
      const url=request.request().url();
      if(url.startsWith(new URL(base).origin+'/')||url.startsWith('data:')||url.startsWith('blob:')) await request.continue();
      else { external.push(url); await request.abort(); }
    });
    await context.exposeBinding('__trajectoryQaGeoCall',(_,method)=>geoCalls.push(method));
    await context.addInitScript(()=>{
      for(const method of ['getCurrentPosition','watchPosition']) {
        try { Object.defineProperty(navigator.geolocation,method,{value:()=>{window.__trajectoryQaGeoCall(method); throw new Error('Unexpected real geolocation call');}}); } catch {}
      }
    });
    page=await newPage();
    await check('8医美租户导航/menu、平台allMenu唯一；9非医美无入口',sourceMatrix);
    await check('日期范围全部样本、断轨坏点、单点空态与租户数据隔离',dataContract);
    await check('8医美租户实际Shell入口与位置；9非医美直达不开放',browserMatrix);
    await check('两西安旧menu缓存与旧侧栏迁移；父级隐藏和直接访问边界',xianMigration);
    await check('9非医美v1/v2未发布缓存退役；本机字段保留且直达拒绝',retiredPreviewCaches);
    if(!process.argv.includes('--matrix-only')) await uiChecks();
    await check('无外网、定位调用或浏览器脚本错误',async()=>{assert.deepEqual(external,[]);assert.deepEqual(geoCalls,[]);assert.deepEqual(errors,[]);return {externalRequests:external,geolocationCalls:geoCalls,scriptErrors:errors};});
  } catch(error) { results.push({name:'harness',status:'FAIL',error:error.stack}); console.error(error.stack); }
  finally {
    await browser?.close(); if(server) await new Promise(resolve=>server.close(resolve));
    const report={spec:'SPEC-SUIYIN-ADMIN-081@1.1.0',timestamp:new Date().toISOString(),scope:'local-static-prototype-medical-aesthetics',tenants,excludedTenants:excluded,results,externalRequests:external,geolocationCalls:geoCalls,scriptErrors:errors};
    fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2));
    console.log('EVIDENCE '+output); console.log(results.filter(r=>r.status==='PASS').length+' PASS / '+results.filter(r=>r.status==='FAIL').length+' FAIL');
    if(results.some(r=>r.status==='FAIL')) process.exitCode=1;
  }
})();
