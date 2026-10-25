/* SPEC-SUIYIN-ADMIN-092@0.3.0: tenant-isolated read-only enterprise model directory.
 * Real captures use the same ignored local JSON as Prompt templates. Quality
 * fixtures remain explicitly synthetic. No endpoint is called or key is stored.
 */
'use strict';
(() => {
  const A = window.Admin, M = window.AdminQualityModel, V = window.AdminViews;
  if (!A || !V || A.route !== 'aiEntModelConfig') return;
  const previousRender = V.render;
  let snapshots = window.AdminPromptSnapshots || null, pending = null, loadError = '';
  const supportsDaily = () => M?.isEnabledTenant(A.tenant) === true;
  function capturedTenant() { const value = snapshots?.tenants?.[A.tenant]; return value?.tenant === A.tenant && (!value.sampleTenant || value.sampleTenant === A.tenant) ? value : null; }
  async function load() {
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await fetch('data/private/prompt-templates.json', { cache: 'no-store' });
        if (!response.ok) throw Error('local snapshot unavailable');
        const value = await response.json(); if (value.schemaVersion !== 1 || !value.tenants) throw Error('invalid snapshot');
        snapshots = value;
      } catch { snapshots = { schemaVersion: 1, tenants: {} }; loadError = '本机模型采样文件尚未就绪，未读取其他租户目录。'; }
      render();
    })(); return pending;
  }
  const sceneNames = {
    wecom_quality_daily: '企微会话质检日报',
    wechat_quality_daily: '个微会话质检日报',
    customer_chat: '客户聊天（对照场景）'
  };
  const el = A.node;
  const value = input => input === null || input === undefined || input === '' ? '—' : String(input);
  function button(text, action, cls = '') {
    const node = A.button(text, action, cls); node.type = 'button'; return node;
  }
  function render() {
    if (A.route !== 'aiEntModelConfig') return false;
    const source = capturedTenant(), modelCaptured = (source?.modelOptionsStatus || source?.formSchema?.modelOptionsStatus) === 'captured' && Array.isArray(source?.models);
    const page = el('div', 'page aqm-page'), head = el('header', 'page-head'), title = el('div');
    title.append(el('h1', '', 'AI-企业模型配置'), el('div', 'page-sub', A.tenantInfo?.name || A.tenant));
    // The legacy page head describes its old fixture, not this private catalog.
    const capturedDate = modelCaptured && source.capturedAt ? new Date(source.capturedAt) : null;
    const knownDate = capturedDate && !Number.isNaN(capturedDate.getTime());
    const dateText = knownDate ? capturedDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }) : '时间未知';
    const provenance = el('span', 'aqm-note aqm-provenance', !snapshots ? '正在读取本租户采样…' : modelCaptured ? '本租户采样 · ' + dateText : '本租户未采集 · 采样时间未知');
    if (knownDate) provenance.title = source.capturedAt;
    head.append(title, provenance);
    page.append(head);
    const intro = el('div', 'aqm-intro');
    intro.append(el('p', '', '模型调用配置由平台维护。企业可在提示词或场景绑定中选择业务模型。'));
    intro.append(el('p', 'aqm-note', '本页只读；显示本租户在此电脑保存的采样配置。' + (supportsDaily() ? '日报合成配置单独标明，新场景待平台增加支持，演示可选不代表线上已开通。' : '')));
    const toPrompts = button('查看提示词管理', () => parent.postMessage({ type: 'admin-quality-navigate', route: 'promptTemplate' }, location.origin), 'link');
    intro.append(toPrompts); page.append(intro);
    if (!snapshots) { page.append(el('p', 'aqm-note', '正在读取本租户模型采样…')); A.$('app').replaceChildren(page); load(); return true; }
    const captured = modelCaptured ? source.models : [], catalog = supportsDaily() ? M.getModelConfigs(A.tenant) : { models: [] };
    if (!modelCaptured) intro.append(el('p', 'aqm-pending', loadError || source?.note || '本租户模型目录尚未采集，不等同于没有配置。'));
    if (catalog.error) {
      const error = el('section', 'card aqm-error');
      error.append(el('p', '', catalog.message || '本地模型目录读取失败，未替换为成功或空数据。'), button('重新读取', render));
      page.append(error); A.$('app').replaceChildren(page); return true;
    }
    const card = el('section', 'card aqm-card'), wrap = el('div', 'aqm-table-wrap'), table = el('table', 'aqm-table');
    const thead = el('thead'), tr = el('tr');
    ['来源', '模型名称', '供应商', '接口地址', '场景', '是否启用'].forEach(text => tr.append(el('th', '', text)));
    thead.append(tr); table.append(thead);
    const tbody = el('tbody');
    const names = new Map((source?.scenes || []).map(scene => [scene.id, scene.label]));
    captured.forEach(model => {
      const row = el('tr'); row.dataset.modelOrigin = 'captured'; row.dataset.sourceRowId = model.id;
      const scope = model.scope === 'platform' ? '平台' : model.scope === 'enterprise' ? '企业' : '来源未采集';
      [scope, model.label || model.displayName || model.modelName, model.provider, model.endpointDisplay, (model.scenes || []).map(scene => names.get(scene) || '场景名称未采集').join('、'), model.enabled === true ? '启用' : model.enabled === false ? '停用' : '未采集'].forEach(cell => row.append(el('td', '', value(cell))));
      tbody.append(row);
    });
    catalog.models.forEach(model => {
      const row = el('tr', 'aqm-demo-row'); row.dataset.modelOrigin = 'synthetic'; row.dataset.modelConfigId = model.id;
      row.append(el('td', '', model.scope === 'platform' ? '平台（演示）' : '企业（演示对照）'));
      const name = el('td');
      name.append(el('span', '', model.displayName || model.modelName), el('small', 'aqm-row-note', '日报本地演示候选'));
      row.append(name, el('td', '', 'DeepSeek（合成）'), el('td', '', '未连接（不配置密钥）'));
      const scenes = el('td');
      scenes.append(el('span', '', model.scenes.map(scene => sceneNames[scene] || scene).join('、') || '未设置支持场景'));
      if (model.scenes.some(scene => /_quality_daily$/.test(scene))) scenes.append(el('small', 'aqm-row-note aqm-pending', '两个日报新场景待平台实际注册支持'));
      if (model.defaultScenes?.length) scenes.append(el('small', 'aqm-row-note', '演示默认：' + model.defaultScenes.map(scene => sceneNames[scene] || scene).join('、')));
      row.append(scenes, el('td', '', model.enabled ? '演示启用' : '演示停用'));
      tbody.append(row);
    });
    if (!captured.length && !catalog.models.length) { const row = el('tr'), cell = el('td', 'aqm-empty', modelCaptured ? '本次采样确认暂无模型配置' : '本租户模型目录未采集'); cell.colSpan = 6; row.append(cell); tbody.append(row); }
    table.append(tbody); wrap.append(table); card.append(wrap);
    card.append(el('p', 'aqm-footer', (modelCaptured ? '本租户采样 ' + captured.length + ' 条' : '本租户模型采样未完成') + (catalog.models.length ? ' · 合成演示 ' + catalog.models.length + ' 条' : '') + '。提示词候选来自同一目录，仅列出已启用且支持其场景的配置。此页不提供模型配置的创建或编辑。'));
    page.append(card); A.$('app').replaceChildren(page); return true;
  }
  V.render = function () {
    if (A.route === 'aiEntModelConfig') return render();
    return previousRender.apply(this, arguments);
  };
  document.addEventListener('admin-quality-changed', event => {
    if (event.detail?.tenant === A.tenant && event.detail?.channel === 'models' && A.$('app').querySelector('.aqm-page')) render();
  });
  window.AdminQualityModels = { render, load };
  if (document.body.dataset.contentReady === 'true') render();
})();
