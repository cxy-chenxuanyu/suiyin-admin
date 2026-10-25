#!/usr/bin/env node
/* Synthetic DOM only. No browser profile, private data or real HTTP is accessed. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { JSDOM, VirtualConsole } = require(process.env.QUALITY_JSDOM_ROOT || 'E:/dev/suiyin-insights/node_modules/jsdom');
const root = path.resolve(__dirname, '../..'), source = fs.readFileSync(path.join(root, 'prototype/admin-navigation.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'prototype/_shell.html'), 'utf8'), results = [], windows = [];
const routes = ['promptTemplate', 'wecomQualityDaily', 'wechatQualityDaily', 'aiEntModelConfig'];
const labels = ['提示词', '企微日报', '个微日报', '模型目录'];
const key = 'admin-qa-shell-view:v1:yestar-sz', sentinelKey = 'synthetic-business-state';
const saved = { expanded: ['ai'], tabs: routes, active: routes[0], sidebarTop: 37, navCollapsed: true };
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
function check(id, description, condition) { results.push({ id, description, passed: !!condition }); if (!condition) throw Error(id + ': ' + description); }
async function boot({ view = saved, page, session = routes } = {}) {
  const errors = [], console = new VirtualConsole(); console.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(html, { url: 'http://synthetic.invalid/prototype/_shell.html?tenant=yestar-sz&qa=1' + (page ? '&page=' + page : ''), runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console });
  const w = dom.window, d = w.document; windows.push(w);
  w.structuredClone = value => JSON.parse(JSON.stringify(value)); w.ResizeObserver = class { observe() {} disconnect() {} };
  w.HTMLElement.prototype.scrollIntoView = function () {}; w.matchMedia = () => ({ matches: false });
  const tenant = { id: 'yestar-sz', name: '合成租户', brand: '合成租户', capturedAt: '2026-10-24', menu: [{ id: 'ai', label: '合成菜单', children: routes.map((route, i) => ({ route, label: labels[i], platformLabel: labels[i], contentStatus: 'mock' })) }] };
  let fetches = 0, frameCreations = 0;
  w.fetch = async url => { if (url !== 'data/navigation-snapshot.json') throw Error('Unexpected request'); fetches++; return { ok: true, json: async () => ({ tenants: [tenant], aliases: {} }) }; };
  w.AdminAccountProfile = { normalizeTenant: value => value, displayText: (_tenant, value) => value };
  w.AdminMenuState = { read: () => ({}) };
  w.AdminPlatformMenu = { key: 'synthetic-platform-menu', load: async () => {} };
  w.AdminTenantMenu = { key: id => 'synthetic-tenant-menu:' + id, load: async () => {}, read: () => null, resolve: value => ({ visible: value.menu }) };
  w.AdminLiveUI = { menuIcons: {}, menuIconsByRoute: {} };
  if (view) w.localStorage.setItem(key, JSON.stringify(view));
  w.localStorage.setItem(sentinelKey, '{"unchanged":true}'); w.sessionStorage.setItem('admin-nav:yestar-sz', JSON.stringify(session));
  const create = d.createElement.bind(d); d.createElement = function (tag, ...args) { if (tag.toLowerCase() === 'iframe') frameCreations++; return create(tag, ...args); };
  w.eval(source);
  for (let i = 0; i < 50 && !d.querySelector('.frame-wrap'); i++) await pause();
  await pause(); await pause(); await pause();
  function frame(route) { return d.querySelector('#panel-' + route + ' iframe'); }
  function tabRoutes() { return [...d.querySelectorAll('[role="tab"]')].map(node => node.id.slice(4)); }
  function activeRoute() { return d.querySelector('[role="tab"][aria-selected="true"]')?.id.slice(4) || null; }
  async function tab(route) { d.querySelector('#tab-' + route).click(); await pause(); }
  async function nav(route) { d.querySelector('.nav-button[data-route="' + route + '"]').click(); await pause(); }
  async function close(route) { d.querySelector('#tab-' + route).parentElement.querySelector('.close-tab').click(); await pause(); }
  return { w, d, frame, tabRoutes, activeRoute, tab, nav, close, errors, creations: () => frameCreations, fetches: () => fetches };
}
async function main() {
  const a = await boot();
  check('STR001', 'Restoring four tabs creates only the active iframe, keeping every tab and its order.', a.creations() === 1 && JSON.stringify(a.tabRoutes()) === JSON.stringify(routes) && !!a.frame(routes[0]) && !a.frame(routes[1]) && !a.frame(routes[2]) && !a.frame(routes[3]));
  check('STR002', 'The active restored iframe has the correct route and retains the QA namespace.', new URL(a.frame(routes[0]).src).searchParams.get('route') === routes[0] && new URL(a.frame(routes[0]).src).searchParams.get('qa') === '1');
  check('STR003', 'Saved active tab, expanded menu, sidebar position and collapsed state survive restore.', a.activeRoute() === routes[0] && a.d.querySelector('[data-group="ai"]').open && a.d.querySelector('#navigation').scrollTop === 37 && a.d.body.classList.contains('nav-collapsed'));
  let dirty = true, accept = false, leaveRequests = 0;
  a.frame(routes[0]).contentWindow.AdminPromptTemplates = { hasDirty: () => dirty, requestLeave: async () => { leaveRequests++; if (accept) dirty = false; return accept; } };
  await a.tab(routes[2]);
  check('STR004', 'Declining a dirty editor leave keeps the current tab and does not create the destination iframe.', leaveRequests === 1 && a.activeRoute() === routes[0] && a.creations() === 1 && !a.frame(routes[2]));
  accept = true; await a.nav(routes[2]);
  check('STR005', 'Accepting a dirty editor leave loads a restored inactive tab on its first sidebar visit.', leaveRequests === 2 && a.activeRoute() === routes[2] && !!a.frame(routes[2]) && a.creations() === 2 && a.d.querySelector('#panel-' + routes[0]).hidden && !a.d.querySelector('#panel-' + routes[2]).hidden);
  const originalFrame = a.frame(routes[0]); await a.tab(routes[0]);
  check('STR006', 'Returning to a visited tab reuses its existing iframe and in-memory state.', a.frame(routes[0]) === originalFrame && a.creations() === 2 && a.activeRoute() === routes[0]);
  await a.close(routes[3]);
  check('STR007', 'Closing an unvisited restored tab removes only tab state without creating an iframe.', !a.tabRoutes().includes(routes[3]) && a.creations() === 2 && a.activeRoute() === routes[0]);
  dirty = true; accept = false; await a.close(routes[0]);
  check('STR008', 'Declining close of a dirty active tab retains its iframe and the unvisited neighbor.', a.frame(routes[0]) === originalFrame && a.activeRoute() === routes[0] && !a.frame(routes[1]) && a.creations() === 2);
  accept = true; await a.close(routes[0]);
  check('STR009', 'Closing the active tab activates and creates its previously unvisited adjacent tab.', !a.frame(routes[0]) && !!a.frame(routes[1]) && a.activeRoute() === routes[1] && a.creations() === 3);
  let backgroundDirty = true, backgroundAccept = false;
  a.frame(routes[2]).contentWindow.AdminQualityPrompts = { hasDirty: () => backgroundDirty, requestLeave: async () => { if (backgroundAccept) backgroundDirty = false; return backgroundAccept; } };
  a.d.querySelector('#closeOthers').click(); await pause();
  check('STR010', 'Close-others retains a loaded background tab when its dirty-editor guard declines.', a.tabRoutes().length === 2 && !!a.frame(routes[2]));
  backgroundAccept = true; a.d.querySelector('#closeOthers').click(); await pause();
  check('STR011', 'Close-others removes accepted background frames while retaining the active frame.', a.tabRoutes().join() === routes[1] && !a.frame(routes[2]) && !!a.frame(routes[1]) && a.creations() === 3);
  await a.close(routes[1]);
  check('STR012', 'Closing the last tab clears the active route and frames without creating replacements.', a.tabRoutes().length === 0 && !a.activeRoute() && !a.d.querySelector('iframe') && !new URL(a.w.location.href).searchParams.has('page'));
  await a.nav(routes[3]);
  check('STR013', 'A sidebar route remains usable after all restored tabs have been closed.', a.activeRoute() === routes[3] && a.creations() === 4 && !!a.frame(routes[3]));
  check('STR014', 'Only the isolated shell navigation key changes; unrelated stored business data is preserved.', a.w.localStorage.getItem(sentinelKey) === '{"unchanged":true}' && JSON.parse(a.w.localStorage.getItem(key)).active === routes[3]);
  const b = await boot({ page: routes[1] });
  check('STR015', 'An explicit URL route wins over the saved active tab and still creates one iframe.', b.activeRoute() === routes[1] && b.creations() === 1 && b.tabRoutes().length === 4 && !!b.frame(routes[1]));
  const c = await boot({ view: null, page: routes[2] });
  check('STR016', 'Legacy session-tab restore also loads only the active iframe.', c.tabRoutes().length === 4 && c.creations() === 1 && c.activeRoute() === routes[2]);
  const e = await boot({ view: { ...saved, tabs: [routes[0], routes[0], 'removedRoute', routes[1]], active: 'removedRoute' } });
  check('STR017', 'Duplicate and unavailable restored tabs are filtered before lazy activation.', e.tabRoutes().join() === routes.slice(0, 2).join() && e.creations() === 1 && e.activeRoute() === routes[0]);
  check('STR018', 'The synthetic harness performs only its stubbed navigation fetch and has no DOM runtime errors.', [a, b, c, e].every(item => item.fetches() === 1 && item.errors.length === 0));
}
main().catch(error => { results.push({ id: 'ERROR', description: error.message, passed: false }); process.exitCode = 1; }).finally(() => {
  windows.forEach(w => w.close());
  const receipt = { spec: process.env.QUALITY_CHECK_SPEC || 'SPEC-SUIYIN-ADMIN-092@0.3.0', checkedAt: new Date().toISOString(), status: results.every(x => x.passed) ? 'passed' : 'failed', checks: results.length, passed: results.filter(x => x.passed).length, sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), boundaries: { syntheticDOM: true, realNetworkCalls: 0, privateDataReads: 0, userBrowserStorageAccess: false }, limitations: ['Checks lazy frame creation, tab state and draft guards; real iframe rendering is separately checked in Chrome.'], results };
  const file = process.env.QUALITY_CHECK_OUTPUT_DIR ? path.resolve(process.env.QUALITY_CHECK_OUTPUT_DIR, 'shell-tab-restore-check.json') : path.join(root, 'docs/verification/chat-quality-daily-20261024/shell-tab-restore-check.json'); fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n'); console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, passed: receipt.passed, errors: results.filter(x => !x.passed) }));
});
