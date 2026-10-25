/** Builds the current multi-tenant prototype as one self-contained HTML file. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=process.argv[2]?path.resolve(process.argv[2]):path.dirname(fileURLToPath(import.meta.url));
const outputFile=process.argv[3]?path.resolve(process.argv[3]):path.join(root,'_shell_inline.html');
const cleanPath=p=>p.split(/[?#]/)[0];
const read=p=>fs.readFileSync(path.join(root,cleanPath(p)),'utf8').replace(/\r\n/g,'\n');
const privatePath=p=>/(^|\/)(private|vendor|node_modules)(\/|$)|\.private\./i.test(p);
const files=(dir)=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(d=>{const p=dir+'/'+d.name;return privatePath(p)?[]:d.isDirectory()?files(p):[p];});
const types={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
const assets=Object.fromEntries(files('assets').map(p=>[p,'data:'+(types[path.extname(p)]||'application/octet-stream')+';base64,'+fs.readFileSync(path.join(root,p)).toString('base64')]));
// Editable guide-line configurations retain compact, stable asset references in storage.
// Resolve bundled defaults at render time so saving another tenant never copies the image library.
const runtimeAssets=Object.fromEntries(Object.entries(assets).filter(([p])=>p.startsWith('assets/guide-lines/')));
const embedAssets=text=>Object.entries(assets).reduce((out,[p,data])=>out.split(p).join(data),text);
// srcdoc replaces src in the standalone shell; retain the same query context for frame CSS.
const inlineFrameSelectors=css=>css.replace(/\.page-frame\[src(?=[~|^$*]?=|\])/g,'.page-frame[data-inline-src').replace(/(\.page-frame:is\()([^)]*)(\))/g,(_,start,selectors,end)=>start+selectors.replace(/\[src(?=[~|^$*]?=|\])/g,'[data-inline-src')+end);
const serial=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const data=Object.fromEntries(files('data').filter(p=>p.endsWith('.json')).map(p=>[p,JSON.parse(embedAssets(read(p)))]));
const included={scripts:new Set(),styles:new Set()};
function offlineFetch(input){
 const raw=typeof input==='string'?input:input.url;
 const key=String(raw).split('?')[0].replace(/^\.\//,'');
 if(!Object.hasOwn(window.__ADMIN_INLINE_DATA__,key))return Promise.reject(new Error('离线资源未包含：'+key));
 return Promise.resolve(new Response(JSON.stringify(window.__ADMIN_INLINE_DATA__[key]),{status:200,headers:{'Content-Type':'application/json'}}));
}
function inlinePage(file){
 const scripts=[];
 let html=read(file).replace(/<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?\s*>/gi,(_,p)=>{included.styles.add(cleanPath(p));return '<style>\n'+inlineFrameSelectors(embedAssets(read(p)))+'\n</style>';});
 // Page-local parity rules need the same srcdoc selector adaptation as linked stylesheets.
 html=html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,(_,start,css,end)=>start+inlineFrameSelectors(css)+end);
 html=html.replace(/<script\s+src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,(_,p)=>{
  p=cleanPath(p);
  let code=p==='data/guide-lines.js'?read(p):embedAssets(read(p));
  included.scripts.add(p);
  // about:srcdoc has an opaque location.origin; use the inherited parent origin for messages.
  const origin="(window.__ADMIN_INLINE_ORIGIN__||location.origin)";
  code=code.replaceAll('location.origin',origin).replaceAll(','+origin+')',','+origin+"==='null'?'*':"+origin+')');
  // Every content module uses the frame query, including voice/usage QA state.
  code=code.replaceAll('new URLSearchParams(location.search)','new URLSearchParams(window.__ADMIN_INLINE_PARAMS__||location.search)');
  if(p==='admin-navigation.js'){
   const needle="frame.src='admin-content.html?'+p;";
   if(!code.includes(needle))throw Error('Inline iframe adapter must be updated for navigation changes');
   code=code.replace(needle,"frame.dataset.inlineSrc='admin-content.html?'+p;frame.srcdoc=window.__ADMIN_INLINE_FRAME__(p.toString());");
  }
  scripts.push('<script>\n'+code.replace(/<\/script/gi,'<\\/script')+'\n</script>');return '';
 });
 if(/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\brel\s*=\s*["']stylesheet["']/i.test(html))throw Error('Unbundled script or stylesheet in '+file);
 if(!html.includes('</body>')||!html.includes('<head>'))throw Error('Inline document adapter must be updated for '+file);
 return embedAssets(html).replace('</body>',scripts.join('\n')+'\n</body>');
}
const child=inlinePage('admin-content.html');
// Chrome serializes a file document's location.origin as file://, but its message origin is null.
// Normalize this once so offline parent/child messages use * as target and compare the same origin.
const bootstrap=`window.__ADMIN_INLINE_ORIGIN__=location.protocol==='file:'?'null':location.origin;window.__ADMIN_INLINE_DATA__=${serial(data)};window.__ADMIN_INLINE_ASSETS__=${serial(runtimeAssets)};window.fetch=${offlineFetch.toString()};window.__ADMIN_INLINE_FRAME__=function(params){const code='window.__ADMIN_INLINE_PARAMS__='+JSON.stringify(params)+';window.__ADMIN_INLINE_ORIGIN__=parent.__ADMIN_INLINE_ORIGIN__;window.__ADMIN_INLINE_DATA__=parent.__ADMIN_INLINE_DATA__;window.__ADMIN_INLINE_ASSETS__=parent.__ADMIN_INLINE_ASSETS__;window.fetch=parent.fetch.bind(parent);';return ${serial(child)}.replace('<head>','<head><script>'+code+'<'+ '/script>');};`;
let output=inlinePage('_shell.html');
// SPEC-081 must remain functional in a srcdoc/file bundle: the UI, local data,
// access checks and shell cancellation are one inseparable feature package.
const streetTrajectoryBundle={
 spec:'SPEC-SUIYIN-ADMIN-081@1.1.0',
 scripts:['admin-content.js','admin-navigation.js','admin-account-profile.js','admin-menu-state.js','admin-stats-date-picker.js','admin-filter-calendars.js','data/street-trajectories.js','admin-street-trajectories.js'],
 styles:['admin-street-trajectories.css','admin-stats-date-picker.css','admin-filter-calendars.css'],
};
for(const [kind,paths] of [['scripts',streetTrajectoryBundle.scripts],['styles',streetTrajectoryBundle.styles]]){
 for(const file of paths)if(!included[kind].has(file))throw Error('Street trajectory inline bundle is incomplete: '+file);
}
// Install data before any shell scripts; all original scripts retain their order at body end.
output=output.replace('<body class="admin-shell">','<body class="admin-shell"><script>'+bootstrap+'<'+ '/script>');
fs.writeFileSync(outputFile,output);
console.log(JSON.stringify({output:'prototype/_shell_inline.html',jsonFiles:Object.keys(data).length,assets:Object.keys(assets).length,scripts:included.scripts.size,styles:included.styles.size,streetTrajectoryBundle,bytes:Buffer.byteLength(output),sha256:createHash('sha256').update(output).digest('hex')}));
