/**
 * [INPUT]: FitnessApp.state.form / result；WenKeleTracker / WenKeleAbility 公开接口
 * [OUTPUT]: 全局 WenKeleAuditFollowup —— 数据导出 / 草稿保存 / 结果页导航 / 无障碍 / 能力起点建议
 * [POS]: 产品审计后续（P1-P5）；独立层，不改训练学引擎（规格 specs/2026-11-17-audit-followup/）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const WenKeleAuditFollowup = {
  VERSION: 1,
  DRAFT_KEY: 'wenkele_form_draft',
  FORM_FIELDS: [
    'heightCm', 'weightKg', 'age', 'gender', 'bodyGoal', 'trainingFocus',
    'experience', 'goal', 'scenario', 'daysPerWeek', 'activity', 'specialCondition'
  ],

  // ---- P1 数据导出（原生 Blob，无网络、无依赖）----
  exportData(result) {
    let records = {}, events = [], ability = null;
    try { if (typeof WenKeleTracker !== 'undefined') { const d = WenKeleTracker.exportData(); records = d.records || {}; events = d.events || []; } } catch (e) { /* 降级为空 */ }
    try { if (typeof WenKeleAbility !== 'undefined') ability = WenKeleAbility.exportForDebug(); } catch (e) { /* 降级为空 */ }
    return {
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      plan: result || null,
      records,
      ability,
      events
    };
  },

  downloadJSON(result) {
    const data = this.exportData(result);
    const text = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    const name = `wenkele-data-${date}.json`;
    if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') {
      return { ok: false, reason: '环境不支持下载', data, name };
    }
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    if (a.click) a.click();
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) { /* noop */ } }, 1000);
    return { ok: true, name, bytes: text.length };
  },

  // ---- P2 表单草稿（只写 sessionStorage，白名单字段）----
  saveDraft(form) {
    if (!form || typeof sessionStorage === 'undefined') return false;
    const draft = {};
    this.FORM_FIELDS.forEach(k => { if (form[k] != null) draft[k] = form[k]; });
    try { sessionStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft)); return true; }
    catch (e) { return false; }
  },

  loadDraft() {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(this.DRAFT_KEY);
      if (!raw) return null;
      const v = JSON.parse(raw);
      if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
      const out = {};
      this.FORM_FIELDS.forEach(k => { if (v[k] != null) out[k] = v[k]; });
      return Object.keys(out).length ? out : null;
    } catch (e) { return null; }
  },

  clearDraft() {
    if (typeof sessionStorage === 'undefined') return false;
    try { sessionStorage.removeItem(this.DRAFT_KEY); return true; } catch (e) { return false; }
  },

  // ---- P3 结果页目录（纯展示与滚动）----
  NAV_ITEMS: [
    { id: 'secToday', label: '今日' },
    { id: 'secPlan', label: '方案' },
    { id: 'secNutrition', label: '营养' },
    { id: 'secRecovery', label: '恢复' },
    { id: 'secEvidence', label: '循证' },
    { id: 'secSafety', label: '安全' }
  ],

  navHTML() {
    return `<nav class="af-nav" aria-label="结果页目录">
      ${this.NAV_ITEMS.map(i => `<button type="button" class="af-nav-item" data-af-nav="${i.id}">${i.label}</button>`).join('')}
    </nav>`;
  },

  scrollTo(id) {
    if (typeof document === 'undefined') return false;
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  },

  // ---- P4 运行时无障碍：只加语义，不改视觉 ----
  enhanceA11y() {
    if (typeof document === 'undefined') return 0;
    let n = 0;
    const tabs = document.getElementById('viewTabs');
    if (tabs) {
      tabs.setAttribute('role', 'tablist');
      tabs.querySelectorAll('.view-tab').forEach(t => {
        t.setAttribute('role', 'tab');
        t.setAttribute('aria-selected', t.classList.contains('active') ? 'true' : 'false');
        n++;
      });
    }
    const bar = tabs && tabs.parentElement ? tabs.parentElement.querySelector('.progress-bar') : null;
    if (bar) {
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuemin', '1');
      bar.setAttribute('aria-valuemax', '4');
      const active = document.querySelector('.step-dot.active');
      if (active) bar.setAttribute('aria-valuenow', active.textContent.trim() || '1');
      n++;
    }
    const resultBody = document.getElementById('resultBody');
    if (resultBody) {
      resultBody.querySelectorAll('section.result-card').forEach(sec => {
        const h = sec.querySelector('h2');
        if (!h) return;
        if (!h.id) { h.id = 'af-title-' + (++n); }
        sec.setAttribute('aria-labelledby', h.id);
      });
    }
    return n;
  },

  // ---- P5 能力起点建议：只展示、不改算法 ----
  AXIS_TO_GROUP: {
    arm: ['胸部', '肩部'], back: ['背部'],
    leg: ['腿部'], waist: ['核心'], cardio: ['有氧与体能']
  },

  buildStartHint(result, specialCondition) {
    if (typeof WenKeleAbility === 'undefined') return null;
    // 特殊人群不显示（沿用能力地图 C5 口径）
    if (['youth', 'elderly', 'postpartum'].includes(specialCondition)) return null;
    let axes = [];
    try { axes = WenKeleAbility.getAxes(); } catch (e) { return null; }
    const tested = axes.filter(a => a.key !== 'steady' && !a.pending && typeof a.value === 'number');
    if (!tested.length) return null;
    const weakest = tested.reduce((min, a) => (a.value < min.value ? a : min));
    const groups = this.AXIS_TO_GROUP[weakest.key] || [];
    // 仅当方案动作中确实出现对应肌群才显示（不撒谎）
    const planGroups = ((result && result.weeklyPlan) || [])
      .flatMap(d => (d.exercises || []).map(e => e.group));
    if (!groups.some(g => planGroups.includes(g))) return null;
    return {
      label: weakest.label,
      groups,
      text: `从能力记录看，「${weakest.label}」是你的起点较低的一项，这套方案已经安排了相关动作。`
    };
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleAuditFollowup;
