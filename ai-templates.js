/**
 * [INPUT]: 脱敏 context + 已清洗字段（done/total/rate/firstAction/weakest/focus）
 * [OUTPUT]: 三段式解读对象 { observation, reason, adjustment } 或 null
 * [POS]: local 解读的三个确定性变体模板（规格 specs/2026-11-19-ai-regenerate/）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 三个变体 = 同一批事实、不同组织角度；不做"AI 重新思考"的假象。
 * 所有字段必须来自 context 真实数据，禁止编造。
 */

const WenKeleAITemplates = {
  count: 3,

  build(variant, f) {
    const v = ((variant % 3) + 3) % 3 || 0;
    const recorded = f.recorded;
    const base = recorded
      ? `${f.done} / ${f.total} 组动作，完成度约 ${f.rate}%`
      : `每周 ${f.dayCount} 个训练日，还没有练习记录`;
    const label = f.focusLabel || '';

    if (v === 0) return {
      observation: `${label}本周记录了 ${base}。`,
      reason: f.low
        ? `安排了 ${f.frequency}天，可能是当前节奏偏密。`
        : (f.firstAction
          ? `「${f.firstAction}」这类动作已排进计划，节奏与记录保持稳定。`
          : '训练节奏与记录保持稳定，继续保持。'),
      adjustment: f.low
        ? (f.firstAction
          ? `下周先把「${f.firstAction}」所在的两个训练日完成，再加量。`
          : '下周先完成两个训练日，再加量。')
        : (f.weakest
          ? `下一次可留意「${f.weakest}」相关动作的质量。`
          : '下一次在状态允许时，尝试让动作更稳一点。')
    };

    if (v === 1) return {
      observation: `${label}看训练日：这一周排了 ${f.dayCount} 天，记录到 ${f.done} 组动作。`,
      reason: recorded
        ? `已完成的动作里包含「${f.firstAction || '计划中的动作'}」，说明计划有在推进。`
        : '还没开始记录，先做第一天最重要。',
      adjustment: f.weakest
        ? `下一次练「${f.weakest}」相关动作时，先把它做稳再谈加量。`
        : '下一次先完成计划中的一个训练日，再逐步加量。'
    };

    return {
      observation: `${label}换个角度看完成情况：${base}。`,
      reason: f.low
        ? `完成度还有提升空间，可能与当前安排偏密有关。`
        : (f.firstAction
          ? `「${f.firstAction}」已排进计划，完成度稳定，动作质量比数量更值得关注。`
          : '完成度稳定，动作质量比数量更值得关注。'),
      adjustment: recorded
        ? '保持这个节奏，下一次把每组动作做得更稳一点就好。'
        : '从最容易的一个动作开始，先建立记录习惯。'
    };
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleAITemplates;
