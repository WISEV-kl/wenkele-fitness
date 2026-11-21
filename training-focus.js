/**
 * [INPUT]: bodyGoal（体型方向）；trainingFocus（用户选择的训练侧重）
 * [OUTPUT]: 全局 WenKeleTrainingFocus —— 体系派生、互斥规则、旧方案兼容
 * [POS]: 体型方向与训练体系之间的正交契约层（规格 specs/2026-11-17-training-focus-entry/）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 设计：体型方向决定「结果」（heat + focus），训练侧重决定「练法」（goal）。
 * 二者正交 —— 不恢复旧的「训练目标」字段，避免减脂被问两遍。
 * C6：不定义任何热量常量，heat/focus 一律来自 WenKeleBodyGoal。
 */

const WenKeleTrainingFocus = {
  VALUES: ['auto', 'strength', 'conditioning', 'posture'],
  LABELS: {
    auto: '均衡发展',
    strength: '力量优先',
    conditioning: '体能优先',
    posture: '体态优先'
  },
  DESCS: {
    auto: '跟随上面的体型方向',
    strength: '三大项为主，逐步加重',
    conditioning: '循环训练 + HIIT，提升心肺',
    posture: '评估、激活、强化、拉伸'
  },
  GOALS: ['muscle', 'fatloss', 'strength', 'conditioning', 'posture'],

  validate(v) { return this.VALUES.includes(v); },

  // 旧方案无字段 → auto；非法值 → auto（B1/B2）
  fromResult(result) {
    if (result && this.validate(result.trainingFocus)) return result.trainingFocus;
    return 'auto';
  },

  // 唯一派生真源：auto/null → 跟随 bodyGoal；显式选择 → 直传
  deriveGoal(bodyGoal, trainingFocus) {
    const focus = this.validate(trainingFocus) ? trainingFocus : 'auto';
    if (focus === 'auto') {
      return typeof WenKeleBodyGoal !== 'undefined'
        ? WenKeleBodyGoal.deriveGoal(bodyGoal) : null;
    }
    return this.GOALS.includes(focus) ? focus : null;
  },

  // 体态优先互斥：体态体系走矫正/激活分支，不被部位权重重排串味
  getAskExtension(trainingFocus) {
    return { skipFocus: trainingFocus === 'posture' };
  },

  // 展示文案：auto 显示「跟随方向」，其余显示正式名
  getLabel(trainingFocus) {
    const v = this.validate(trainingFocus) ? trainingFocus : 'auto';
    return v === 'auto' ? '跟随方向' : this.LABELS[v];
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleTrainingFocus;
