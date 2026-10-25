#!/usr/bin/env node
'use strict';

// SPEC-SUIYIN-ADMIN-092@0.2.1: reproducible checks of the local synthetic model.
// Run from any directory: node <this-file> [--write]
// Without --write this is read-only. --write updates only the named evidence JSON.
// This is not a production/API/model evaluation or a browser permission test.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '../..');
const modelPath = path.join(repo, 'prototype/admin-quality-model.js');
const resultPath = process.env.QUALITY_CHECK_OUTPUT_DIR ? path.resolve(process.env.QUALITY_CHECK_OUTPUT_DIR, 'model-check.json') : path.join(repo, 'docs/verification/chat-quality-daily-20261024/model-check.json');
const source = fs.readFileSync(modelPath, 'utf8');
const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
const tenant = 'yestar-sz';
const reportDate = '2026-10-23';
const results = [];
let assertions = 0;

function truth(value, reason) { assertions++; assert.ok(value, reason); }
function equal(actual, expected, reason) { assertions++; assert.equal(actual, expected, reason); }
function same(actual, expected, reason) {
  assertions++;
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), reason);
}
function environment(storage) {
  const saved = storage || new Map();
  let failWrites = false;
  let networkCalls = 0;
  const events = [];
  const deniedNetwork = () => { networkCalls++; throw new Error('Network is forbidden in static model checks'); };
  const sandbox = {
    localStorage: {
      getItem: key => saved.get(key) || null,
      setItem: (key, value) => { if (failWrites) throw new Error('Simulated storage quota failure'); saved.set(key, value); }
    },
    fetch: deniedNetwork,
    XMLHttpRequest: deniedNetwork,
    WebSocket: deniedNetwork,
    document: { dispatchEvent: event => events.push(event) },
    CustomEvent: function (type, options) { this.type = type; this.detail = options.detail; },
    addEventListener() {}
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: modelPath, timeout: 5000 });
  return { model: sandbox.AdminQualityModel, saved, events, failWrites(value) { failWrites = value; }, networkCalls: () => networkCalls };
}
function run(id, title, oracle, fn) {
  const before = assertions;
  try { fn(); results.push({ id, title, status: 'passed', assertions: assertions - before, oracle }); }
  catch (error) { results.push({ id, title, status: 'failed', assertions: assertions - before, oracle, error: error.message }); }
}
function enable(model, channel) {
  truth(model.savePrompt(tenant, channel, { enabled: true }).ok, 'save enabled draft');
  truth(model.trialPrompt(tenant, channel).data.passed, 'matching channel trial');
  truth(model.publishPrompt(tenant, channel).ok, 'publish enabled local configuration');
}

run('AC-R003-01/AC-R005-01', 'Known fixture totals and independent response denominators',
  'Eight independently identified conversations contain 25 body messages: 22 effective and 3 excluded. Three timeout events belong to two of six applicable conversations.', () => {
    const e = environment(), m = e.model, r = m.getReport(tenant, 'wecom', reportDate);
    equal(m.today(), '2026-10-24', 'stable reviewed demonstration day');
    equal(m.yesterday(), reportDate, 'default must not drift with the execution host');
    equal(r.summary.sessions, 8);
    equal(r.summary.rawMessages, 25);
    equal(r.summary.excludedMessages, 3);
    equal(r.summary.validMessages, 22);
    equal(r.summary.responseEvents, 9);
    equal(r.summary.timeoutEvents, 3);
    equal(r.summary.timeoutSessions, 2);
    equal(r.summary.applicableSessions, 6);
    equal(r.summary.allTimeoutRate, 25, '2 / 8 conversations');
    equal(r.summary.applicableTimeoutRate, 33.33, '2 / 6 applicable conversations');
    equal(r.summary.avgResponseMinutes, 9, 'waiting lower bound must not enter replied average');
    equal(r.summary.maxResponseMinutes, 22);
    equal(r.summary.unrepliedEvents, 1);
    equal(r.summary.deepChatSessions, 1);
    equal(new Set(r.sessions.map(s => s.id)).size, 8);
    equal(r.sessions[0].customerName, r.sessions[6].customerName, 'same display name fixture');
    truth(r.sessions[0].accountId !== r.sessions[6].accountId, 'same name is not a cross-account identity key');
    equal(e.networkCalls(), 0);
  });

run('AC-R004-01/AC-R004-02/AC-R005-02/AC-R007-02', 'Cross-midnight grouping, prior-day ownership and observation context',
  '23:55→00:03 is 8 minutes; 23:55→00:16 is 21; 23:59/00:02→00:10 is 8 from the last customer message. The 28-minute prior-day event contributes neither numerator nor denominator today.', () => {
    const m = environment().model, r = m.getReport(tenant, 'wecom', reportDate);
    equal(r.sessions[0].responseEvents[0].minutes, 8);
    equal(r.sessions[1].responseEvents[0].minutes, 21);
    equal(r.sessions[2].responseEvents[0].minutes, 8);
    equal(r.sessions[2].responseEvents[0].ownerDate, reportDate);
    equal(r.sessions[6].responseEvents[0].minutes, 28);
    equal(r.sessions[6].responseEvents[0].ownerDate, '2026-10-22');
    const historical = m.filterReport(r, { receiverId: 'unknown' });
    equal(historical.summary.sessions, 1);
    equal(historical.summary.responseEvents, 0);
    equal(historical.summary.timeoutEvents, 0);
    equal(historical.summary.applicableSessions, 0);
    equal(historical.summary.applicableTimeoutRate, null, 'not applicable is not 0%');
    equal(r.sessions[0].validMessageCount, 1, 'next-day context does not increase body-message count');
    equal(r.sessions[0].intent, '初步了解', '02:00 new intent must not upgrade yesterday');
    equal(r.meta.observationCutoff, '2026-10-24T04:00:00+08:00');
  });

run('AC-R001-01/AC-R015-01', 'One filter updates all seven module inputs without changing the source report',
  'Work account 01 owns exactly four conversations, five body messages and one issue. Filtering cannot leave other-account rows or mutate the unfiltered report.', () => {
    const m = environment().model, r = m.getReport(tenant, 'wecom', reportDate), before = JSON.stringify(r);
    const accountId = r.sessions[0].accountId, f = m.filterReport(r, { accountId });
    equal(f.summary.sessions, 4);
    equal(f.summary.rawMessages, 5);
    equal(f.summary.candidateIssues, 1);
    equal(f.summary.timeoutSessions, 1);
    equal(f.summary.applicableSessions, 3);
    equal(f.coverage.expected, 4);
    equal(f.coverage.accounts.length, 1);
    truth(f.sessions.every(s => s.accountId === accountId));
    truth(f.issues.every(i => i.accountId === accountId));
    truth(f.intents.every(i => i.accountId === accountId));
    truth(f.staff.every(s => s.accountIds.length === 1 && s.accountIds[0] === accountId));
    truth(f.business.every(row => row.applicableSessions <= 4));
    equal(JSON.stringify(r), before, 'pure filtering');
    const empty = m.filterReport(r, { accountId: 'unavailable-account' });
    equal(empty.summary.sessions, 0);
    equal(empty.summary.allTimeoutRate, null);
    equal(empty.issues.length, 0);
  });

run('AC-R001-02/AC-R006-01/AC-R014-01', 'One failed channel remains independent and unresolved media prevents completion',
  'Personal WeChat has 7 successful and 1 failed tasks plus one unparsed voice and image. Retrying the same input can recover the failed task but cannot invent media content or advance the revision.', () => {
    const m = environment().model, wecom = m.getReport(tenant, 'wecom', reportDate), before = m.getReport(tenant, 'wechat', reportDate);
    equal(wecom.meta.status, 'completed');
    equal(before.meta.status, 'partial');
    equal(before.coverage.expected, 8);
    equal(before.coverage.success, 7);
    equal(before.coverage.failed, 1);
    equal(before.coverage.unparsedVoice, 1);
    equal(before.coverage.unparsedImage, 1);
    const retry = m.rerun(tenant, 'wechat', reportDate, { mode: 'retry_failed' });
    truth(retry.ok);
    equal(retry.data.meta.revision, 1);
    equal(retry.data.meta.inputDigest, before.meta.inputDigest);
    same(retry.data.snapshot, before.snapshot);
    equal(retry.data.coverage.success, 8);
    equal(retry.data.coverage.failed, 0);
    equal(retry.data.coverage.unparsedVoice, 1);
    equal(retry.data.meta.status, 'partial', 'missing parsing is not a clean report');
    same(m.getReport(tenant, 'wecom', reportDate), wecom);
  });

run('AC-R008-01/AC-R010-01/AC-R015-01', 'Scoped evidence and default-off tenants',
  'Every issue cites a real message in its own conversation. The limited-evidence fixture, another channel, non-demo tenants and an unknown channel must refuse evidence or mutations.', () => {
    const e = environment(), m = e.model, r = m.getReport(tenant, 'wecom', reportDate);
    for (const issue of r.issues) {
      const session = r.sessions.find(s => s.id === issue.sessionId);
      truth(issue.evidenceMessageIds.length > 0);
      truth(issue.evidenceMessageIds.every(id => session.messages.some(message => message.id === id)));
    }
    const allowed = m.getEvidence(tenant, 'wecom', reportDate, 1, r.sessions[0].id);
    truth(allowed.ok);
    same(allowed.data.messages, r.sessions[0].messages);
    equal(m.getEvidence(tenant, 'wecom', reportDate, 1, r.sessions[6].id).error, 'evidence_forbidden');
    truth(!m.getEvidence(tenant, 'wechat', reportDate, 1, r.sessions[0].id).ok);
    for (const disabled of ['yestar', 'yestar-bj', 'yestar-nj', 'bzds', '', 'unknown']) {
      equal(m.isEnabledTenant(disabled), false);
      equal(m.getReport(disabled, 'wecom', reportDate).sessions.length, 0);
      truth(!m.getConfig(disabled, 'wecom').enabled);
      truth(!m.savePrompt(disabled, 'wecom', { content: 'disallowed' }).ok);
      truth(!m.saveRulesDraft(disabled, { responseMinutes: 10 }).ok);
    }
    equal(m.getReport(tenant, 'all', reportDate).meta.status, 'disabled');
    equal(e.saved.size, 0, 'rejected mutations cannot create storage');
  });

run('AC-R011-01/AC-R011-02/AC-R011-03', 'Independent prompt drafts, exact trial binding and explicit publication',
  'Saving a prompt cannot enable it. An edited draft cannot reuse an earlier passing trial, a failing trial cannot publish, and the other channel configuration remains unchanged.', () => {
    const m = environment().model, other = m.getConfig(tenant, 'wechat'), original = m.getConfig(tenant, 'wecom');
    equal(original.published.enabled, false);
    equal(other.published.enabled, false);
    truth(m.savePrompt(tenant, 'wecom', { enabled: true }).ok);
    equal(m.getConfig(tenant, 'wecom').published.enabled, false);
    truth(!m.publishPrompt(tenant, 'wecom').ok);
    truth(m.trialPrompt(tenant, 'wecom').data.passed);
    truth(m.savePrompt(tenant, 'wecom', { content: original.draft.content + '\n仅对企微增加合成解释。' }).ok);
    equal(m.getConfig(tenant, 'wecom').trial, null);
    truth(!m.publishPrompt(tenant, 'wecom').ok);
    equal(m.trialPrompt(tenant, 'wecom', { simulateFailure: true }).data.passed, false);
    truth(!m.publishPrompt(tenant, 'wecom').ok);
    truth(m.trialPrompt(tenant, 'wecom').data.passed);
    truth(m.publishPrompt(tenant, 'wecom').ok);
    const published = m.getConfig(tenant, 'wecom');
    equal(published.published.enabled, true);
    equal(published.published.version, 'p2');
    same(m.getConfig(tenant, 'wechat'), other);
    equal(published.ruleSetId, other.ruleSetId, 'one common rule source');
    truth(published.templateId !== other.templateId);
    truth(published.scene !== other.scene);
  });

run('AC-R018-01/AC-R018-02/AC-R011-02', 'Common-rule publication requires each enabled channel and preserves effective rules on failure',
  'When both channels are enabled, a changed common draft invalidates old trials. One passing channel or a failed second trial cannot publish; both passing channels cause a single r2 publication.', () => {
    const m = environment().model;
    enable(m, 'wecom'); enable(m, 'wechat');
    const beforeWecom = m.getConfig(tenant, 'wecom').published, beforeWechat = m.getConfig(tenant, 'wechat').published;
    truth(m.saveRulesDraft(tenant, { responseMinutes: 15 }).ok);
    equal(m.getRules(tenant).current.responseMinutes, 20);
    equal(m.getConfig(tenant, 'wecom').trial, null);
    equal(m.getConfig(tenant, 'wechat').trial, null);
    truth(!m.publishRules(tenant).ok);
    truth(m.trialRules(tenant, 'wecom').data.passed);
    truth(!m.publishRules(tenant).ok);
    equal(m.trialRules(tenant, 'wechat', { simulateFailure: true }).data.passed, false);
    truth(!m.publishRules(tenant).ok);
    equal(m.getRules(tenant).current.version, 'r1');
    truth(m.trialRules(tenant, 'wechat').data.passed);
    truth(m.publishRules(tenant).ok);
    equal(m.getRules(tenant).current.version, 'r2');
    equal(m.getRules(tenant).current.responseMinutes, 15);
    equal(m.getConfig(tenant, 'wecom').ruleVersion, 'r2');
    equal(m.getConfig(tenant, 'wechat').ruleVersion, 'r2');
    same(m.getConfig(tenant, 'wecom').published, beforeWecom, 'common rules cannot overwrite channel prose');
    same(m.getConfig(tenant, 'wechat').published, beforeWechat);
  });

run('AC-R012-01/AC-R012-02/AC-R014-01', 'Frozen history, rerun revisions, request idempotency and failed latest revision',
  'Changing a threshold to 60 minutes and removing configured products affects a new revision only. Request retries reuse it; a later failed revision remains the latest and does not hide behind old success.', () => {
    const m = environment().model, old = m.getReport(tenant, 'wecom', reportDate), other = m.getReport(tenant, 'wechat', reportDate);
    enable(m, 'wecom');
    truth(m.saveRulesDraft(tenant, { responseMinutes: 60, largeProducts: [] }).ok);
    truth(m.trialRules(tenant, 'wecom').data.passed);
    truth(m.publishRules(tenant).ok, 'disabled other channel does not block publication');
    const rerun = m.rerun(tenant, 'wecom', reportDate, { mode: 'new_revision', requestId: 'reviewed-rerun' });
    truth(rerun.ok);
    equal(rerun.data.meta.revision, 2);
    equal(rerun.data.meta.ruleVersion, 'r2');
    equal(rerun.data.meta.templateVersion, 'p2');
    equal(rerun.data.meta.observationCutoff, old.meta.observationCutoff);
    equal(rerun.data.summary.timeoutEvents, 1, 'only the unresolved long-wait event remains above 60 minutes');
    equal(rerun.data.issues.length, 2, '21-minute issue is absent under the new rule');
    equal(rerun.data.business[0].applicableSessions, 0, 'unconfigured product rule is not applicable');
    truth(Date.parse(rerun.data.meta.actualFinish) >= Date.parse(rerun.data.meta.actualStart));
    const historic = m.getReport(tenant, 'wecom', reportDate, 1);
    equal(historic.meta.ruleVersion, 'r1');
    equal(historic.meta.inputDigest, old.meta.inputDigest);
    same(historic.snapshot, old.snapshot);
    same(historic.summary, old.summary);
    same(historic.issues, old.issues);
    equal(m.rerun(tenant, 'wecom', reportDate, { requestId: 'reviewed-rerun' }).data.meta.revision, 2);
    equal(m.getReport(tenant, 'wecom', reportDate).revisions.length, 2);
    same(m.getReport(tenant, 'wechat', reportDate), other);
    truth(m.rerun(tenant, 'wecom', reportDate, { requestId: 'failed-rerun', simulateFailure: true }).ok);
    equal(m.getReport(tenant, 'wecom', reportDate).meta.status, 'failed');
    equal(m.getReport(tenant, 'wecom', reportDate).meta.revision, 3);
    equal(m.getReport(tenant, 'wecom', reportDate, 2).meta.status, 'completed');
  });

run('AC-R009-01', 'Review and handling are separate; corrections retain original AI judgement',
  'Marking handled does not confirm an issue. Confirm then false-positive removes the confirmed count but keeps the AI candidate and three audit entries. Intent correction preserves AI intent.', () => {
    const m = environment().model, before = m.getReport(tenant, 'wecom', reportDate), issueId = before.issues[0].id;
    truth(!m.reviewIssue(tenant, 'wecom', reportDate, 1, issueId, { reviewStatus: 'confirmed', reason: '' }).ok);
    truth(m.reviewIssue(tenant, 'wecom', reportDate, 1, issueId, { handlingStatus: 'resolved', reason: '合成处理记录' }).ok);
    equal(m.getReport(tenant, 'wecom', reportDate).summary.confirmedIssues, 0);
    truth(m.reviewIssue(tenant, 'wecom', reportDate, 1, issueId, { reviewStatus: 'confirmed', reason: '合成复核确认' }).ok);
    equal(m.getReport(tenant, 'wecom', reportDate).summary.confirmedIssues, 1);
    truth(m.reviewIssue(tenant, 'wecom', reportDate, 1, issueId, { reviewStatus: 'false_positive', reason: '合成更正理由' }).ok);
    const reviewed = m.getReport(tenant, 'wecom', reportDate);
    equal(reviewed.summary.confirmedIssues, 0);
    equal(reviewed.summary.candidateIssues, 3);
    equal(reviewed.issues[0].history.length, 3);
    equal(reviewed.issues[0].handlingStatus, 'resolved');
    equal(m.getReport(tenant, 'wechat', reportDate).issues[0].history.length, 0);
    const s = before.sessions[0];
    truth(m.updateIntent(tenant, 'wecom', reportDate, 1, s.id, { intent: '明确需求', reason: '人工复核合成原文' }).ok);
    const corrected = m.getReport(tenant, 'wecom', reportDate).intents[0];
    equal(corrected.aiIntent, '初步了解');
    equal(corrected.intent, '明确需求');
    equal(corrected.history.length, 1);
  });

run('AC-R006-01/AC-R007-01/AC-R007-03/AC-R008-01', 'Fourteen synthetic dimensions preserve applicability, uncertainty and valid evidence',
  'Every conversation has fourteen explicit dimension decisions. Short conversations do not inherit required business actions; unknown media does not become a passing semantic finding; candidate findings retain their original AI state after human correction.', () => {
    const m = environment().model, reports = ['wecom', 'wechat'].map(channel => m.getReport(tenant, channel, reportDate));
    for (const report of reports) {
      for (const session of report.sessions) {
        equal(session.dimensions.length, 14);
        equal(new Set(session.dimensions.map(item => item.name)).size, 14);
        const validIds = session.messages.filter(message => message.status === 'success' && message.type !== 'system' && message.direction !== 'system').map(message => message.id);
        truth(session.dimensions.every(item => ['applicable', 'not_applicable'].includes(item.applicability)));
        truth(session.dimensions.every(item => ['sufficient', 'insufficient'].includes(item.evidenceStatus)));
        truth(session.dimensions.every(item => ['no_issue', 'candidate', 'not_applicable', 'insufficient'].includes(item.conclusion)));
        truth(session.dimensions.every(item => item.evidenceMessageIds.every(id => validIds.includes(id))));
        truth(session.dimensions.every(item => item.explanation.includes('合成预置')));
      }
    }
    const short = reports[0].sessions[3].dimensions.find(item => item.name === '重点业务动作');
    equal(short.applicability, 'not_applicable');
    equal(short.conclusion, 'not_applicable');
    const media = reports[1].sessions[7].dimensions;
    equal(media.find(item => item.name === '诉求识别').evidenceStatus, 'insufficient');
    equal(media.find(item => item.name === '诉求识别').conclusion, 'insufficient');
    equal(media.find(item => item.name === '医疗合规话术').conclusion, 'insufficient');
    equal(media.find(item => item.name === '重点业务动作').conclusion, 'insufficient');
    equal(media.find(item => item.name === '回复时效').evidenceStatus, 'sufficient', 'known timestamps may support timing despite missing semantic content');
    const riskSession = reports[0].sessions[5];
    const riskDimension = riskSession.dimensions.find(item => item.name === '医疗合规话术');
    equal(riskDimension.conclusion, 'candidate');
    truth(riskDimension.evidenceMessageIds.includes(riskSession.messages[1].id));
    const riskIssue = reports[0].issues.find(item => item.dimension === '医疗合规话术');
    truth(m.reviewIssue(tenant, 'wecom', reportDate, 1, riskIssue.id, { reviewStatus: 'false_positive', reason: '合成复核更正' }).ok);
    equal(m.getReport(tenant, 'wecom', reportDate).sessions[5].dimensions.find(item => item.name === '医疗合规话术').conclusion, 'candidate', 'human review must not overwrite the synthetic original finding');
    equal(m.getReport(tenant, 'wecom', reportDate).summary.rawMessages, 25, 'dimension enrichment leaves deterministic statistics unchanged');
  });

run('AC-R011-01/AC-R014-01', 'Storage failures, corruption and reload',
  'A rejected browser write must not mutate stored configuration or emit success. A new model instance reads saved state; malformed scoped data is an error rather than default success.', () => {
    const e = environment(), m = e.model;
    truth(m.savePrompt(tenant, 'wecom', { content: '可重复回读的合成草稿' }).ok);
    const before = m.getConfig(tenant, 'wecom'), eventsBefore = e.events.length;
    e.failWrites(true);
    const failed = m.savePrompt(tenant, 'wecom', { content: '不得保存的草稿' });
    equal(failed.ok, false);
    equal(failed.error, 'storage_failed');
    equal(e.events.length, eventsBefore, 'failed persistence cannot emit a changed event');
    e.failWrites(false);
    same(m.getConfig(tenant, 'wecom'), before);
    same(environment(e.saved).model.getConfig(tenant, 'wecom'), before, 'fresh VM reload');
    e.saved.set('admin-quality:v1:yestar-sz:wechat', '{broken');
    equal(m.getReport(tenant, 'wechat', reportDate).meta.status, 'error');
    truth(!m.savePrompt(tenant, 'wechat', { content: 'cannot overwrite corrupt state' }).ok);
    equal(e.saved.get('admin-quality:v1:yestar-sz:wechat'), '{broken');
    equal(e.networkCalls(), 0);
  });

run('AC-R017-02', 'Late start is not represented as on-time completion',
  'The fixed 2026-10-22 report starts at 05:00 and finishes at 08:30: elapsed time is 3.5 hours, while the 08:00 target is missed. This checks presentation data, not actual throughput.', () => {
    const r = environment().model.getReport(tenant, 'wecom', '2026-10-22');
    equal(r.meta.plannedStart, '2026-10-23T04:00:00+08:00');
    equal(r.meta.actualStart, '2026-10-23T05:00:00+08:00');
    equal(r.meta.actualFinish, '2026-10-23T08:30:00+08:00');
    equal((Date.parse(r.meta.actualFinish) - Date.parse(r.meta.actualStart)) / 3600000, 3.5);
    truth(Date.parse(r.meta.actualFinish) > Date.parse(r.meta.targetFinish));
    equal(r.meta.late, true);
  });

run('AC-R011-01', 'Initial prompt prose matches the canonical approved draft bodies',
  'The embedded bodies match the two SPEC prompt documents after the template-body heading; configuration notes are not silently mixed into model prose.', () => {
    const m = environment().model;
    const canonicalRoot = path.resolve(repo, '../../../prototype-sdd/specs/092-admin-chat-quality-daily/prompts');
    for (const channel of ['wecom', 'wechat']) {
      const text = fs.readFileSync(path.join(canonicalRoot, channel + '-quality-daily.md'), 'utf8');
      const body = text.split('## 模板正文\n')[1];
      truth(body, 'canonical document must have a template-body heading');
      equal(m.getConfig(tenant, channel).draft.content, body.trim());
    }
  });

run('MODEL-ASSOCIATION-01', 'Model choices come from one saved directory and respect enabled scene support',
  'Platform and enterprise examples are selectable; disabled and old-scene examples are not. Existing deepseek-existing bindings remain valid without migrating channel storage.', () => {
    const e = environment(), m = e.model, catalog = m.getModelConfigs(tenant), c = m.getConfig(tenant, 'wecom');
    equal(catalog.models.length, 4);
    equal(c.models.length, 2);
    truth(c.models.every(model => model.enabled && model.scenes.includes(c.scene)));
    same(c.models.map(model => model.scope).sort(), ['enterprise', 'platform']);
    truth(!c.models.some(model => model.id === 'deepseek-disabled-demo'));
    truth(!c.models.some(model => model.id === 'deepseek-other-scene-demo'));
    same(c.modelCatalog, catalog.models);
    equal(c.published.modelId, 'deepseek-existing');
    equal(c.publishedResolution.effectiveModelId, 'deepseek-existing');
    truth(c.publishedResolution.ok);
    equal(e.saved.size, 0, 'reading new model directory must not rewrite existing channel state');
    equal(m.getModelConfigs('yestar').models.length, 0);
    truth(!m.saveModelConfig('yestar', 'deepseek-existing', { enabled: false }).ok);
    truth(catalog.models.every(model => !Object.keys(model).some(key => /api.?key|secret|token/i.test(key))), 'no credentials in model catalog');
  });

run('MODEL-ASSOCIATION-02', 'Empty prompt binding resolves the scene default and binds trial to the final configuration',
  'The final default model changes only after a simulated platform directory update; this invalidates the prior trial and records the actually resolved configuration in the new report snapshot.', () => {
    const m = environment().model, original = m.getReport(tenant, 'wecom', reportDate);
    truth(m.savePrompt(tenant, 'wecom', { modelId: '', enabled: true }).ok);
    equal(m.getConfig(tenant, 'wecom').draft.modelId, '');
    equal(m.getConfig(tenant, 'wecom').draftResolution.effectiveModelId, 'deepseek-existing');
    truth(m.trialPrompt(tenant, 'wecom').data.passed);
    truth(m.saveModelConfig(tenant, 'deepseek-enterprise-demo', { defaultScenes: ['wecom_quality_daily'] }).ok);
    const changed = m.getConfig(tenant, 'wecom');
    equal(changed.draftResolution.effectiveModelId, 'deepseek-enterprise-demo');
    equal(changed.publishedResolution.effectiveModelId, 'deepseek-existing', 'unpublished draft cannot replace published binding');
    equal(changed.trial, null);
    truth(!m.publishPrompt(tenant, 'wecom').ok);
    const trial = m.trialPrompt(tenant, 'wecom');
    truth(trial.data.passed);
    equal(trial.data.effectiveModelId, 'deepseek-enterprise-demo');
    truth(m.publishPrompt(tenant, 'wecom').ok);
    equal(m.getConfig(tenant, 'wecom').effectiveModelId, 'deepseek-enterprise-demo');
    equal(m.getConfig(tenant, 'wechat').effectiveModelId, 'deepseek-existing');
    const rerun = m.rerun(tenant, 'wecom', reportDate, { requestId: 'actual-default' });
    truth(rerun.ok);
    equal(rerun.data.meta.modelConfigId, 'deepseek-enterprise-demo');
    equal(rerun.data.meta.modelName, 'deepseek-enterprise-demo');
    equal(rerun.data.snapshot.modelId, 'deepseek-enterprise-demo');
    equal(rerun.data.snapshot.modelConfig.binding, 'default');
    equal(rerun.data.snapshot.modelConfig.scope, 'enterprise');
    same(m.getReport(tenant, 'wecom', reportDate, 1).snapshot, original.snapshot);
    equal(m.getReport(tenant, 'wecom', reportDate, 1).meta.modelName, original.meta.modelName);
  });

run('MODEL-ASSOCIATION-03', 'Disabled, unsupported and missing-default configurations fail closed',
  'A binding is retained with an explicit failure instead of silently selecting an available alternative. New trials and new batches fail; reading historical data still works.', () => {
    const m = environment().model;
    enable(m, 'wecom');
    truth(m.saveModelConfig(tenant, 'deepseek-existing', { enabled: false }).ok);
    let c = m.getConfig(tenant, 'wecom');
    equal(c.published.modelId, 'deepseek-existing');
    equal(c.publishedResolution.error, 'model_disabled');
    equal(c.trial, null);
    truth(!m.trialPrompt(tenant, 'wecom').data.passed);
    truth(!m.rerun(tenant, 'wecom', reportDate, { requestId: 'invalid-model' }).ok);
    equal(m.getReport(tenant, 'wecom', reportDate).meta.revision, 1);
    truth(m.saveModelConfig(tenant, 'deepseek-existing', { enabled: true, scenes: ['customer_chat'] }).ok);
    equal(m.getConfig(tenant, 'wecom').draftResolution.error, 'model_scene_mismatch');
    truth(!m.trialPrompt(tenant, 'wecom').data.passed);
    truth(m.savePrompt(tenant, 'wecom', { modelId: '' }).ok);
    truth(m.saveModelConfig(tenant, 'deepseek-existing', { defaultScenes: [] }).ok);
    equal(m.getConfig(tenant, 'wecom').draftResolution.error, 'default_model_missing');
    truth(!m.trialPrompt(tenant, 'wecom').data.passed);
    equal(m.getReport(tenant, 'wecom', reportDate).meta.status, 'completed');
  });

run('MODEL-ASSOCIATION-04', 'Final model parameter changes invalidate both prompt and common-rule validation',
  'Changing the selected configuration after trial makes that trial stale. Common-rule publication must also revalidate the effective model parameters of enabled channels.', () => {
    const e = environment(), m = e.model;
    enable(m, 'wecom'); enable(m, 'wechat');
    truth(m.saveRulesDraft(tenant, { responseMinutes: 15 }).ok);
    truth(m.trialRules(tenant, 'wecom').data.passed);
    truth(m.trialRules(tenant, 'wechat').data.passed);
    truth(m.saveModelConfig(tenant, 'deepseek-existing', { parameters: { temperature: 0.2, maxTokens: 2048 } }).ok);
    equal(m.getConfig(tenant, 'wecom').trial, null);
    equal(m.getRules(tenant).trials.wecom, null);
    equal(m.getRules(tenant).trials.wechat, null);
    truth(!m.publishRules(tenant).ok);
    equal(m.getRules(tenant).current.version, 'r1');
    const newTrial = m.trialPrompt(tenant, 'wecom');
    truth(newTrial.data.passed);
    equal(newTrial.data.resolvedModel.parameters.temperature, 0.2);
    equal(newTrial.data.resolvedModel.parameters.maxTokens, 2048);
    const before = m.getModelConfigs(tenant);
    e.failWrites(true);
    truth(!m.saveModelConfig(tenant, 'deepseek-existing', { enabled: false }).ok);
    e.failWrites(false);
    same(m.getModelConfigs(tenant), before);
    equal(e.networkCalls(), 0);
  });

run('MODEL-DIRECTORY-READONLY', 'Enterprise model page preserves captured rows and exposes no model mutation controls',
  'Tenant-isolated synthetic snapshots and four clearly marked quality fixtures share one read-only table. Missing tenants never reuse another catalog.', () => {
    const { JSDOM } = require(process.env.QUALITY_JSDOM_ROOT || 'E:/dev/suiyin-insights/node_modules/jsdom');
    const uiSource = fs.readFileSync(path.join(repo, 'prototype/admin-quality-models.js'), 'utf8');
    const capturedModels = Array.from({length:7},(_,index)=>({id:'synthetic-model-'+index,label:'合成采样模型 '+index,scope:'platform',provider:'合成供应商',endpointDisplay:'未连接（合成）',scenes:['single'],enabled:index!==6}));
    function pageFor(tenantId, captured = true, capturedAt = '2026-10-24T12:26:17.751Z', accessEvidence = null) {
      const dom = new JSDOM('<body><main id="app"></main></body>', { url: 'https://static-check.invalid/?tenant=' + tenantId, runScripts: 'outside-only' });
      const w = dom.window;
      function node(tag, cls, text) { const n = w.document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
      w.Admin = { tenant: tenantId, tenantInfo: { name: '合成租户' }, route: 'aiEntModelConfig', source: {capturedAt:'2026-09-18T00:00:00Z'}, node, $: id => w.document.getElementById(id), pageHead: () => { const h = node('header'); h.append(node('h1', '', 'AI模型管理'),node('button','','本租户采样 · 2026-09-18')); return h; }, button: (text, action, cls) => { const b = node('button', cls, text); b.onclick = action; return b; } };
      w.AdminPromptSnapshots={schemaVersion:1,tenants:captured?{[tenantId]:{tenant:tenantId,capturedAt,modelOptionsStatus:'captured',models:capturedModels,scenes:[{id:'single',label:'单聊'}]}}:{'yestar-sz':{tenant:'yestar-sz',capturedAt,modelOptionsStatus:'captured',models:capturedModels}}};
      if(accessEvidence)w.AdminPromptSnapshots.tenants[tenantId]={tenant:tenantId,status:'not-captured',...accessEvidence};
      w.AdminViews = { render: () => false }; w.eval(source); w.eval(uiSource);
      return dom;
    }
    const dom = pageFor(tenant), w = dom.window;
    truth(w.AdminQualityModels.render());
    equal(w.document.querySelectorAll('.aqm-table').length, 1);
    equal(w.document.querySelectorAll('[data-model-origin="captured"]').length, 7);
    equal(w.document.querySelectorAll('[data-model-origin="synthetic"]').length, 4);
    const capturedRows = [...w.document.querySelectorAll('[data-model-origin="captured"]')];
    for (let i = 0; i < capturedRows.length; i++) {
      const cells = [...capturedRows[i].children].map(td => td.firstChild?.textContent || '');
      same(cells, ['平台','合成采样模型 '+i,'合成供应商','未连接（合成）','单聊',i===6?'停用':'启用']);
    }
    equal(w.document.querySelectorAll('input,select,textarea').length, 0);
    same([...w.document.querySelectorAll('button')].map(b => b.textContent), ['查看提示词管理']);
    truth(w.document.body.textContent.includes('由平台维护'));
    truth(w.document.body.textContent.includes('待平台增加支持'));
    equal(w.document.querySelector('.aqm-provenance').textContent,'本租户采样 · 2026-10-24');
    truth(!w.document.body.textContent.includes('2026-09-18'));
    equal(w.document.querySelector('.page-sub').textContent,'合成租户');
    const other = pageFor('yestar');
    truth(other.window.AdminQualityModels.render());
    equal(other.window.document.querySelectorAll('[data-model-origin="captured"]').length, 7);
    equal(other.window.document.querySelectorAll('[data-model-origin="synthetic"]').length, 0);
    const missing=pageFor('jbfs',false);truth(missing.window.AdminQualityModels.render());equal(missing.window.document.querySelectorAll('[data-model-origin="captured"]').length,0);truth(missing.window.document.body.textContent.includes('未采集'));
    equal(missing.window.document.querySelector('.aqm-provenance').textContent,'本租户未采集 · 采样时间未知');
    const noDate=pageFor('yestar',true,null);truth(noDate.window.AdminQualityModels.render());equal(noDate.window.document.querySelector('.aqm-provenance').textContent,'本租户采样 · 时间未知');
    const invalidDate=pageFor('yestar',true,'invalid-date');truth(invalidDate.window.AdminQualityModels.render());equal(invalidDate.window.document.querySelector('.aqm-provenance').textContent,'本租户采样 · 时间未知');
    const accessNote='当前已登录，但菜单无AI管理；模型直达返回人员管理，具体原因未知。';
    const unavailable=pageFor('hqjd',false,null,{accessStatus:'authenticated_route_unavailable',captureReason:'page_not_available_for_current_login',note:accessNote});truth(unavailable.window.AdminQualityModels.render());
    equal(unavailable.window.document.querySelector('.aqm-intro .aqm-pending').textContent,accessNote);
    truth(!unavailable.window.document.body.textContent.includes('确认暂无模型配置')&&!unavailable.window.document.body.textContent.includes('待登录'));
    equal(unavailable.window.document.querySelectorAll('[data-model-origin="captured"]').length,0);
    unavailable.window.close();invalidDate.window.close();noDate.window.close();missing.window.close();other.window.close(); dom.window.close();
  });

const failed = results.filter(item => item.status === 'failed');
const evidence = {
  spec: process.env.QUALITY_CHECK_SPEC || 'SPEC-SUIYIN-ADMIN-092@0.3.0',
  artifactClass: 'static-html',
  generatedAt: new Date().toISOString(),
  fixtureToday: '2026-10-24',
  command: 'node prototype/checks/quality-daily-model-check.cjs --write',
  target: 'prototype/admin-quality-model.js',
  targetSha256: sourceHash,
  relatedSources: ['prototype/admin-quality-models.js', 'prototype/admin-quality-models.css'].map(file => ({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex') })),
  status: failed.length ? 'failed' : 'passed',
  scenarios: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  assertions,
  limitations: ['Synthetic fixtures and in-memory localStorage only.', 'No real DeepSeek, production API, production scheduler or medical accuracy validation.', 'Model API permission demonstrations are not server-side access control.', 'No actual four-hour capacity or browser visual verification.'],
  results
};
if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
}
console.log(JSON.stringify({ status: evidence.status, scenarios: evidence.scenarios, assertions, failed: failed.map(item => ({ id: item.id, error: item.error })), targetSha256: sourceHash, resultFile: process.argv.includes('--write') ? path.relative(repo, resultPath).replace(/\\/g, '/') : null }));
process.exitCode = failed.length ? 1 : 0;
