/**
 * [INPUT]: data.js 动作字典（equipment/teach）；WenKeleTracker 记录；today-view.js 动作卡
 * [OUTPUT]: 全局 WenKeleRecommendationUI —— 器械预告 / 教学 / 上次记录 / 换动作 / 请假护盾 / 难度标识
 * [POS]: 批次 A 体验层；不改 getSystem/applyTimeBudget/getDayExercises 选动作逻辑（规格 C1）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 规格：specs/2026-11-16-recommendation-refinement/
 */

const WenKeleRecommendationUI = {
  SHIELD_KEY: 'wenkele_rest_shield',
  SHIELD_PER_WEEK: 1,

  // ---- 器械与教学片段（纯展示，C3 不反向影响打卡）----
  equipOf(ex) { return ex.equipment || '—'; },

  teachHTML(ex) {
    const t = ex.teach || {};
    const parts = [];
    if (t.warmup) parts.push(`<li><b>热身</b> ${t.warmup}</li>`);
    if (t.eccentric) parts.push(`<li><b>离心</b> ${t.eccentric}</li>`);
    if (t.common_error) parts.push(`<li><b>常见代偿</b> ${t.common_error}</li>`);
    if (t.cue2) parts.push(`<li><b>发力</b> ${t.cue2}</li>`);
    if (!parts.length) return '';
    return `<ul class="rc-teach-list">${parts.join('')}</ul>`;
  },

  // 上次记录：同方案内同动作位最近一次有数据的记录（当前记录之外）
  lastRecord(planId, dayIdx, exIdx) {
    if (typeof WenKeleTracker === 'undefined') return null;
    const rec = WenKeleTracker.getRecords(planId);
    if (!rec || !rec.days) return null;
    const days = Object.keys(rec.days).sort((a, b) => Number(b) - Number(a));
    for (const d of days) {
      if (Number(d) === dayIdx) continue;
      const entry = rec.days[d] && rec.days[d][String(exIdx)];
      if (entry && (entry.sets != null || entry.reps != null || entry.weight != null)) return entry;
    }
    return null;
  },

  lastRecordHTML(entry) {
    if (!entry) return '';
    const parts = [];
    if (entry.sets != null) parts.push(`${entry.sets} 组`);
    if (entry.reps != null) parts.push(`${entry.reps} 次`);
    if (entry.weight != null) parts.push(`${entry.weight} kg`);
    if (!parts.length) return '';
    return `<span class="rc-last">上次：${parts.join(' × ')}</span>`;
  },

  cardExtrasHTML(planId, dayIdx, exIdx, ex) {
    const last = this.lastRecordHTML(this.lastRecord(planId, dayIdx, exIdx));
    return `
      <div class="rc-extras">
        <div class="rc-line">
          <span class="rc-equip"><i class="fas fa-dumbbell"></i> ${this.equipOf(ex)}</span>
          ${last}
          <button type="button" class="rc-swap" data-rc-swap="${exIdx}" title="换成同肌群的其他动作">
            <i class="fas fa-arrows-rotate"></i> 换一个
          </button>
          <button type="button" class="rc-teach-toggle" data-rc-teach="${exIdx}">
            <i class="fas fa-lightbulb"></i> 要点
          </button>
        </div>
        <div class="rc-teach" data-rc-teach-body="${exIdx}" hidden>${this.teachHTML(ex)}</div>
      </div>`;
  },

  // ---- 换动作：优先等效替换表，其次同 group 轮转；不改 planId，不动记录位（C5）----
  findSwap(day, exIdx) {
    const list = day.exercises || [];
    const ex = list[exIdx];
    if (!ex) return null;
    const subs = (typeof FITNESS_DATA !== 'undefined' && FITNESS_DATA.exerciseSubstitutes) || [];
    const hit = subs.find(s => s.home === ex.name || s.gym === ex.name || ex.name.includes(s.gym) || ex.name.includes(s.home));
    if (hit) {
      const target = ex.group === '背部' || ex.group === '腿部' ? hit.home : (hit.gym || hit.home);
      const pool = this.allExercises();
      const found = pool.find(e => target && (e.name === target || target.includes(e.name) || e.name.includes(target)));
      if (found && found.name !== ex.name) return found;
    }
    const pool = this.allExercises().filter(e => e.group === ex.group);
    const idx = pool.findIndex(e => e.name === ex.name);
    if (idx >= 0 && pool.length > 1) return pool[(idx + 1) % pool.length];
    return null;
  },

  allExercises() {
    const lib = (typeof FITNESS_DATA !== 'undefined' && FITNESS_DATA.exerciseLibrary) || {};
    const out = [];
    Object.keys(lib).forEach(k => ['home', 'gym'].forEach(p => {
      (lib[k][p] || []).forEach(e => out.push({ group: lib[k].name, ...e }));
    }));
    return out;
  },

  // ---- 请假护盾：每周 1 次；只记 shield，不写打卡，不涨恒力（C4）----
  weekKey(nowMs) {
    const d = new Date(nowMs || Date.now());
    const day = (d.getDay() + 6) % 7; // 周一为 0
    const monday = new Date(d.getTime() - day * 86400000);
    return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
  },

  readShields() {
    try {
      const raw = localStorage.getItem(this.SHIELD_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },

  shieldUsed(weekKey) {
    const s = this.readShields();
    return !!(s[weekKey] && s[weekKey].count >= this.SHIELD_PER_WEEK);
  },

  useShield(weekKey, nowMs) {
    if (this.shieldUsed(weekKey)) return { ok: false, reason: '本周已休息过一次' };
    const s = this.readShields();
    s[weekKey] = { count: 1, at: new Date(nowMs || Date.now()).toISOString() };
    try { localStorage.setItem(this.SHIELD_KEY, JSON.stringify(s)); } catch (e) { return { ok: false, reason: '本地存储不可用' }; }
    return { ok: true };
  },

  // ---- 难度标识：纯展示，按当日语动作数与 focus 派生（C3）----
  difficultyLabel(day) {
    const n = (day.exercises || []).length;
    if (n <= 2) return '轻松';
    if (n <= 3) return '适中';
    return '有点狠';
  },

  // ---- 周历估算热量：粗估，明确标「估算」，不改营养方案 ----
  estimateDayKcal(day, targetCal) {
    const n = (day.exercises || []).length;
    if (!n) return null;
    const base = Number(targetCal) || 0;
    return Math.round(base * (0.22 + Math.min(n, 5) * 0.03));
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleRecommendationUI;
