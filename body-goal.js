/**
 * [INPUT]: 用户性别与体型方向；BMI 数值
 * [OUTPUT]: 全局 WenKeleBodyGoal —— 方向取值域、体系/热量双参数、部位权重、健康守卫
 * [POS]: fitness-coach 的体型方向契约层（规格 2026-11-15-body-goal-routing）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 设计要点（Replan 1）：goal 只用于 PlanGen 选训练体系，heat 独立决定热量与宏量模式。
 * 二者解耦，避免「塑形派生 muscle」误走 +250 kcal 盈余分支。
 * C7：不定义任何新热量常量，数值一律沿用 data.js 的 calorieAdjust / minCalories。
 */

const WenKeleBodyGoal = {
  VALUES: ['v_taper', 'cut', 'tone', 'build'],
  // 正式分类名，不用梗、不用体型标签；男生方向不显示
  LABELS: { cut: '减脂', tone: '塑形', build: '增肌' },
  // 女生三选一的展示顺序
  FEMALE_OPTIONS: ['cut', 'tone', 'build'],

  // 方向 → 三参数。focus 为肌群权重（数值越大越优先），供 getDayExercises 做动作侧重
  PARAMS: {
    v_taper: {
      goal: 'muscle', heat: 'maintain',
      focus: { back: 2, shoulders: 2, chest: 1, legs: 1, core: 1 },
      label: '宽肩窄腰'
    },
    cut: {
      goal: 'fatloss', heat: 'deficit',
      focus: { legs: 2, back: 1, core: 1, chest: 1, shoulders: 1 },
      label: '减脂'
    },
    tone: {
      goal: 'muscle', heat: 'maintain',
      focus: { back: 1, shoulders: 1, chest: 1, legs: 1, core: 1 },
      label: '塑形'
    },
    build: {
      goal: 'muscle', heat: 'surplus',
      focus: { back: 2, shoulders: 1, legs: 2, chest: 1, core: 1 },
      label: '增肌'
    }
  },

  validate(value) { return this.VALUES.includes(value); },

  // 男：系统自动且唯一；女：留空待用户选，不预选
  deriveFromGender(gender) {
    if (gender === 'male') return 'v_taper';
    if (gender === 'female') return null;
    return null;
  },

  deriveGoal(bodyGoal) {
    return this.PARAMS[bodyGoal] ? this.PARAMS[bodyGoal].goal : null;
  },

  deriveHeat(bodyGoal) {
    return this.PARAMS[bodyGoal] ? this.PARAMS[bodyGoal].heat : null;
  },

  getParams(bodyGoal) {
    const p = this.PARAMS[bodyGoal];
    if (!p) return null;
    return { goal: p.goal, heat: p.heat, focus: { ...p.focus }, label: p.label };
  },

  getLabel(bodyGoal) {
    return this.LABELS[bodyGoal] || (bodyGoal === 'v_taper' ? '' : '');
  },

  // 兼容旧方案：无 bodyGoal 时按性别推导，不报错
  fromResult(result) {
    if (result && this.validate(result.bodyGoal)) return result.bodyGoal;
    const g = result && result.profile && result.profile.gender;
    return this.deriveFromGender(g);
  },

  // 健康下限守卫：BMI < 18.5 且减脂方向 → 不应输出缺口
  // 依据：中科院样本女生理想 BMI 17.87，低于中国健康下限 18.5
  BMI_FLOOR: 18.5,
  isHealthyForCut(bmi) {
    const v = Number(bmi);
    return !isNaN(v) && v >= this.BMI_FLOOR;
  },

  shouldBlockDeficit(bodyGoal, bmi) {
    return bodyGoal === 'cut' && !this.isHealthyForCut(bmi);
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleBodyGoal;
