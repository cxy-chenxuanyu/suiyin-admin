#!/usr/bin/env node
/* Reproducible static DOM checks for SPEC-SUIYIN-ADMIN-092@0.2.1.
 * Runs existing Admin rendering/editing plus the quality model and prompt UI.
 * All writes are confined to jsdom's in-memory localStorage and this JSON receipt.
 * No server, network, real customer data, model API, or product scheduler is used.
 * Optional dependency override: QUALITY_JSDOM_ROOT=/absolute/path/to/jsdom.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const prototype = path.resolve(__dirname, '..');
const output = process.env.QUALITY_CHECK_OUTPUT_DIR ? path.resolve(process.env.QUALITY_CHECK_OUTPUT_DIR, 'prompts-check.json') : path.resolve(prototype, '../docs/verification/chat-quality-daily-20261024/prompts-check.json');
const loaded = [];
let dependencyPath;
function loadJsdom() {
  const candidates = [process.env.QUALITY_JSDOM_ROOT, 'jsdom', 'E:/dev/suiyin-insights/node_modules/jsdom'].filter(Boolean);
  for (const candidate of candidates) {
    try { dependencyPath = require.resolve(candidate); return require(candidate); } catch (error) { if (candidate === process.env.QUALITY_JSDOM_ROOT) throw error; }
  }
  throw new Error('jsdom unavailable. Install it in the test runtime or set QUALITY_JSDOM_ROOT to an existing jsdom package directory.');
}
function source(relative) {
  const absolute = path.resolve(prototype, relative);
  if (!absolute.startsWith(prototype + path.sep)) throw new Error('Unexpected fixture path: ' + relative);
  const value = fs.readFileSync(absolute, 'utf8');
  if (!loaded.some(x => x.path === relative)) loaded.push({ path: relative, sha256: crypto.createHash('sha256').update(value).digest('hex') });
  return value;
}
const receipt = {
  spec: process.env.QUALITY_CHECK_SPEC || 'SPEC-SUIYIN-ADMIN-092@0.2.1',
  generatedAt: new Date().toISOString(), timezone: 'Asia/Shanghai',
  type: 'static-dom-interaction', status: 'running', checks: [],
  boundaries: {
    syntheticOnly: true, networkRequests: 0, realModelCalls: 0, productWrites: 0,
    storage: 'Fresh in-memory jsdom localStorage; no existing browser data read or modified.',
    dialogPolyfills: ['showModal', 'close', 'scrollIntoView', 'ResizeObserver'],
    visualVerification: 'Not performed by this check; actual Chrome verification is separate.',
    coverage: 'Existing Admin template render/edit plus quality prompt and shared-rule interaction.'
  }
};
let dom;
function check(id, description, condition) {
  const passed = !!condition;
  receipt.checks.push({ id, description, passed });
  if (!passed) throw new Error(id + ': ' + description);
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

async function main() {
  const { JSDOM, VirtualConsole } = loadJsdom();
  receipt.runtime = { node: process.version, jsdom: dependencyPath };
  const consoleErrors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => consoleErrors.push(error.message));
  dom = new JSDOM('<!doctype html><html lang="zh-CN"><body class="admin-content"><main id="app" aria-busy="true"></main><dialog id="dialog"><header><h2 id="dialogTitle"></h2><button id="closeDialog">×</button></header><div id="dialogBody"></div><footer id="dialogFooter"></footer></dialog><div id="toast" role="status"></div></body></html>', {
    url: 'http://static-quality.test/prototype/admin-content.html?tenant=yestar-sz&route=promptTemplate&qa=1',
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole
  });
  const w = dom.window, d = w.document;
  w.structuredClone = value => JSON.parse(JSON.stringify(value));
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; const dialog = this; w.setTimeout(() => dialog.dispatchEvent(new w.Event('close')), 0); };
  w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.fetch = async url => {
    if (/^[a-z]+:/i.test(String(url))) throw new Error('Network access is prohibited in this check.');
    return { ok: true, json: async () => JSON.parse(source(String(url))) };
  };
  w.AdminViews = { render: () => false };
  [
    'data/live-ui-reference.js', 'admin-live-controls.js', 'admin-account-profile.js', 'admin-menu-state.js',
    'data/page-evidence.js', 'data/form-schemas.js', 'data/button-states.js',
    'admin-content.js', 'admin-quality-model.js', 'admin-quality-prompts.js'
  ].forEach(file => w.eval(source(file)));
  for (let i = 0; i < 50 && !d.body.dataset.contentReady; i++) await settle();
  const A = w.Admin, M = w.AdminQualityModel, U = w.AdminQualityPrompts;
  const button = label => [...d.querySelectorAll('button')].find(node => node.textContent.trim() === label);
  const click = async label => {
    const node = button(label);
    if (!node || node.disabled) throw new Error('Expected enabled button: ' + label);
    node.click(); await settle(); return node;
  };
  const change = (selector, value) => {
    const node = d.querySelector(selector);
    if (!node) throw new Error('Missing input: ' + selector);
    if (node.type === 'checkbox') node.checked = !!value; else node.value = String(value);
    node.dispatchEvent(new w.Event('input', { bubbles: true }));
    node.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  const old = JSON.parse(source('data/content/yestar-sz.json')).promptTemplate;
  check('P001', 'Existing Admin route initializes successfully.', d.body.dataset.contentReady === 'true');
  check('P002', 'All existing template rows remain in the original model.', A.getTable().rows.length === old.tables[0].rows.length);
  check('P003', 'Two dedicated quality templates appear in the same table as existing rows.', d.querySelectorAll('#qualityPromptSection [data-quality-channel]').length === 2 && d.querySelectorAll('#app table').length === 1 && d.querySelectorAll('#app tbody tr').length === old.tables[0].rows.length + 2);
  check('P004', 'Both channel templates initially remain disabled.', !M.getConfig('yestar-sz', 'wecom').published.enabled && !M.getConfig('yestar-sz', 'wechat').published.enabled);
  check('P044', 'Unified list preserves the six observed columns and actual five-record count.', [...d.querySelectorAll('#app thead th')].map(n => n.textContent).join('|') === '模版名称|场景|绑定模型|自动填写的标签|定时|操作' && d.querySelector('.aqp-list-count').textContent.includes('共 5 条'));
  check('P045', 'Main list uses Chinese scenes, hides technical IDs, and provides shared-rule and create controls.', !/demo-|deepseek-existing|chat_quality_daily|wecom_quality_daily|wechat_quality_daily/.test(d.querySelector('#app').textContent) && !!button('共用质检规则') && !!button('创建'));
  change('#aqp-scene-filter', M.getConfig('yestar-sz', 'wecom').scene);
  check('P046', 'All-scene filter can show only the enterprise-WeChat daily template.', d.querySelectorAll('#app tbody tr').length === 1 && !!d.querySelector('[data-quality-channel="wecom"]') && !d.querySelector('[data-quality-channel="wechat"]'));
  change('#aqp-scene-filter', '');
  check('P047', 'Clearing the scene filter restores all original and daily templates.', d.querySelectorAll('#app tbody tr').length === 5);

  // Exercise the real generic edit flow, not a stubbed replacement.
  const row = A.getTable().rows[0], beforeLegacy = JSON.stringify(row);
  A.edit(row);
  check('P005', 'Existing template editor still opens through Admin.edit.', !!d.querySelector('#editForm'));
  const legacyName = d.querySelector('#editForm [data-field="模板名称"],#editForm [data-field="模版名称"]');
  check('P006', 'Existing template editor exposes its original name field.', !!legacyName);
  legacyName.value = '旧模板可编辑性检查';
  A.closeDialog();
  check('P007', 'Cancelling the old template editor leaves its record unchanged.', JSON.stringify(row) === beforeLegacy);
  A.edit(row);
  const legacyForm = d.querySelector('#editForm');
  legacyForm.querySelector('[data-field="模板名称"],[data-field="模版名称"]').value = '旧模板本地保存检查';
  legacyForm.querySelectorAll('input[required],textarea[required],select[required]').forEach(node => {
    if (!node.value && node.tagName === 'SELECT') node.value = [...node.options].find(o => o.value && !o.disabled)?.value || '';
    else if (!node.value && node.type !== 'checkbox') node.value = '本地合成测试';
  });
  check('P008', 'Existing edit form remains valid for a local save.', legacyForm.checkValidity());
  legacyForm.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await settle();
  check('P009', 'Existing template save updates its own original row.', A.getTable().rows[0].cells[0] === '旧模板本地保存检查');
  check('P010', 'Quality controls survive the existing list refresh.', !!d.querySelector('#qualityPromptSection'));
  await click('创建');
  const createForm = d.querySelector('#editForm');
  check('P051', 'Create keeps the existing generic template form.', !!createForm);
  createForm.querySelector('[data-field="模板名称"],[data-field="模版名称"]').value = '可撤销的新建检查';
  createForm.querySelectorAll('input[required],textarea[required],select[required]').forEach(node => {
    if (!node.value && node.tagName === 'SELECT') node.value = [...node.options].find(o => o.value && !o.disabled)?.value || '';
    else if (!node.value && node.type !== 'checkbox') node.value = '本地合成测试';
  });
  createForm.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await settle();
  const created = A.getTable().rows.find(item => item.cells[0] === '可撤销的新建检查');
  check('P052', 'Legacy create appears alongside both daily templates with the actual count.', !!created && A.getTable().rows.length === 4 && d.querySelectorAll('#app tbody tr').length === 6 && d.querySelector('.aqp-list-count').textContent.includes('共 6 条'));
  A.action('删除', created); await click('确认删除'); await click('完成');
  check('P053', 'Legacy delete restores three original records without deleting daily templates.', A.getTable().rows.length === 3 && d.querySelectorAll('#app tbody tr').length === 5 && d.querySelectorAll('[data-quality-channel]').length === 2);
  const legacyStorageKey = 'admin-qa:v1:yestar-sz:promptTemplate';
  const legacyStored = w.localStorage.getItem(legacyStorageKey);
  check('P011', 'Existing template save uses its original scoped storage key.', !!legacyStored);

  await U.openTemplate('wecom');
  check('P048', 'Daily editor follows the observed scene, timing, model, name and content order.', [...d.querySelectorAll('.aqp-source-editor > .aqp-field')].map(n => n.firstElementChild.textContent).join('|') === '场景|定时启动|绑定模型|模板名称|模板内容');
  check('P049', 'Daily advanced workflow starts collapsed and footer keeps Confirm and Cancel.', !d.querySelector('.aqp-advanced').open && [...d.querySelectorAll('#dialogFooter button')].map(n => n.textContent).join('|') === '确定|取消' && d.querySelector('#aqp-template-name').readOnly && d.querySelector('#aqp-prompt-content').rows === 20);
  const configBefore = M.getConfig('yestar-sz', 'wecom');
  check('P050', 'Model options use only enabled scene-compatible candidates with source scope and optional default.', [...d.querySelector('#aqp-model').options].filter(o => o.value).length === configBefore.models.length && configBefore.models.every(m => m.enabled && m.scenes.includes(configBefore.scene) && [...d.querySelector('#aqp-model').options].some(o => o.value === m.id && o.textContent.includes(m.scope === 'platform' ? '平台' : '企业'))) && d.querySelector('#aqp-model').options[0].value === '' && !d.querySelector('#aqp-model').required);
  await U.openRules();
  await U.openTemplate('wecom');
  await settle();
  change('#aqp-enabled', true);
  check('P042', 'Delayed close events from prior editors do not clear the new editor state.', U.hasDirty() && d.querySelector('#dialog').open && d.querySelector('.aqp-dialog'));
  const otherBefore = JSON.stringify(M.getConfig('yestar-sz', 'wechat').published);
  change('#aqp-prompt-content', d.querySelector('#aqp-prompt-content').value + '\n本地合成检查 A。');
  change('#aqp-enabled', true);
  check('P012', 'Edited prompt is marked unsaved and cannot publish.', U.hasDirty() && button('发布当前模板（演示）').disabled);
  w.dispatchEvent(new w.MessageEvent('message', { data: { type: 'admin-dialog-close' }, origin: w.location.origin, source: w.parent }));
  await settle();
  check('P041', 'Shell scrim close message preserves dirty editor and offers leave choices.', d.querySelector('#dialog').open && U.hasDirty() && !!d.querySelector('.aqp-leave'));
  await click('继续编辑');
  A.closeDialog(); await settle();
  check('P043', 'Legacy direct close entry also respects the quality editor dirty guard.', d.querySelector('#dialog').open && U.hasDirty() && !!d.querySelector('.aqp-leave'));
  await click('继续编辑');
  d.querySelector('.aqp-advanced').open = true;
  await click('确定');
  check('P013', 'Saving a prompt only saves its draft.', !U.hasDirty() && M.getConfig('yestar-sz', 'wecom').dirty && !M.getConfig('yestar-sz', 'wecom').published.enabled);
  check('P014', 'Saving one channel leaves the other published template unchanged.', JSON.stringify(M.getConfig('yestar-sz', 'wechat').published) === otherBefore);
  await click('模拟结构 / 证据校验失败');
  check('P015', 'Failed trial displays a failure and blocks publication.', !M.getConfig('yestar-sz', 'wecom').trial.passed && button('发布当前模板（演示）').disabled && d.querySelector('.aqp-notice.error'));
  await click('试跑企微合成样本');
  check('P016', 'Passing same-channel trial allows the saved candidate to publish.', M.getConfig('yestar-sz', 'wecom').trial.passed && !button('发布当前模板（演示）').disabled);
  change('#aqp-prompt-content', d.querySelector('#aqp-prompt-content').value + '\n试跑后新修改。');
  check('P017', 'Changes after trial clear its visible proof and block publication.', button('发布当前模板（演示）').disabled && !d.querySelector('.aqp-trial-card'));
  await click('确定');
  check('P018', 'Saved changes invalidate previous trial in the shared model.', M.getConfig('yestar-sz', 'wecom').trial === null && !M.publishPrompt('yestar-sz', 'wecom').ok);
  await click('试跑企微合成样本'); await click('发布当前模板（演示）');
  check('P019', 'Publishing enables only the chosen channel and increments its version.', M.getConfig('yestar-sz', 'wecom').published.enabled && M.getConfig('yestar-sz', 'wecom').published.version === 'p2' && JSON.stringify(M.getConfig('yestar-sz', 'wechat').published) === otherBefore);

  // Saving fails without silently closing the editor or mutating the stored draft.
  const goodSet = w.Storage.prototype.setItem, savedPrompt = JSON.stringify(M.getConfig('yestar-sz', 'wecom').draft);
  change('#aqp-prompt-content', d.querySelector('#aqp-prompt-content').value + '\n保存失败时应保留。');
  w.Storage.prototype.setItem = function (key, value) { if (key.startsWith('admin-quality:')) throw new Error('synthetic quota failure'); return goodSet.call(this, key, value); };
  await click('确定');
  w.Storage.prototype.setItem = goodSet;
  check('P020', 'Storage failure retains unsaved edits and original stored draft.', U.hasDirty() && d.querySelector('#dialog').open && JSON.stringify(M.getConfig('yestar-sz', 'wecom').draft) === savedPrompt && !!d.querySelector('.aqp-notice.error'));
  const escape = new w.Event('cancel', { bubbles: true, cancelable: true }); d.querySelector('#dialog').dispatchEvent(escape);
  check('P021', 'Escape cannot discard dirty prompt edits.', escape.defaultPrevented && d.querySelector('#dialog').open && !!d.querySelector('.aqp-leave'));
  await click('继续编辑');
  check('P022', 'Continue editing preserves the dirty content.', U.hasDirty() && !d.querySelector('.aqp-leave'));
  d.querySelector('#closeDialog').click();
  check('P023', 'Close button also guards unsaved edits.', !!d.querySelector('.aqp-leave') && d.querySelector('#dialog').open);
  await click('继续编辑');
  let leave = U.requestLeave(); await click('保存草稿并离开');
  check('P024', 'Saving a draft before leaving resolves navigation and closes the editor.', await leave === true && !d.querySelector('#dialog').open && !U.hasDirty());
  check('P025', 'Save-and-leave does not publish the pending prompt.', M.getConfig('yestar-sz', 'wecom').dirty);
  await U.openTemplate('wecom');
  const savedText = M.getConfig('yestar-sz', 'wecom').draft.content;
  change('#aqp-prompt-content', savedText + '\n放弃的修改。');
  leave = U.requestLeave(); await click('继续编辑');
  check('P026', 'Continue editing declines a Shell leave request.', await leave === false && U.hasDirty());
  leave = U.requestLeave(); await click('放弃修改');
  check('P027', 'Discard leaves without changing the already saved draft.', await leave === true && M.getConfig('yestar-sz', 'wecom').draft.content === savedText);

  await U.openTemplate('wechat'); change('#aqp-enabled', true); await click('确定');
  await click('试跑个微合成样本'); await click('发布当前模板（演示）'); await U.requestLeave();
  check('P028', 'Both channel templates can be enabled independently.', M.getConfig('yestar-sz', 'wecom').published.enabled && M.getConfig('yestar-sz', 'wechat').published.enabled);
  const historical = M.getReport('yestar-sz', 'wecom', M.yesterday());
  const promptVersions = ['wecom', 'wechat'].map(channel => M.getConfig('yestar-sz', channel).published.version);
  await U.openRules(); change('#aqp-rule-responseMinutes', 15); await click('保存草稿');
  check('P029', 'Shared-rule draft is one source and leaves current rule unchanged.', M.getRules('yestar-sz').draft.responseMinutes === 15 && M.getRules('yestar-sz').current.responseMinutes === 20);
  check('P030', 'Shared-rule changes invalidate both channel prompt trials.', M.getConfig('yestar-sz', 'wecom').trial === null && M.getConfig('yestar-sz', 'wechat').trial === null);
  await click('用企微模板试跑');
  check('P031', 'One successful channel cannot publish rules when both are enabled.', button('发布共用规则（演示）').disabled && !M.publishRules('yestar-sz').ok && M.getRules('yestar-sz').current.responseMinutes === 20);
  await click('模拟个微试跑失败');
  check('P032', 'A failed second-channel trial keeps old common rules effective.', !M.getRules('yestar-sz').trials.wechat.passed && button('发布共用规则（演示）').disabled && M.getRules('yestar-sz').current.responseMinutes === 20);
  await click('用个微模板试跑');
  check('P033', 'Both exact candidate trials permit shared-rule publication.', M.getRules('yestar-sz').trials.wecom.passed && M.getRules('yestar-sz').trials.wechat.passed && !button('发布共用规则（演示）').disabled);
  await click('发布共用规则（演示）');
  const rules = M.getRules('yestar-sz');
  check('P034', 'One shared publish changes both rule references to the same version.', rules.current.responseMinutes === 15 && rules.version === 'r2' && M.getConfig('yestar-sz', 'wecom').ruleVersion === 'r2' && M.getConfig('yestar-sz', 'wechat').ruleVersion === 'r2');
  check('P035', 'Shared rules do not replace either dedicated template version.', ['wecom', 'wechat'].every((channel, i) => M.getConfig('yestar-sz', channel).published.version === promptVersions[i]));
  check('P036', 'Previously generated report retains its original rule snapshot.', M.getReport('yestar-sz', 'wecom', M.yesterday()).meta.ruleVersion === historical.meta.ruleVersion && M.getReport('yestar-sz', 'wecom', M.yesterday()).snapshot.rules.responseMinutes === historical.snapshot.rules.responseMinutes);
  await U.requestLeave();
  check('P037', 'Quality workflows do not mutate original template storage.', w.localStorage.getItem(legacyStorageKey) === legacyStored && A.getTable().rows.length === old.tables[0].rows.length);

  // Blank binding resolves through the shared model directory, not a UI fallback.
  await U.openTemplate('wecom'); change('#aqp-model', ''); await click('确定');
  check('P054', 'Confirm preserves an empty binding and shows its scene default.', M.getConfig('yestar-sz', 'wecom').draft.modelId === '' && M.getConfig('yestar-sz', 'wecom').draftResolution.effectiveModelId === 'deepseek-existing' && d.querySelector('#aqp-model-hint').textContent.includes('当前默认'));
  d.querySelector('.aqp-advanced').open = true;
  await click('试跑企微合成样本'); await click('发布当前模板（演示）');
  check('P055', 'Default-bound publication records the shared directory final model.', M.getConfig('yestar-sz', 'wecom').published.modelId === '' && M.getConfig('yestar-sz', 'wecom').effectiveModelId === 'deepseek-existing' && M.getConfig('yestar-sz', 'wecom').trial.effectiveModelId === 'deepseek-existing');
  change('#aqp-prompt-content', d.querySelector('#aqp-prompt-content').value + '\n目录变更期间保留的编辑。');
  const unsavedContent = d.querySelector('#aqp-prompt-content').value;
  M.saveModelConfig('yestar-sz', 'deepseek-existing', { enabled: false });
  check('P056', 'Simulated platform model change refreshes candidates but preserves unsaved content.', U.hasDirty() && d.querySelector('#aqp-prompt-content').value === unsavedContent && ![...d.querySelector('#aqp-model').options].some(o => o.value === 'deepseek-existing') && d.querySelector('#aqp-model-hint').textContent.includes('默认配置不可用') && button('发布当前模板（演示）').disabled);
  leave = U.requestLeave(); await click('放弃修改'); await leave;
  await U.openTemplate('wecom'); d.querySelector('.aqp-advanced').open = true; await click('试跑企微合成样本');
  check('P057', 'An unavailable default fails visibly and does not silently choose another enabled model.', !M.getConfig('yestar-sz', 'wecom').draftResolution.ok && M.getConfig('yestar-sz', 'wecom').draftResolution.effectiveModelId === 'deepseek-existing' && button('发布当前模板（演示）').disabled && !!d.querySelector('.aqp-notice.error'));
  M.saveModelConfig('yestar-sz', 'deepseek-enterprise-demo', { enabled: false });
  check('P058', 'Empty model candidates explain platform configuration and expose the read-only directory link.', [...d.querySelector('#aqp-model').options].filter(o => o.value).length === 0 && d.querySelector('#aqp-model-hint').textContent.includes('请由平台配置模型支持') && !!button('查看 AI 模型管理'));
  const postMessage = w.postMessage, messages = [];
  w.postMessage = (data, origin) => messages.push({ data, origin });
  await click('查看 AI 模型管理'); w.postMessage = postMessage;
  check('P059', 'Model-directory navigation uses the existing enterprise-model route and same origin.', messages.some(message => message.data.type === 'admin-quality-navigate' && message.data.route === 'aiEntModelConfig' && message.origin === w.location.origin) && !d.querySelector('#dialog').open);
  M.saveModelConfig('yestar-sz', 'deepseek-existing', { enabled: true });
  M.saveModelConfig('yestar-sz', 'deepseek-enterprise-demo', { enabled: true });
  check('P060', 'Default and directory tests still leave legacy storage and old report snapshots untouched.', w.localStorage.getItem(legacyStorageKey) === legacyStored && JSON.stringify(M.getReport('yestar-sz', 'wecom', M.yesterday()).snapshot) === JSON.stringify(historical.snapshot) && M.getReport('yestar-sz', 'wecom', M.yesterday()).meta.templateVersion === historical.meta.templateVersion);
  w.localStorage.setItem('admin-quality:v1:yestar-sz:wechat', '{invalid');
  d.dispatchEvent(new w.CustomEvent('admin-quality-changed', { detail: { tenant: 'yestar-sz', channel: 'wechat' } }));
  check('P038', 'Corrupt channel storage shows an error instead of a false empty state.', d.querySelector('[data-quality-channel="wechat"]').textContent.includes('配置读取失败'));
  check('P039', 'One corrupt channel preserves the other controls and the original list.', d.querySelector('[data-quality-channel="wecom"]').textContent.includes('编辑') && d.querySelectorAll('[data-legacy-template]').length === old.tables[0].rows.length && !!d.querySelector('#results'));
  check('P040', 'No unexpected jsdom runtime errors occurred.', consoleErrors.length === 0);
  receipt.runtime.consoleErrors = consoleErrors;
  receipt.status = 'passed';
}

main().catch(error => {
  receipt.status = 'failed'; receipt.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
}).finally(() => {
  if (dom) dom.window.close();
  receipt.inputs = loaded;
  receipt.summary = { total: receipt.checks.length, passed: receipt.checks.filter(x => x.passed).length, failed: receipt.checks.filter(x => !x.passed).length };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ status: receipt.status, ...receipt.summary, receipt: output, error: receipt.error?.message }));
});
