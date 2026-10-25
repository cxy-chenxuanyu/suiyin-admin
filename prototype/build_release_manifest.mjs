/** Freeze staged delivery bytes so both GitHub and Pages can be verified exactly. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const git=(...args)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{maxBuffer:24*1024*1024});
const tag=process.argv[2];
if(!tag||!/^[a-zA-Z0-9._-]+$/.test(tag))throw Error('usage: node prototype/build_release_manifest.mjs <release-tag>');
const primarySpec=process.argv[3]||'SPEC-SUIYIN-ADMIN-REFRESH-001@0.2.0';
if(!/^SPEC-[A-Z0-9-]+@\d+\.\d+\.\d+$/.test(primarySpec))throw Error('Expected an exact SPEC-ID@version');
// A corrective delivery must retain the contracts already shipped by other modules.
const previousSpecs=JSON.parse(git('show','HEAD:release.json').toString()).specs||[];
const navigation=JSON.parse(git('show',':prototype/data/navigation-snapshot.json').toString());
const routesOf=nodes=>nodes.flatMap(n=>[...(n.route?[n.route]:[]),...routesOf(n.children||[])]);
const tenantRoutes=navigation.tenants.flatMap(tenant=>routesOf(tenant.menu));
const coverage={tenants:navigation.tenants.length,routes:new Set(tenantRoutes).size,tenantRoutes:tenantRoutes.length};
const files=git('ls-files','-z').toString().split('\0').filter(p=>p&&p!=='release.json'&&!p.startsWith('.github/')&&!p.startsWith('.')&&p!=='serve.js');
if(files.some(p=>/(^|\/)(private|node_modules|vendor)(\/|$)|\.private\./i.test(p)))throw Error('Private or dependency paths must not be staged for public delivery');
const hashes=Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(git('show',':'+p)).digest('hex')]));
const manifest={tag,spec:primarySpec,baseline:'SPEC-SUIYIN-ADMIN-051@1.1.0',specs:[...new Set([...previousSpecs,'SPEC-SUIYIN-ADMIN-052@1.2.0','SPEC-SUIYIN-ADMIN-053@1.0.2','SPEC-SUIYIN-ADMIN-054@1.0.0','SPEC-SUIYIN-ADMIN-055@1.1.0','SPEC-SUIYIN-ADMIN-056@1.0.0','SPEC-SUIYIN-ADMIN-058@1.2.0','SPEC-SUIYIN-ADMIN-060@1.1.0','SPEC-SUIYIN-ADMIN-062@1.0.0','SPEC-SUIYIN-ADMIN-068@1.0.0','SPEC-SUIYIN-ADMIN-REFRESH-001@0.2.0',primarySpec])],runtime:'static-html',coverage,generatedAt:new Date().toISOString(),files:hashes};
fs.writeFileSync(path.join(root,'release.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({tag,files:files.length,output:'release.json'}));
