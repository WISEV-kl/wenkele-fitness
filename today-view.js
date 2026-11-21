/**
 * [INPUT]: 依赖 tracker.js 的 WenKeleTracker（唯一数据源）；app.js 传入 result 与 planId
 * [OUTPUT]: 全局 WenKeleTodayView.mount(result, planId) —— 今日训练大卡视图
 * [POS]: fitness-coach 执行态 UI，与 tracker-ui.js（报表内打卡）共享同一份数据
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 规格：specs/2026-11-13-training-loop/addendum-c-ui-restructure.md T8
 * C11：严禁另起状态，所有读写经 WenKeleTracker；C13：原生 DOM + CSS，无新依赖
 */

const WenKeleTodayView = {
  state: { planId: null, weeklyPlan: [], dayIdx: -1, bound: false },
  WEEK_CN: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],

  mount(result, planId) {
    const root = document.getElementById('wkTodayView');
    if (!root || !result || !planId) return;
    this.state.planId = planId;
    this.state.special = !!result.special;
    this.state.weeklyPlan = result.weeklyPlan || [];
    WenKeleTracker.ensurePlan(planId, this.state.weeklyPlan);
    this.state.dayIdx = this.resolveDayIdx();
    this.render();
    if (!this.state.bound) { this._bind(root); this.state.bound = true; }
  },

  // 今天该练哪天：优先匹配星期；否则取第一个未完成的训练日；全完成取最后一天
  resolveDayIdx(now) {
    const list = this.state.weeklyPlan;
    if (list.length === 0) return -1;
    const today = this.WEEK_CN[(now || new Date()).getDay()];
    let idx = list.findIndex(d => d.day === today && (d.exercises || []).length > 0);
    if (idx >= 0) return idx;

    const trainable = list.map((d, i) => ({ d, i })).filter(x => (x.d.exercises || []).length > 0);
    if (trainable.length === 0) return -1;
    const unfinished = trainable.find(x => !this._isDayDone(x.i));
    if (unfinished) return unfinished.i;
    return trainable[trainable.length - 1].i;
  },

  _isDayDone(i) {
    const list = (this.state.weeklyPlan[i] || {}).exercises || [];
    if (list.length === 0) return true;
    return list.every((_, j) => WenKeleTracker.isDone(this.state.planId, i, j));
  },

  render() {
    const root = document.getElementById('wkTodayView');
    if (!root) return;
    const { planId, weeklyPlan, dayIdx } = this.state;

    if (dayIdx < 0 || weeklyPlan.length === 0) {
      root.innerHTML = `<div class="tv-empty">暂无训练日安排，可在「完整方案」中查看。</div>`;
      return;
    }
    const day = weeklyPlan[dayIdx];
    const list = day.exercises || [];
    const doneCount = list.filter((_, j) => WenKeleTracker.isDone(planId, dayIdx, j)).length;
    const allDone = list.length > 0 && doneCount === list.length;
    const today = this.WEEK_CN[new Date().getDay()];
    const isToday = day.day === today;

    const cards = list.map((ex, j) => {
      const done = WenKeleTracker.isDone(planId, dayIdx, j);
      const rec = WenKeleTracker.getRecordPayload(planId, dayIdx, j);
      return `
        <div class="tv-card ${done ? 'is-done' : ''}" data-ex="${j}">
          <div class="tv-card-main" data-toggle="${j}">
            <div class="tv-check">${done ? '<i class="fas fa-check"></i>' : ''}</div>
            <div class="tv-card-info">
              <div class="tv-name">${ex.name} <span class="tv-group">${ex.group || ''}</span></div>
              <div class="tv-meta">${ex.sets || ''} × ${ex.reps || ''} ${ex.rest ? '· 休息 ' + ex.rest : ''}</div>
              <div class="tv-cue">${ex.cue || ''}</div>
            </div>
            <button type="button" class="tv-expand" data-expand="${j}"><i class="fas fa-sliders"></i> 记数据</button>
          </div>
          <div class="tv-detail" data-detail="${j}" hidden>
            <label>组数<input type="number" class="tv-field" data-key="sets" data-ex="${j}" min="1" max="20" value="${rec && rec.sets != null ? rec.sets : ''}" placeholder="3"></label>
            <label>次数<input type="text" class="tv-field" data-key="reps" data-ex="${j}" value="${rec && rec.reps != null ? rec.reps : ''}" placeholder="10"></label>
            <label>重量kg<input type="number" class="tv-field" data-key="weight" data-ex="${j}" min="0" step="0.5" value="${rec && rec.weight != null ? rec.weight : ''}" placeholder="选填"></label>
            <label>RPE<input type="number" class="tv-field" data-key="rpe" data-ex="${j}" min="1" max="10" value="${rec && rec.rpe != null ? rec.rpe : ''}" placeholder="选填"></label>
          </div>
          ${typeof WenKeleRecommendationUI !== 'undefined'
            ? WenKeleRecommendationUI.cardExtrasHTML(this.state.planId, this.state.dayIdx, j, ex) : ''}
        </div>`;
    }).join('');

    root.innerHTML = `
      <div class="tv-head">
        <div>
          <div class="tv-title">${isToday ? '今天' : '下一个训练日'} · ${day.day} · ${day.focus}</div>
          <div class="tv-sub">${day.duration || ''} ${allDone ? '· 本次训练已完成' : ''}
            ${typeof WenKeleRecommendationUI !== 'undefined'
              ? `<span class="rc-difficulty">${WenKeleRecommendationUI.difficultyLabel(day)}</span>` : ''}
          </div>
        </div>
        <div class="tv-head-actions">
          ${typeof WenKeleRecommendationUI !== 'undefined' && list.length > 0
            ? `<button type="button" class="rc-shield" data-rc-shield ${WenKeleRecommendationUI.shieldUsed(WenKeleRecommendationUI.weekKey()) ? 'disabled' : ''}>
                 <i class="fas fa-moon"></i> 今天先歇
               </button>` : ''}
          <div class="tv-progress ${allDone ? 'is-full' : ''}">${doneCount}/${list.length}</div>
        </div>
      </div>
      ${allDone ? '<div class="tv-done-banner"><i class="fas fa-circle-check"></i> 今天练完了，去「完整方案」看进阶路径，或明天回来继续。</div>' : ''}
      ${typeof WenKeleAICoach !== 'undefined' && WenKeleAICoach.isEnabledFor(planId) && !this.state.special
        ? `<button type="button" class="tv-ai-teaser" data-ai-teaser>
             <i class="fas fa-comments"></i> 想知道这份方案为什么这么排？看看教练解读
             <i class="fas fa-arrow-right"></i>
           </button>` : ''}
      ${list.length === 0 ? '<div class="tv-empty">今天是休息日，恢复也是训练的一部分。</div>' : `<div class="tv-list">${cards}</div>`}
      <div class="tv-daynav">
        ${weeklyPlan.map((d, i) => `<button type="button" class="tv-daybtn ${i === dayIdx ? 'active' : ''}" data-day="${i}" ${(!d.exercises || d.exercises.length === 0) ? 'disabled' : ''}>${d.day}</button>`).join('')}
      </div>`;
  },

  _bind(root) {
    root.addEventListener('click', (e) => {
      const expand = e.target.closest && e.target.closest('[data-expand]');
      if (expand) {
        const j = Number(expand.dataset.expand);
        const detail = root.querySelector(`[data-detail="${j}"]`);
        if (detail) detail.hidden = !detail.hidden;
        return;
      }
      const dayBtn = e.target.closest && e.target.closest('[data-day]');
      if (dayBtn) {
        this.state.dayIdx = Number(dayBtn.dataset.day);
        this.render();
        return;
      }
      const toggle = e.target.closest && e.target.closest('[data-toggle]');
      if (toggle) {
        const j = Number(toggle.dataset.toggle);
        this._toggle(this.state.dayIdx, j);
        return;
      }
      // 批次 A：教学展开 / 换一个 / 今天先歇（均在 tv-card-main 之外，不与打卡冲突）
      const teachBtn = e.target.closest && e.target.closest('[data-rc-teach]');
      if (teachBtn) {
        const j = Number(teachBtn.dataset.rcTeach);
        const body = root.querySelector(`[data-rc-teach-body="${j}"]`);
        if (body) body.hidden = !body.hidden;
        return;
      }
      const swapBtn = e.target.closest && e.target.closest('[data-rc-swap]');
      if (swapBtn) {
        this._swapExercise(Number(swapBtn.dataset.rcSwap));
        return;
      }
      const shieldBtn = e.target.closest && e.target.closest('[data-rc-shield]');
      if (shieldBtn) { this._useShield(); return; }
      const teaser = e.target.closest && e.target.closest('[data-ai-teaser]');
      if (teaser) {
        // 从执行态引导到规划态的 AI 解读卡（可发现性）
        if (typeof FitnessApp !== 'undefined') {
          FitnessApp.switchView('plan');
          setTimeout(() => {
            const card = document.getElementById('aiCoachCard');
            if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 60);
        }
        return;
      }
    });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches && t.matches('.tv-field')) this._onField(t);
    });
  },

  _toggle(dayIdx, exIdx) {
    const T = WenKeleTracker;
    if (T.isDone(this.state.planId, dayIdx, exIdx)) {
      T.clearRecord(this.state.planId, dayIdx, exIdx);
    } else {
      T.saveRecord(this.state.planId, dayIdx, exIdx, { sets: null, reps: null, weight: null, rpe: null });
    }
    this._sync();
  },

  // 批次 A2：换动作只改当天动作对象，不动 planId、不碰记录位（C5）
  _swapExercise(exIdx) {
    if (typeof WenKeleRecommendationUI === 'undefined') return;
    const day = this.state.weeklyPlan[this.state.dayIdx];
    const next = WenKeleRecommendationUI.findSwap(day, exIdx);
    if (!next) { if (typeof showToast === 'function') showToast('暂时没有可替换的动作'); return; }
    day.exercises[exIdx] = { ...next };
    this.render();
    if (typeof showToast === 'function') showToast(`已换成「${next.name}」，记录仍保留`);
  },

  // 批次 A1：请假护盾，每周 1 次，不写打卡、不涨恒力
  _useShield() {
    if (typeof WenKeleRecommendationUI === 'undefined') return;
    const U = WenKeleRecommendationUI;
    const wk = U.weekKey();
    const res = U.useShield(wk);
    if (typeof showToast === 'function') {
      showToast(res.ok ? '今天先歇，进度不会清零' : res.reason);
    }
    this.render();
  },

  _onField(input) {
    const T = WenKeleTracker;
    const dayIdx = this.state.dayIdx, exIdx = Number(input.dataset.ex);
    const rec = T.getRecordPayload(this.state.planId, dayIdx, exIdx);
    const payload = {
      sets: rec ? rec.sets : null, reps: rec ? rec.reps : null,
      weight: rec ? rec.weight : null, rpe: rec ? rec.rpe : null
    };
    const key = input.dataset.key;
    const v = input.value.trim();
    payload[key] = v === '' ? null : (key === 'reps' ? v : Number(v));
    T.saveRecord(this.state.planId, dayIdx, exIdx, payload); // 填数据即视为完成
    this._sync();
  },

  // C11：一处变更，三处同步（今日视图 / 进度卡 / 完整方案内的勾选）
  _sync() {
    this.render();
    if (typeof WenKeleTrackerUI !== 'undefined') {
      WenKeleTrackerUI.renderProgressCard();
      WenKeleTrackerUI.syncCheckboxes();
    }
  }
};
