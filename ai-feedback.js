/**
 * [INPUT]: 用户反馈（理由 + 被评解读指纹/来源/变体）；localStorage
 * [OUTPUT]: 全局 WenKeleAIFeedback —— 反馈记录 / 去抖 / eval 候选导出
 * [POS]: 反馈可追溯层（规格 specs/2026-11-19-feedback-traceability/）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 设计：存解读指纹（hash）不存原文——既能复现定位「当时说了什么」，
 * 又隐私最小化、不占 localStorage 空间。数据飞轮「反馈→标注」这一环靠它闭合。
 */

const WenKeleAIFeedback = {
  KEY: 'wenkele_ai_feedback',
  DEDUP_MS: 60000,

  // 解读指纹：确定性 hash（djb2 变体）
  hashOutput(text) {
    if (!text) return null;
    const s = typeof text === 'string' ? text : JSON.stringify(text);
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return 'h_' + h.toString(36);
  },

  read() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  },

  record(payload) {
    if (typeof localStorage === 'undefined' || !payload) return false;
    try {
      const list = this.read();
      const hash = this.hashOutput(payload.output || null);
      const now = Date.now();
      // 同一条解读 60 秒内只记一次（防误触/刷屏污染 eval 池）
      if (hash && list.some(f => f.outputHash === hash && now - (f.ts || 0) < this.DEDUP_MS)) return false;
      list.push({
        at: new Date().toISOString(), ts: now,
        reason: String(payload.reason || ''),
        outputHash: hash,
        source: payload.source || null,
        variant: typeof payload.variant === 'number' ? payload.variant : null
      });
      localStorage.setItem(this.KEY, JSON.stringify(list.slice(-100)));
      return true;
    } catch (e) { return false; }
  },

  exportCandidates() {
    return this.read().map(f => ({
      id: f.outputHash ? `eval_${f.outputHash}` : `eval_${f.at}`,
      at: f.at,
      reason: String(f.reason || ''),
      outputHash: f.outputHash || null,
      modelSource: f.source || null,
      variant: typeof f.variant === 'number' ? f.variant : null,
      source: 'user_feedback'
    }));
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleAIFeedback;
