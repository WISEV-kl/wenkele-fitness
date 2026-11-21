/**
 * [INPUT]: AI 输出文本 + 脱敏 context（doneEx/totalEx/rate/dayCount）
 * [OUTPUT]: 数字事实一致性校验结果 { ok, reason? }
 * [POS]: 事实核验层（规格 specs/2026-11-19-ai-groundedness/）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 设计：只校验「陈述已完成事实」的句式，不扫描全文数字——
 * "下周做 2 个训练日"是建议不是事实，全文扫描会误伤（precision/recall 取舍）。
 */

const WenKeleAIGrounding = {
  // s 为已 normalize 的文本；复用 ai-coach 的 normalize（若可用），否则本地降级
  _norm(text, coach) {
    return coach && typeof coach.normalize === 'function'
      ? coach.normalize(text) : String(text == null ? '' : text).replace(/\s+/g, '');
  },

  validateNumbers(text, ctx, coach) {
    if (!ctx || typeof ctx !== 'object') return { ok: true };
    const s = this._norm(text, coach);
    const num = '(\\d+(?:\\.\\d+)?)';

    // 完成度约 X% —— 允许 ±5 个百分点（模型四舍五入）
    const rateMatch = s.match(new RegExp('完成度(?:约)?' + num + '%'));
    if (rateMatch && ctx.totalEx > 0 && typeof ctx.rate === 'number') {
      const expected = ctx.rate * 100;
      if (Math.abs(parseFloat(rateMatch[1]) - expected) > 5) {
        return { ok: false, reason: `完成度与记录不符（说${rateMatch[1]}%，实际约${Math.round(expected)}%）` };
      }
    }
    // X / Y 组 —— 精确
    const frac = s.match(new RegExp(num + '/' + num + '组'));
    if (frac && ctx.totalEx > 0 &&
        (parseInt(frac[1], 10) !== ctx.doneEx || parseInt(frac[2], 10) !== ctx.totalEx)) {
      return { ok: false, reason: `组数与记录不符（说${frac[1]}/${frac[2]}，实际${ctx.doneEx}/${ctx.totalEx}）` };
    }
    // 记录了 X 组 —— 必须等于 doneEx
    const done = s.match(new RegExp('记录(?:了)?' + num + '组'));
    if (done && ctx.totalEx > 0 && parseInt(done[1], 10) !== ctx.doneEx) {
      return { ok: false, reason: `记录组数与事实不符（说${done[1]}，实际${ctx.doneEx}）` };
    }
    // 每周安排 X 个训练日 —— 精确
    const day = s.match(new RegExp('每周安排' + num + '个训练日'));
    if (day && ctx.dayCount > 0 && parseInt(day[1], 10) !== ctx.dayCount) {
      return { ok: false, reason: `训练日数与方案不符（说${day[1]}，实际${ctx.dayCount}）` };
    }
    return { ok: true };
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleAIGrounding;
