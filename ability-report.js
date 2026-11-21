/**
 * [INPUT]: ability.js 的能力状态；WenKeleBodyGoal 的方向；specialCondition
 * [OUTPUT]: 全局 WenKeleAbilityReport —— 周期自测入口（T5）与总结报告（T6）
 * [POS]: 能力地图的自测与报告 UI；从 ability-ui.js 拆出以守住单文件 ≤400 行（规格 C14）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 规格：specs/2026-11-14-ability-map/ T5 + T6
 * C1：前台禁循证术语；不得排名/评级/比较；报告只在用户点击后生成。
 */

const WenKeleAbilityReport = {
  // 自测题口径与开场问卷一致（5 条自测轴，范围而非数字），每项 ≤1 分钟
  SELF_TESTS: [
    { key: 'arm', label: '臂力', hint: '一口气标准俯卧撑', grades: ['0–5 个', '6–15 个', '16–30 个', '31+'] },
    { key: 'back', label: '背力', hint: '一口气标准引体向上', grades: ['0 个', '1–5 个', '6–15 个', '16+'] },
    { key: 'leg', label: '腿力', hint: '一口气徒手深蹲', grades: ['0–10 个', '11–25 个', '26–50 个', '51+'] },
    { key: 'waist', label: '腰力', hint: '标准平板支撑', grades: ['<20 秒', '20–60 秒', '1–2 分钟', '2 分钟+'] },
    { key: 'cardio', label: '气力', hint: '快走/慢跑多久开始喘', grades: ['<5 分钟', '5–15 分钟', '15–30 分钟', '30 分钟+'] }
  ],
  GRADE_LETTERS: ['A', 'B', 'C', 'D'],

  // 特殊人群：青少年/产后/中老年不做自测（C5）；其余可简化
  isSelfTestAllowed(specialCondition) {
    const blocked = ['youth', 'postpartum', 'elderly'];
    return !blocked.includes(specialCondition);
  },

  // 到点轻提示：只返回文案，绝不弹窗、不自动打开
  mountSelfTestIntro(root) {
    const box = root && root.querySelector ? root.querySelector('#abilitySelfTest') : null;
    if (!box || typeof WenKeleAbility === 'undefined') return;
    const due = WenKeleAbility.getSelfTestDue();
    const special = (typeof FitnessApp !== 'undefined' && FitnessApp.state)
      ? FitnessApp.state.form.specialCondition : null;

    if (!this.isSelfTestAllowed(special)) {
      box.innerHTML = `
        <div class="ab-selftest">
          <h3><i class="fas fa-heart-pulse"></i> 能力复测</h3>
          <p class="ab-selftest-note">当前处于特殊训练阶段，暂不开放自测。按方案训练即可，能力图会照常记录你的完成。</p>
        </div>`;
      return;
    }

    const hint = due.hasBaseline && due.due
      ? `<p class="ab-selftest-due"><i class="fas fa-bell"></i> 距离上次记录已 ${due.daysSince} 天，可以复测了（不测也没关系）</p>`
      : due.hasBaseline
        ? `<p class="ab-selftest-note">上次记录距今 ${due.daysSince} 天，通常每 4 周复测一次就够。</p>`
        : '';

    box.innerHTML = `
      <div class="ab-selftest">
        <h3><i class="fas fa-heart-pulse"></i> 能力复测</h3>
        ${hint}
        <p class="ab-selftest-note">每项选个大概范围就行，不用真去测。可只选几项，其余沿用上次。</p>
        <button type="button" class="btn btn-secondary" id="abTestToggle">
          <i class="fas fa-pen"></i> 记录一次
        </button>
        <div id="abTestForm" hidden>
          ${this.SELF_TESTS.map(t => `
            <div class="ab-test-row">
              <label>${t.label}<span class="ab-test-hint">${t.hint}</span></label>
              <div class="ab-test-grades">
                ${t.grades.map((g, i) => `
                  <label class="ab-test-grade">
                    <input type="radio" name="abtest_${t.key}" value="${this.GRADE_LETTERS[i]}">
                    <span>${this.GRADE_LETTERS[i]} · ${g}</span>
                  </label>`).join('')}
              </div>
            </div>`).join('')}
          <button type="button" class="btn btn-primary" id="abTestSave">保存记录</button>
        </div>
      </div>`;

    const toggle = document.getElementById('abTestToggle');
    const form = document.getElementById('abTestForm');
    if (toggle && form) toggle.addEventListener('click', () => {
      form.hidden = !form.hidden;
      toggle.innerHTML = form.hidden ? '<i class="fas fa-pen"></i> 记录一次'
        : '<i class="fas fa-xmark"></i> 收起';
    });
    const save = document.getElementById('abTestSave');
    if (save) save.addEventListener('click', () => {
      const answers = {};
      this.SELF_TESTS.forEach(t => {
        const el = document.querySelector(`input[name="abtest_${t.key}"]:checked`);
        if (el) answers[t.key] = el.value;
      });
      if (Object.keys(answers).length === 0) {
        if (typeof showToast === 'function') showToast('至少选一项再保存');
        return;
      }
      WenKeleAbility.recordSelfTest(answers);
      if (typeof WenKeleTracker !== 'undefined') WenKeleTracker.track('self_test_done', answers);
      form.hidden = true;
      if (toggle) toggle.innerHTML = '<i class="fas fa-pen"></i> 记录一次';
      if (typeof WenKeleAbilityUI !== 'undefined') WenKeleAbilityUI.mountAbilityPanel();
      if (typeof showToast === 'function') showToast('记下了，能力图已更新');
    });
  },

  // ---- T6 周期总结报告：用户点才生成，绝不自动弹出 ----
  mountReport(root) {
    const box = root && root.querySelector ? root.querySelector('#abilityReport') : null;
    if (!box || typeof WenKeleAbility === 'undefined') return;
    const due = WenKeleAbility.getSelfTestDue();
    const history = WenKeleAbility.getState().reports || [];
    const last = history.length ? history[history.length - 1] : null;

    box.innerHTML = `
      <div class="ab-report">
        <h3><i class="fas fa-chart-line"></i> 阶段回顾</h3>
        <p class="ab-report-note">每 4 周生成一次，看看这段时间的自己。只有你点才会生成。</p>
        ${last ? `<p class="ab-report-last">上次回顾：${this.formatDate(last.at)}</p>` : ''}
        <button type="button" class="btn btn-secondary" id="abReportGen">
          <i class="fas fa-file-chart-column"></i> 生成本期回顾
        </button>
        ${due.hasBaseline && due.due ? '<p class="ab-report-due">现在正适合做一次回顾</p>' : ''}
        <div id="abReportBody"></div>
      </div>`;

    const btn = document.getElementById('abReportGen');
    const body = document.getElementById('abReportBody');
    if (btn && body) btn.addEventListener('click', () => {
      const report = WenKeleAbility.buildReport();
      WenKeleAbility.saveReport(report);
      if (typeof WenKeleTracker !== 'undefined') WenKeleTracker.track('report_generated', { tier: report.tier });
      body.innerHTML = this.renderReport(report);
      btn.textContent = '重新生成';
      btn.hidden = true; // 生成后隐藏，避免反复点击刷报告
    });
  },

  renderReport(report) {
    const axes = report.axes.filter(a => !a.pending);
    const weakest = report.weakest;
    const label = (typeof WenKeleBodyGoal !== 'undefined'
      && typeof FitnessApp !== 'undefined' && FitnessApp.state)
      ? WenKeleBodyGoal.getLabel(FitnessApp.state.form.bodyGoal) : '';
    return `
      <div class="ab-report-card">
        <p class="ab-report-lead">这一程：第 ${report.tier} 层 · 解锁 ${report.unlocked} 个动作节点${label ? ` · ${label}方向` : ''}</p>
        <div class="ab-report-axes">
          ${axes.map(a => `<span class="ab-report-chip">${a.label} ${a.value}</span>`).join('')}
        </div>
        ${weakest ? `<p class="ab-report-weak">下一步可以留意「${weakest.label}」，慢慢来就好。</p>`
          : '<p class="ab-report-weak">先完成一次能力记录，下次就有对比了。</p>'}
        <button type="button" class="ab-report-close" id="abReportClose">收起回顾</button>
      </div>`;
  },

  formatDate(iso) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}月${d.getDate()}日`;
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleAbilityReport;
