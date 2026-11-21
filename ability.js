/**
 * [INPUT]: 依赖 tracker.js 的 WenKeleTracker（读写范式与行为数据）；localStorage
 * [OUTPUT]: 全局 WenKeleAbility —— 开场问卷、6 轴能力分、自测、段位、报告数据
 * [POS]: 能力地图的数据层，与打卡记录严格分离（规格 C4）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 规格：specs/2026-11-14-ability-map/ T1
 * C3：本模块数据绝不参与 PlanGen / NutritionGen；C8：复用 WenKeleTracker 读写范式
 * C1：本模块不产生前台文案（术语禁用于 UI 层）
 */

const WenKeleAbility = {
  KEY_ABILITY: 'wenkele_ability',
  AXES: ['arm', 'back', 'leg', 'waist', 'cardio', 'steady'],
  // 面板用 2 字属性名（见 naming.md），仅 UI 层展示
  LABELS: { arm: '臂力', back: '背力', leg: '腿力', waist: '腰力', cardio: '气力', steady: '恒力' },
  // 开场问卷与自测的 A/B/C/D → 初始能力分（整数，游戏面板感）
  GRADE_SCORE: { A: 6, B: 10, C: 14, D: 18 },
  WEEK_MS: 7 * 24 * 60 * 60 * 1000,
  STALE_WEEKS: 8,
  DEFAULT_PERIOD_WEEKS: 4,

  _mem: null,

  // C8：委托已有读写范式，不另造存储抽象；Node 单测无 tracker 时降级到同款实现
  _read(key, fallback) {
    if (typeof WenKeleTracker !== 'undefined' && WenKeleTracker._read) {
      return WenKeleTracker._read(key, fallback);
    }
    const v = this._mem && this._mem[key];
    if (v !== undefined) return v;
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  },

  _write(key, value) {
    if (typeof WenKeleTracker !== 'undefined' && WenKeleTracker._write) {
      return WenKeleTracker._write(key, value);
    }
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { if (!this._mem) this._mem = {}; this._mem[key] = value; return false; }
  },

  _blankState() {
    return {
      version: 1,
      onboarding: null,
      axes: { arm: null, back: null, leg: null, waist: null, cardio: null, steady: 0 },
      baseline: null,
      selfTests: [],
      nodes: { arm: [], back: [], leg: [], waist: [], cardio: [], steady: [] },
      reports: []
    };
  },

  getState() {
    const v = this._read(this.KEY_ABILITY, null);
    if (!v || typeof v !== 'object' || Array.isArray(v) || v.version !== 1) return this._blankState();
    const base = this._blankState();
    return {
      ...base, ...v,
      axes: { ...base.axes, ...(v.axes || {}) },
      nodes: { ...base.nodes, ...(v.nodes || {}) },
      selfTests: Array.isArray(v.selfTests) ? v.selfTests : [],
      reports: Array.isArray(v.reports) ? v.reports : []
    };
  },

  saveState(state) { return this._write(this.KEY_ABILITY, state); },

  _validGrade(g) { return Object.prototype.hasOwnProperty.call(this.GRADE_SCORE, g); },

  // 开场问卷：点亮 5 条自测轴；恒力来自行为数据，不占问卷题
  // Replan 2（2026-11-15 用户反馈）：原 3 题导致背力/气力长期空白，改为 5 题
  setOnboarding(answers) {
    const map = { push: 'arm', squat: 'leg', plank: 'waist', pull: 'back', cardio: 'cardio' };
    for (const k of Object.keys(map)) {
      if (answers[k] != null && !this._validGrade(answers[k])) return false;
    }
    const state = this.getState();
    const axes = { ...state.axes };
    Object.entries(map).forEach(([q, axis]) => {
      if (answers[q] != null) axes[axis] = this.GRADE_SCORE[answers[q]];
    });
    axes.steady = this.computeSteady();
    const at = new Date().toISOString();
    state.onboarding = {
      push: answers.push ?? null, squat: answers.squat ?? null, plank: answers.plank ?? null,
      at, skipped: false
    };
    state.axes = axes;
    if (!state.baseline) state.baseline = { at, axes: { ...axes } };
    this.saveState(state);
    return true;
  },

  skipOnboarding() {
    const state = this.getState();
    state.onboarding = { push: null, squat: null, plank: null, at: new Date().toISOString(), skipped: true };
    this.saveState(state);
    return true;
  },

  isOnboarded() {
    const o = this.getState().onboarding;
    return !!o; // 作答或跳过都算已完成，不再重复弹出
  },

  // 恒力：来自行为数据（连续周数 × 完成率），口径与其余 5 轴不同（naming.md）
  computeSteady() {
    if (typeof WenKeleTracker === 'undefined') return 0;
    const streak = WenKeleTracker.getStreak ? WenKeleTracker.getStreak() : 0;
    const totals = WenKeleTracker.getTotalStats ? WenKeleTracker.getTotalStats() : { totalSessions: 0 };
    return Math.min(20, Math.round(streak * 2 + Math.min(6, totals.totalSessions || 0)));
  },

  // 6 轴视图：pending 轴返回 null，UI 显示「待点亮」而非 0
  getAxes() {
    const state = this.getState();
    const axes = { ...state.axes, steady: this.computeSteady() };
    return this.AXES.map(key => ({
      key,
      label: this.LABELS[key],
      value: axes[key],
      pending: axes[key] === null || axes[key] === undefined
    }));
  },

  _scoreOf(v) {
    if (typeof v === 'number' && isFinite(v)) return Math.max(0, Math.min(20, Math.round(v)));
    return this._validGrade(v) ? this.GRADE_SCORE[v] : null;
  },

  // 周期自测：带时间戳；>8 周则以本次为新基线，旧数据留在 history 不参与当前计算
  recordSelfTest(input, nowMs) {
    const now = nowMs || Date.now();
    const at = new Date(now).toISOString();
    const state = this.getState();
    const prev = state.selfTests.length ? Date.parse(state.selfTests[state.selfTests.length - 1].at) : Date.parse(state.onboarding?.at || '');
    const stale = !isNaN(prev) && (now - prev) > this.STALE_WEEKS * this.WEEK_MS;

    const parsed = {};
    Object.entries(input || {}).forEach(([k, v]) => {
      if (!this.AXES.includes(k) || k === 'steady') return;
      const score = this._scoreOf(v);
      if (score !== null) parsed[k] = score;
    });
    if (Object.keys(parsed).length === 0) return false;

    const axes = { ...state.axes };
    Object.entries(parsed).forEach(([k, score]) => { axes[k] = score; });
    axes.steady = this.computeSteady();
    state.axes = axes;
    if (!state.baseline || stale) state.baseline = { at, axes: { ...axes } };
    state.selfTests.push({ at, axes: parsed, stale });
    this.saveState(state);
    return true;
  },

  // 默认 4 周；只返回轻提示数据，绝不弹窗（requirements 2.4）
  getSelfTestDue(periodWeeks, nowMs) {
    const period = periodWeeks || this.DEFAULT_PERIOD_WEEKS;
    const now = nowMs || Date.now();
    const state = this.getState();
    const lastTest = state.selfTests.length ? Date.parse(state.selfTests[state.selfTests.length - 1].at) : NaN;
    const onboard = Date.parse(state.onboarding?.at || '');
    const ref = !isNaN(lastTest) ? lastTest : (!isNaN(onboard) ? onboard : NaN);
    if (isNaN(ref)) return { due: false, daysSince: null, periodWeeks: period, hasBaseline: false };
    const days = Math.max(0, Math.floor((now - ref) / (24 * 60 * 60 * 1000)));
    return {
      due: days >= period * 7,
      daysSince: days,
      periodWeeks: period,
      stale: days >= this.STALE_WEEKS * 7,
      hasBaseline: true
    };
  },

  // 节点解锁：幂等；段位只由已解锁节点总数推进，不由自测分数决定
  unlockNode(axis, nodeIdx) {
    if (!this.AXES.includes(axis)) return false;
    const state = this.getState();
    const list = state.nodes[axis] || [];
    if (!list.includes(nodeIdx)) { list.push(nodeIdx); state.nodes[axis] = list; }
    this.saveState(state);
    return true;
  },

  getUnlockedCount() {
    const n = this.getState().nodes;
    return Object.values(n).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
  },

  // 9 层：阈值按 exerciseLibrary 真实阶梯节点总数 28 校准（Replan 1），否则顶层不可达
  getTier() {
    const count = this.getUnlockedCount();
    const thresholds = [0, 2, 5, 8, 12, 16, 20, 24, 28];
    let tier = 1;
    for (let i = 0; i < thresholds.length; i++) if (count >= thresholds[i]) tier = i + 1;
    return tier;
  },

  // 报告数据：木桶 = 5 条自测轴里最短的一条。
  // 恒力排除（Replan 1）：它来自行为数据、初始恒为 0，参与比较会永远霸占最短轴。
  buildReport() {
    const state = this.getState();
    const axes = this.getAxes().filter(a => !a.pending && a.key !== 'steady');
    const weakest = axes.length ? axes.reduce((min, a) => (a.value < min.value ? a : min)) : null;
    return {
      at: new Date().toISOString(),
      axes: this.getAxes(),
      baseline: state.baseline,
      unlocked: this.getUnlockedCount(),
      tier: this.getTier(),
      weakest: weakest ? { key: weakest.key, label: weakest.label, value: weakest.value } : null
    };
  },

  saveReport(report) {
    const state = this.getState();
    state.reports.push(report || this.buildReport());
    this.saveState(state);
    return true;
  },

  exportForDebug() { return this.getState(); }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleAbility;
