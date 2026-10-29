/* All records in this prototype are synthetic. No API or production data is used. */
(function (root) {
  'use strict';
  const dates = ['2026-10-28', '2026-10-27', '2026-10-26'];
  const channels = [{ id: 'wecom', name: '企微' }, { id: 'wechat', name: '个微' }];
  const departments = [{ id: 'consulting', name: '咨询部' }, { id: 'service', name: '客户服务部' }];
  const accounts = channels.flatMap(channel => Array.from({ length: 4 }, (_, index) => ({
    id: `${channel.id}-${index + 1}`,
    channel: channel.id,
    name: `演示${channel.name} ${String(index + 1).padStart(2, '0')}`,
    departmentId: departments[index < 2 ? 0 : 1].id,
    departmentName: departments[index < 2 ? 0 : 1].name,
    shared: index === 3,
    attribution: index === 3 ? '多人共号，具体接待人待确认' : '按工作号统计',
  })));
  const products = [
    { id: 'light', name: '光子护理' },
    { id: 'hydration', name: '补水护理' },
    { id: 'consult', name: '抗衰咨询' },
    { id: 'followup', name: '术后随访' },
    { id: 'lifting', name: '紧致评估' },
  ];
  // Keep this configured zero-touch product outside the synthetic mention rotation.
  const touchedProducts = products.slice(0, 4);
  const ruleVersion = 'synthetic-quality-rules-v1';
  const judgementDimensionIds = ['safety', 'promise', 'unresolved', 'complaint', 'closing', 'interaction', 'needs', 'appointment', 'followup'];
  const dimensionStatusLabels = { conform: '符合', nonconform: '不符合', insufficient: '信息不足', not_applicable: '不适用' };
  const dimensionKinds = {
    response: ['response_event', '分别记录已回复事件与待回复事件，后者保留截至观察点的等待下限。'],
    depth: ['count', '统计日客户有效文字／语音条数及深聊阈值；未转写语音的语义另记缺口。'],
    product: ['extraction', '提取产品、提及方、消息证据及统计日归属。'],
    referral: ['business_action', '保留实际老带新提及动作和证据，不等同转介绍完成。'],
    responsibility: ['attribution', '保留工作号归属及实际操作人可得性，未知不推断个人。'],
  };
  const dimensionContracts = {
    response: { rule: '将需要答复的客户消息与随后有效员工回复配对；超过配置分钟数记超时。待回复单列等待下限，不混入已回复均值。', applicability: '统计日内存在客户请求且消息方向、时间可确认；员工单向触达不适用。', evidenceRequirement: '客户请求与员工回复的消息 ID 和时间；未回复保留客户消息及观察截止点。', parameterKeys: ['timeoutMinutes'] },
    safety: { rule: '涉及项目安全、禁忌或术后症状时检查是否保留专业评估与必要安全提醒；明确绕过评估、淡化明显风险作为风险候选。', applicability: '涉及项目适用性、安全或症状；即使客户未回复，可读员工安全话术仍需检查。', evidenceRequirement: '引用具体员工话术及必要客户上下文；缺少评估资料时保留信息不足，不虚构禁忌结论。', severity: 'high', redline: true },
    promise: { rule: '检查员工是否作百分之百有效、绝对安全等确定性承诺；专业评估后的审慎说明不等同确定效果承诺。', applicability: '存在可读员工效果或适用性表达；不以客户是否回复作为免检条件。', evidenceRequirement: '必须引用员工作出承诺的原文消息，区分客户转述与员工表达。', severity: 'high', redline: true },
    unresolved: { rule: '识别客户提出的具体诉求及后续答复；截至观察点仍无明确答复或结果时标记未解决，不能把登记等同解决。', applicability: '可读客户消息中存在具体待答复或待处理事项。', evidenceRequirement: '诉求消息和答复／待处理消息；未回复注明观察截止点，缺失上下文保留信息不足。', severity: 'medium', redline: false },
    complaint: { rule: '客户明确不满、焦虑或投诉时检查员工是否针对问题回应和安抚；客户表达不满与员工服务失当分别记录。', applicability: '存在可读的负面情绪或投诉表达；无此情境为不适用。', evidenceRequirement: '客户情绪原文和员工随后处理消息；仅有未解析媒体不能认定情绪或处理失当。', severity: 'medium', redline: false },
    closing: { rule: '检查需要继续答复的诉求是否被承接、结束安排是否明确；客户最后追问未答复与正常礼貌收尾分开。', applicability: '已经形成双向接待或客户提出需要答复的请求。', evidenceRequirement: '末段客户与员工消息及观察截止点；员工单向触达不推断接待收尾是否合格。', severity: 'medium', redline: false },
    depth: { rule: '按统计日客户 text/voice 发言数量与配置阈值判深聊；图片、表情和员工消息不混计。未转写语音仍算发言次数，语义是否可读另记。', applicability: '存在统计日客户消息并能确认消息类型及方向。', evidenceRequirement: '用于计数的客户消息 ID、类型和时间；语音解析状态独立保留。', parameterKeys: ['deepMinMessages'] },
    interaction: { rule: '对达到深聊阈值的可读会话判断是否有实质追问、需求展开和针对性回应；不能用消息数量替代互动质量。', applicability: '达到配置的深聊阈值；需有足够可读内容，未达到阈值不适用，达到但不可读则信息不足。', evidenceRequirement: '客户表达与员工追问／回应的成对消息证据。', severity: 'low', redline: false },
    needs: { rule: '检查是否识别并承接客户实际咨询需求；只记录员工推介的产品不能代替客户需求澄清。', applicability: '客户已提出可读咨询需求或有待澄清的可读问题。', evidenceRequirement: '客户需求原文和员工澄清、记录或确认的消息。', severity: 'low', redline: false },
    product: { rule: '按企业产品目录提取实际提及的产品、提及方与消息证据；员工主动提及和客户表达需求分别统计。', applicability: '可读文本或已有转写包含产品目录可匹配的实际提及。', evidenceRequirement: '产品 ID、员工／客户提及方及原文消息 ID；同会话去重与提及事件数分开。' },
    referral: { rule: '记录员工是否主动提及老带新或转介绍安排，并区分触达、客户回应和已完成动作；触达不等于转介绍成功。', applicability: '存在可读老带新相关表达；未提及不凭空生成行动事实。', evidenceRequirement: '实际提及消息与提及方；只有明确后续证据才记客户接受或完成。' },
    appointment: { rule: '有预约意图时检查是否明确具体时间、项目及必要确认；客户说周末有空只构成时间意向，不等同预约完成。', applicability: '客户表达咨询、到店或项目预约意图。', evidenceRequirement: '客户时间意向、员工安排及最终确认消息；缺少确认保留信息不足。', severity: 'low', redline: false },
    followup: { rule: '需要后续跟进时检查是否交代跟进内容、时间或触发条件；泛称继续跟进不能证明结果已落实。', applicability: '存在已承诺、待处理或需要后续联系的事项。', evidenceRequirement: '跟进承诺及可核对的时间／条件／结果；不得推断会话以外已经完成的动作。', severity: 'low', redline: false },
    responsibility: { rule: '按工作号和统计日归属快照统计；仅凭账号名称不认定实际接待人，共号缺少操作者记录时标记责任未知。', applicability: '所有工作号会话；具体个人责任仅在来源记录充分时可确认。', evidenceRequirement: '工作号 ID、部门归属快照和实际操作者／接待记录；缺失个人来源不由模型猜测。' },
  };
  const dimensions = [
    ['response', '回复及时性', '程序统计'], ['safety', '安全告知', 'AI 判断'],
    ['promise', '效果承诺', 'AI 判断'], ['unresolved', '诉求解决', 'AI 判断'],
    ['complaint', '客户情绪处理', 'AI 判断'], ['closing', '会话收尾', 'AI 判断'],
    ['depth', '沟通深度', '程序统计'], ['interaction', '有效互动', 'AI 判断'],
    ['needs', '需求澄清', 'AI 判断'], ['product', '产品触达', 'AI 判断'],
    ['referral', '老带新引导', 'AI 判断'], ['appointment', '预约推进', 'AI 判断'],
    ['followup', '后续跟进', 'AI 判断'], ['responsibility', '接待归属', '来源记录'],
  ].map(([id, name, source]) => ({
    id, name, source, enabled: true, semanticVersion: 1, ruleVersion, ...dimensionContracts[id],
    kind: judgementDimensionIds.includes(id) ? 'judgement' : dimensionKinds[id][0],
    description: judgementDimensionIds.includes(id) ? '预设合成场景的逐维度判定，独立于候选问题和人工复核状态。' : dimensionKinds[id][1],
  }));
  const metricLibrary = [
    ['conv_count', '质检会话', '个', '会话事实', '会话去重计数', '无', '当前范围内有统计日消息的客户×工作号会话数。'],
    ['risk_count', '高风险会话', '个', 'AI 问题事实', '按会话去重', '无', '至少含一条重大问题的会话；复核口径排除已判误报的问题。'],
    ['timeout_count', '回复超时会话', '个', '程序统计', '按会话去重', '无', '至少一次有效回复耗时超过 20 分钟；按配对消息时间计算。'],
    ['deep_count', '深聊会话', '个', '程序统计', '按会话去重', '无', '统计日有效客户 text/voice 发言不少于 6 条；未转写语音计条数，语义另记未知；图片、视频及员工消息不计入。'],
    ['high_issue_count', '重大问题', '条', 'AI 问题事实', '问题事件计数', '无', '重大级别的问题条数，与高风险会话数口径不同。'],
    ['unresolved_count', '未解决诉求', '个', 'AI 判断', '按会话去重', '无', '存在未解决诉求问题的会话；复核口径排除相应误报。'],
    ['complaint_count', '负面情绪会话', '个', 'AI 判断', '按会话去重', '无', '存在客户不满问题的会话；仅为演示判定。'],
    ['complaint_rate', '负面情绪占比', '%', 'AI 判断 + 会话事实', '比例', '当前范围全部质检会话', '负面情绪会话数 ÷ 质检会话数，空范围显示 —。'],
    ['referral_count', '老带新触达', '个', 'AI 行为事实', '按会话去重', '无', '工作号主动提及老带新安排的会话，保留对应原文。'],
    ['response_avg', '平均回复耗时', '分钟', '程序统计', '有效回复总耗时 ÷ 有效回复次数', '有效回复次数', '按消息配对加权计算，不对各工作号均值再次求平均。跨日回复计入原客户请求。'],
  ].map(([id, name, unit, source, aggregation, denominator, description]) => ({ id, name, unit, source, aggregation, denominator, description }));
  const intentLabels = { 1: 'L1 高意向', 2: 'L2 明确咨询', 3: 'L3 需求待明', 4: 'L4 持续维护', 5: 'L5 当日未回应', unknown: '信息不足' };
  // These declared synthetic assessments are fixtures, not model execution or inference from a missing issue.
  function declaredDimensionResults(scenarioId, messages, intentScenario) {
    const cases = {
      safety: ['insufficient', [3], '已提到专业评估，但未提供完整风险和禁忌核查信息，不判为安全告知已完成。'],
      promise: ['conform', [3], '合成场景明确要求先专业评估，再确认具体方案，未在该表达中作确定效果承诺。'],
      unresolved: ['insufficient', [6, 7], '已承接联系安排，是否实际落实仍缺少明确结果。'],
      complaint: ['not_applicable', [4], '本合成场景中客户是在询问安排，没有进入投诉安抚情境。'],
      closing: ['conform', [-1], '本合成场景以工作号明确回应和收尾结束。'],
      needs: ['conform', [2, 5], '客户表达咨询项目与时间，工作号明确记录并承接其需求。'],
      appointment: ['insufficient', [2, 7], '仅有周末意向和后续联系说明，没有可核对的具体预约结果。'],
      followup: ['insufficient', [7], '已说明继续联系，但缺少完整可核对的跟进时间与结果。'],
      interaction: ['not_applicable', [0], '客户文字／语音发言数未达到演示深聊阈值，不以短会话推断互动不足。'],
    };
    const speechMessages = messages.filter(m => m.sender === 'customer' && ['text', 'voice'].includes(m.type) && m.inReportDay);
    if (speechMessages.length >= 6) cases.interaction = speechMessages.some(m => m.status === 'unparsed')
      ? ['insufficient', [0], '发言数量达到阈值，但存在未解析语音，缺少足够的语义证据判断互动质量。']
      : ['conform', [8, 9], '合成场景中员工针对客户咨询准备继续追问具体需求，存在可核对的互动证据。'];
    if (intentScenario === 'project_only') {
      cases.needs = ['conform', [2, 5], '客户明确咨询项目，工作号已承接需求；尚无明确时间意向。'];
      cases.appointment = ['not_applicable', [2], '客户仅咨询项目，没有提出预约或到店时间意向。'];
    }
    if (intentScenario === 'general_long' || intentScenario === 'general_short') {
      cases.needs = ['insufficient', [2], '客户尚未表达明确项目需求，不能把员工产品介绍当成需求已澄清。'];
      cases.appointment = ['not_applicable', [2], '客户未表达预约意图，暂不评价预约推进。'];
      cases.followup = ['not_applicable', [2], '客户明确暂不安排，尚无约定的后续跟进事项。'];
      cases.unresolved = ['not_applicable', [2], '当前没有明确待答复或待处理诉求。'];
      if (intentScenario === 'general_short') {
        cases.safety = ['insufficient', [1], '员工提到专业评估，但本段招呼不包含完整安全核查信息。'];
        cases.promise = ['conform', [1], '员工明确保留专业评估边界，未承诺确定效果。'];
        cases.complaint = ['not_applicable', [2], '本段仅为日常招呼，没有投诉安抚情境。'];
      }
    }
    if (intentScenario === 'aftercare') {
      cases.needs = ['conform', [6, 7], '客户明确要求处理已有售后事项，员工已记录；这不是新的购买项目意向。'];
      cases.appointment = ['not_applicable', [0, 2], '本段为既有售后诉求，没有新项目预约意图。'];
    }
    if (scenarioId === 'unsafe_promise') {
      cases.safety = ['nonconform', [3], '合成消息明确表示无需先面诊，绕过专业评估。'];
      cases.promise = ['nonconform', [3], '合成消息明确承诺百分之百有效。'];
    }
    if (scenarioId === 'complaint' || scenarioId === 'complaint_unresolved') {
      cases.complaint = ['nonconform', [4, 5], '客户明确表达不满，随后仅收到登记和继续跟进的通用回应，没有针对该情绪安抚。'];
    }
    if (scenarioId === 'unresolved' || scenarioId === 'complaint_unresolved') {
      cases.unresolved = ['nonconform', [6, 7], '客户明确表示售后未解决，工作号也确认处理结果仍待落实。'];
    }
    if (scenarioId === 'pending_staff_reply') {
      cases.unresolved = ['nonconform', [-1], '客户新增的咨询时间问题截至次日 04:00 仍未获得答复。'];
      cases.closing = ['nonconform', [-1], '最后一条为客户需要答复的追问，截至观察点没有工作号回复。'];
    }
    if (scenarioId === 'outreach_only' || scenarioId === 'outreach_redline') {
      ['unresolved', 'complaint', 'closing', 'interaction', 'needs', 'appointment', 'followup'].forEach(id => {
        cases[id] = ['not_applicable', [0], '仅员工单向触达，没有发生该项所需的客户接待情境；员工自身话术仍单独检查。'];
      });
      cases.safety = scenarioId === 'outreach_redline'
        ? ['nonconform', [2], '员工单向触达中明确表示无需面诊，客户未回复不豁免安全话术检查。']
        : ['insufficient', [2], '员工保留专业评估边界，但缺少客户具体情况，不能认定完整安全告知已完成。'];
      cases.promise = scenarioId === 'outreach_redline'
        ? ['nonconform', [2], '员工单向触达中承诺百分之百有效；这是可直接定位的红线候选。']
        : ['conform', [2], '员工明确具体方案须经专业评估后确认，未作确定效果承诺。'];
    }
    if (scenarioId === 'unreadable_customer') {
      ['unresolved', 'complaint', 'closing', 'needs', 'appointment', 'followup'].forEach(id => {
        cases[id] = ['insufficient', [0, 1], '客户仅发送未解析媒体，无法可靠获知该项所需的诉求或上下文。'];
      });
      cases.safety = ['insufficient', [3], '员工要求补充可读内容并保留评估边界；缺少客户信息，安全核查完整性未知。'];
      cases.promise = ['conform', [3], '尽管客户媒体不可读，员工可读文字明确不承诺效果，仍可检查该段表达。'];
    }
    return judgementDimensionIds.map(dimensionId => {
      const [status, indexes, explanation] = cases[dimensionId];
      const definition = dimensions.find(d => d.id === dimensionId);
      return { dimensionId, kind: 'judgement', status, explanation, source: 'synthetic_scenario', scenarioId,
        ruleVersion, severity: definition.severity, redline: definition.redline,
        evidenceMessageIds: [...new Set(indexes.map(index => messages[index < 0 ? messages.length + index : index]?.id).filter(Boolean))] };
    });
  }
  function isoAt(date, hour, minute) { return new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`); }
  function isoChina(date) {
    const shifted = new Date(date.getTime() + 8 * 60 * 60000);
    return shifted.toISOString().slice(0, 19) + '+08:00';
  }
  function addMinutes(date, minutes) { return new Date(date.getTime() + minutes * 60000); }
  function sameDay(message, date) { return message.time.slice(0, 10) === date; }
  // Read only explicit signals in these authored fixtures; this is not a replacement for model intent analysis.
  function declaredIntent(intentScenario, messages, date) {
    const customer = messages.filter(m => m.sender === 'customer' && sameDay(m, date));
    const readable = customer.filter(m => m.status !== 'unparsed');
    const projectEvidence = readable.flatMap(message => products.filter(p => message.text.includes(p.name)).map(p => ({ productId: p.id, messageId: message.id })));
    const timeEvidence = readable.flatMap(message => [...message.text.matchAll(/周末|明天|下周三|本周五/g)].map(match => ({ expression: match[0], messageId: message.id })));
    const level = !customer.length ? 5 : !readable.length ? 'unknown' : intentScenario === 'aftercare' ? 4
      : projectEvidence.length && timeEvidence.length ? 1 : projectEvidence.length || timeEvidence.length ? 2
        : messages.filter(m => sameDay(m, date)).length > 6 ? 3 : 4;
    return { level, scenario: intentScenario, source: 'synthetic_scenario',
      projects: projectEvidence, timeExpressions: timeEvidence,
      evidenceMessageIds: [...new Set([...projectEvidence, ...timeEvidence].map(e => e.messageId).concat(
        level === 3 || level === 4 ? readable.map(m => m.id) : []))],
      explanation: level === 'unknown' ? '客户确有消息，但都是未解析媒体，不能判为当日未回应。'
        : level === 5 ? '统计日无客户消息，仅员工触达；与客户价值和员工话术合规分别判断。'
          : intentScenario === 'aftercare' ? '仅咨询已有售后事项，没有新项目意向；服务优先级单独保持较高。'
            : level === 1 ? '客户同时表达具体项目和时间意向。' : level === 2 ? '客户仅明确项目或时间之一。'
              : level === 3 ? '客户没有明确项目或时间，双方统计日消息超过 6 条。' : '客户没有明确项目或时间，双方统计日消息不超过 6 条。' };
  }
  const conversations = [];
  channels.forEach((channel, channelIndex) => dates.slice(0, 2).forEach((date, dateIndex) => {
    for (let index = 0; index < 12; index += 1) {
      const account = accounts.find(a => a.channel === channel.id && a.id.endsWith(`-${Math.floor(index / 3) + 1}`));
      const id = `${channel.id}-${date}-${String(index + 1).padStart(2, '0')}`;
      const product = touchedProducts[(index + channelIndex + dateIndex) % touchedProducts.length];
      const crossDay = index === 0;
      const unreadable = index === 6;
      const voice = index === 2;
      const noCustomerReply = index === 11;
      const outreachRedline = noCustomerReply && dateIndex === 0;
      const pendingStaffReply = index === 5;
      const deepSample = channelIndex === 0 && dateIndex === 0 && (index === 1 || index === 2);
      // Both channels have reviewable severe examples on 10/28; 10/27 retains an empty severe state.
      const critical = index === 3 && dateIndex === 0;
      const complaint = index === 4 || (index === 10 && dateIndex === 1);
      const unresolved = index === 4 || index === 7;
      const referral = index === 1 || index === 8;
      const intentScenario = noCustomerReply ? 'outreach_only' : unreadable ? 'unreadable_customer'
        : index === 4 || index === 7 ? 'aftercare' : index === 8 ? 'general_long'
          : index === 9 ? 'general_short' : index === 1 || index === 10 ? 'project_only' : 'project_and_time';
      const firstDelay = [3, 25, 5, 42, 3, 12, 22, 4, 2, 35, 6, 18][index] + dateIndex * 2;
      const base = isoAt(date, crossDay ? 23 : 8 + Math.floor(index / 2), crossDay ? 20 : (index % 2) * 10);
      const times = [base];
      [firstDelay, 2, 3, 2, 2, 1, 1].forEach(delay => times.push(addMinutes(times[times.length - 1], delay)));
      if (crossDay) { times[6] = isoAt(date, 23, 56); times[7] = addMinutes(times[6], 8); }
      const lines = [
        ['customer', `您好，想了解一下${product.name}，可以先咨询吗？`],
        ['staff', `您好，可以先了解您的需求。${product.name}需要结合实际情况沟通。`],
        ['customer', `我主要想了解${product.name}的流程，周末有时间。`],
        ['staff', critical ? '这个项目保证百分之百有效，不需要先做面诊。' : '可以先安排咨询，具体方案和适用情况需要专业人员评估。'],
        ['customer', complaint ? '我上次的问题还没有处理好，等待太久了，有点不满意。' : '好的，我想再了解一下后续安排。'],
        ['staff', referral ? '如果朋友也有咨询需求，可以了解我们的老带新咨询安排。' : '我已记录您的需求，会继续跟进咨询安排。'],
        ['customer', unresolved ? '我提出的售后问题还没有明确答复，麻烦继续处理。' : '了解了，请帮我确认一下后续怎么联系。'],
        ['staff', unresolved ? '收到，我先登记，具体处理结果还需要进一步确认。' : '好的，我们会按您确认的时间联系，感谢您的沟通。'],
      ];
      if (intentScenario === 'project_only') lines[2][1] = `我主要想了解${product.name}的流程，目前还没有确定时间。`;
      if (intentScenario === 'aftercare') {
        lines[0][1] = '您好，我想跟进之前的售后处理结果，这次没有咨询新项目。';
        lines[2][1] = '还是上次留下的售后问题，希望能把处理情况说明清楚。';
      }
      if (intentScenario === 'general_long') {
        lines[0][1] = '您好，我想先了解咨询通常怎样开始。';
        lines[2][1] = '目前还没有确定咨询哪个项目，也没有安排时间。';
        lines[4][1] = '具体需求还没想清楚，先了解一下流程。';
        lines[6][1] = '先了解就好，暂时不用安排。';
        lines[7][1] = '好的，等您有明确需求后可以再联系。';
      }
      if (intentScenario === 'general_short') {
        lines.splice(0, lines.length, ['customer', '您好，我来打个招呼。'],
          ['staff', `您好，如需了解${product.name}，具体适用情况仍需要专业评估。`],
          ['customer', '谢谢，暂时没有具体咨询需求，也不安排后续联系。'],
          ['staff', '好的，有明确需求时可以再联系。']);
        times.splice(lines.length);
      }
      if (deepSample) {
        lines.push(['customer', '咨询前需要准备哪些资料？'], ['staff', '为了明确咨询重点，请说明您最想了解的问题和既往相关体验，专业人员会进一步沟通。'],
          ['customer', '好的，我会准备好相关问题，方便时再确认时间。'], ['staff', '收到，等您确认后我们再安排。']);
        [2, 1, 2, 1].forEach(delay => times.push(addMinutes(times[times.length - 1], delay)));
      }
      if (noCustomerReply) {
        const outreach = [`您好，这里是演示工作号，为您发送${product.name}的咨询信息。`, `${product.name}可先通过咨询了解适用情况。`,
          outreachRedline ? '这个项目保证百分之百有效，不需要先做面诊。' : '具体方案需要专业评估后再确认。', '咨询准备说明已发送，您可以方便时查看。',
          '如有想了解的问题，可以留言。', '如果暂时不方便沟通，可以之后再联系。', '是否安排后续咨询，请以您的确认为准。', '当日未收到您的回复，先保留本次触达记录。'];
        lines.splice(0, lines.length, ...outreach.map(text => ['staff', text]));
        times.splice(0, times.length, ...outreach.map((_, i) => isoAt(date, 8 + i, 0)));
      }
      if (unreadable) {
        lines[0][1] = '[图片：尚未识别]'; lines[2][1] = '[语音：尚未转写]';
        lines[4][1] = '[视频：尚未识别]'; lines[6][1] = '[图片：尚未识别]';
        lines[1][1] = '已收到资料，需要补充可读的文字信息。';
        lines[3][1] = '目前看不到资料中的具体内容，请描述咨询问题；具体方案需要专业评估，不能承诺效果。';
      }
      if (pendingStaffReply) {
        lines.push(['customer', '请帮我确认明天几点可以继续咨询，需要提前安排时间。']);
        times.push(addMinutes(times[times.length - 1], 5));
      }
      const messages = lines.map(([sender, text], messageIndex) => ({
        id: `${id}-m${messageIndex + 1}`, time: isoChina(times[messageIndex]), sender, text,
        type: unreadable && sender === 'customer' ? ['image', 'voice', 'video', 'image'][messageIndex / 2] : voice && messageIndex === 2 ? 'voice' : 'text',
        status: unreadable && sender === 'customer' ? 'unparsed' : voice && messageIndex === 2 ? 'transcribed' : 'normal',
        inReportDay: isoChina(times[messageIndex]).slice(0, 10) === date,
      }));
      const responseEvents = (noCustomerReply ? [] : messages.map((m, i) => m.sender === 'customer' ? i : -1).filter(i => i >= 0 && messages[i + 1]?.sender === 'staff')).map(messageIndex => ({
        id: `${id}-reply${messageIndex / 2 + 1}`,
        durationMinutes: (times[messageIndex + 1] - times[messageIndex]) / 60000,
        customerMessageId: messages[messageIndex].id, replyMessageId: messages[messageIndex + 1].id,
        crossDay: !sameDay(messages[messageIndex + 1], date),
      }));
      const observedUntil = addMinutes(isoAt(date, 0, 0), 28 * 60);
      const lastMessage = messages[messages.length - 1];
      const pendingResponseEvents = pendingStaffReply ? [{
        id: `${id}-pending-reply`, customerMessageId: lastMessage.id, lastCustomerAt: lastMessage.time,
        observedUntil: isoChina(observedUntil),
        waitLowerBoundMinutes: (observedUntil.getTime() - new Date(lastMessage.time).getTime()) / 60000,
      }] : [];
      const scenarioId = noCustomerReply ? outreachRedline ? 'outreach_redline' : 'outreach_only' : unreadable ? 'unreadable_customer'
        : critical ? 'unsafe_promise' : pendingStaffReply ? 'pending_staff_reply'
          : complaint && unresolved ? 'complaint_unresolved' : complaint ? 'complaint' : unresolved ? 'unresolved' : 'consultation';
      const dimensionResults = declaredDimensionResults(scenarioId, messages, intentScenario);
      const highlights = channelIndex === 0 && dateIndex === 0 && index === 2 ? [{
        id: `${id}-highlight-1`, title: '先评估再沟通方案',
        summary: '工作号明确说明适用情况需要专业人员评估，保留了审慎沟通的边界。',
        evidenceMessageIds: [messages[3].id], source: 'synthetic_scenario',
      }] : [];
      const issues = [];
      function issue(ruleId, title, severity, summary, messageIndexes, review = 'pending', redline = dimensionContracts[ruleId]?.redline === true) {
        issues.push({ id: `${id}-issue-${issues.length + 1}`, ruleId, title, severity, summary,
          redline, ruleVersion, source: ruleId === 'response' ? 'program' : 'synthetic_scenario',
          evidenceIds: messageIndexes.map(i => messages[i].id), review });
      }
      if (responseEvents.some(e => e.durationMinutes > 20)) {
        issue('response', '回复超过 20 分钟', 'medium', `首次回复耗时 ${firstDelay} 分钟，超过演示规则的 20 分钟阈值。`, [0, 1]);
      }
      if (critical) {
        issue('promise', '未经评估承诺确定效果', 'high', '合成示例中出现“保证百分之百有效”，需要人工复核并纠正沟通方式。', [2, 3]);
        issue('safety', '忽略专业评估环节', 'high', '同条合成消息表示“不需要先做面诊”，作为安全告知风险候选。', [3]);
      }
      if (outreachRedline) {
        issue('promise', '单向触达仍出现确定效果承诺', 'high', '员工单向推介中承诺百分之百有效，客户未回应不豁免话术检查。', [2]);
        issue('safety', '单向触达绕过专业评估', 'high', '同条可读员工消息表示无需面诊，独立记录安全红线候选。', [2]);
      }
      if (complaint) issue('complaint', '客户表达不满', 'medium', '客户明确表达等待过久和不满意，需要继续处理。', [4, 5], index === 4 && dateIndex === 1 ? 'confirmed' : 'pending');
      if (unresolved) issue('unresolved', '售后诉求尚未形成结果', 'medium', '截至当前会话，售后请求仍在登记或待处理状态。', [6, 7]);
      if (pendingStaffReply) {
        issue('closing', '客户追问截至观察点仍未回复', 'medium', '客户最后提出需要答复的咨询时间问题，截至次日 04:00 未收到工作号回复。', [messages.length - 1]);
        issue('unresolved', '新增咨询时间问题尚未得到答复', 'medium', '此条客户追问仍未解决；等待下限单列，不计入已回复耗时。', [messages.length - 1]);
      }
      const productMentions = [];
      messages.forEach(message => products.forEach(p => {
        if (message.status !== 'unparsed' && message.text.includes(p.name)) {
          productMentions.push({ id: `${message.id}-${p.id}`, productId: p.id, speaker: message.sender, messageId: message.id, inReportDay: sameDay(message, date) });
        }
      }));
      const speechCount = customerSpeechCount({ messages, date });
      const intentAssessment = declaredIntent(intentScenario, messages, date);
      const intent = intentAssessment.level;
      conversations.push({
        id, date, channel: channel.id, accountId: account.id,
        departmentId: account.departmentId, departmentName: account.departmentName,
        customerId: `synthetic-${channel.id}-${index + 1}`, customerName: `演示客户 ${channelIndex + 1}${String(index + 1).padStart(2, '0')}`,
        accountName: account.name, intent, intentLabel: intentLabels[intent],
        intentEvidence: intentAssessment.evidenceMessageIds, intentAssessment,
        servicePriority: noCustomerReply || unreadable ? 'unknown' : critical || complaint || unresolved ? 'high' : intent === 1 || intent === 2 ? 'medium' : 'low',
        sentiment: complaint ? 'negative' : unreadable || noCustomerReply ? 'unknown' : index % 3 === 0 ? 'positive' : 'neutral',
        unresolved: unresolved || pendingStaffReply, complaint, referral, deep: speechCount >= 6,
        responsibility: account.shared ? 'unknown' : 'account',
        responsibilityLabel: account.shared ? '工作号共用，具体接待人未知' : '按工作号归属统计',
        analysisStatus: unreadable ? 'limited' : 'success',
        dataNotes: [crossDay ? '最后一次回复跨日 8 分钟，作为原请求的上下文。' : '', unreadable ? '客户仅发送未解析媒体，意向保留 unknown。' : '', voice ? '语音已有文字转写，本次按转写文本分析。' : '', pendingStaffReply ? '客户最后追问截至次日 04:00 尚无回复，等待下限单列，不进入已回复均值。' : '', noCustomerReply ? '员工单向触达，当日没有客户消息；不能据此推断客户价值或服务优先级。' : '', account.shared ? '没有具体操作者记录，不归责到员工个人。' : ''].filter(Boolean),
        summary: noCustomerReply ? '当日仅有员工触达，客户未回应；这不代表客户价值低或没有后续意向。' : unreadable ? '客户媒体尚未解析，信息不足，无法可靠判定意向。' : pendingStaffReply ? '客户新增咨询时间追问，截至次日 04:00 尚未收到回复。' : unresolved ? '客户仍有待处理诉求，应继续跟进明确结果。' : `围绕${product.name}开展咨询，已记录后续联系安排。`,
        messages, issues, productMentions, responseEvents, pendingResponseEvents, dimensionResults, highlights,
      });
    }
  }));
  function reviewStatus(issue, reviewsMap = {}) { return reviewsMap[issue.id]?.status || issue.review || 'pending'; }
  function activeIssues(conversation, reviewsMap = {}, mode = 'ai') {
    return conversation.issues.filter(issue => mode !== 'effective' || reviewStatus(issue, reviewsMap) !== 'dismissed').map(issue => {
      const review = reviewsMap[issue.id] || {};
      return { ...issue, aiSeverity: issue.severity, aiRedline: issue.redline === true,
        severity: mode === 'effective' && ['low', 'medium', 'high'].includes(review.severity) ? review.severity : issue.severity,
        redline: mode === 'effective' && typeof review.redline === 'boolean' ? review.redline : issue.redline === true,
        redlineConfirmed: reviewStatus(issue, reviewsMap) === 'confirmed' && review.redline === true,
        review: reviewStatus(issue, reviewsMap), reviewReason: review.reason || '' };
    });
  }
  function issuesFor(list, reviewsMap = {}, mode = 'ai') {
    return list.flatMap(c => activeIssues(c, reviewsMap, mode).map(issue => ({ ...issue, conversationId: c.id, accountId: c.accountId, accountName: c.accountName, customerName: c.customerName, date: c.date, channel: c.channel })));
  }
  function hasIssue(c, ruleId, reviewsMap, mode) { return activeIssues(c, reviewsMap, mode).some(issue => issue.ruleId === ruleId); }
  function riskLevel(c, reviewsMap = {}, mode = 'ai') {
    const issues = activeIssues(c, reviewsMap, mode);
    if (issues.some(issue => issue.severity === 'high')) return 'high';
    if (issues.filter(issue => issue.severity === 'medium').length >= 2 || issues.some(issue => issue.ruleId === 'unresolved')) return 'medium';
    if(c.analysisStatus==='limited'&&c.intent==='unknown')return 'unknown';
    return 'low';
  }
  function confirmedRedlineCount(list, reviewsMap = {}) {
    return issuesFor(list, reviewsMap, 'effective').filter(issue => issue.redline === true && issue.redlineConfirmed).length;
  }
  function customerSpeechCount(c) {
    return c.messages.filter(m => sameDay(m, c.date) && m.sender === 'customer' && ['text', 'voice'].includes(m.type)
      && m.valid !== false && !['failed', 'recalled', 'revoked', 'withdrawn', 'system'].includes(m.status)).length;
  }
  function validReplies(c) { return c.responseEvents.filter(event => Number.isFinite(event.durationMinutes) && event.durationMinutes >= 0 && c.messages.some(m => m.id === event.customerMessageId && sameDay(m, c.date))); }
  function thresholds(options = {}) {
    return { timeoutMinutes: Number.isFinite(Number(options.timeoutMinutes)) && Number(options.timeoutMinutes) >= 0 ? Number(options.timeoutMinutes) : 20,
      deepMinMessages: Number.isFinite(Number(options.deepMinMessages)) && Number(options.deepMinMessages) > 0 ? Number(options.deepMinMessages) : 6 };
  }
  function isDeep(c, options = {}) {
    return customerSpeechCount(c) >= thresholds(options).deepMinMessages;
  }
  function metricMatches(c, metricId, reviewsMap = {}, mode = 'ai', options = {}) {
    switch (metricId) {
      case 'conv_count': return true;
      case 'risk_count': case 'high_issue_count': return riskLevel(c, reviewsMap, mode) === 'high';
      case 'medium_risk': return riskLevel(c, reviewsMap, mode) === 'medium';
      case 'redline_confirmed': return confirmedRedlineCount([c], reviewsMap) > 0;
      case 'timeout_count': return validReplies(c).some(event => event.durationMinutes > thresholds(options).timeoutMinutes);
      case 'deep_count': return isDeep(c, options);
      case 'unresolved_count': return hasIssue(c, 'unresolved', reviewsMap, mode);
      case 'complaint_count': case 'complaint_rate': return hasIssue(c, 'complaint', reviewsMap, mode);
      case 'referral_count': return c.referral;
      case 'response_avg': return validReplies(c).length > 0;
      default: return false;
    }
  }
  function drilldown(list, metricId, reviewsMap = {}, mode = 'ai', options = {}) { return list.filter(c => metricMatches(c, metricId, reviewsMap, mode, options)); }
  function round(value) { return Math.round(value * 10) / 10; }
  function metricValue(metricId, list, reviewsMap = {}, mode = 'ai', options = {}) {
    if (metricId === 'response_avg') {
      const replies = list.flatMap(validReplies);
      return replies.length ? round(replies.reduce((sum, event) => sum + event.durationMinutes, 0) / replies.length) : null;
    }
    if (metricId === 'complaint_rate') return list.length ? round(100 * drilldown(list, 'complaint_count', reviewsMap, mode, options).length / list.length) : null;
    if (metricId === 'high_issue_count') return issuesFor(list, reviewsMap, mode).filter(issue => issue.severity === 'high').length;
    if (metricId === 'medium_risk') return drilldown(list, metricId, reviewsMap, mode, options).length;
    if (metricId === 'redline_confirmed') return confirmedRedlineCount(list, reviewsMap);
    if (!metricLibrary.some(metric => metric.id === metricId)) return null;
    return drilldown(list, metricId, reviewsMap, mode, options).length;
  }
  function getMetrics(list, reviewsMap, mode, options) { return Object.fromEntries(metricLibrary.map(metric => [metric.id, metricValue(metric.id, list, reviewsMap, mode, options)])); }
  function filter(list, filters = {}, reviewsMap = {}, mode = 'ai', options = {}) {
    function accepts(actual, expected) { return expected == null || expected === '' || expected === 'all' || (Array.isArray(expected) ? expected.includes(actual) : String(actual) === String(expected)); }
    return list.filter(c => {
      if (!accepts(c.date, filters.date) || !accepts(c.channel, filters.channel) || !accepts(c.departmentId, filters.departmentId) || !accepts(c.accountId, filters.accountId) || !accepts(c.intent, filters.intent) || !accepts(c.servicePriority, filters.servicePriority) || !accepts(c.sentiment, filters.sentiment)) return false;
      if (filters.search && !`${c.customerName} ${c.accountName} ${c.summary} ${c.messages.map(m => m.text).join(" ")} ${c.issues.map(i => i.title + " " + i.summary).join(" ")}`.toLowerCase().includes(String(filters.search).toLowerCase())) return false;
      if (filters.productId && filters.productId !== 'all' && !c.productMentions.some(p => p.inReportDay && accepts(p.productId, filters.productId))) return false;
      if (filters.metricId && !metricMatches(c, filters.metricId, reviewsMap, mode, options)) return false;
      if (filters.riskLevel && !accepts(riskLevel(c, reviewsMap, mode), filters.riskLevel)) return false;
      const needsIssue = ['severity', 'ruleId', 'reviewStatus', 'redline'].some(key => filters[key] != null && filters[key] !== '' && filters[key] !== 'all');
      if (needsIssue && !activeIssues(c, reviewsMap, mode).some(issue => accepts(issue.severity, filters.severity) && accepts(issue.ruleId, filters.ruleId) && accepts(issue.redline, filters.redline) && accepts(reviewStatus(issue, reviewsMap), filters.reviewStatus))) return false;
      if (filters.responsibility && !accepts(c.responsibility, filters.responsibility)) return false;
      return true;
    });
  }
  function aggregate(list, reviewsMap = {}, mode = 'ai', options = {}) {
    const selectedAccounts = accounts.filter(account => list.some(c => c.accountId === account.id));
    const dailyMessages = list.flatMap(c => c.messages.filter(m => sameDay(m, c.date)));
    const allIssues = list.flatMap(c => c.issues);
    const replyEvents = list.flatMap(validReplies);
    return {
      total: list.length,
      metrics: getMetrics(list, reviewsMap, mode, options),
      riskCounts: Object.fromEntries(['high', 'medium', 'low'].map(level => [level, list.filter(c => riskLevel(c, reviewsMap, mode) === level).length])),
      intents: [1, 2, 3, 4, 5, 'unknown'].map(id => ({ id, label: intentLabels[id], count: list.filter(c => String(c.intent) === String(id)).length })),
      accounts: selectedAccounts.map(account => {
        const own = list.filter(c => c.accountId === account.id);
        return { accountId: account.id, name: account.name, channel: account.channel, departmentId: account.departmentId, departmentName: account.departmentName, shared: account.shared, metrics: getMetrics(own, reviewsMap, mode, options), messageCount: own.reduce((sum, c) => sum + c.messages.filter(m => sameDay(m, c.date)).length, 0), issueCount: issuesFor(own, reviewsMap, mode).length };
      }),
      products: products.map(product => {
        const mentioned = list.flatMap(c => c.productMentions.filter(m => m.productId === product.id && m.inReportDay).map(m => ({ ...m, conversationId: c.id })));
        return { productId: product.id, name: product.name, mentions: mentioned.length, staffMentions: mentioned.filter(m => m.speaker === 'staff').length, customerMentions: mentioned.filter(m => m.speaker === 'customer').length, conversationCount: new Set(mentioned.map(m => m.conversationId)).size };
      }),
      issues: issuesFor(list, reviewsMap, mode),
      coverage: {
        totalConversations: list.length, analyzedConversations: list.filter(c => c.analysisStatus === 'success').length,
        limitedConversations: list.filter(c => c.analysisStatus === 'limited').length,
        messageCount: dailyMessages.length, contextMessageCount: list.reduce((sum, c) => sum + c.messages.filter(m => !sameDay(m, c.date)).length, 0),
        unparsedMessages: dailyMessages.filter(m => m.status === 'unparsed').length,
        transcribedVoices: dailyMessages.filter(m => m.type === 'voice' && m.status === 'transcribed').length,
        replyCount: replyEvents.length, replyMinutes: replyEvents.reduce((sum, event) => sum + event.durationMinutes, 0),
        timeoutEvents: replyEvents.filter(event => event.durationMinutes > thresholds(options).timeoutMinutes).length,
        reviewedIssues: allIssues.filter(issue => reviewStatus(issue, reviewsMap) !== 'pending').length,
        pendingIssues: allIssues.filter(issue => reviewStatus(issue, reviewsMap) === 'pending').length,
        dismissedIssues: allIssues.filter(issue => reviewStatus(issue, reviewsMap) === 'dismissed').length,
        confirmedIssues: allIssues.filter(issue => reviewStatus(issue, reviewsMap) === 'confirmed').length,
        redlineCandidates: issuesFor(list, reviewsMap, mode).filter(issue => issue.redline === true).length,
        confirmedRedlines: confirmedRedlineCount(list, reviewsMap),
      },
    };
  }
  // Independent status fixtures; changing a status does not invent additional conversation/model results.
  const runScenarios = [
    { id:'running',status:'running',label:'生成中',total:12,completed:5,waiting:0,failed:0,description:'已完成5个会话，其余仍在处理；仅显示已完成范围。' },
    { id:'failed',status:'failed',label:'全部分析失败',total:12,completed:0,waiting:0,failed:12,description:'12个会话均未形成可用结果，不能展示为零问题；查看失败原因后，仅补跑可恢复任务。' },
    { id: 'complete', status: 'complete', label: '全部完成', total: 12, completed: 12, waiting: 0, failed: 0, description: '12 个应处理会话均已形成结果；媒体局限仍单独展示，不等于所有语义均可判断。' },
    { id: 'waiting', status: 'waiting', label: '等待模型额度', total: 12, completed: 8, waiting: 4, failed: 0, description: '8 个已完成，4 个等待共享模型额度；已完成结果可查看，08:00 前完成仍待容量验证。' },
    { id: 'partial', status: 'partial', label: '部分完成', total: 12, completed: 11, waiting: 0, failed: 1, description: '11 个已完成，1 个失败待重试；统计仅覆盖已完成会话，不能显示全部完成。' },
    { id: 'not_generated', status: 'not_generated', label: '尚未生成', total: null, completed: 0, waiting: 0, failed: 0, description: '尚未生成或扫描范围未知，不能把未知会话数显示为零。' },
    { id: 'no_data', status: 'no_data', label: '当日无可处理会话', total: 0, completed: 0, waiting: 0, failed: 0, description: '已确认当前统计日范围内没有消息；这是无数据状态，不是生成完成。' },
  ];
  root.QualityDemo = { synthetic: true, channels, departments, accounts, dates, products, dimensions, judgementDimensionIds, dimensionStatusLabels, ruleVersion, metricLibrary, conversations, intentLabels, runScenarios, filter, aggregate, metricValue, drilldown, activeIssues, reviewStatus, issuesFor, isDeep, customerSpeechCount, riskLevel, confirmedRedlineCount };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.QualityDemo;
}(typeof window !== 'undefined' ? window : globalThis));
