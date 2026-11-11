// Scoped excerpts from the MIT Room template src/bridge.js. The bridge nickname is supplied by its host.
export function isSilentMarker(text) {
  return /^\s*\[SILENT\]\s*$/i.test(String(text ?? '').trim());
}

function isDirectedAtAi(textContent) {
  const lower = String(textContent ?? '').toLowerCase();
  const aiMention = /deepseek|claude|chatgpt|gpt|小蓝鱼|小鲸鱼|鲸鱼|d指导|d老师|d师傅|深度求索|\bds\b|ai|人工智障|机器人|模型/.test(lower);
  const challenge = /强|弱|行不行|能不能|会不会|是不是|一半|水平|垃圾|废物|白嫖|菜|不如|厉害|赢|输|比.*强|比.*弱/.test(lower);
  const question = /[?？吗呢吧]|怎么|为什么|哪|谁/.test(lower);
  if (aiMention && (question || challenge)) return true;
  // "你/您" + 疑问/比较/挑战（放宽，避免漏掉"你有claude一半强吗"这类直接问）
  if (/(你|您).{0,10}(吗|呢|？|\?|怎么|是不是|能不能|行不行|有没有|有|没有|比|不如|强|弱|一半|厉害|垃圾|菜|赢|输)/.test(lower)) return true;
  if (/^(你|您)(是不是|行不行|能不能|会不会|觉得|有|没有)/.test(lower)) return true;
  // "你是...还是... / 你是...吗 / 你是...？"（如：你是人类还是ai、你是真人吗）
  if (/(你|您)是[^？?。！!]{0,14}(还是|或者|吗|么|？|\?)/.test(lower)) return true;
  // 追问/催促：AI 没回时的真人式催促
  if (/怎么不说话|人呢|回我|说话啊|理我|别装死|在不在|装死|说话/.test(lower)) return true;
  return false;
}

export function evaluateWakeTriggerV2(st, event, plainContent, quoteTargetIsSelf, selfNickname) {
  if (event.message_type === 'private') return 'private';
  const tr = st.wakeConfig?.triggers ?? {};
  if (tr.anyMessage) return 'anyMessage';
  if (tr.atMention) {
    const atSelf = Array.isArray(event?.message) && event.message.some((seg) => seg?.type === 'at' && String(seg.data?.qq) === String(event?.self_id ?? ''));
    if (atSelf || quoteTargetIsSelf) return 'atMention';
  }
  if (tr.nameMention && selfNickname) {
    // 用 plainContent（当前消息自己的文字）：textContent 含 `[引用 某人：原文]`，
    // 引用一条恰好提到机器人昵称的旧消息不该算「叫了名字」（那是被动触发的付费回合）。
    const lower = String(plainContent ?? '').toLowerCase();
    if (lower.includes('@' + selfNickname.toLowerCase()) || lower.includes(selfNickname.toLowerCase())) return 'nameMention';
  }
  if (Array.isArray(tr.keywords) && tr.keywords.length) {
    const lower = String(plainContent ?? '').toLowerCase();
    for (const kw of tr.keywords) {
      const kwStr = String(kw ?? '').toLowerCase();
      if (!kwStr) continue;
      // 短英文/数字关键词（如 DS/R1）用词边界匹配，避免 ADS/BDSM/DSL 误触发。
      if (/^[a-z0-9]+$/.test(kwStr) && kwStr.length <= 4) {
        if (new RegExp(`\\b${kwStr}\\b`, 'i').test(lower)) return `keyword:${kw}`;
      } else if (lower.includes(kwStr)) {
        return `keyword:${kw}`;
      }
    }
  }
  if (tr.question && isDirectedAtAi(plainContent)) return 'question';
  if (Array.isArray(tr.speakerIds) && tr.speakerIds.length) {
    const speakerId = String(event?.user_id ?? event?.sender?.user_id ?? '');
    if (speakerId && tr.speakerIds.some((id) => String(id) === speakerId)) {
      const senderLabel = event?.sender?.card || event?.sender?.nickname || speakerId;
      return `speaker:${senderLabel}`;
    }
  }
  if (Number(tr.probability) > 0 && Math.random() < Number(tr.probability)) return 'probability';
  return null;
}

export function readThroughSeqV2(st, additional = []) {
  const seen = new Set(st.modelSeenSeqs || []);
  for (const msg of additional) if (Number.isSafeInteger(msg?.seq) && msg.seq > 0) seen.add(msg.seq);
  const seqs = st.unread.map((m) => m.seq).filter((seq) => Number.isSafeInteger(seq) && seq > 0);
  const lowestBuffered = seqs.length ? Math.min(...seqs) : Infinity;
  const lastUnread = Number.isSafeInteger(st.lastUnreadSeq) ? st.lastUnreadSeq : 0;
  let through = Number.isSafeInteger(st.lastReadThroughSeq) ? st.lastReadThroughSeq : 0;
  // A seq may be reached only when it was offered to the model, or when the buffer
  // no longer holds it at all (evicted by unreadLimit, so it can never be displayed
  // again). Scoping the skip to the real buffer range is what keeps this from ever
  // stepping over a still-pending message.
  const reachable = (seq) => seen.has(seq) || (seq < lowestBuffered && seq <= lastUnread);
  while (through < lastUnread && reachable(through + 1)) through += 1;
  return through;
}

export function noteModelMessagesV2(st, messages) {
  // Bound receipts by the actual unread buffer; historical/self messages need no receipt.
  const unread = new Set(st.unread.map((m) => m.seq));
  st.modelSeenSeqs = new Set([...st.modelSeenSeqs || []].filter((seq) => unread.has(seq)));
  for (const msg of messages) {
    if (Number.isSafeInteger(msg?.seq) && msg.seq > 0 && unread.has(msg.seq)) st.modelSeenSeqs.add(msg.seq);
  }
  return readThroughSeqV2(st);
}

export function requestedReadThroughSeqV2(st, body, isAgent) {
  if (!Object.prototype.hasOwnProperty.call(body, 'throughSeq')) return null;
  const seq = body.throughSeq;
  const max = isAgent ? readThroughSeqV2(st) : st.lastUnreadSeq;
  if (!Number.isSafeInteger(seq) || seq < 0 || seq > max || seq > st.lastUnreadSeq) {
    const error = new Error('throughSeq 必须是不超过已展示连续消息水位的非负安全整数；请先读取未读消息并使用返回的 readThroughSeq');
    error.statusCode = 400;
    throw error;
  }
  return seq;
}

export function acknowledgeMessagesV2(st, throughSeq) {
  const before = st.unread.length;
  if (throughSeq === null) {
    // Compatibility for console actions and old presets; new agents pass a cursor.
    st.unread = [];
    st.lastReadThroughSeq = st.lastUnreadSeq;
  } else {
    st.unread = st.unread.filter((m) => !Number.isSafeInteger(m.seq) || m.seq > throughSeq);
    st.lastReadThroughSeq = Math.max(st.lastReadThroughSeq || 0, throughSeq);
  }
  noteModelMessagesV2(st, []);
  return before - st.unread.length;
}
