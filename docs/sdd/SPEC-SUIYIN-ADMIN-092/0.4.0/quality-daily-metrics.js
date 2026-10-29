/* Prototype-only calculations over supplied facts. No DOM, network or persistence. */
(function (root) {
  'use strict';
  const aliases = { timeout_rate: 'timeout_count', timeout_events: 'timeout_count', response_max: 'response_avg', complaint_rate: 'complaint_count' };
  const names = {
    conv_count: '质检会话', message_count: '当日消息', high_issue_count: '重大问题',
    timeout_count: '超时回复', response_avg: '有效回复时长', risk_count: '高风险会话',
    deep_count: '深聊会话', unresolved_count: '未解决诉求', complaint_count: '负面情绪会话',
    referral_count: '老带新触达', closing_count: '收尾问题', medium_risk: '中风险会话',
    interaction_insufficient: '互动不足', negligent_closing: '失职收尾',
    redline_confirmed: '红线认定', referral_unprepared: '未铺垫引导', new: '新增 AI 判定字段',
  };
  const unavailable = new Set(['interaction_insufficient', 'negligent_closing', 'referral_unprepared', 'new']);
  const dependencyMap = {
    timeout_count: ['response'], response_avg: ['response'], deep_count: ['depth'],
    unresolved_count: ['unresolved'], complaint_count: ['complaint'], referral_count: ['referral'],
    closing_count: ['closing'], interaction_insufficient: ['interaction'], negligent_closing: ['closing'],
    referral_unprepared: ['referral'],
  };
  function canonical(id) { return aliases[id] || id; }
  function sourceOf(metric) { return typeof metric === 'string' ? metric : metric?.sourceId || metric?.base || metric?.id || 'new'; }
  const dimensionPrefix = 'dimension:';
  const dimensionKinds = new Set(['judgement', 'number', 'enum']);
  function dimensionId(source) { return String(source).startsWith(dimensionPrefix) ? String(source).slice(dimensionPrefix.length) : ''; }
  function dimensionDefinition(source, dimensions = []) { return dimensions.find(d => d.id === dimensionId(source)); }
  function sources(dimensions = []) {
    return [
      ...Object.entries(names).filter(([id]) => !['new','interaction_insufficient'].includes(id)).map(([id, name]) => ({ id, name, kind: 'builtin' })),
      ...dimensions.filter(d => dimensionKinds.has(d.kind)).map(d => ({
        id: dimensionPrefix + d.id, dimensionId: d.id, name: d.name, kind: d.kind,
        unit: d.unit || '', enumOptions: (d.enumOptions || []).map(option => ({ ...option })),
        enabled: d.enabled !== false, newField: !!d.newField,
        definitionVersion: d.definitionVersion ?? d.semanticVersion ?? d.version ?? 1,
      })),
    ];
  }
  function descriptor(id, name, unit, formula, denominator = '无') { return { id, name, unit, formula, denominator }; }
  function methods(sourceId, dimensions = []) {
    const source = canonical(sourceId);
    const dimension = dimensionDefinition(source, dimensions);
    if (dimension?.kind === 'number') return [
      descriptor('count', '有效数值会话数', '个', '该维度已判定且有有效数值的去重会话数'),
      descriptor('sum', '数值合计', dimension.unit || '数值', '该维度已判定有效数值之和'),
      descriptor('avg', '数值平均', dimension.unit || '数值', '该维度已判定有效数值之和 ÷ 有效数值会话数', '该维度有有效数值的已判定会话'),
      descriptor('min', '最小数值', dimension.unit || '数值', '该维度已判定有效数值的最小值'),
      descriptor('max', '最大数值', dimension.unit || '数值', '该维度已判定有效数值的最大值'),
    ];
    if (dimension) {
      const condition = dimension.kind === 'enum' ? '该维度等于所选选项' : '该维度判定不符合';
      return [
        descriptor('conversation_count', '命中会话数', '个', condition + '的去重会话数'),
        descriptor('ratio', '命中会话占比', '%', condition + '的去重会话数 ÷ 所选分母 × 100%', '由分母口径确定'),
      ];
    }
    const label = names[source] || '满足判定的';
    if (source === 'conv_count') return [descriptor('count', '会话数', '个', '当前范围内去重的质检会话数')];
    if (source === 'message_count') return [descriptor('count', '消息条数', '条', '统计日内消息计数，跨日上下文不重复计入')];
    if (source === 'redline_confirmed') return [descriptor('event_count', '人工认定事件数', '条', '人工确认的红线事件去重计数，不以 AI 候选会话数代替')];
    if (source === 'response_avg') return [
      descriptor('average', '平均回复耗时', '分钟', '有效回复事件总耗时 ÷ 有效回复事件数', '有效回复事件数'),
      descriptor('maximum', '最长回复耗时', '分钟', '有效回复事件耗时的最大值'),
    ];
    if (source === 'high_issue_count') return [
      descriptor('event_count', '问题事件数', '条', '当前口径下重大问题事件去重计数'),
      descriptor('conversation_count', '问题会话数', '个', '至少含一条重大问题的会话去重计数'),
      descriptor('ratio', '问题会话占比', '%', '含重大问题的去重会话数 ÷ 全部质检会话数 × 100%', '当前范围全部质检会话'),
    ];
    if (source === 'timeout_count') return [
      descriptor('conversation_count', '超时会话数', '个', '至少一次有效回复超过当前阈值的会话去重计数'),
      descriptor('event_count', '超时事件数', '次', '耗时超过当前阈值的有效回复事件去重计数'),
      descriptor('response_ratio', '已回复会话超时率', '%', '有超时回复的会话数 ÷ 存在有效回复的会话数 × 100%', '存在有效回复事件的会话'),
      descriptor('ratio', '占全部质检会话比例', '%', '有超时回复的会话数 ÷ 全部质检会话数 × 100%', '当前范围全部质检会话'),
    ];
    return [
      descriptor('conversation_count', '满足条件的会话数', '个', `${label}涉及的会话去重计数`),
      descriptor('ratio', '占全部质检会话比例', '%', `${label}涉及的去重会话数 ÷ 全部质检会话数 × 100%`, '当前范围全部质检会话'),
    ];
  }
  function defaultMethod(sourceId, dimensions = []) {
    if (dimensionDefinition(sourceId, dimensions)?.kind === 'number') return 'count';
    if (sourceId === 'timeout_rate') return 'response_ratio';
    if (sourceId === 'timeout_events') return 'event_count';
    if (sourceId === 'response_max') return 'maximum';
    if (sourceId === 'complaint_rate') return 'ratio';
    if (sourceId === 'redline_confirmed') return 'event_count';
    return { conv_count: 'count', message_count: 'count', high_issue_count: 'event_count', timeout_count: 'conversation_count', response_avg: 'average' }[canonical(sourceId)] || 'conversation_count';
  }
  function supportedMethod(sourceId, method, dimensions = []) {
    const dimension = dimensionDefinition(sourceId, dimensions);
    const compatible = dimension?.kind === 'number' ? { average: 'avg', minimum: 'min', maximum: 'max' } : dimension ? { count: 'conversation_count' } : {};
    const requested = !method || method === 'native' ? defaultMethod(sourceId, dimensions) : compatible[method] || method;
    const available = methods(sourceId, dimensions);
    return available.find(item => item.id === requested) || available.find(item => item.id === defaultMethod(sourceId, dimensions)) || available[0];
  }
  function suggestName(sourceId, method, dimensions = [], optionId = '') {
    const source = canonical(sourceId);
    const actual = supportedMethod(sourceId, method, dimensions).id;
    const dimension = dimensionDefinition(sourceId, dimensions);
    if (dimension) {
      if (dimension.kind === 'number') return dimension.name + ({ count: '有效数值会话数', sum: '合计', avg: '平均值', min: '最小值', max: '最大值' }[actual] || '会话数');
      const option = (dimension.enumOptions || []).find(o => o.id === optionId);
      return dimension.name + (dimension.kind === 'enum' ? (option ? ' · ' + option.name : ' · 所选选项') : '不符合') + (actual === 'ratio' ? '占比' : '会话数');
    }
    const label = names[source] || '判定';
    if (source === 'conv_count') return '质检会话数';
    if (source === 'message_count') return '当日消息数';
    if (source === 'response_avg') return actual === 'maximum' ? '最长回复耗时' : '平均回复耗时';
    if (source === 'high_issue_count') return { event_count: '重大问题条数', conversation_count: '重大问题会话数', ratio: '重大问题会话占比' }[actual];
    if (source === 'timeout_count') return { event_count: '回复超时次数', conversation_count: '回复超时会话数', response_ratio: '已回复会话超时率', ratio: '超时会话占全部会话比例' }[actual];
    const prefix = source === 'new' ? '新判定' : label.endsWith('会话') ? label.slice(0, -2) : label;
    return `${prefix}会话${actual === 'ratio' ? '占比' : '数'}`;
  }
  function normalize(metric, dimensions = []) {
    const input = typeof metric === 'string' ? { base: metric } : { ...(metric || {}) };
    const source = sourceOf(input);
    const method = supportedMethod(source, input.method, dimensions);
    const dimension = dimensionDefinition(source, dimensions);
    const denominatorMode = input.denominatorMode === 'assessed' ? 'assessed' : 'all';
    const denominator = dimension && method.id === 'ratio'
      ? denominatorMode === 'assessed' ? '该维度适用且已判定的会话' : '当前范围全部质检会话'
      : method.denominator;
    const out = { ...input, base: canonical(source), method: method.id, unit: method.unit, aggregation: method.name,
      denominatorMode, denominator, formula: method.formula.replace('所选分母', denominator),
      name: typeof input.name === 'string' && input.name.trim() ? input.name : suggestName(source, method.id, dimensions, input.optionId) };
    if (dimensionId(source)) {
      out.dimensionId = dimensionId(source);
      out.definitionVersion = input.definitionVersion ?? dimension?.definitionVersion ?? dimension?.semanticVersion ?? dimension?.version ?? 1;
      out.optionId = input.optionId || '';
      delete out.rule; // The definition owns its rule; a metric only references its stable ID/version.
      delete out.noFacts;
    }
    if (source === 'redline_confirmed') delete out.noFacts;
    return out;
  }
  function sourceIds(Q, dimensions = Q?.dimensions || []) {
    const result = [];
    const seen = new Set();
    for (const metric of Q?.metricLibrary || []) {
      const id = canonical(metric.id);
      if (seen.has(id) || id === 'new') continue;
      seen.add(id);
      result.push({ id, name: names[id] || metric.name || id });
    }
    for (const source of sources(dimensions)) {
      if (seen.has(source.id)) continue;
      seen.add(source.id); result.push(source);
    }
    return result;
  }
  function dependencies(sourceId) { return dimensionId(sourceId) ? [dimensionId(sourceId)] : (dependencyMap[canonical(sourceId)] || []).slice(); }
  function uniqueList(list) {
    const seen = new Set();
    return (list || []).filter(c => {
      const key = c.id || c;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  function reportDay(c, message) {
    return message.inReportDay !== false && (!c.date || !message.time || message.time.slice(0, 10) === c.date);
  }
  function replies(c) {
    const messages = new Map((c.messages || []).map(message => [message.id, message]));
    const seen = new Set();
    return (c.responseEvents || []).filter(event => {
      if (!Number.isFinite(event.durationMinutes) || event.durationMinutes < 0 || !event.customerMessageId || !event.replyMessageId) return false;
      const customer = messages.get(event.customerMessageId), reply = messages.get(event.replyMessageId);
      if (messages.size && (!customer || !reply || customer.sender !== 'customer' || reply.sender !== 'staff' || !reportDay(c, customer))) return false;
      if ([customer, reply].some(m => m && ['failed', 'recalled', 'withdrawn'].includes(m.status))) return false;
      const key = event.id || `${event.customerMessageId}|${event.replyMessageId}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  function activeIssues(Q, c, reviews, mode) {
    const rows = typeof Q?.activeIssues === 'function' ? Q.activeIssues(c, reviews, mode) : (c.issues || []).filter(issue => mode !== 'effective' || (reviews?.[issue.id]?.status || issue.review) !== 'dismissed');
    const seen = new Set();
    return rows.filter(issue => {
      const key = issue.id || issue;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  function limit(options) { return Number.isFinite(Number(options?.timeoutMinutes)) && Number(options.timeoutMinutes) >= 0 ? Number(options.timeoutMinutes) : 20; }
  function isUnavailable(Q, metric, dimensions = []) {
    const source = sourceOf(metric), canonicalSource = canonical(source);
    if (dimensionId(source)) {
      const d = dimensionDefinition(source, dimensions);
      return !d || !dimensionKinds.has(d.kind) || d.enabled === false || !!d.newField || !!metric.newField;
    }
    if (canonicalSource === 'redline_confirmed') return false;
    return !!metric.newField || !!metric.noFacts || unavailable.has(canonicalSource) || !!Q?.metricLibrary?.find(item => item.id === source || item.id === canonicalSource)?.noFacts || !Object.hasOwn(names, canonicalSource);
  }
  function dimensionResult(c, definition) {
    const rows = (c.dimensionResults || []).filter(row => row.dimensionId === definition.id);
    return rows.length === 1 ? rows[0] : null;
  }
  function assessedResult(result, definition) {
    if (!result || !['conform', 'nonconform'].includes(result.status)) return false;
    if (definition.kind === 'number') return typeof result.value === 'number' && Number.isFinite(result.value);
    if (definition.kind === 'enum') return (definition.enumOptions || []).some(option => option.id === result.value);
    return true;
  }
  function dimensionMatches(result, definition, metric) {
    if (!assessedResult(result, definition)) return false;
    if (definition.kind === 'judgement') return result.status === 'nonconform';
    if (definition.kind === 'enum') return !!metric.optionId && result.value === metric.optionId;
    return true;
  }
  function dimensionSample(Q, metric, list, options) {
    const dimensions = options.dimensions || Q?.dimensions || [];
    const normalized = normalize(metric, dimensions);
    const definition = dimensionDefinition(sourceOf(normalized), dimensions);
    if (isUnavailable(Q, normalized, dimensions)) return null;
    if (definition.kind === 'enum' && !(definition.enumOptions || []).some(option => option.id === normalized.optionId)) return null;
    const scope = uniqueList(list);
    const rows = scope.map(conversation => ({ conversation, result: dimensionResult(conversation, definition) }));
    if (!rows.some(row => row.result)) return null;
    return { metric: normalized, definition, scope, rows };
  }
  function riskLevel(Q, c, reviews, mode) {
    if (typeof Q?.riskLevel === 'function') return Q.riskLevel(c, reviews, mode);
    const issues = activeIssues(Q, c, reviews, mode);
    if (issues.some(issue => issue.severity === 'high')) return 'high';
    if (issues.some(issue => issue.ruleId === 'unresolved') || issues.filter(issue => issue.severity === 'medium').length >= 2) return 'medium';
    if(c.analysisStatus==='limited'&&c.intent==='unknown')return 'unknown';
    return 'low';
  }
  function confirmedRedlines(Q, list, reviews) {
    if (typeof Q?.confirmedRedlineCount === 'function') return Q.confirmedRedlineCount(list, reviews);
    return uniqueList(list).reduce((count, c) => count + activeIssues(Q, c, reviews, 'effective').filter(issue => {
      const review = reviews?.[issue.id];
      return review?.status === 'confirmed' && review.redline === true;
    }).length, 0);
  }
  function matches(Q, source, c, reviews, mode, options) {
    const issues = activeIssues(Q, c, reviews, mode);
    switch (source) {
      case 'conv_count': return true;
      case 'message_count': return (c.messages || []).some(m => reportDay(c, m));
      case 'high_issue_count': return issues.some(issue => issue.severity === 'high');
      case 'risk_count': return riskLevel(Q, c, reviews, mode) === 'high';
      case 'redline_confirmed': return confirmedRedlines(Q, [c], reviews) > 0;
      case 'timeout_count': return replies(c).some(event => event.durationMinutes > limit(options));
      case 'response_avg': return replies(c).length > 0;
      case 'deep_count': {
        if (typeof Q?.isDeep === 'function') return Q.isDeep(c, options);
        const threshold = Number.isFinite(Number(options?.deepMinMessages)) && Number(options.deepMinMessages) > 0 ? Number(options.deepMinMessages) : 6;
        return (c.messages || []).filter(m => reportDay(c, m) && m.sender === 'customer' && m.valid !== false && ['text', 'voice'].includes(m.type) && !['failed', 'recalled', 'withdrawn', 'revoked', 'system'].includes(m.status)).length >= threshold;
      }
      case 'unresolved_count': return issues.some(issue => issue.ruleId === 'unresolved');
      case 'complaint_count': return issues.some(issue => issue.ruleId === 'complaint');
      case 'closing_count': return issues.some(issue => issue.ruleId === 'closing');
      case 'referral_count': return c.referral === true;
      case 'medium_risk': return riskLevel(Q, c, reviews, mode) === 'medium';
      default: return false;
    }
  }
  // Returns affected conversations, even when the selected value counts events/messages.
  function drilldown(Q, metric, list, reviews = {}, mode = 'ai', options = {}) {
    const m = normalize(metric, options.dimensions || Q?.dimensions || []);
    if (dimensionId(sourceOf(m))) {
      const sample = dimensionSample(Q, m, list, options);
      return sample ? sample.rows.filter(row => dimensionMatches(row.result, sample.definition, sample.metric)).map(row => row.conversation) : [];
    }
    if (isUnavailable(Q, m, options.dimensions)) return [];
    return uniqueList(list).filter(c => matches(Q, canonical(sourceOf(m)), c, reviews, mode, options));
  }
  function rounded(number) { return Math.round(number * 10) / 10; }
  function value(Q, metric, list, reviews = {}, mode = 'ai', options = {}) {
    const m = normalize(metric, options.dimensions || Q?.dimensions || []);
    if (dimensionId(sourceOf(m))) {
      const sample = dimensionSample(Q, m, list, options);
      if (!sample) return null;
      const assessed = sample.rows.filter(row => assessedResult(row.result, sample.definition));
      const matched = assessed.filter(row => dimensionMatches(row.result, sample.definition, sample.metric));
      if (m.method === 'ratio') {
        const denominator = m.denominatorMode === 'assessed' ? assessed.length : sample.scope.length;
        return denominator ? rounded(100 * matched.length / denominator) : null;
      }
      if (sample.definition.kind === 'number' && m.method !== 'count') {
        const values = assessed.map(row => row.result.value);
        if (!values.length) return null;
        const sum = values.reduce((total, number) => total + number, 0);
        if (m.method === 'sum') return sum;
        if (m.method === 'avg') return sum / values.length;
        if (m.method === 'min') return Math.min(...values);
        if (m.method === 'max') return Math.max(...values);
      }
      return matched.length;
    }
    if (isUnavailable(Q, m, options.dimensions)) return null;
    const source = canonical(sourceOf(m)), scope = uniqueList(list);
    const matched = drilldown(Q, m, scope, reviews, mode, options);
    if (m.method === 'ratio') return scope.length ? rounded(100 * matched.length / scope.length) : null;
    if (m.method === 'response_ratio') {
      const denominator = scope.filter(c => replies(c).length).length;
      return denominator ? rounded(100 * matched.length / denominator) : null;
    }
    if (source === 'message_count') {
      return scope.reduce((count, c) => count + new Set((c.messages || []).filter(message => reportDay(c, message)).map(message => message.id || message)).size, 0);
    }
    if (source === 'response_avg') {
      const durations = scope.flatMap(replies).map(event => event.durationMinutes);
      if (!durations.length) return null;
      return m.method === 'maximum' ? Math.max(...durations) : rounded(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
    }
    if (m.method === 'event_count') {
      if (source === 'timeout_count') return scope.reduce((count, c) => count + replies(c).filter(event => event.durationMinutes > limit(options)).length, 0);
      if (source === 'high_issue_count') return scope.reduce((count, c) => count + activeIssues(Q, c, reviews, mode).filter(issue => issue.severity === 'high').length, 0);
      if (source === 'redline_confirmed') return confirmedRedlines(Q, scope, reviews);
    }
    return matched.length;
  }
  root.QualityMetric = { sources, sourceIds, methods, defaultMethod, normalize, suggestName, value, drilldown, dependencies };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.QualityMetric;
}(typeof window !== 'undefined' ? window : globalThis));
