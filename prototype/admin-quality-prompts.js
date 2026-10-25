/* SPEC-SUIYIN-ADMIN-092@0.2.1 — unified template list; synthetic quality controls. */
'use strict';
(() => {
  const A = window.Admin, M = window.AdminQualityModel, V = window.AdminViews;
  if (!A || !M || !V || A.route !== 'promptTemplate' || !M.isEnabledTenant(A.tenant)) return;
  const tenant = A.tenant, channels = ['wecom', 'wechat'];
  const labels = { wecom: '企微', wechat: '个微' };
  const previousRender = V.render;
  let active = null, section = null, closeAllowed = false, sceneFilter = '';
  const el = A.node;
  const serial = value => JSON.stringify(value);
  const button = (text, run, cls = '') => {
    const b = A.button(text, run, cls); b.type = 'button'; return b;
  };
  const text = (value, fallback = '—') => value === null || value === undefined || value === '' ? fallback : String(value);
  const badge = (value, state = '') => el('span', 'aqp-status ' + state, value);
  const getConfig = channel => M.getConfig(tenant, channel);
  const getRules = () => M.getRules(tenant);
  function field(label, control, hint = '') {
    const wrap = el('label', 'field aqp-field');
    wrap.append(el('span', '', label), control);
    if (hint) wrap.append(el('small', '', hint));
    return wrap;
  }
  function input(label, value, type = 'text') {
    const n = el(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') n.type = type;
    n.value = value ?? ''; n.setAttribute('aria-label', label);
    return n;
  }
  function modelName(model) { return model?.displayName || model?.modelName || model?.name || '配置不可用'; }
  function scopeLabel(model) { return model?.scope === 'platform' ? '平台' : model?.scope === 'enterprise' ? '企业' : ''; }
  function sceneLabel(channel) { return labels[channel] + '会话质检日报'; }
  async function removeTemplate(channel) {
    if (!(await requestLeave()) || (window.AdminPromptTemplates && !(await window.AdminPromptTemplates.requestLeave()))) return;
    const config = getConfig(channel);
    if (config.deleted) { renderSection(); return; }
    if (config.error) { A.toast('本地配置读取失败，记录保留'); return; }
    const box = el('div');
    box.append(el('p', '', '将从本地原型删除“' + (config.name || sceneLabel(channel) + '分析提示词') + '”，真实后台保持原值。'));
    box.append(el('p', '', '删除后，该渠道停止使用此模板生成新的本地模拟日报，已生成日报保留。'));
    A.showDialog('删除模板', box, [{ label: '取消', run: A.closeDialog }, { label: '确认删除', cls: 'danger', run: () => {
      const result = M.deletePrompt(tenant, channel);
      if (!result.ok) { A.toast(result.message || '本地保存失败，记录保留'); return; }
      A.closeDialog(); renderSection();
    } }]);
  }
  function dailyRow(channel, c = getConfig(channel)) {
    const row = el('tr'); row.dataset.qualityChannel = channel;
    if (c.error) { const error = el('td'); error.colSpan = 6; error.append(el('span', '', labels[channel] + '配置读取失败，原有记录保留。'), button('重新读取', renderSection, 'link')); row.append(error); return row; }
    const title = el('td'); title.append(el('span', '', c.name || sceneLabel(channel) + '分析提示词'), el('small', 'aqp-meta', '日报新增 · ' + (c.dirty ? '草稿待发布' : text(c.published?.version)) + ' · 本地模拟'));
    const scene = el('td', '', sceneLabel(channel)), model = el('td', 'aqp-model-cell'), resolved = c.publishedResolution;
    const bound = (c.modelCatalog || c.models || []).find(m => m.id === c.published?.modelId);
    if (!c.published?.modelId) model.append(el('span', '', '使用默认模型'), el('small', 'aqp-meta', resolved?.ok ? modelName(resolved) : '默认模型待配置'));
    else model.append(el('span', '', modelName(bound || (resolved?.ok ? resolved : null))));
    const scope = scopeLabel(bound || resolved); if (scope) model.append(badge(scope, scope === '平台' ? 'warn' : 'good'));
    if (resolved && !resolved.ok) model.append(el('small', 'aqp-error-text', '绑定配置不可用'));
    const enabled = el('td'); enabled.append(badge(c.published?.enabled ? '已开启' : '未开启', c.published?.enabled ? 'good' : 'neutral'));
    const actions = el('td', window.AdminPromptTemplates ? 'apt-row-actions' : 'aqp-row-actions'); actions.append(button('编辑', () => openTemplate(channel), 'link'), button('删除', () => removeTemplate(channel), 'link danger'));
    row.append(title, scene, model, el('td', '', '—'), enabled, actions); return row;
  }
  function renderSection() {
    if (window.AdminPromptTemplates) { window.AdminPromptTemplates.render(); return; }
    const root = A.$('app').firstElementChild, results = A.$('results');
    if (!root || !results || !root.classList.contains('aqp-prompt-page')) return;
    const legacy = A.getTable(), configs = Object.fromEntries(channels.map(channel => [channel, getConfig(channel)]));
    const legacySceneIndex = legacy.headers.indexOf('场景');
    const options = [...new Set(legacy.rows.map(row => row.cells[legacySceneIndex]).filter(Boolean))].map(label => ({ value: 'legacy:' + label, label }));
    channels.filter(channel => !configs[channel].deleted).forEach(channel => options.push({ value: configs[channel].scene || channel + '_quality_daily', label: sceneLabel(channel) }));
    const select = A.$('aqp-scene-filter');
    if (select) {
      if (sceneFilter && !options.some(option => option.value === sceneFilter)) sceneFilter = '';
      select.replaceChildren(new Option('全部场景', '', false, !sceneFilter));
      options.forEach(option => select.append(new Option(option.label, option.value, false, sceneFilter === option.value)));
    }
    results.replaceChildren();
    const wrap = el('div', 'aqp-table-wrap'), table = el('table', 'aqp-table'), head = el('thead'), tr = el('tr');
    ['模版名称', '场景', '绑定模型', '自动填写的标签', '定时', '操作'].forEach(label => tr.append(el('th', '', label)));
    head.append(tr); table.append(head);
    const body = el('tbody'); let visible = 0;
    legacy.rows.forEach(item => {
      if (sceneFilter && sceneFilter !== 'legacy:' + item.cells[legacySceneIndex]) return;
      visible++;
      const row = el('tr'); row.dataset.legacyTemplate = item.id;
      for (let i = 0; i < 5; i++) row.append(el('td', i === 2 ? 'aqp-model-cell' : '', item.cells[i] || '—'));
      const actions = el('td', 'aqp-row-actions');
      (item.actions || ['编辑', '删除']).forEach(action => actions.append(button(action, () => A.action(action, item), /删除/.test(action) ? 'link danger' : 'link')));
      row.append(actions); body.append(row);
    });
    channels.forEach(channel => {
      const c = configs[channel];
      if (c.deleted) return;
      if (sceneFilter && sceneFilter !== (c.scene || channel + '_quality_daily')) return;
      visible++;
      body.append(dailyRow(channel, c));
    });
    if (!visible) { const row = el('tr'), cell = el('td', 'aqp-empty', '当前场景暂无模板'); cell.colSpan = 6; row.append(cell); body.append(row); }
    table.append(body); wrap.append(table); results.append(wrap);
    const dailyCount = channels.filter(channel => !configs[channel].deleted).length;
    results.append(el('p', 'aqp-list-count', '共 ' + (legacy.rows.length + dailyCount) + ' 条，当前显示 ' + visible + ' 条'));
    results.append(el('p', 'aqp-footnote', '保留 ' + legacy.rows.length + ' 条原有参考模板，另有 ' + dailyCount + ' 条日报模板。日报的草稿、试跑与发布为新增本地模拟能力，不调用真实模型或启动定时任务。'));
  }
  function render() {
    if (A.route !== 'promptTemplate' || !M.isEnabledTenant(tenant)) return false;
    if (window.AdminPromptTemplates) return window.AdminPromptTemplates.render();
    A.renderTablePage();
    const root = A.$('app').firstElementChild; root.classList.add('aqp-prompt-page');
    const heading = el('header', 'aqp-list-heading'), tools = el('div', 'aqp-list-tools');
    const select = el('select'); select.id = 'aqp-scene-filter'; select.setAttribute('aria-label', '全部场景');
    select.onchange = () => { sceneFilter = select.value; renderSection(); };
    tools.append(select, button('共用质检规则', () => openRules()), button('创建', () => A.action('创建'), 'aqp-create'));
    heading.append(el('h2', '', 'Prompt模板管理'), tools);
    section = el('section', 'aqp-unified-list'); section.id = 'qualityPromptSection';
    const results = el('div'); results.id = 'results'; section.append(results);
    root.replaceChildren(heading, section); renderSection(); return true;
  }
  function dirty() { return !!active && serial(active.read()) !== active.saved; }
  function setNotice(message, kind = '') {
    if (!active) return;
    active.notice.textContent = message; active.notice.className = 'aqp-notice ' + kind; active.notice.hidden = !message;
  }
  function updateActions() {
    if (!active) return;
    const isDirty = dirty(), rules = getRules();
    active.form.dataset.dirty = String(isDirty);
    active.dirtyMark.textContent = isDirty ? '有未保存修改' : '当前编辑已保存';
    active.dirtyMark.className = 'aqp-status ' + (isDirty ? 'warn' : 'neutral');
    active.saveButton.disabled = active.busy || !isDirty;
    active.trialButtons.forEach(b => { b.disabled = active.busy || isDirty; });
    if (active.kind === 'prompt') {
      const config = getConfig(active.channel);
      active.publishButton.disabled = active.busy || isDirty || !config.trial?.passed;
      active.stateText.textContent = '已生效 ' + text(config.published?.version) + ' · 共同规则 ' + text(config.ruleVersion) + (config.dirty ? ' · 草稿待发布' : '');
    } else {
      const required = rules.enabledChannels || channels.filter(channel => getConfig(channel).published?.enabled);
      active.publishButton.disabled = active.busy || isDirty || !rules.dirty || required.some(channel => !rules.trials?.[channel]?.passed);
      active.stateText.textContent = '当前共同规则 ' + text(rules.version) + ' · 已启用渠道：' + (required.length ? required.map(channel => labels[channel]).join('、') : '无（启用时需验证当前规则）');
    }
    active.form.querySelectorAll('input,textarea,select').forEach(n => { n.disabled = active.busy || n.dataset.locked === 'true'; });
    active.form.setAttribute('aria-busy', String(active.busy));
  }
  async function write(operation, success) {
    if (!active || active.busy) return false;
    const editor = active; editor.busy = true; updateActions(); setNotice('正在保存本地演示状态…');
    try {
      const result = await operation();
      if (active !== editor) return false;
      if (!result?.ok) { setNotice(result?.message || result?.error || '保存失败，草稿保留，请重试。', 'error'); return false; }
      success?.(result); setNotice(result.message || '已保存到本地演示。', 'good'); renderSection(); return true;
    } catch (error) {
      if (active === editor) setNotice('操作未完成，草稿保留：' + (error?.message || '请重试'), 'error');
      return false;
    } finally { if (active === editor) { editor.busy = false; updateActions(); } }
  }
  async function saveDraft() {
    if (!active || active.busy) return false;
    if (!active.form.reportValidity()) return false;
    if (!dirty()) return true;
    const editor = active, values = editor.read();
    return write(() => editor.kind === 'prompt' ? M.savePrompt(tenant, editor.channel, values) : M.saveRulesDraft(tenant, values), () => {
      editor.saved = serial(values); editor.output.replaceChildren(); editor.leaveBox?.remove(); editor.leaveBox = null;
    });
  }
  function showTrial(trial, channel) {
    if (!active) return;
    const card = el('section', 'aqp-trial-card'); card.dataset.trialChannel = channel;
    card.append(el('strong', '', labels[channel] + '样本试跑'), badge(trial?.passed ? '校验通过' : '未通过', trial?.passed ? 'good' : 'error'));
    card.append(el('p', '', trial?.passed ? '已校验当前候选配置与合成样本。修改正文、模型或共用规则后需重新试跑。' : text(trial?.error, '结构或证据校验未通过，不能发布此候选配置。')));
    if (trial?.output) {
      const details = el('details'), summary = el('summary', '', '查看合成输出');
      const pre = el('pre', '', JSON.stringify(trial.output, null, 2)); details.append(summary, pre); card.append(details);
    }
    active.output.querySelector('[data-trial-channel="' + channel + '"]')?.remove(); active.output.append(card);
  }
  async function trial(channel, simulateFailure = false) {
    if (!active || dirty()) { setNotice('请先保存当前修改，再用同渠道样本试跑。', 'warn'); return; }
    const editor = active;
    await write(() => editor.kind === 'prompt' ? M.trialPrompt(tenant, channel, { simulateFailure }) : M.trialRules(tenant, channel, { simulateFailure }), result => {
      const outcome = editor.kind === 'prompt' ? getConfig(channel).trial : getRules().trials?.[channel];
      showTrial(outcome || result.data, channel);
    });
    if (active === editor) {
      const outcome = editor.kind === 'prompt' ? getConfig(channel).trial : getRules().trials?.[channel];
      if (outcome) {
        if (!outcome.passed) showTrial(outcome, channel);
        setNotice(outcome.passed ? labels[channel] + '合成样本校验通过，未调用真实模型。' : text(outcome.error, '试跑校验未通过，请修改后重新试跑。'), outcome.passed ? 'good' : 'error');
      }
    }
  }
  async function publish() {
    if (!active || dirty()) { setNotice('当前修改尚未保存，请先保存并重新试跑。', 'warn'); return; }
    const editor = active;
    await write(() => editor.kind === 'prompt' ? M.publishPrompt(tenant, editor.channel) : M.publishRules(tenant), () => {
      editor.saved = serial(editor.read());
      A.toast(editor.kind === 'prompt' ? labels[editor.channel] + '模板已在本地演示生效' : '共用规则已在本地演示生效');
    });
  }
  function makeEditor(kind, channel, title) {
    const form = el('form', 'aqp-editor'), notice = el('p', 'aqp-notice'); notice.hidden = true; notice.setAttribute('role', 'status');
    const top = el('div', 'aqp-editor-top'), stateText = el('p', 'aqp-meta'), dirtyMark = badge('当前编辑已保存', 'neutral');
    top.append(badge('日报新增 · 本地模拟', 'neutral'), dirtyMark); form.append(notice);
    const advanced = el('details', 'aqp-advanced'), advancedBody = el('div', 'aqp-advanced-body');
    advanced.append(el('summary', '', '日报新增高级设置：草稿、试跑与发布'), advancedBody); advancedBody.append(top, stateText);
    if (kind === 'rules') advanced.open = true;
    active = { kind, channel, form, notice, stateText, dirtyMark, advanced, advancedBody, saved: '', busy: false, read: () => ({}), trialButtons: [], leaveBox: null, leaveResolve: null };
    form.addEventListener('input', () => { updateActions(); if (dirty()) { active.output?.replaceChildren(); setNotice('修改尚未保存；原试跑记录不能用于这些修改，需保存后重新校验。', 'warn'); } });
    form.addEventListener('change', updateActions);
    form.onsubmit = e => { e.preventDefault(); saveDraft(); };
    A.showDialog(title, form, []);
    A.$('dialog').classList.add('aqp-dialog');
    A.$('dialog').style.setProperty('--dialog-width', '960px');
    if (window.frameElement) {
      const rect = window.frameElement.getBoundingClientRect();
      A.$('dialog').style.setProperty('--dialog-left', Math.max(16, (parent.innerWidth - Math.min(960, innerWidth - 32)) / 2) - rect.left + 'px');
      A.$('dialog').style.setProperty('--dialog-top', Math.max(16, parent.innerHeight * .08 - rect.top) + 'px');
    }
    return active;
  }
  function finishEditor(editor) {
    editor.output = el('div', 'aqp-trial-output');
    editor.advancedBody.append(editor.output);
    editor.form.append(editor.advanced);
    const footer = A.$('dialogFooter');
    editor.saveButton = button(editor.kind === 'prompt' ? '确定' : '保存草稿', saveDraft, 'primary');
    editor.publishButton = button(editor.kind === 'prompt' ? '发布当前模板（演示）' : '发布共用规则（演示）', publish, 'primary');
    editor.advancedBody.append(editor.publishButton);
    footer.append(editor.saveButton, button('取消', requestClose));
    editor.saved = serial(editor.read()); updateActions();
  }
  async function openTemplate(channel) {
    if (!channels.includes(channel) || !(await requestLeave())) return;
    if (window.AdminPromptTemplates && !(await window.AdminPromptTemplates.requestLeave())) return;
    const config = getConfig(channel), rules = getRules();
    if (config.deleted) { A.toast('该渠道提示词模板已删除'); renderSection(); return; }
    if (config.error || rules.error) { A.toast('本地配置读取失败，原有记录保留，请重试。'); renderSection(); return; }
    const editor = makeEditor('prompt', channel, '修改模板'); editor.form.classList.add('aqp-source-editor');
    const scene = el('select'); scene.setAttribute('aria-label', '场景'); scene.dataset.locked = 'true'; scene.disabled = true;
    scene.append(new Option(sceneLabel(channel), config.scene, true, true));
    const content = input('模板正文', config.draft.content, 'textarea'); content.required = true; content.rows = 20; content.id = 'aqp-prompt-content';
    const model = el('select'); model.id = 'aqp-model'; model.setAttribute('aria-label', '绑定模型');
    let modelConfig = config, available = [];
    const enabled = input('定时启用', '', 'checkbox'); enabled.id = 'aqp-enabled'; enabled.checked = !!config.draft.enabled;
    enabled.className = 'aqp-switch'; enabled.setAttribute('role', 'switch');
    const toggle = el('label', 'aqp-toggle'), toggleLabel = el('span', '', enabled.checked ? '已开启' : '未开启'); toggle.append(enabled, toggleLabel);
    enabled.addEventListener('change', () => { toggleLabel.textContent = enabled.checked ? '已开启' : '未开启'; });
    const timing = el('div', 'field aqp-field'); timing.append(el('span', '', '定时启动'), toggle, el('small', '', '日报新增：每日 04:00 开始，08:00 前完成目标。此处为本地模拟，未启用真实调度；原有场景的执行规则不变。'));
    const modelField = field('绑定模型', model), hint = el('div', 'aqp-model-hint'); hint.id = 'aqp-model-hint';
    const configure = button('查看 AI 模型管理', async () => { if (await requestLeave()) parent.postMessage({ type: 'admin-quality-navigate', route: 'aiEntModelConfig' }, location.origin); }, 'link');
    function showModelHint() {
      hint.replaceChildren();
      if (modelConfig.modelCatalogError) hint.append(el('span', 'aqp-error-text', '模型目录读取失败，原绑定保留，请重试。'));
      else if (!available.length) hint.append(el('span', 'aqp-error-text', '当前日报场景暂无可用演示模型，请由平台配置模型支持。'));
      else if (model.value && !available.some(m => m.id === model.value)) hint.append(el('span', 'aqp-error-text', '当前绑定已停用或不支持此场景，请选择有效配置。'));
      else if (!model.value) {
        const defaultModel = available.find(m => m.defaultScenes?.includes(config.scene));
        hint.append(el('span', defaultModel ? '' : 'aqp-error-text', defaultModel ? '当前默认：' + modelName(defaultModel) + '（' + scopeLabel(defaultModel) + '）；试跑时解析最终配置。' : '当前场景默认配置不可用，请由平台维护人员检查；不会自动替换。'));
      }
      else hint.append(el('span', '', '日报新场景的模型支持为演示候选；线上需由平台完成配置。'));
      hint.append(configure);
    }
    editor.refreshModels = (selected = model.value) => {
      modelConfig = getConfig(channel);
      available = (modelConfig.models || []).filter(m => m.enabled === true && m.scenes?.includes(config.scene));
      model.replaceChildren(new Option('不选则使用默认模型', '', false, !selected));
      available.forEach(m => model.append(new Option(modelName(m) + (scopeLabel(m) ? '（' + scopeLabel(m) + '）' : '') + ' · 演示候选', m.id, false, m.id === selected)));
      if (selected && !available.some(m => m.id === selected)) {
        const old = (modelConfig.modelCatalog || []).find(m => m.id === selected);
        const option = new Option(modelName(old) + '（当前不可用）', selected, true, true); option.disabled = true; model.append(option);
      }
      showModelHint();
    };
    model.addEventListener('change', showModelHint); editor.refreshModels(config.draft.modelId); modelField.append(hint);
    const name = input('模板名称', config.name); name.readOnly = true; name.id = 'aqp-template-name';
    editor.form.append(field('场景', scene), timing, modelField, field('模板名称', name), field('模板内容', content));
    editor.form.append(el('p', 'aqp-muted aqp-save-explainer', '日报新增能力：点击“确定”仅保存草稿；在高级设置中试跑并发布后，才改变本地演示的生效配置。'));
    const reference = el('div', 'aqp-reference'); reference.append(el('span', '', '共同规则 ' + rules.version + '：两份模板共用同一套标准，正文仅调整本渠道分析关注点。'), button('编辑共用规则', () => openRules(), 'link')); editor.advancedBody.append(reference);
    editor.read = () => ({ content: content.value, modelId: model.value, enabled: enabled.checked });
    const trialBar = el('div', 'aqp-trial-actions'), run = button('试跑' + labels[channel] + '合成样本', () => trial(channel));
    const failures = el('details', 'aqp-demo-cases'); failures.append(el('summary', '', '查看失败状态演示'));
    const fail = button('模拟结构 / 证据校验失败', () => trial(channel, true), 'link'); failures.append(fail);
    editor.trialButtons.push(run, fail); trialBar.append(run, failures); editor.advancedBody.append(trialBar);
    finishEditor(editor); if (config.trial) showTrial(config.trial, channel);
    content.focus();
  }
  async function openRules() {
    if (!(await requestLeave())) return;
    if (window.AdminPromptTemplates && !(await window.AdminPromptTemplates.requestLeave())) return;
    const rules = getRules();
    if (rules.error) { A.toast('本地共用规则读取失败，原有记录保留，请重试。'); renderSection(); return; }
    const editor = makeEditor('rules', 'shared', '编辑共用质检规则');
    const info = el('div', 'aqp-reference'); info.append(el('strong', '', rules.ruleSetId), el('span', '', ' · 企微、个微共同引用，发布会影响后续两个渠道的新批次。历史报告快照保持。')); editor.form.append(info);
    const draft = rules.draft, content = input('共用质检标准与业务知识', draft.content, 'textarea'); content.required = true; content.rows = 8; content.id = 'aqp-rule-content';
    const fields = [ ['responseMinutes', '响应超时阈值（分钟）'], ['burstMinutes', '客户连发归组间隔（分钟）'], ['deepChatCount', '客户深聊发言条数'], ['businessMinMessages', '业务动作适用最低双方消息数'] ];
    const controls = {}, grid = el('div', 'aqp-rule-grid');
    fields.forEach(([key, label]) => { const control = input(label, draft[key], 'number'); control.required = true; control.min = '1'; control.step = '1'; control.id = 'aqp-rule-' + key; controls[key] = control; grid.append(field(label, control)); });
    const products = input('重点项目清单', (draft.largeProducts || []).join('\n'), 'textarea'); products.rows = 3; products.id = 'aqp-rule-products';
    const referral = input('老带新适用条件', draft.referralCondition, 'textarea'); referral.rows = 3; referral.id = 'aqp-rule-referral';
    editor.form.append(field('共用质检标准与业务知识', content), grid, field('重点项目清单', products, '每行一个项目；未配置时该项不适用。'), field('老带新适用条件', referral));
    editor.read = () => ({ content: content.value, ...Object.fromEntries(fields.map(([key]) => [key, Number(controls[key].value)])), largeProducts: products.value.split('\n').map(v => v.trim()).filter(Boolean), referralCondition: referral.value });
    editor.form.append(el('p', 'aqp-impact', '发布前，所有已启用渠道须分别用自己的有效模板和模型验证候选规则；任一未通过，旧共同规则继续有效。未启用渠道不阻断发布，但启用前需验证。'));
    const actions = el('div', 'aqp-trial-actions');
    channels.forEach(channel => { const b = button('用' + labels[channel] + '模板试跑', () => trial(channel)); b.dataset.ruleTrial = channel; editor.trialButtons.push(b); actions.append(b); });
    const failures = el('details', 'aqp-demo-cases'); failures.append(el('summary', '', '查看失败状态演示'));
    channels.forEach(channel => { const b = button('模拟' + labels[channel] + '试跑失败', () => trial(channel, true), 'link'); editor.trialButtons.push(b); failures.append(b); });
    actions.append(failures); editor.advancedBody.append(actions); finishEditor(editor);
    channels.forEach(channel => { if (rules.trials?.[channel]) showTrial(rules.trials[channel], channel); }); content.focus();
  }
  function closeEditor() {
    closeAllowed = true;
    const resolve = active?.leaveResolve; active = null;
    A.$('dialog').classList.remove('aqp-dialog'); A.closeDialog(); closeAllowed = false;
    resolve?.(true); renderSection();
  }
  function requestLeave() {
    if (!active) return Promise.resolve(true);
    if (active.busy) { setNotice('当前操作正在完成，请稍后再离开。', 'warn'); return Promise.resolve(false); }
    if (!dirty()) { closeEditor(); return Promise.resolve(true); }
    if (active.leavePromise) { active.leaveBox?.scrollIntoView({ block: 'nearest' }); return active.leavePromise; }
    const editor = active, box = el('section', 'aqp-leave'); editor.leaveBox = box;
    box.setAttribute('role', 'alert'); box.append(el('strong', '', '还有未保存修改'), el('p', '', '可以保存为草稿后离开，或放弃这次未保存修改。当前生效配置不会改变。'));
    const actions = el('div', 'aqp-leave-actions');
    actions.append(button('保存草稿并离开', async () => { if (await saveDraft()) closeEditor(); }, 'primary'), button('放弃修改', closeEditor, 'danger'), button('继续编辑', () => {
      const resolve = editor.leaveResolve; editor.leaveResolve = null; editor.leavePromise = null; box.remove(); editor.leaveBox = null; resolve?.(false);
    })); box.append(actions); editor.form.append(box); box.scrollIntoView({ block: 'nearest' }); actions.lastElementChild.focus();
    editor.leavePromise = new Promise(resolve => { editor.leaveResolve = resolve; }); return editor.leavePromise;
  }
  function requestClose() { return requestLeave(); }
  // The legacy Shell message listener calls dialog.close() directly. Guard the
  // shared instance while this editor owns it, regardless of listener order.
  const dialog = A.$('dialog'), nativeDialogClose = dialog.close;
  dialog.close = function (...args) {
    if (active && !closeAllowed) { requestClose(); return; }
    return nativeDialogClose.apply(this, args);
  };
  function interceptClose(event) {
    if (!active || closeAllowed) return;
    const dialog = A.$('dialog');
    const outside = event.type === 'click' && event.target === dialog && (() => { const r = dialog.getBoundingClientRect(); return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom; })();
    if (event.type === 'cancel' || outside || event.target?.closest?.('#closeDialog')) {
      event.preventDefault(); event.stopImmediatePropagation(); requestClose();
    }
  }
  document.addEventListener('click', interceptClose, true);
  A.$('dialog').addEventListener('cancel', interceptClose, true);
  dialog.addEventListener('close', event => {
    // Native close events are queued. A preceding editor may have closed and a
    // new editor reopened this same dialog before the old event is delivered.
    if (dialog.open) { event.stopImmediatePropagation(); return; }
    if (!closeAllowed && active) { const resolve = active.leaveResolve; active = null; resolve?.(true); }
    dialog.classList.remove('aqp-dialog');
  }, true);
  window.addEventListener('message', event => {
    if (active && event.origin === location.origin && event.source === parent && event.data?.type === 'admin-dialog-close') {
      event.stopImmediatePropagation(); requestClose();
    }
  }, true);
  window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
  document.addEventListener('admin-quality-changed', event => {
    if (event.detail?.tenant && event.detail.tenant !== tenant) return;
    renderSection();
    if (active && !active.busy) { active.refreshModels?.(); active.output?.replaceChildren(); setNotice('本租户配置已变化；当前编辑内容仍保留，发布时会重新核对有效配置。', 'warn'); updateActions(); }
  });
  // Legacy CRUD calls its own lexical renderResults() after saving. Refresh the
  // unified projection afterwards without modifying its model or storage key.
  document.addEventListener('admin-model-changed', () => queueMicrotask(renderSection));
  V.render = () => render() || previousRender?.();
  window.AdminQualityPrompts = { render, openTemplate, openRules, hasDirty: dirty, requestLeave };
  window.AdminPromptTemplates?.registerExtension({ id: 'quality-daily', rows: () => channels.filter(channel => !getConfig(channel).deleted).map(channel => ({ id: 'quality-' + channel, sceneId: getConfig(channel).scene || channel + '_quality_daily', sceneLabel: sceneLabel(channel), element: dailyRow(channel) })), toolbar: () => [button('共用质检规则', () => openRules())], requestLeave, note: '日报的草稿、试跑与发布为新增本地模拟能力，不调用真实模型或启动定时任务。' });
})();
