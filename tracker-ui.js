/**
 * [INPUT]: 依赖 tracker.js 的 WenKeleTracker；app.js 传入 result 与 planId
 * [OUTPUT]: 全局 WenKeleTrackerUI.mount(result, planId) —— 结果页打卡 UI 与进度视图
 * [POS]: fitness-coach 训练状态的 UI 层，与 tracker.js 数据层分离（SRP）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 规格：specs/2026-11-13-training-loop/ T2
 * 约束：事件委托绑定到稳定的 #resultBody；勾选后只局部更新，不整页重渲染
 */

const WenKeleTrackerUI = {
  state: { planId: null, weeklyPlan: [], bound: false },

  mount(result, planId) {
    const root = document.getElementById('resultBody');
    if (!root || !result || !planId) return;

    this.state.planId = planId;
    this.state.weeklyPlan = result.weeklyPlan || [];
    WenKeleTracker.ensurePlan(planId, this.state.weeklyPlan);

    // 结构守卫：day-block 数量必须与 weeklyPlan 对齐，否则不挂载（避免错位打卡）
    const blocks = root.querySelectorAll('.day-block');
    if (blocks.length !== this.state.weeklyPlan.length) {
      console.warn('[TrackerUI] day-block 数量与 weeklyPlan 不一致，跳过挂载');
      return;
    }

    this._injectProgressCard(root);
    this._injectCheckboxes(root, blocks);
    if (!this.state.bound) {
      this._bind(root);
      this.state.bound = true;
    }
  },

  // ---- 顶部进度卡片 ----
  _injectProgressCard(root) {
    let card = document.getElementById('wkProgressCard');
    if (!card) {
      card = document.createElement('section');
      card.id = 'wkProgressCard';
      card.className = 'result-card wk-card';
      root.insertBefore(card, root.firstChild);
    }
    this.renderProgressCard();
  },

  renderProgressCard() {
    const card = document.getElementById('wkProgressCard');
    if (!card) return;
    const T = WenKeleTracker;
    const pr = T.getProgress(this.state.planId, this.state.weeklyPlan);
    const weeks = T.getWeeklyStats();
    const streak = T.getStreak();
    const totals = T.getTotalStats();
    const max = Math.max(1, ...weeks.map(w => w.count));
    const pct = Math.round(pr.rate * 100);

    card.innerHTML = `
      <h2><i class="fas fa-chart-simple"></i> 训练进度</h2>
      <div class="wk-summary">
        <div class="wk-metric"><strong>${pr.doneDays}/${pr.totalDays}</strong><span>本周完成天数</span></div>
        <div class="wk-metric"><strong>${pr.doneEx}/${pr.totalEx}</strong><span>完成动作</span></div>
        <div class="wk-metric"><strong>${pct}%</strong><span>完成率</span></div>
        <div class="wk-metric"><strong>${streak}</strong><span>连续周数</span></div>
      </div>
      <div class="wk-bar-wrap">
        <div class="wk-bar-label">本周完成率</div>
        <div class="wk-bar"><div class="wk-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="wk-weeks">
        <div class="wk-weeks-title">最近 8 周完成动作数 · 累计 ${totals.totalChecked} 个动作 / ${totals.totalSessions} 次训练</div>
        <div class="wk-chart">
          ${weeks.map(w => `
            <div class="wk-col" title="${w.label}：${w.count} 个动作">
              <div class="wk-col-val">${w.count || ''}</div>
              <div class="wk-col-bar" style="height:${Math.max(4, Math.round(w.count / max * 56))}px"></div>
              <div class="wk-col-label">${w.label}</div>
            </div>`).join('')}
        </div>
      </div>
      <p class="wk-hint"><i class="fas fa-circle-info"></i> 勾选下方动作即可记录；数据仅保存在本机浏览器，不会上传。</p>`;
  },

  // ---- 动作勾选控件 ----
  _injectCheckboxes(root, blocks) {
    const T = WenKeleTracker;
    this.state.weeklyPlan.forEach((day, i) => {
      const block = blocks[i];
      const items = block.querySelectorAll('.exercise-item');
      const list = day.exercises || [];
      if (items.length !== list.length) return;

      // 日进度徽标
      let badge = block.querySelector('.wk-day-progress');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'wk-day-progress';
        const header = block.querySelector('.day-header');
        if (header) header.appendChild(badge);
      }
      this._updateDayBadge(i);

      items.forEach((item, j) => {
        if (item.querySelector('.wk-check')) return; // 幂等
        const done = T.isDone(this.state.planId, i, j);
        const rec = T.getRecordPayload(this.state.planId, i, j);
        const wrap = document.createElement('div');
        wrap.className = 'wk-check-row' + (done ? ' is-done' : '');
        wrap.innerHTML = `
          <label class="wk-check">
            <input type="checkbox" data-day="${i}" data-ex="${j}" ${done ? 'checked' : ''}>
            <span class="wk-check-box"><i class="fas fa-check"></i></span>
            <span class="wk-check-text">${done ? '已完成' : '标记完成'}</span>
          </label>
          <button type="button" class="wk-detail-toggle" data-day="${i}" data-ex="${j}">记数据</button>
          <div class="wk-detail" data-day="${i}" data-ex="${j}" hidden>
            <label>组数<input type="number" class="wk-field" data-key="sets" data-day="${i}" data-ex="${j}" min="1" max="20" value="${rec && rec.sets != null ? rec.sets : ''}" placeholder="3"></label>
            <label>次数<input type="text" class="wk-field" data-key="reps" data-day="${i}" data-ex="${j}" value="${rec && rec.reps != null ? rec.reps : ''}" placeholder="10"></label>
            <label>重量kg<input type="number" class="wk-field" data-key="weight" data-day="${i}" data-ex="${j}" min="0" step="0.5" value="${rec && rec.weight != null ? rec.weight : ''}" placeholder="选填"></label>
            <label>RPE<input type="number" class="wk-field" data-key="rpe" data-day="${i}" data-ex="${j}" min="1" max="10" value="${rec && rec.rpe != null ? rec.rpe : ''}" placeholder="选填"></label>
          </div>`;
        const info = item.querySelector('.exercise-info');
        (info || item).appendChild(wrap);
      });
    });
  },

  // ---- 事件委托（绑定一次到稳定的 #resultBody） ----
  _bind(root) {
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches && t.matches('input[type="checkbox"][data-day]')) {
        this._onCheck(t);
      } else if (t.matches && t.matches('.wk-field')) {
        this._onField(t);
      }
    });
    root.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.wk-detail-toggle');
      if (!btn) return;
      const d = root.querySelector(
        `.wk-detail[data-day="${btn.dataset.day}"][data-ex="${btn.dataset.ex}"]`
      );
      if (d) { d.hidden = !d.hidden; btn.classList.toggle('open', !d.hidden); }
    });
  },

  _onCheck(input) {
    const day = Number(input.dataset.day), ex = Number(input.dataset.ex);
    const T = WenKeleTracker;
    if (input.checked) {
      T.saveRecord(this.state.planId, day, ex, {
        sets: null, reps: null, weight: null, rpe: null
      });
    } else {
      T.clearRecord(this.state.planId, day, ex);
    }
    const row = input.closest('.wk-check-row');
    if (row) {
      row.classList.toggle('is-done', input.checked);
      const text = row.querySelector('.wk-check-text');
      if (text) text.textContent = input.checked ? '已完成' : '标记完成';
    }
    this._updateDayBadge(day);
    this.renderProgressCard();
    // C11：完整方案里打卡后，同步「今日训练」视图
    if (typeof WenKeleTodayView !== 'undefined' && WenKeleTodayView.state.planId === this.state.planId) {
      WenKeleTodayView.render();
    }
  },

  _onField(input) {
    const day = Number(input.dataset.day), ex = Number(input.dataset.ex);
    const rec = WenKeleTracker.getRecordPayload(this.state.planId, day, ex);
    const payload = {
      sets: rec ? rec.sets : null,
      reps: rec ? rec.reps : null,
      weight: rec ? rec.weight : null,
      rpe: rec ? rec.rpe : null
    };
    const key = input.dataset.key;
    let v = input.value.trim();
    payload[key] = v === '' ? null : (key === 'reps' ? v : Number(v));
    // 记数据不强制勾选完成，但若填了值视为该动作已练（避免分母丢失）
    WenKeleTracker.saveRecord(this.state.planId, day, ex, payload);
    const row = input.closest('.wk-check-row');
    if (row && !row.classList.contains('is-done')) {
      const box = row.querySelector('input[type="checkbox"]');
      if (box) { box.checked = true; row.classList.add('is-done'); }
      const text = row.querySelector('.wk-check-text');
      if (text) text.textContent = '已完成';
      this._updateDayBadge(day);
    }
    this.renderProgressCard();
  },

  // C11：今日视图打卡后，同步「完整方案」里已渲染的勾选控件（不整页重渲染）
  syncCheckboxes() {
    const root = document.getElementById('resultBody');
    if (!root) return;
    root.querySelectorAll('.wk-check-row').forEach(row => {
      const box = row.querySelector('input[type="checkbox"][data-day]');
      if (!box) return;
      const done = WenKeleTracker.isDone(this.state.planId, Number(box.dataset.day), Number(box.dataset.ex));
      box.checked = done;
      row.classList.toggle('is-done', done);
      const text = row.querySelector('.wk-check-text');
      if (text) text.textContent = done ? '已完成' : '标记完成';
      const day = Number(box.dataset.day);
      this._updateDayBadge(day);
    });
  },

  _updateDayBadge(dayIdx) {
    const root = document.getElementById('resultBody');
    if (!root) return;
    const blocks = root.querySelectorAll('.day-block');
    const block = blocks[dayIdx];
    if (!block) return;
    const badge = block.querySelector('.wk-day-progress');
    if (!badge) return;
    const day = this.state.weeklyPlan[dayIdx];
    const total = (day && day.exercises || []).length;
    if (total === 0) { badge.textContent = '休息日'; badge.classList.add('is-rest'); return; }
    let done = 0;
    for (let j = 0; j < total; j++) if (WenKeleTracker.isDone(this.state.planId, dayIdx, j)) done++;
    badge.textContent = `${done}/${total} 完成`;
    badge.classList.toggle('is-full', done === total);
    badge.classList.remove('is-rest');
  }
};
