/* Captured Prompt template UI. Private snapshots load from an ignored local JSON.
 * Browser-local edits only; no product API, model invocation or real scheduling.
 */
'use strict';
(() => {
  const A = window.Admin, V = window.AdminViews;
  if (!A || !V || A.route !== 'promptTemplate') return;
  const tenant = A.tenant, node = A.node, extensions = new Map();
  const storageKey = (new URLSearchParams(location.search).get('qa') === '1' ? 'admin-qa-prompt-templates:v1:' : 'admin-prompt-templates:v1:') + tenant;
  let snapshots = null, loadError = '', loading = null, sceneFilter = '', page = 1, active = null, allowClose = false;
  const previousRender = V.render, previousEdit = V.edit;
  const clone = value => JSON.parse(JSON.stringify(value));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const button = (label, action, cls = '') => { const b = A.button(label, action, cls); b.type = 'button'; return b; };
  const labelOf = item => item?.label || item?.displayName || item?.modelName || item?.name || '';
  const scopeOf = scope => scope === 'platform' ? '平台' : scope === 'enterprise' ? '企业' : '';
  const emptyLocal = () => ({ version: 1, tenant, patches: {}, created: [], deleted: [] });
  function readLocal() {
    try {
      const raw = localStorage.getItem(storageKey); if (!raw) return emptyLocal();
      const value = JSON.parse(raw);
      if (value.version !== 1 || value.tenant !== tenant || !value.patches || !Array.isArray(value.created) || !Array.isArray(value.deleted)) throw Error('invalid');
      return value;
    } catch { return { error: '本地编辑记录读取失败，已保留原数据。请重试，或先备份浏览器记录。' }; }
  }
  function saveLocal(value) {
    try { localStorage.setItem(storageKey, JSON.stringify(value)); }
    catch { return false; }
    document.dispatchEvent(new CustomEvent('admin-prompt-templates-changed', { detail: { tenant } })); return true;
  }
  function tenantSnapshot() {
    const value = snapshots?.tenants?.[tenant];
    if (!value || value.tenant !== tenant) return null;
    if (value.sampleTenant && value.sampleTenant !== tenant) return null;
    return value;
  }
  function capture() {
    const value = tenantSnapshot();
    if (!value || value.status === 'not-captured' || !Array.isArray(value.rows)) return null;
    const ids = value.rows.map(row => row.id);
    if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) return null;
    return value;
  }
  function records() {
    const source = capture(), local = readLocal(); if (!source || local.error) return [];
    return source.rows.concat(local.created).filter(row => !local.deleted.includes(row.id)).map(row => ({ ...clone(row), ...clone(local.patches[row.id] || {}) }));
  }
  function sceneOptions(source = capture()) {
    const options = new Map((source?.scenes || []).map(scene => [scene.id, { ...scene }]));
    records().forEach(row => { if (row.sceneId && !options.has(row.sceneId)) options.set(row.sceneId, { id: row.sceneId, label: row.sceneLabel || '场景未采集', partial: true }); });
    return [...options.values()];
  }
  function extraRows() { return [...extensions.values()].flatMap(extension => extension.rows?.() || []); }
  async function load() {
    if (loading) return loading;
    loading = (async () => {
      try {
        const supplied = window.AdminPromptSnapshots;
        const response = supplied ? null : await fetch('data/private/prompt-templates.json', { cache: 'no-store' });
        if (response && !response.ok) throw Error('local snapshot unavailable');
        const value = supplied || await response.json();
        if (value.schemaVersion !== 1 || !value.tenants || typeof value.tenants !== 'object') throw Error('invalid snapshot');
        snapshots = value; loadError = '';
      } catch { loadError = '本机提示词采样文件尚未就绪。未读取其他租户或参考模板。'; snapshots = { schemaVersion: 1, tenants: {} }; }
      render();
    })();
    return loading;
  }
  function status(text, good = false) { return node('span', 'apt-status' + (good ? ' good' : ''), text); }
  function renderRow(row) {
    const tr = node('tr'); tr.dataset.promptId = row.id;
    const name = node('td'); name.append(node('span', '', row.name || '未命名'));
    if (row.groupPrompts?.length) name.append(node('small', 'apt-group-summary', '分组子提示词：' + row.groupPrompts.map(item => item.groupLabel || '未命名分组').join('、')));
    if (row.localCreated) name.append(node('small', 'apt-meta', '本地新增'));
    else if (row.contentStatus !== 'captured') name.append(node('small', 'apt-meta', '正文未采集'));
    const scene = node('td', '', row.sceneLabel || sceneOptions().find(item => item.id === row.sceneId)?.label || '场景未采集');
    const model = node('td'); model.append(node('span', '', row.modelLabel || (row.modelId === '' ? '使用默认模型' : '模型绑定未采集')));
    if (row.modelScope) model.append(status(scopeOf(row.modelScope)));
    const tags = node('td'); (row.autoTags || []).forEach(value => tags.append(status(typeof value === 'string' ? value : labelOf(value)))); if (!tags.children.length) tags.textContent = '—';
    const timing = node('td'); if (typeof row.cronEnabled === 'boolean') timing.append(status(row.cronEnabled ? '已开启' : '未开启', row.cronEnabled)); else timing.textContent = '—';
    const actions = node('td', 'apt-row-actions'); actions.append(button('编辑', () => openEditor(row), 'link'), button('删除', () => removeRow(row), 'link danger'));
    tr.append(name, scene, model, tags, timing, actions); return tr;
  }
  function render() {
    if (A.route !== 'promptTemplate') return previousRender?.() || false;
    const root = node('section', 'page apt-page'); A.$('app').replaceChildren(root);
    const header = node('header', 'apt-heading'), tools = node('div', 'apt-tools'); header.append(node('h2', '', 'Prompt模板管理'), tools); root.append(header);
    if (!snapshots) { root.append(node('p', 'apt-note', '正在读取本机提示词采样…')); load(); return true; }
    const source = capture(), local = readLocal(), capturedRows = records(), extra = extraRows();
    const options = new Map(sceneOptions().map(item => [item.id, item.label]));
    extra.forEach(item => options.set(item.sceneId, item.sceneLabel));
    if (sceneFilter && !options.has(sceneFilter)) sceneFilter = '';
    const select = node('select'); select.id = 'apt-scene-filter'; select.setAttribute('aria-label', '全部场景'); select.append(new Option('全部场景', ''));
    options.forEach((label, value) => select.append(new Option(label, value))); select.value = sceneFilter;
    select.onchange = () => { sceneFilter = select.value; page = 1; render(); }; tools.append(select);
    extensions.forEach(extension => (extension.toolbar?.() || []).forEach(control => tools.append(control)));
    const create = button('创建', () => openEditor(), 'apt-create'); create.disabled = !source || !!local.error; tools.append(create);
    if (loadError || !source) root.append(node('p', 'apt-note warn', loadError || tenantSnapshot()?.note || '本租户提示词尚未采集。未借用其他租户模板。'));
    if (local.error) root.append(node('p', 'apt-note error', local.error), button('重新读取', render));
    if (source) {
      const original = source.rows.length, total = source.totalRows;
      const complete = source.listComplete === true && original === total;
      root.append(node('p', 'apt-note', (complete ? '本租户已采列表 ' + original + ' 条' : '本租户已采 ' + original + ' 条' + (Number.isInteger(total) ? '／采样时共 ' + total + ' 条' : '，总数未确认')) + '；采样时间 ' + (source.capturedAt || '未记录') + '。正文与本地编辑仅保存在此电脑，不代表线上当前值。'));
      const missing = Object.keys(local.patches || {}).filter(id => !source.rows.concat(local.created).some(row => row.id === id));
      if (missing.length) root.append(node('p', 'apt-note warn', '另有 ' + missing.length + ' 条旧采样的本地修改已保留，需核对记录身份后关联。'));
    }
    const all = capturedRows.map(row => ({ id: row.id, sceneId: row.sceneId, row })).concat(extra);
    const filtered = all.filter(item => !sceneFilter || item.sceneId === sceneFilter);
    const pages = Math.max(1, Math.ceil(filtered.length / 20)); page = Math.min(page, pages);
    const wrap = node('div', 'apt-table-wrap'), table = node('table', 'apt-table'), head = node('thead'), headerRow = node('tr'), body = node('tbody');
    ['模版名称', '场景', '绑定模型', '自动填写的标签', '定时', '操作'].forEach(label => headerRow.append(node('th', '', label))); head.append(headerRow); table.append(head, body);
    filtered.slice((page - 1) * 20, page * 20).forEach(item => body.append(item.row ? renderRow(item.row) : item.element));
    if (!filtered.length) { const tr = node('tr'), td = node('td', 'apt-empty', local.error ? '本地记录暂不可读' : !source ? '本租户未采集' : source.listComplete && source.totalRows === 0 ? '本次采样确认暂无模板' : sceneFilter ? '当前场景没有已采模板' : '尚无可展示的采样记录'); td.colSpan = 6; tr.append(td); body.append(tr); }
    wrap.append(table); root.append(wrap);
    const pager = node('footer', 'apt-pagination'), pageSize = node('select'); pageSize.setAttribute('aria-label', '每页条数'); pageSize.append(new Option('20条/页', '20'));
    const previous = button('‹', () => { page--; render(); }, 'apt-page-arrow'), next = button('›', () => { page++; render(); }, 'apt-page-arrow');
    previous.setAttribute('aria-label', '上一页'); next.setAttribute('aria-label', '下一页'); previous.disabled = page === 1; next.disabled = page === pages;
    pager.append(pageSize, previous);
    for (let number = 1; number <= pages; number++) { const target = number, control = button(String(number), () => { page = target; render(); }, 'apt-page-number' + (number === page ? ' current' : '')); if (number === page) control.setAttribute('aria-current', 'page'); pager.append(control); }
    const totalPending = source?.status !== 'captured' && source?.listComplete !== true && !source?.rows?.length;
    pager.append(next, node('span', '', totalPending ? '总条数待采集' : '共 ' + filtered.length + ' 条')); root.append(pager);
    extensions.forEach(extension => { if (extension.note) root.append(node('p', 'apt-note', extension.note)); });
    return true;
  }
  function field(label, control, hint = '') {
    const wrap = node('div', 'apt-field'); wrap.append(node('label', '', label), control); if (hint) wrap.append(node('small', '', hint)); return wrap;
  }
  function dirty() { return !!active && !same(active.values(), active.initial); }
  function notice(message, error = false) { if (active) { active.notice.textContent = message; active.notice.className = 'apt-note' + (error ? ' error' : ''); active.notice.hidden = !message; } }
  function refreshActions() { if (active) active.save.disabled = active.busy || !dirty(); }
  function modelCandidates(source, sceneId) { return (source.models || []).filter(model => model.enabled === true && Array.isArray(model.scenes) && model.scenes.includes(sceneId)); }
  async function openEditor(row) {
    if (!(await requestLeave())) return;
    for (const extension of extensions.values()) if (extension.requestLeave && !(await extension.requestLeave())) return;
    const source = capture(); if (!source || readLocal().error) return;
    const schema = source.formSchema || {}, original = row ? clone(row) : { id: 'local-' + crypto.randomUUID(), name: '', sceneId: '', sceneLabel: '', modelId: '', modelLabel: '', modelScope: '', cronEnabled: false, tagIds: [], autoTags: [], content: '', contentStatus: 'captured', groupPrompts: [], localCreated: true };
    const form = node('form', 'apt-editor'); form.id = 'apt-edit-form';
    const alert = node('p', 'apt-note'); alert.hidden = true; alert.setAttribute('role', 'status'); form.append(alert);
    const scene = node('select'); scene.id = 'apt-scene'; scene.required = true; scene.append(new Option('请选择场景', ''));
    sceneOptions(source).forEach(option => scene.append(new Option(option.label, option.id))); scene.value = original.sceneId || '';
    const model = node('select'); model.id = 'apt-model'; const modelHint = node('small');
    const cron = node('input'); cron.type = 'checkbox'; cron.id = 'apt-cron'; cron.setAttribute('role', 'switch'); cron.checked = original.cronEnabled === true;
    const cronBox = node('div', 'apt-cron'), cronText = node('span', '', cron.checked ? '已开启' : '未开启'); cronBox.append(cron, cronText); const cronHelp = node('small');
    const name = node('input'); name.id = 'apt-name'; name.value = original.name || ''; name.required = true;
    const content = node('textarea'); content.id = 'apt-content'; content.rows = 20; content.value = original.contentStatus === 'captured' ? original.content || '' : '';
    content.disabled = original.contentStatus !== 'captured'; content.required = !content.disabled; if (content.disabled) content.placeholder = '此模板正文尚未采集，未用其他模板内容补齐。';
    const tags = node('div', 'apt-tags'), tagHint = node('small'); const selectedTags = new Set(original.tagIds || []);
    const fields = { scene: field('场景', scene), tags: field('填写标签', tags), cron: field('定时启动', cronBox), model: field('绑定模型', model), name: field('模板名称', name), content: field(original.contentLabel || schema.contentLabel || '模板内容', content) };
    fields.tags.append(tagHint); fields.cron.append(cronHelp); fields.model.append(modelHint);
    const order = schema.fieldOrder || ['scene', 'tags', 'cron', 'model', 'name', 'content'];
    [...new Set(order)].forEach(key => { if (fields[key]) form.append(fields[key]); });
    const groupSchema = schema.groupPrompts || {}, groupPrompts = clone(original.groupPrompts || []), expandedGroups = new Set();
    const groupOptions = original.groupOptions || source.groupOptions || [];
    const groupSection = node('section', 'apt-group-prompts'), groupHeading = node('div', 'apt-group-heading'), groupList = node('div', 'apt-group-list');
    groupHeading.append(node('h3', '', groupSchema.label || '分组子提示词'));
    const addGroup = button(groupSchema.addLabel || '添加分组', () => {
      const id = 'local-group-' + crypto.randomUUID(); expandedGroups.add(id); groupPrompts.push({ id, groupId: '', groupLabel: '', content: '', contentStatus: 'captured' }); renderGroups(); refreshActions();
    });
    addGroup.disabled = groupSchema.optionsStatus !== 'captured'; groupHeading.append(addGroup);
    groupSection.append(groupHeading, node('p', 'apt-note', groupSchema.help || '客户所有正常好友人设均属于同一已配置分组时使用对应子提示词；跨组、未配置或子提示词留空时使用主要提示词。保存不会自动重跑客户。'), groupList);
    if (groupSchema.optionsStatus !== 'captured') groupSection.append(node('p', 'apt-note warn', '权限分组选项尚未采集，保留原分组绑定；已采子提示词正文仍可编辑。'));
    function renderGroups() {
      groupList.replaceChildren();
      groupPrompts.forEach((item, index) => {
        const card = node('details', 'apt-group-card'); card.dataset.groupPromptId = item.id || 'captured-group-' + index; card.open = expandedGroups.has(card.dataset.groupPromptId);
        const heading = node('summary', 'apt-group-toggle'), title = node('span', '', item.groupLabel || '请选择权限分组'), contentBox = node('div', 'apt-group-body'); heading.append(title); card.append(heading, contentBox);
        card.ontoggle = () => { card.open ? expandedGroups.add(card.dataset.groupPromptId) : expandedGroups.delete(card.dataset.groupPromptId); };
        const select = node('select'); select.setAttribute('aria-label', groupSchema.groupLabel || '权限分组'); select.append(new Option('请选择权限分组', ''));
        groupOptions.forEach(option => { const entry = new Option(labelOf(option), option.id); entry.disabled = !!option.disabled; select.append(entry); });
        if (item.groupId && !groupOptions.some(option => option.id === item.groupId)) select.append(new Option(item.groupLabel || '已配置分组（选项未采集）', item.groupId));
        select.value = item.groupId || ''; select.disabled = groupSchema.optionsStatus !== 'captured'; select.required = !select.disabled;
        const body = node('textarea'); body.rows = 12; body.className = 'apt-sub-prompt'; body.setAttribute('aria-label', groupSchema.contentLabel || '子提示词');
        const hasBody = item.contentStatus === 'captured' || (item.contentStatus !== 'not-captured' && typeof item.content === 'string'); body.value = hasBody ? item.content || '' : ''; body.disabled = !hasBody;
        if (!hasBody) body.placeholder = '此分组子提示词尚未采集，原内容保持。';
        select.onchange = () => { item.groupId = select.value; item.groupLabel = labelOf(groupOptions.find(option => option.id === select.value)) || ''; title.textContent = item.groupLabel || '请选择权限分组'; validateGroups(); refreshActions(); };
        body.oninput = () => { item.content = body.value; item.contentStatus = 'captured'; refreshActions(); };
        contentBox.append(field(groupSchema.groupLabel || '权限分组', select), field(groupSchema.contentLabel || '子提示词', body));
        if (groupSchema.removeLabel) { const remove = button(groupSchema.removeLabel, () => { groupPrompts.splice(index, 1); renderGroups(); refreshActions(); }, 'link danger'); remove.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); }); heading.append(remove); }
        groupList.append(card);
      });
      validateGroups();
    }
    function validateGroups() {
      const chosen = groupPrompts.map(item => item.groupId).filter(Boolean);
      groupList.querySelectorAll('select').forEach(select => { select.required = !groupSection.hidden && !select.disabled; select.setCustomValidity(!groupSection.hidden && select.value && chosen.filter(value => value === select.value).length > 1 ? '同一权限分组只能配置一份子提示词' : ''); });
    }
    renderGroups(); form.append(groupSection);
    if (row && original.contentStatus !== 'captured') form.append(node('p', 'apt-note warn', '正文未采集，只可保留或修改已采字段。不会把空白正文作为线上原文。'));
    form.append(node('p', 'apt-note', '所有修改仅保存到本浏览器，不写入真实后台，不触发定时或模型调用。'));
    function currentScene() { return sceneOptions(source).find(option => option.id === scene.value); }
    function refreshDependent(changedScene = false) {
      const option = currentScene(), candidates = modelCandidates(source, scene.value), chosen = changedScene ? model.value : original.modelId;
      fields.cron.hidden = option?.cronSupported !== true; cronHelp.textContent = option?.cronHelp || '';
      fields.tags.hidden = option?.tagSupported !== true;
      fields.content.firstElementChild.textContent = option?.contentLabel || (option?.tagSupported === true ? '主要提示词' : '模板内容');
      const groupSupported = option?.groupPromptsSupported === true || (option?.groupPromptsSupported === undefined && scene.value === original.sceneId && (original.groupPrompts || []).length > 0);
      groupSection.hidden = !groupSupported; validateGroups();
      if (changedScene && !option?.cronSupported) cron.checked = false;
      if (changedScene && !option?.tagSupported) selectedTags.clear();
      cronText.textContent = cron.checked ? '已开启' : '未开启';
      const known = schema.modelOptionsStatus === 'captured' || source.modelOptionsStatus === 'captured';
      model.replaceChildren(new Option('不选则使用默认模型', ''));
      candidates.forEach(item => model.append(new Option(labelOf(item) + (scopeOf(item.scope) ? '（' + scopeOf(item.scope) + '）' : ''), item.id)));
      if (chosen && !candidates.some(item => item.id === chosen) && !changedScene) { const unavailable = new Option(original.modelLabel || '已绑定模型（候选未采集）', chosen); unavailable.disabled = true; model.append(unavailable); }
      model.value = chosen && [...model.options].some(item => item.value === chosen) ? chosen : '';
      model.disabled = !scene.value || !known;
      modelHint.textContent = !scene.value ? '请先选择场景' : !known ? '此场景模型候选尚未采集，保留当前绑定。' : !candidates.length ? '当前场景暂无已采可用模型；调用配置由平台维护。' : '不选则使用该场景默认配置。';
      tags.replaceChildren(); const options = original.tagOptions || source.tagOptions || [], tagsCaptured = (original.tagOptionsStatus || source.tagOptionsStatus || schema.tagOptionsStatus) === 'captured';
      const trigger = button('', () => { menu.hidden = !menu.hidden; trigger.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden) search.focus(); }, 'apt-tag-trigger');
      trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-label', '选择填写标签');
      const menu = node('div', 'apt-tag-menu'); menu.hidden = true;
      const search = node('input'); search.type = 'search'; search.className = 'apt-tag-search'; search.placeholder = '搜索标签'; search.setAttribute('aria-label', '搜索标签');
      const choices = node('div', 'apt-tag-options'); choices.setAttribute('role', 'listbox'); choices.setAttribute('aria-multiselectable', 'true');
      function renderSelected() {
        trigger.replaceChildren(); const known = new Map(options.map(item => [item.id, labelOf(item)]));
        if (!selectedTags.size) trigger.append(node('span', 'apt-tag-placeholder', '请选择标签'));
        else [...selectedTags].forEach(id => trigger.append(node('span', 'apt-selected-tag', known.get(id) || (original.autoTags || [])[Math.max(0, (original.tagIds || []).indexOf(id))] || '已选标签')));
        trigger.append(node('span', 'apt-tag-chevron', '⌄'));
      }
      function renderChoices() {
        choices.replaceChildren(); const filtered = options.filter(item => labelOf(item).toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));
        filtered.forEach(item => { const label = node('label', 'apt-tag-option'), control = node('input'); control.type = 'checkbox'; control.value = item.id || ''; control.checked = selectedTags.has(item.id); control.disabled = item.disabled === true || !item.id; label.setAttribute('role', 'option'); label.setAttribute('aria-selected', String(control.checked)); label.classList.toggle('disabled', control.disabled); label.append(control, document.createTextNode(labelOf(item) + (control.disabled ? '（' + (item.disabledReason || '缺少唯一标识') + '）' : ''))); control.onchange = () => { control.checked ? selectedTags.add(item.id) : selectedTags.delete(item.id); label.setAttribute('aria-selected', String(control.checked)); renderSelected(); refreshActions(); }; choices.append(label); });
        if (!filtered.length) choices.append(node('p', 'apt-tag-empty', options.length ? '无匹配标签' : tagsCaptured ? '当前没有可选标签' : '标签选项尚未采集'));
      }
      search.oninput = renderChoices;
      menu.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); } });
      menu.addEventListener('focusout', event => { if (event.relatedTarget && !tags.contains(event.relatedTarget)) { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); } });
      menu.append(search, choices); tags.append(trigger, menu); renderSelected(); renderChoices();
      tagHint.textContent = options.length ? (options.some(item => item.disabled || !item.id) ? '置灰标签不可选；原有选择会保留。' : '') : tagsCaptured ? '当前没有可选标签' : '标签选项尚未采集，保留已采标签。';
    }
    refreshDependent();
    const editor = { form, notice: alert, busy: false, original, leavePromise: null, leaveResolve: null, values: () => {
      const option = currentScene(), modelChanged = !model.disabled && model.value !== (original.modelId || ''), matchedModel = (source.models || []).find(item => item.id === model.value);
      const tagOptions = original.tagOptions || source.tagOptions || [], tagMap = new Map(tagOptions.map(item => [item.id, labelOf(item)]));
      return { name: name.value, sceneId: scene.value, sceneLabel: option?.label || original.sceneLabel, modelId: model.disabled ? original.modelId : model.value, modelLabel: modelChanged ? matchedModel ? labelOf(matchedModel) : '使用默认模型' : original.modelLabel, modelScope: modelChanged ? matchedModel?.scope || '' : original.modelScope, cronEnabled: option?.cronSupported === true ? cron.checked : original.sceneId === scene.value ? original.cronEnabled : false, tagIds: [...selectedTags], autoTags: tagOptions.length || original.sceneId !== scene.value ? [...selectedTags].map(id => tagMap.get(id) || (original.autoTags || [])[Math.max(0, (original.tagIds || []).indexOf(id))] || '已选标签') : original.autoTags || [], content: content.disabled ? original.content : content.value, contentStatus: original.contentStatus, groupPrompts: clone(groupPrompts) };
    } };
    active = editor; editor.initial = clone(editor.values());
    const save = button('确定', saveEditor, 'primary'); editor.save = save; form.oninput = refreshActions; form.onchange = refreshActions;
    scene.onchange = () => { refreshDependent(true); refreshActions(); };
    cron.onchange = () => { cronText.textContent = cron.checked ? '已开启' : '未开启'; refreshActions(); };
    form.onsubmit = event => { event.preventDefault(); saveEditor(); };
    A.showDialog(row ? '修改模板' : '新增模板', form, []); A.$('dialog').classList.add('apt-dialog'); A.$('dialog').style.setProperty('--dialog-width', '920px');
    A.$('dialogFooter').append(save, button('取消', requestLeave)); refreshActions();
  }
  async function saveEditor() {
    if (!active || active.busy || !active.form.reportValidity()) return false;
    const editor = active, local = readLocal(); if (local.error) { notice(local.error, true); return false; }
    editor.busy = true; refreshActions(); const value = editor.values();
    if (editor.original.localCreated && !local.created.some(row => row.id === editor.original.id)) local.created.push({ ...editor.original, ...value });
    else {
      const base = capture()?.rows.concat(local.created).find(row => row.id === editor.original.id);
      if (!base) { editor.busy = false; notice('本地记录身份已变化，请保留修改并重新核对。', true); refreshActions(); return false; }
      const patch = { ...(local.patches[editor.original.id] || {}) }; Object.keys(value).forEach(key => { if (!same(value[key], editor.initial[key])) patch[key] = value[key]; }); local.patches[editor.original.id] = patch;
    }
    local.captureRevision = snapshots.captureRevision || capture()?.captureRevision || '';
    if (!saveLocal(local)) { editor.busy = false; notice('本地保存失败，修改仍保留在编辑器内，请重试。', true); refreshActions(); return false; }
    editor.initial = clone(value); closeEditor(); A.toast('已保存到本浏览器，未写入真实后台'); return true;
  }
  async function removeRow(row) {
    if (!(await requestLeave())) return;
    for (const extension of extensions.values()) if (extension.requestLeave && !(await extension.requestLeave())) return;
    const box = node('div'); box.append(node('p', '', '将从本地原型删除“' + (row.name || '未命名') + '”，真实后台保持原值。'));
    A.showDialog('删除模板', box, [{ label: '取消', run: A.closeDialog }, { label: '确认删除', cls: 'danger', run: () => {
      const local = readLocal(); if (local.error) { A.toast(local.error); return; }
      if (!local.deleted.includes(row.id)) local.deleted.push(row.id);
      if (!saveLocal(local)) { A.toast('本地保存失败，记录保留'); return; } A.closeDialog(); render();
    } }]);
  }
  function closeEditor() {
    const resolve = active?.leaveResolve; active = null; allowClose = true; A.$('dialog').classList.remove('apt-dialog'); A.closeDialog(); allowClose = false; resolve?.(true); render();
  }
  function requestLeave() {
    if (!active) return Promise.resolve(true);
    if (active.busy) return Promise.resolve(false);
    if (!dirty()) { closeEditor(); return Promise.resolve(true); }
    if (active.leavePromise) return active.leavePromise;
    const editor = active, box = node('section', 'apt-leave'); box.setAttribute('role', 'alert'); box.append(node('strong', '', '还有未保存修改'), node('p', '', '保存到本浏览器后离开，或放弃本次未保存修改。'));
    const choices = node('div', 'apt-leave-actions'); choices.append(button('保存并离开', saveEditor, 'primary'), button('放弃修改', closeEditor, 'danger'), button('继续编辑', () => { const resolve = editor.leaveResolve; editor.leavePromise = null; editor.leaveResolve = null; box.remove(); resolve?.(false); })); box.append(choices); editor.form.append(box); box.scrollIntoView({ block: 'nearest' });
    editor.leavePromise = new Promise(resolve => { editor.leaveResolve = resolve; }); return editor.leavePromise;
  }
  const dialog = A.$('dialog'), nativeClose = dialog.close;
  dialog.close = function (...args) { if (active && !allowClose) { requestLeave(); return; } return nativeClose.apply(this, args); };
  dialog.addEventListener('cancel', event => { if (active) { event.preventDefault(); event.stopImmediatePropagation(); requestLeave(); } }, true);
  dialog.addEventListener('close', event => { if (dialog.open) { event.stopImmediatePropagation(); return; } if (active) { const resolve = active.leaveResolve; active = null; resolve?.(true); } dialog.classList.remove('apt-dialog'); }, true);
  document.addEventListener('click', event => { if (active && event.target?.closest?.('#closeDialog')) { event.preventDefault(); event.stopImmediatePropagation(); requestLeave(); } }, true);
  window.addEventListener('message', event => { if (active && event.origin === location.origin && event.source === parent && event.data?.type === 'admin-dialog-close') { event.stopImmediatePropagation(); requestLeave(); } }, true);
  window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('storage', event => { if (event.key === storageKey) { if (active) notice('另一页已更新本地记录，当前未保存内容仍保留。'); else render(); } });
  V.render = render;
  V.edit = row => { if (A.route !== 'promptTemplate') return previousEdit?.(row) || false; const found = row && records().find(item => item.id === row.id); if (row && !found) A.toast('这条参考记录未纳入本租户真实采样，未打开其他租户内容'); else openEditor(found); return true; };
  window.AdminPromptTemplates = { render, openEditor, hasDirty: dirty, requestLeave, load, getRecords: records, registerExtension(extension) { extensions.set(extension.id, extension); if (snapshots) render(); } };
})();
