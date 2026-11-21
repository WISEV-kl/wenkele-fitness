/**
 * [INPUT]: localStorage（无外部依赖）；由 app.js 传入 planId 与 weeklyPlan
 * [OUTPUT]: 全局 WenKeleTracker：训练记录 CRUD、周聚合、连续周数、事件队列、进度渲染
 * [POS]: fitness-coach 的训练状态层，与 db.js 的方案快照存储严格分离（C3）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 规格：specs/2026-11-13-training-loop/
 * D1 动作级打卡 / D2 方案周期为周 / D3 完成率按动作数 / D4 事件仅本地
 * B2 删除方案时一并删除训练记录
 */

const WenKeleTracker = {
  KEY_RECORDS: 'wenkele_workout_records',
  KEY_EVENTS: 'wenkele_events',
  KEY_LAST_VISIT: 'wenkele_last_visit',
  KEY_LAST_PLAN: 'wenkele_last_plan',
  MAX_EVENTS: 500,
  WEEK_MS: 7 * 24 * 60 * 60 * 1000,

  _mem: null, // localStorage 不可用时的内存兜底

  // ---- 统一存储读写（C4/C5：沿用 db.js 的降级范式） ----
  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // 写满 / 禁用：落内存，保证本次会话不崩
      if (!this._mem) this._mem = {};
      this._mem[key] = value;
      return false;
    }
  },

  _allRecords() {
    const v = this._mem && this._mem[this.KEY_RECORDS];
    const r = v || this._read(this.KEY_RECORDS, {});
    return (r && typeof r === 'object' && !Array.isArray(r)) ? r : {};
  },

  _uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  // ---- 打卡 CRUD（D1 动作级） ----
  getRecords(planId) {
    const all = this._allRecords();
    return all[planId] || null;
  },

  ensurePlan(planId, weeklyPlan) {
    const all = this._allRecords();
    const list = Array.isArray(weeklyPlan) ? weeklyPlan : [];
    const totalEx = list.reduce((n, d) => n + (d.exercises || []).length, 0);
    if (!all[planId]) {
      all[planId] = {
        createdAt: new Date().toISOString(),
        systemSplit: (!Array.isArray(weeklyPlan) && weeklyPlan && weeklyPlan.split) || '',
        totalEx,
        days: {}
      };
      this._write(this.KEY_RECORDS, all);
    } else if (all[planId].totalEx == null) {
      // 兼容旧记录：补上分母快照
      all[planId].totalEx = totalEx;
      this._write(this.KEY_RECORDS, all);
    }
    return all[planId];
  },

  saveRecord(planId, dayIdx, exIdx, payload) {
    const all = this._allRecords();
    if (!all[planId]) all[planId] = { createdAt: new Date().toISOString(), systemSplit: '', days: {} };
    const d = String(dayIdx);
    if (!all[planId].days[d]) all[planId].days[d] = {};
    all[planId].days[d][String(exIdx)] = {
      done: true,
      sets: payload.sets ?? null,
      reps: payload.reps ?? null,
      weight: payload.weight ?? null,
      rpe: payload.rpe ?? null,
      ts: new Date().toISOString()
    };
    this._write(this.KEY_RECORDS, all);
    this.track('workout_checked', { planId, dayIdx, exIdx });
    return true;
  },

  clearRecord(planId, dayIdx, exIdx) {
    const all = this._allRecords();
    const d = String(dayIdx);
    if (all[planId] && all[planId].days[d]) {
      delete all[planId].days[d][String(exIdx)];
      this._write(this.KEY_RECORDS, all);
    }
    return true;
  },

  isDone(planId, dayIdx, exIdx) {
    const rec = this.getRecords(planId);
    if (!rec) return false;
    const d = rec.days && rec.days[String(dayIdx)];
    return !!(d && d[String(exIdx)] && d[String(exIdx)].done);
  },

  getRecordPayload(planId, dayIdx, exIdx) {
    const rec = this.getRecords(planId);
    if (!rec) return null;
    const d = rec.days && rec.days[String(dayIdx)];
    return (d && d[String(exIdx)]) || null;
  },

  clearPlan(planId) {
    const all = this._allRecords();
    if (all[planId]) {
      delete all[planId];
      this._write(this.KEY_RECORDS, all);
    }
    return true;
  },

  // ---- 进度聚合（D3 完成率按动作数） ----
  getProgress(planId, weeklyPlan) {
    const rec = this.getRecords(planId);
    let totalEx = 0, doneEx = 0, doneDays = 0;
    (weeklyPlan || []).forEach((day, i) => {
      const list = day.exercises || [];
      if (list.length === 0) return; // 休息日不计分母
      totalEx += list.length;
      let dayDone = 0;
      list.forEach((_, j) => { if (this.isDone(planId, i, j)) { doneEx++; dayDone++; } });
      if (dayDone === list.length) doneDays++;
    });
    const totalDays = (weeklyPlan || []).filter(d => (d.exercises || []).length > 0).length;
    return {
      doneEx, totalEx, doneDays, totalDays,
      rate: totalEx > 0 ? doneEx / totalEx : 0
    };
  },

  // ---- 周统计（D2 方案生成日起 7 天，不按自然周边界） ----
  getWeeklyStats(nowMs) {
    const now = nowMs || Date.now();
    const all = this._allRecords();
    // 以「当前时间往前 8 个 7 天窗口」为桶，起点对齐到最近一次方案创建日
    let anchor = now;
    Object.values(all).forEach(p => {
      const t = Date.parse(p.createdAt || '');
      if (!isNaN(t) && t < anchor) anchor = t;
    });
    // 锚点最多回溯到 8 周前，避免极老数据把窗口推歪
    const minAnchor = now - 8 * this.WEEK_MS;
    if (anchor < minAnchor) anchor = minAnchor;

    const buckets = Array.from({ length: 8 }, (_, i) => ({
      label: '', start: anchor + i * this.WEEK_MS, count: 0
    }));
    buckets.forEach(b => {
      const d = new Date(b.start);
      b.label = (d.getMonth() + 1) + '/' + d.getDate();
    });

    Object.values(all).forEach(p => {
      Object.values(p.days || {}).forEach(day => {
        Object.values(day || {}).forEach(r => {
          const t = Date.parse(r.ts || '');
          if (isNaN(t)) return;
          const idx = Math.floor((t - anchor) / this.WEEK_MS);
          if (idx >= 0 && idx < 8) buckets[idx].count++;
        });
      });
    });
    return buckets;
  },

  // 连续打卡周数：从当前周往前数连续有记录的桶
  getStreak(nowMs) {
    const buckets = this.getWeeklyStats(nowMs);
    let streak = 0;
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (buckets[i].count > 0) streak++;
      else break;
    }
    return streak;
  },

  getTotalStats() {
    const all = this._allRecords();
    let totalChecked = 0;
    const daySet = new Set();
    Object.entries(all).forEach(([pid, p]) => {
      Object.entries(p.days || {}).forEach(([d, day]) => {
        Object.values(day || {}).forEach(r => {
          totalChecked++;
          daySet.add(pid + ':' + d);
        });
      });
    });
    return { totalChecked, totalSessions: daySet.size };
  },

  // 最近一份方案的完成率（供 T4 回读）
  // 分母用 ensurePlan 存下的 totalEx 快照，因此无需重新加载 weeklyPlan 也能算
  getLastCompletionRate(excludePlanId) {
    const all = this._allRecords();
    const list = Object.entries(all)
      .filter(([pid]) => pid !== excludePlanId)
      .sort((a, b) => Date.parse(b[1].createdAt || '') - Date.parse(a[1].createdAt || ''));
    if (list.length === 0) return null;
    const [pid, rec] = list[0];
    let done = 0;
    Object.values(rec.days || {}).forEach(day => {
      Object.values(day || {}).forEach(r => { if (r.done) done++; });
    });
    const total = rec.totalEx || 0;
    if (total === 0) return null; // 分母未知时不给建议，避免误报
    return {
      planId: pid, done, total,
      rate: done / total,
      createdAt: rec.createdAt
    };
  },

  // T4：基于最近一份方案的完成率生成调整建议。
  // 推导规则（可审查）：按每训练日约 4 个动作估算「实际练了几天」，收敛到 2-6 天档位。
  // 只给建议与预选，不自动修改计划内容（requirements 2.3）。
  getAdjustmentAdvice(excludePlanId, threshold) {
    const last = this.getLastCompletionRate(excludePlanId);
    if (!last) return null;
    const lim = threshold == null ? 0.5 : threshold;
    if (last.rate >= lim) return null;
    const AVG_EX_PER_DAY = 4;
    const estimatedDays = Math.max(2, Math.min(6, Math.round(last.done / AVG_EX_PER_DAY) || 2));
    return {
      rate: last.rate,
      done: last.done,
      total: last.total,
      suggestedDays: estimatedDays,
      message: `上次方案完成了 ${last.done}/${last.total} 个动作（${Math.round(last.rate * 100)}%）。` +
        `与其维持高频，不如先把每周可训练天数调到 ${estimatedDays} 天并稳定完成——` +
        `ACSM 2026 强调一致性优于复杂性。`
    };
  },

  // ---- 事件队列（D4 仅本地，FIFO 上限 500） ----
  track(name, fields) {
    let list = this._mem && this._mem[this.KEY_EVENTS];
    if (!list) list = this._read(this.KEY_EVENTS, []);
    if (!Array.isArray(list)) list = [];
    list.push({
      name,
      ts: new Date().toISOString(),
      sessionId: this._sessionId(),
      fields: fields || {}
    });
    if (list.length > this.MAX_EVENTS) list = list.slice(-this.MAX_EVENTS);
    this._write(this.KEY_EVENTS, list);
    return true;
  },

  _sessionId() {
    try {
      let s = sessionStorage.getItem('wenkele_sid');
      if (!s) { s = this._uid(); sessionStorage.setItem('wenkele_sid', s); }
      return s;
    } catch (e) {
      return 'anonymous';
    }
  },

  exportEvents() {
    const v = this._mem && this._mem[this.KEY_EVENTS];
    return v || this._read(this.KEY_EVENTS, []);
  },

  // 只读导出：供「导出我的数据」使用，不暴露写接口（规格 P1）
  exportData() {
    return {
      records: this._read(this.KEY_RECORDS, {}),
      events: this._read(this.KEY_EVENTS, [])
    };
  },

  // ---- T7 回访缓存：打开页面直接回到当前方案 ----
  // C12：只存本地；result 沿用现有结构，不新增敏感字段
  saveLastPlan(planId, result) {
    if (!planId || !result || !Array.isArray(result.weeklyPlan)) return false;
    return this._write(this.KEY_LAST_PLAN, {
      planId, result, savedAt: new Date().toISOString()
    });
  },

  getLastPlan() {
    const v = (this._mem && this._mem[this.KEY_LAST_PLAN]) || this._read(this.KEY_LAST_PLAN, null);
    if (!v || !v.planId || !v.result || !Array.isArray(v.result.weeklyPlan)) return null;
    return v;
  },

  clearLastPlan() {
    try { localStorage.removeItem(this.KEY_LAST_PLAN); } catch (e) { /* 忽略 */ }
    if (this._mem) delete this._mem[this.KEY_LAST_PLAN];
    return true;
  },

  // 回访判定：距上次访问 ≥1 天
  checkReturnVisit() {
    const now = Date.now();
    const last = this._read(this.KEY_LAST_VISIT, null);
    let daysSince = null;
    if (last && !isNaN(Number(last))) daysSince = Math.floor((now - Number(last)) / (24 * 3600 * 1000));
    this._write(this.KEY_LAST_VISIT, String(now));
    return daysSince !== null && daysSince >= 1 ? daysSince : null;
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleTracker;
