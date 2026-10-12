'use strict';
// SPEC-SUIYIN-ADMIN-081: repeatable evidence for the approved navigation changes.
// Reads prototype files and the fixed pre-feature baseline; simulated storage is in memory.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const repository = path.resolve(__dirname, '../../../../佰智德三/碎银原型/suiyin-admin');
const reportPath = path.join(__dirname, 'nav-check.json');
const baseline = process.env.NAV_CHECK_BASELINE || '1788b8e4521cd4024f0a94cb6f4df8d057f9e179';
process.chdir(repository);
const clone = value => structuredClone(value);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const priorBytes = file => cp.execFileSync('git', ['show', baseline + ':' + file], { maxBuffer: 12e6 });
const prior = file => JSON.parse(priorBytes(file));
const nav = read('prototype/data/navigation-snapshot.json');
const oldNav = prior('prototype/data/navigation-snapshot.json');
const route = 'streetTrajectories';
const medical = ['yestar-sz', 'yestar', 'yestar-bj', 'yestar-gz', 'yestar-hz', 'yestar-jx', 'huamei-xian', 'aoli-xian'];
let count = 0;
const check = (value, message) => { assert.ok(value, message); count++; };
const storage = new Map();
const context = {
  structuredClone,
  URLSearchParams,
  location: { search: '' },
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  window: { AdminAccountProfile: { normalizePage: value => value, normalizeOverride: value => value } },
  fetch: async file => ({ ok: true, json: async () => read('prototype/' + file) }),
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('prototype/admin-menu-state.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('prototype/data/street-trajectories.js', 'utf8'), context);
const W = context.window;
const Data = W.AdminStreetTrajectoryData;
const flat = tree => tree.flatMap(group => group.children || [group]);

(async () => {
  await W.AdminPlatformMenu.load();
  const oldBz = prior('prototype/data/content/bzds.json');
  storage.set(W.AdminPlatformMenu.key, JSON.stringify(oldBz.allMenu));
  const affected = [];
  const excluded = [];
  check(JSON.stringify([...Data.tenants].sort()) === JSON.stringify([...medical].sort()), 'model has exactly the eight approved medical fixtures');
  for (const tenant of nav.tenants) {
    const data = read('prototype/data/content/' + tenant.id + '.json');
    const old = prior('prototype/data/content/' + tenant.id + '.json');
    const oldTenant = oldNav.tenants.find(item => item.id === tenant.id);
    const entry = flat(tenant.menu).filter(item => item.route === route);
    for (const key of Object.keys(old)) {
      if (!['menu', 'allMenu'].includes(key)) check(JSON.stringify(data[key]) === JSON.stringify(old[key]), tenant.id + ' existing page untouched ' + key);
    }
    if (!medical.includes(tenant.id)) {
      excluded.push(tenant.id);
      check(entry.length === 0 && !data[route], tenant.id + ' excluded');
      check(!data.menu.tables[0].rows.some(row => row.tree?.key === route), tenant.id + ' has no business menu row');
      check(JSON.stringify(data.menu) === JSON.stringify(old.menu), tenant.id + ' published menu model untouched');
      if(tenant.id !== 'bzds') check(fs.readFileSync('prototype/data/content/' + tenant.id + '.json').equals(priorBytes('prototype/data/content/' + tenant.id + '.json')), tenant.id + ' full content unchanged byte for byte');
      let denied = false;
      try { Data.people(tenant.id); } catch (error) { denied = error.code === 'FORBIDDEN'; }
      check(denied, tenant.id + ' model rejects direct people access');
      denied = false;
      try { Data.query(tenant.id, 'demo-01', Data.today(), Data.today()); } catch (error) { denied = error.code === 'FORBIDDEN'; }
      check(denied, tenant.id + ' model rejects direct trajectory access');
      await W.AdminTenantMenu.load(tenant.id);
      for(const version of ['street-trajectories-v1', 'street-trajectories-medical-v2']) {
        const legacy = clone(old.menu);
        legacy.dataRevision += '-' + version;
        legacy.tables[0].rows[0].cells[0] = '保留本租户原有名称';
        const expectedRows = clone(legacy.tables[0].rows);
        const anchor = legacy.tables[0].rows.findIndex(row => ['newAddedRecords', 'salesStatsReferral'].includes(row.tree?.key));
        const retired = clone(legacy.tables[0].rows[anchor]);
        retired.id = 'prototype-street-trajectories';
        retired.tree.key = route;
        retired.cells[0] = '扫街轨迹';
        legacy.tables[0].rows.splice(anchor + 1, 0, retired);
        legacy.menuLayout = { version: 1, parents: { [route]: retired.tree.parentKey }, orders: { [retired.tree.parentKey]: [legacy.tables[0].rows[anchor].tree.key, route] } };
        legacy.history = [{ action: '保留已有记录' }];
        storage.set(W.AdminTenantMenu.key(tenant.id), JSON.stringify(legacy));
        const override = W.AdminMenuState.migrate(tenant, { enabled: [...W.AdminMenuState.defaultEnabled(oldTenant), route], appliedMigrations: { 'street-trajectories-v1': true } });
        const merged = W.AdminTenantMenu.read(tenant.id);
        const resolved = W.AdminTenantMenu.resolve(tenant, merged, override);
        check(!override.enabled.includes(route), tenant.id + ' retired enabled entry removed ' + version);
        check(!resolved.rows.some(row => row.tree?.key === route) && !flat(resolved.visible).some(item => item.route === route), tenant.id + ' legacy cache cannot restore retired route ' + version);
        check(JSON.stringify(merged.tables[0].rows) === JSON.stringify(expectedRows), tenant.id + ' all unrelated local rows preserved while retiring route ' + version);
        check(JSON.stringify(merged.history) === JSON.stringify(legacy.history) && !merged.menuLayout.parents[route] && !Object.values(merged.menuLayout.orders).flat().includes(route), tenant.id + ' history retained and retired layout cleaned ' + version);
      }
      continue;
    }
    affected.push(tenant.id);
    check(entry.length === 1, tenant.id + ' unique navigation');
    check(data[route]?.state === 'mock' && data[route].tenant === tenant.id, tenant.id + ' isolated metadata');
    const group = tenant.menu.find(item => item.children?.some(child => child.route === route));
    const index = group.children.findIndex(child => child.route === route);
    check(tenant.industry === 'medical-aesthetics' && tenant.capabilities.streetTrajectories === true, tenant.id + ' explicit medical profile');
    check(tenant.streetTrajectoriesAnchor ? group.children[index - 1].route === tenant.streetTrajectoriesAnchor : group.id === 'dataDisplay' && group.children.length === 1, tenant.id + ' source position');
    const rows = data.menu.tables[0].rows;
    const menuIndex = rows.findIndex(row => row.tree?.key === route);
    check(tenant.streetTrajectoriesAnchor ? rows[menuIndex - 1].tree.key === tenant.streetTrajectoriesAnchor : rows[menuIndex - 1].tree.key === 'dataDisplay', tenant.id + ' source menu position');
    if (tenant.streetTrajectoriesNewParent) check(!flat(tenant.menu).some(item => ['newAddedRecords', 'salesStatsReferral'].includes(item.route)), tenant.id + ' no fabricated recruitment page');
    check(rows.filter(row => row.tree?.key === route).length === 1, tenant.id + ' unique menu');
    // Only the immutable prior table is a merge baseline. Current menu.text is
    // deliberately rebuilt from current rows by the existing public-data policy.
    check(JSON.stringify(data.menu.menuRefresh.baselines[old.menu.dataRevision]) === JSON.stringify(old.menu.tables[0]), tenant.id + ' exact prior baseline');
    const unchanged = clone(data.menu.tables[0].rows).filter(row => row.tree?.key !== route && !(tenant.streetTrajectoriesNewParent && row.tree?.key === 'dataDisplay'));
    check(JSON.stringify(unchanged) === JSON.stringify(old.menu.tables[0].rows), tenant.id + ' existing menu rows unchanged');
    await W.AdminTenantMenu.load(tenant.id);
    const saved = clone(old.menu);
    const nameIndex = saved.tables[0].headers.indexOf('菜单名称');
    const statusIndex = saved.tables[0].headers.indexOf('菜单状态');
    const named = saved.tables[0].rows.find(row => row.tree?.key === (tenant.streetTrajectoriesAnchor || 'salesManage'));
    named.cells[nameIndex] = '自定义拉新名称';
    const other = saved.tables[0].rows.find(row => row.tree?.depth === 1 && row.id !== named.id);
    other.cells[statusIndex] = '隐藏';
    storage.set(W.AdminTenantMenu.key(tenant.id), JSON.stringify(saved));
    const oldOverride = {
      enabled: W.AdminMenuState.defaultEnabled(oldTenant),
      appliedMigrations: {
        'sales-voice-stats-v1': true,
        'ai-cost-stats-v1': true,
        'live-menu-refresh-20260927': true,
        'revisit-rules-v1': true,
        'tools-menu-v1': true,
      },
    };
    const override = W.AdminMenuState.migrate(tenant, oldOverride);
    const merged = W.AdminTenantMenu.read(tenant.id);
    check(override.enabled.includes(route), tenant.id + ' legacy enabled add');
    check(merged.tables[0].rows.find(row => row.id === named.id).cells[nameIndex] === '自定义拉新名称', tenant.id + ' custom label kept');
    check(merged.tables[0].rows.find(row => row.id === other.id).cells[statusIndex] === '隐藏', tenant.id + ' custom hidden kept');
    const resolved = W.AdminTenantMenu.resolve(tenant, merged, override);
    const visibleGroup = resolved.visible.find(item => item.children?.some(child => child.route === route));
    const vIndex = visibleGroup.children.findIndex(child => child.route === route);
    check(tenant.streetTrajectoriesAnchor ? visibleGroup.children[vIndex - 1].route === tenant.streetTrajectoriesAnchor : visibleGroup.id === 'dataDisplay' && vIndex === 0, tenant.id + ' effective platform position');
    check(!resolved.conflicts.length, tenant.id + ' conflict free');
    const hidden = W.AdminMenuState.migrate(tenant, { ...oldOverride, display: { [group.id]: '隐藏' } });
    check(!hidden.enabled.includes(route), tenant.id + ' hidden branch not revived');
    if (!tenant.streetTrajectoriesNewParent) {
      const previouslyHidden = W.AdminMenuState.migrate(tenant, { ...oldOverride, appliedMigrations: { ...oldOverride.appliedMigrations, 'street-trajectories-v1': true } });
      check(!previouslyHidden.enabled.includes(route), tenant.id + ' previous unpublished explicit disabled route preserved');
    }
    check(Data.people(tenant.id).every(person => person.tenantId === tenant.id), tenant.id + ' synthetic people are isolated');
    const layout = clone(merged);
    const parent = rows[menuIndex].tree.parentKey;
    const order = resolved.rows.filter(row => row.tree.parentKey === parent).map(row => row.tree.key).reverse();
    layout.menuLayout = { version: 1, parents: {}, orders: { [parent]: order } };
    const ordered = W.AdminTenantMenu.resolve(tenant, layout, override).rows.filter(row => row.tree.parentKey === parent).map(row => row.tree.key);
    check(JSON.stringify(ordered) === JSON.stringify(order), tenant.id + ' explicit local order kept');
    const hiddenModel = clone(merged);
    hiddenModel.tables[0].rows.find(row => row.tree.key === route).cells[statusIndex] = '隐藏';
    check(!flat(W.AdminTenantMenu.resolve(tenant, hiddenModel, override).visible).some(item => item.route === route), tenant.id + ' row hiding effective');
  }
  check(affected.length === 8 && excluded.length === 9, '8 medical tenants and 9 excluded tenants');
  const platform = JSON.parse(storage.get(W.AdminPlatformMenu.key));
  check(platform.tables[0].rows.filter(row => row.cells[2] === route).length === 1, 'one platform route');
  const target = nav.tenants.find(tenant => tenant.id === 'yestar-sz');
  const model = W.AdminTenantMenu.read(target.id);
  const platformRows = platform.tables[0].rows;
  const entryIndex = platformRows.findIndex(row => row.cells[2] === route);
  const [moved] = platformRows.splice(entryIndex, 1);
  const anchorIndex = platformRows.findIndex(row => row.cells[2] === 'salesStatsNew');
  platformRows.splice(anchorIndex + 1, 0, moved);
  storage.set(W.AdminPlatformMenu.key, JSON.stringify(platform));
  const overridden = W.AdminTenantMenu.resolve(target, model, W.AdminMenuState.migrate(target, { enabled: W.AdminMenuState.defaultEnabled(target) }));
  const children = overridden.visible.find(group => group.children?.some(child => child.route === route)).children;
  const trackAt = children.findIndex(child => child.route === route);
  check(children[trackAt - 1].route === 'salesStatsNew', 'explicit platform reorder respected');
  const publicDataAudit = JSON.parse(cp.execFileSync(process.execPath, ['prototype/sanitize-public-data.mjs', '--check'], { encoding: 'utf8', maxBuffer: 12e6 }));
  const result = {
    status: 'PASS',
    spec: 'SPEC-SUIYIN-ADMIN-081@1.1.0',
    checkedAt: new Date().toISOString(),
    baseCommit: baseline,
    checkedCommit: cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    assertions: count,
    tenantCount: affected.length,
    tenants: affected,
    excludedTenantCount: excluded.length,
    excludedTenants: excluded,
    scopeMigration: 'street-trajectories-medical-v2',
    newMedicalParent: 'dataDisplay',
    checks: [
      'metadata and unique routes',
      'exact previous menu baseline',
      'all old business pages untouched',
      'default effective positions with legacy platform cache',
      'label and hidden overrides',
      'hidden parent',
      'explicit tenant and platform order',
      'row visibility',
      'eight explicit medical profiles and nine denied model/navigation contexts',
      'retired unpublished nonmedical cache cannot restore the route',
      'two new medical parents without fabricated recruitment pages',
    ],
    expectedDerivedUpdates: {
      pages: 17,
      routes: '8 medical menu migration models, 8 streetTrajectories, bzds allMenu platform definition only; excluded menus retain the released source exactly',
      currentText: 'Rebuilt from each current page label, table headers and table rows according to makePageText in sanitize-public-data.mjs.',
      publicDataPolicy: 'public-demo-identities-v1',
      newRouteRevision: 'Includes the existing public-data policy marker.',
      oldMenuBaselines: 'Immutable prior headers and rows preserved; current derived text is not written into historical baselines.',
    },
    publicDataAudit,
    scope: 'Static files and Node VM menu behavior; no live browser, production or deployment assertion.',
  };
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch(error => {
  const result = { status: 'FAIL', checkedAt: new Date().toISOString(), assertionsCompleted: count, error: String(error.stack || error) };
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2) + '\n');
  console.error(result.error);
  process.exitCode = 1;
});
