(function (root) {
  'use strict';

  /* Read-only extraction from the current PC main-chat template, not a PC-page embed.
   * Source: E:/AI 项目/佰智德三/碎银原型/suiyin-pc-chat/prototype/prototype_v1.0.html
   * SHA-256: 1967f633c3393ebed4f79757ce708de9833471410356d612da27d40f12314991
   * Row/avatar/name: 9549–9572, 9703–9707; text bubble: 9681–9700.
   * Voice icon: 9377–9379; voice/transcript layout: 9405–9452.
   * Device SVG function: 12874–12888 (copied verbatim below).
   * Main template slice 9549–9707 (LF) SHA-256:
   * 6c93e6830f9f2443d984fb9b5f741e373f32e3dfeaaf696a4a81c8a3cae115cb
   * Native PC send/context menus, state mutations, timers and AI hooks are excluded.
   * Bundle text is always escaped: it is source text, never trusted isHtml markup.
   */
  var SOURCE = Object.freeze({
    file: 'suiyin-pc-chat/prototype/prototype_v1.0.html',
    sha256: '1967f633c3393ebed4f79757ce708de9833471410356d612da27d40f12314991',
    messageLines: '9549–9572,9681–9707',
    voiceLines: '9377–9379,9405–9452',
    deviceLines: '12874–12888',
    deviceSha256: 'b1f5903ac3c06c07ace81ff03277d7022f74506f25b1fea9cdd30acaa7327cc4'
  });
  var bindings = new WeakMap();
  var TYPE_LABELS = Object.freeze({
    text: '文本', voice: '语音', sound: '语音', image: '图片', img: '图片',
    emoji: '表情', mediadatabase: '素材库消息', location: '位置',
    miniprogram: '小程序', miniapp: '小程序', link: '链接', relay: '合并聊天记录',
    merged: '合并聊天记录', redpack: '红包', video: '视频', namecard: '名片',
    contact: '名片', groupinvite: '群邀请', finder: '视频号', pat: '拍一拍',
    official: '公众号消息', revoke: '撤回通知', notify: '系统通知', file: '文件',
    transfer: '转账'
  });

  function str(value) { return value == null ? '' : String(value); }
  function esc(value) {
    return str(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeImageUrl(value) {
    var url = str(value).trim();
    if (!url || /[\u0000-\u0020\u007f\\]/.test(url)) return '';
    if (/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(url)) return url;
    if (/^https?:\/\//i.test(url)) { try { return new URL(url).href; } catch (_) { return ''; } }
    if (/^(?:\/(?!\/)|\.\/|\.\.\/)/.test(url) && !/[<>"']/.test(url)) return url;
    return '';
  }
  function initials(name) { return Array.from(str(name).trim()).slice(0, 2).join('') || '?'; }
  function metadata(message) {
    return message.metadata && typeof message.metadata === 'object' && !Array.isArray(message.metadata) ? message.metadata : {};
  }
  function isStaff(message) { return message.direction === 'staff' || message.direction === 'me'; }
  function known(value) { return value != null && str(value).trim() !== '' && !/^(?:unknown|null|undefined)$/i.test(str(value).trim()); }
  function normalDevice(value) {
    var devices = { ios: 'iOS', iphone: 'iOS', ipad: 'iOS', android: '安卓', '安卓': '安卓', win: 'Win', windows: 'Win', mac: 'Mac', macos: 'Mac' };
    return devices[str(value).toLowerCase()] || '';
  }

  function deviceIconSvg(device) {
  if (!device) return '';
  const s = 14; // icon size
  const icons = {
    // iOS = 手机轮廓（蓝色），与Mac笔记本形状区分
    'iOS': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><rect x="6" y="1" width="12" height="22" rx="2.5" stroke="#007AFF" stroke-width="1.8" fill="none"/><circle cx="12" cy="20" r="1.2" fill="#007AFF"/><line x1="9.5" y1="3.5" x2="14.5" y2="3.5" stroke="#007AFF" stroke-width="1" stroke-linecap="round"/></svg>`,
    // 安卓 = 机器人头（绿色）
    '安卓': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="11" rx="2.5" fill="#78C257"/><circle cx="8.5" cy="14.5" r="1.3" fill="#fff"/><circle cx="15.5" cy="14.5" r="1.3" fill="#fff"/><line x1="7" y1="5" x2="5" y2="2" stroke="#78C257" stroke-width="1.5" stroke-linecap="round"/><line x1="17" y1="5" x2="19" y2="2" stroke="#78C257" stroke-width="1.5" stroke-linecap="round"/><path d="M5 10a7 7 0 0 1 14 0" fill="#78C257"/></svg>`,
    // Win = 四色田字格（微软经典红绿蓝黄）
    'Win': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="9" height="9" rx="1" fill="#F25022"/><rect x="13" y="2" width="9" height="9" rx="1" fill="#7FBA00"/><rect x="2" y="13" width="9" height="9" rx="1" fill="#00A4EF"/><rect x="13" y="13" width="9" height="9" rx="1" fill="#FFB900"/></svg>`,
    // Mac = 笔记本轮廓（深灰），与iOS手机形状区分
    'Mac': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="13" rx="1.5" stroke="#555" stroke-width="1.8" fill="none"/><line x1="1" y1="18.5" x2="23" y2="18.5" stroke="#555" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="9.5" r="2.5" stroke="#555" stroke-width="1.2" fill="none"/><path d="M14.2 8.2c-.3-.5-.8-.9-1.4-1.1" stroke="#555" stroke-width="0.8" stroke-linecap="round" fill="none"/></svg>`
  };
  return icons[device] || '';
}

  function voiceTrackIconHtml(isMe) {
  return `<svg class="voice-icon" width="14" height="18" viewBox="0 0 24 24" fill="none" style="${isMe ? 'transform:scaleX(1);' : 'transform:scaleX(-1);'}"><path class="voice-bar-3" d="M12 3C16.97 3 21 7.03 21 12s-4.03 9-9 9" stroke="#333" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="1"/><path class="voice-bar-2" d="M12 7c2.76 0 5 2.24 5 5s-2.24 5-5 5" stroke="#333" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="1"/><path class="voice-bar-1" d="M12 11c.55 0 1 .45 1 1s-.45 1-1 1" stroke="#333" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="1"/></svg>`;
}

  function formatTime(value) {
    if (!known(value)) return '时间未知';
    var raw = str(value);
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(raw)) return raw.replace('T', ' ');
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)) {
      var date = new Date(raw);
      if (!Number.isNaN(date.getTime())) {
        var parts = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
        var fields = {}; parts.forEach(function (part) { fields[part.type] = part.value; });
        return fields.year + '-' + fields.month + '-' + fields.day + ' ' + fields.hour + ':' + fields.minute + ':' + fields.second;
      }
    }
    return raw;
  }
  function statusLabel(status) {
    if (!known(status)) return '状态未知';
    var key = str(status).toLowerCase();
    var labels = { failed: '发送失败', send_failed: '发送失败', sending: '发送中', resending: '重发中', recalled: '已撤回', revoked: '已撤回', withdrawn: '已撤回', sent: '已发送', delivered: '已送达', success: '已发送' };
    return labels[key] || ('状态：' + str(status));
  }
  function scopeLabel(scope) {
    return scope === 'prior_context' ? '日前上下文' : scope === 'response_context' ? '日后响应上下文' : '';
  }
  function avatarHtml(name, imageUrl, staff, device, sourceText) {
    var url = safeImageUrl(imageUrl);
    return '<div class="qr-pc-avatar-stack' + (staff ? ' is-staff' : '') + '">' +
      '<div class="qr-pc-avatar-box" title="' + esc(name) + '">' +
      '<span class="qr-pc-avatar-fallback' + (staff ? ' is-staff' : '') + '" aria-hidden="true">' + esc(initials(name)) + '</span>' +
      (url ? '<img class="qr-pc-avatar" src="' + esc(url) + '" alt="' + esc(name) + '头像" loading="lazy" referrerpolicy="no-referrer">' : '') +
      '</div>' + (staff && device ? '<span class="qr-pc-device" title="' + esc(sourceText) + '" aria-label="' + esc(sourceText) + '">' + deviceIconSvg(device) + '</span>' : '') + '</div>';
  }
  function detailHtml(label, text, extraClass) {
    return '<details class="qr-pc-detail ' + (extraClass || '') + '"><summary>' + esc(label) + '</summary><div class="qr-pc-detail-text">' + esc(text) + '</div></details>';
  }
  function transcriptAvailable(message, meta) {
    if (known(meta.transcript) || known(message.voiceText)) return true;
    return message.parseStatus === 'complete' || message.asrStatus === 'available_transcript' || meta.asrStatus === 'available_transcript';
  }
  function hasAttachedText(text, label) {
    var value = str(text).trim();
    return value && value !== '[' + label + ']' && value !== '【' + label + '】' && value !== label;
  }
  function bodyHtml(message, staff) {
    var meta = metadata(message), type = str(message.type || 'text').toLowerCase();
    var text = str(message.text), label = TYPE_LABELS[type] || ('未知消息类型：' + type);
    if (type === 'text') return '<div class="qr-pc-bubble qr-pc-text">' + (text ? esc(text) : '<span class="qr-pc-placeholder">文本内容为空</span>') + '</div>';
    if (type === 'voice' || type === 'sound') {
      var rawDuration = message.duration != null ? message.duration : meta.duration;
      var duration = Number(rawDuration);
      var durationText = rawDuration != null && Number.isFinite(duration) && duration > 0 ? duration + '″' : '时长未知';
      var transcript = known(meta.transcript) ? str(meta.transcript) : known(message.voiceText) ? str(message.voiceText) : text;
      var canShowTranscript = transcriptAvailable(message, meta) && transcript.trim();
      return '<div class="qr-pc-voice"><div class="qr-pc-bubble qr-pc-voice-bubble"><div class="qr-pc-voice-line">' + voiceTrackIconHtml(staff) + '<span>' + esc(durationText) + '</span></div><div class="qr-pc-media-note">语音原音未取得</div></div>' +
        (canShowTranscript ? detailHtml('查看语音转写', transcript, 'qr-pc-transcript') : '<div class="qr-pc-media-note">语音内容未解析</div>') + '</div>';
    }
    var imageUrl = type === 'image' || type === 'img' ? safeImageUrl(meta.imageUrl || meta.mediaUrl) : '';
    var body = imageUrl ? '<img class="qr-pc-media-image" src="' + esc(imageUrl) + '" alt="已取得的图片消息" loading="lazy" referrerpolicy="no-referrer"><span class="qr-pc-image-failure" hidden>图片加载失败</span>' :
      '<div class="qr-pc-bubble qr-pc-media-placeholder"><span class="qr-pc-media-type">[' + esc(label) + ']</span><span class="qr-pc-media-note">' + (type === 'revoke' || type === 'notify' || type === 'pat' ? '原始事件记录' : '原始媒体未取得') + '</span></div>';
    if (hasAttachedText(text, label)) body += detailHtml('查看消息附带文字', text, 'qr-pc-attached-text');
    if (known(meta.ocrText)) body += detailHtml('查看已取得的 OCR 文字', meta.ocrText, 'qr-pc-ocr');
    return '<div class="qr-pc-media">' + body + '</div>';
  }
  function quoteHtml(message, ids) {
    var meta = metadata(message), quote = meta.quote || message.quote;
    if (!quote || typeof quote !== 'object') return '';
    var target = str(quote.messageId || quote.id || quote.refId);
    var text = str(quote.text || quote.transcript);
    return '<details class="qr-pc-detail qr-pc-quote"><summary>引用' + (known(quote.senderName || quote.name) ? ' · ' + esc(quote.senderName || quote.name) : '') + '</summary>' +
      '<div class="qr-pc-detail-text">' + esc(text || '引用内容未取得') + '</div>' +
      (target && ids.has(target) ? '<button type="button" class="qr-pc-jump" data-qr-pc-jump="' + esc(target) + '">定位已载入原消息</button>' : '') + '</details>';
  }
  function renderMessage(message, options, ids, highlights) {
    var meta = metadata(message), staff = isStaff(message), system = message.direction === 'system';
    var id = str(message.id), seq = message.seq != null ? str(message.seq) : '?';
    var highlighted = !!id && highlights.has(id), time = formatTime(message.at);
    var context = scopeLabel(message.scope), status = statusLabel(message.status);
    var sourceParts = [meta.sourceLabel, meta.deviceLabel || meta.device].filter(known).map(str);
    var source = Array.from(new Set(sourceParts)).join(' · ') || '未知';
    var account = str(options.accountName || '工作号名称未知');
    var customer = str(options.customerNickname || meta.senderNickname || meta.senderName || options.customerName || '客户昵称未知');
    var name = staff ? account : message.direction === 'customer' ? customer : '发送方未知';
    var operator = staff ? (known(meta.senderName) ? str(meta.senderName) : '未知') : '';
    var sender = staff ? account + ' · 实际操作人：' + operator : name;
    var device = normalDevice(meta.device);
    var attributes = ' data-message-id="' + esc(id) + '" data-seq="' + esc(seq) + '"' + (highlighted ? ' data-highlighted="true"' : '');
    var metaHtml = '<div class="qr-pc-message-meta"><time>' + esc(time) + '</time><span>#' + esc(seq) + '</span>' +
      (context ? '<span class="qr-pc-scope">' + esc(context) + '</span>' : '') + (highlighted ? '<span class="qr-pc-evidence-label">关联证据</span>' : '') + '</div>';
    if (system) return '<div class="qr-pc-message qr-pc-system' + (highlighted ? ' is-highlighted' : '') + '"' + attributes + '><div>' + esc(message.text || TYPE_LABELS[str(message.type).toLowerCase()] || '系统消息') + '</div>' + metaHtml + '</div>';
    var avatar = avatarHtml(name, meta.avatarUrl || (staff ? options.accountAvatar : options.customerAvatar), staff, device, source);
    return '<article class="qr-pc-message ' + (staff ? 'is-sent' : 'is-received') + (highlighted ? ' is-highlighted' : '') + '"' + attributes + '>' +
      (!staff ? avatar : '') + '<div class="qr-pc-message-stack"><div class="qr-pc-sender">' + esc(sender) + '</div>' +
      bodyHtml(message, staff) + quoteHtml(message, ids) + metaHtml +
      '<div class="qr-pc-source-status"><span>来源：' + esc(source) + '</span><span' + (/失败|撤回/.test(status) ? ' class="qr-pc-status-warning"' : '') + '>' + esc(status) + '</span></div>' +
      '</div>' + (staff ? avatar : '') + '</article>';
  }
  function render(messages, options) {
    options = options || {};
    var list = Array.isArray(messages) ? messages.filter(function (item) { return item && typeof item === 'object'; }) : [];
    var ids = new Set(list.map(function (item) { return str(item.id); }).filter(Boolean));
    var highlightValues = options.highlightIds instanceof Set ? Array.from(options.highlightIds) : Array.isArray(options.highlightIds) ? options.highlightIds : [];
    var highlights = new Set(highlightValues.map(str));
    var html = '', lastDate = '';
    list.forEach(function (message) {
      var time = formatTime(message.at), date = /^\d{4}-\d{2}-\d{2}/.test(time) ? time.slice(0, 10) : '';
      if (date && date !== lastDate) { html += '<div class="qr-pc-date-divider">' + esc(date) + '</div>'; lastDate = date; }
      html += renderMessage(message, options, ids, highlights);
    });
    return '<div class="qr-pc-chat" aria-label="只读聊天记录">' + (html || '<div class="qr-pc-empty">暂无可展示的原始消息</div>') + '</div>';
  }
  function bind(container) {
    if (!container || typeof container.addEventListener !== 'function') return function () {};
    if (bindings.has(container)) return bindings.get(container);
    function showImageFallback(img) {
      if (!img || !img.matches || !img.matches('.qr-pc-avatar,.qr-pc-media-image')) return;
      img.hidden = true;
      if (img.matches('.qr-pc-media-image')) { var note = img.nextElementSibling; if (note && note.classList.contains('qr-pc-image-failure')) note.hidden = false; }
    }
    function onError(event) { showImageFallback(event.target); }
    function onClick(event) {
      var button = event.target && event.target.closest ? event.target.closest('[data-qr-pc-jump]') : null;
      if (!button || !container.contains(button) || !button.closest('.qr-pc-chat')) return;
      var list = button.closest('.qr-pc-chat'), targetId = button.getAttribute('data-qr-pc-jump');
      var target = Array.from(list.querySelectorAll('.qr-pc-message[data-message-id]')).find(function (node) { return node.getAttribute('data-message-id') === targetId; });
      if (target) { event.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }
    container.addEventListener('error', onError, true);
    container.addEventListener('click', onClick);
    if (container.querySelectorAll) container.querySelectorAll('.qr-pc-avatar,.qr-pc-media-image').forEach(function (img) { if (img.complete && img.naturalWidth === 0) showImageFallback(img); });
    var release = function () { container.removeEventListener('error', onError, true); container.removeEventListener('click', onClick); bindings.delete(container); };
    bindings.set(container, release);
    return release;
  }
  root.AdminQualityPCMessages = Object.freeze({ render: render, bind: bind, source: SOURCE });
})(window);
