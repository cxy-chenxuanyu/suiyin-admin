/* SPEC-SUIYIN-ADMIN-081@1.1.0: verify the same self-contained artifact over HTTP and file://. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const repo=path.resolve(__dirname,'../../../../佰智德三/碎银原型/suiyin-admin');
const artifact=path.join(repo,'prototype/_shell_inline.html');
const approved=['yestar-sz','yestar','yestar-bj','yestar-gz','yestar-hz','yestar-jx','huamei-xian','aoli-xian'];
const excluded=['bzds','jbfs','mengzhua','crrm','hqjd','ykjl','ruixi-kh-xiaowen','rxxz','yzhb'];
const route='streetTrajectories',stamp=new Date().toISOString().replace(/[:.]/g,'-');
const directory=path.join(__dirname,'inline-evidence',stamp);fs.mkdirSync(directory,{recursive:true});
const report={spec:'SPEC-SUIYIN-ADMIN-081@1.1.0',artifact,sha256:createHash('sha256').update(fs.readFileSync(artifact)).digest('hex'),approved,excluded,results:[],externalRequests:[],unexpectedAssetRequests:[],geolocationCalls:[],scriptErrors:[]};
let browser,server,base;
async function check(name,run){try{const details=await run();report.results.push({name,status:'PASS',...details});console.log('PASS '+name);}catch(error){report.results.push({name,status:'FAIL',error:error.stack});console.error('FAIL '+name+': '+error.message);}}
async function ready(page,tenant='yestar-sz',mode='http'){
 const url=new URL(mode==='file'?pathToFileURL(artifact):base);url.search=new URLSearchParams({tenant,page:route,qa:'1'}).toString();
 await page.goto(url.href);await page.locator('#navigation').waitFor();
 const frame=await (await page.locator('#panel-'+route+' iframe').elementHandle()).contentFrame();
 await frame.locator('body[data-content-ready="true"]').waitFor();return frame;
}
async function fakeFrame(page,tenant){
 const id='inline-access-probe';await page.evaluate(({id,tenant,route})=>{document.getElementById(id)?.remove();const frame=document.createElement('iframe');frame.id=id;frame.srcdoc=window.__ADMIN_INLINE_FRAME__(new URLSearchParams({tenant,route,qa:'1'}).toString());document.body.append(frame);},{id,tenant,route});
 const frame=await (await page.locator('#'+id).elementHandle()).contentFrame();await frame.locator('body[data-content-ready="error"]').waitFor();return frame;
}
async function runMode(mode){
 const context=await browser.newContext({viewport:{width:1580,height:1000},timezoneId:'Asia/Shanghai'});
 context.on('page',p=>p.on('pageerror',e=>report.scriptErrors.push({mode,message:e.message})));
 await context.exposeBinding('__stGeo',(_,method)=>report.geolocationCalls.push({mode,method}));
 await context.addInitScript(()=>{for(const method of ['getCurrentPosition','watchPosition'])try{Object.defineProperty(navigator.geolocation,method,{value:()=>{window.__stGeo(method);throw new Error('Unexpected real geolocation');}});}catch{}});
 await context.route('**/*',async intercepted=>{
   const url=intercepted.request().url();
   if(url.startsWith('data:')||url.startsWith('blob:'))return intercepted.continue();
   if(url.startsWith('file:')){if(!url.split('?')[0].endsWith('/_shell_inline.html'))report.unexpectedAssetRequests.push({mode,url});return intercepted.continue();}
   if(url.startsWith(new URL(base).origin+'/')){if(!new URL(url).pathname.endsWith('/_shell_inline.html'))report.unexpectedAssetRequests.push({mode,url});return intercepted.continue();}
   report.externalRequests.push({mode,url});await intercepted.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);let frame;
 await check(mode+'：8医美租户单文件入口、模型范围及嵌入资源',async()=>{
   for(const tenant of approved){frame=await ready(page,tenant,mode);assert.equal(await frame.locator('.st-show-trajectory').count(),20);assert.equal(await page.locator('#navigation [data-route="'+route+'"]').count(),1);assert.deepEqual(await frame.evaluate(()=>[...AdminStreetTrajectoryData.tenants]),approved);assert.equal(await frame.locator('script[src],link[rel="stylesheet"]').count(),0);assert.equal(await page.locator('script[src],link[rel="stylesheet"]').count(),0);}
   return {tenants:approved.length};
 });
 await check(mode+'：日历取消恢复、地图动态回放及全程终态',async()=>{
   frame=await ready(page,'yestar-sz',mode);await page.screenshot({path:path.join(directory,mode+'-list.png')});
   await page.clock.install();await page.clock.pauseAt(new Date());await frame.locator('.st-show-trajectory').first().click();await page.clock.runFor(160);
   await frame.locator('.st-dialog[data-state="playing"]').waitFor();
   const day=await frame.locator('[aria-label="地图开始日期"]').inputValue();
   await frame.locator('.st-dialog .source-date-trigger').click();await frame.locator('.st-dialog .usage-calendar:not([hidden]) .usage-calendar-day').first().click();await page.keyboard.press('Escape');
   assert.equal(await frame.locator('.st-dialog[open]').count(),1);assert.equal(await frame.locator('[aria-label="地图开始日期"]').inputValue(),day);
   await page.clock.runFor(3000);const middle=await frame.evaluate(()=>AdminStreetTrajectories.state);assert.equal(middle.state,'playing');assert.ok(middle.progress>0&&middle.progress<1);await page.screenshot({path:path.join(directory,mode+'-map-playing.png')});
   await page.clock.runFor(6500);const final=await frame.evaluate(()=>AdminStreetTrajectories.state);assert.equal(final.state,'completed');assert.equal(final.progress,1);assert.equal(final.completedPoints,final.totalPoints);assert.equal(final.completedSegments,final.totalSegments);
   assert.ok(final.elapsed<=10000);assert.ok(await frame.locator('.st-route-lines path').evaluateAll(paths=>paths.every(p=>p.getAttribute('stroke-dashoffset')==='0')));await page.screenshot({path:path.join(directory,mode+'-map-completed.png')});
   await frame.locator('.st-dialog-close').click();await frame.locator('.st-list-filters .source-date-trigger').click();assert.equal(await frame.locator('.usage-calendar:not([hidden])').count(),1);await page.keyboard.press('Escape');
   assert.equal(await page.locator('.menu-dialog-layer').count(),0);await page.clock.resume();return {playbackMs:final.elapsed,totalPoints:final.totalPoints,totalSegments:final.totalSegments};
 });
 await check(mode+'：页签切换与租户切换终止旧播放',async()=>{
   frame=await ready(page,'yestar-sz',mode);await frame.locator('.st-show-trajectory').first().click();await frame.locator('.st-dialog[data-state="playing"]').waitFor();
   await page.locator('#navigation [data-route="newAddedRecords"]').evaluate(element=>element.click());await frame.locator('.st-dialog').waitFor({state:'detached'});assert.equal(await frame.evaluate(()=>AdminStreetTrajectories.state.state),'closed');
   await page.locator('#navigation [data-route="'+route+'"]').click();await frame.locator('.st-show-trajectory').first().click();await frame.locator('.st-dialog[data-state="playing"]').waitFor();
   const popupPromise=page.waitForEvent('popup');await page.evaluate(()=>switchTenant(data.tenants.find(item=>item.id==='yestar')));const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
   await frame.locator('.st-dialog').waitFor({state:'detached'});assert.equal(await frame.evaluate(()=>AdminStreetTrajectories.state.state),'closed');
   const target=await (await popup.locator('#panel-'+route+' iframe').elementHandle()).contentFrame();await target.locator('.st-show-trajectory').first().waitFor();assert.equal(await target.evaluate(()=>Admin.tenant),'yestar');await popup.close();
   return {hiddenPageCancelled:true,tenantSwitchCancelled:true};
 });
 await check(mode+'：隐藏入口与9非医美租户伪造单文件直达均受阻',async()=>{
   frame=await ready(page,'yestar-sz',mode);
   await frame.evaluate(()=>{const item=Admin.nav.tenants.find(t=>t.id===Admin.tenant),key=Admin.navStorageKey(Admin.tenant),saved=AdminMenuState.read(item,key);saved.enabled=saved.enabled.filter(r=>r!=='streetTrajectories');saved.display={...saved.display,streetTrajectories:'隐藏'};localStorage.setItem(key,JSON.stringify(saved));});
   const hidden=await fakeFrame(page,'yestar-sz');assert.equal(await hidden.locator('.st-show-trajectory,.st-dialog').count(),0);assert.match(await hidden.locator('.error-card').innerText(),/无权/);
   for(const tenant of excluded){const denied=await fakeFrame(page,tenant);assert.equal(await denied.locator('.st-show-trajectory,.st-dialog').count(),0);assert.match(await denied.locator('.error-card').innerText(),/没有这个页面入口|无权/);}
   await page.evaluate(()=>localStorage.removeItem('admin-qa-nav:yestar-sz'));
   return {hiddenRouteBlocked:true,nonMedicalTenantsBlocked:excluded.length};
 });
 await context.close();
}
(async()=>{try{
 server=http.createServer((request,response)=>{if(!new URL(request.url,'http://localhost').pathname.endsWith('/_shell_inline.html')){response.writeHead(404).end();return;}response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});fs.createReadStream(artifact).pipe(response);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+'/_shell_inline.html';
 browser=await playwright.chromium.launch({channel:'chrome',headless:true});report.browser=await browser.version();
 await runMode('http');await runMode('file');
 await check('单文件无外网、额外资源依赖、定位调用及脚本错误',async()=>{for(const key of ['externalRequests','unexpectedAssetRequests','geolocationCalls','scriptErrors'])assert.deepEqual(report[key],[],key);return {standalone:true};});
}catch(error){report.fatal=error.stack;process.exitCode=1;}finally{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());report.passed=report.results.filter(r=>r.status==='PASS').length;report.failed=report.results.filter(r=>r.status==='FAIL').length+(report.fatal?1:0);fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({report:path.join(directory,'report.json'),passed:report.passed,failed:report.failed,sha256:report.sha256}));if(report.failed)process.exitCode=1;}})();
