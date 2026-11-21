/**
 * [INPUT]: 依赖 ability.js 的 WenKeleAbility；app.js 在 init 调用 mountOnboarding()
 * [OUTPUT]: 全局 WenKeleAbilityUI —— 开场问卷（T2）、六边形面板（T3）
 * [POS]: 能力地图的 UI 层，与数据层分离；不产生任何循证术语（C1）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 规格：specs/2026-11-14-ability-map/ T2 + T3
 * C6：原生 DOM + SVG，无图表库；C7：本模块 ≤300 行
 */

const WenKeleAbilityUI = {
  // 开场问卷 3 题：范围 + 一句短状态，简短一目了然（requirements 2.1）
  QUESTIONS: [
    {
      key: 'push', title: '一口气能做几个标准俯卧撑？', icon: 'fa-hand-paper',
      options: [
        { g: 'A', range: '0–5 个', hint: '先歇会儿' },
        { g: 'B', range: '6–15 个', hint: '有点意思' },
        { g: 'C', range: '16–30 个', hint: '像回事了' },
        { g: 'D', range: '31 个以上', hint: '不太费劲' }
      ]
    },
    {
      key: 'squat', title: '一口气能做几个徒手深蹲？', icon: 'fa-person-walking',
      options: [
        { g: 'A', range: '0–10 个', hint: '腿在抗议' },
        { g: 'B', range: '11–25 个', hint: '站得住' },
        { g: 'C', range: '26–50 个', hint: '稳得很' },
        { g: 'D', range: '51 个以上', hint: '还能聊' }
      ]
    },
    {
      key: 'plank', title: '标准平板能撑多久？', icon: 'fa-hourglass-half',
      options: [
        { g: 'A', range: '撑不住 20 秒', hint: '先别急' },
        { g: 'B', range: '20–60 秒', hint: '有点稳' },
        { g: 'C', range: '1–2 分钟', hint: '能刷条视频' },
        { g: 'D', range: '2 分钟以上', hint: '纹丝不动' }
      ]
    },
    {
      key: 'pull', title: '一口气能做几个标准引体向上？', icon: 'fa-arrow-up',
      options: [
        { g: 'A', range: '0 个', hint: '先挂着' },
        { g: 'B', range: '1–5 个', hint: '能拉起来' },
        { g: 'C', range: '6–15 个', hint: '有点东西' },
        { g: 'D', range: '16 个以上', hint: '轻松拿捏' }
      ]
    },
    {
      key: 'cardio', title: '连续快走或慢跑，多久会明显喘？', icon: 'fa-wind',
      options: [
        { g: 'A', range: '不到 5 分钟', hint: '电梯真香' },
        { g: 'B', range: '5–15 分钟', hint: '能绕小区' },
        { g: 'C', range: '15–30 分钟', hint: '能跑一圈' },
        { g: 'D', range: '30 分钟以上', hint: '还能聊天' }
      ]
    }
  ],

  // ---- T2 开场问卷 ----
  mountOnboarding() {
    const root = document.getElementById('abilityOnboarding');
    if (!root || typeof WenKeleAbility === 'undefined') return;
    if (WenKeleAbility.isOnboarded()) { root.hidden = true; return; }

    root.hidden = false;
    root.innerHTML = `
      <div class="ab-card-head">
        <div>
          <h3><i class="fas fa-bolt"></i> 先测一下你的起点</h3>
          <p>5 道题，选个大概范围就行，不用真去做</p>
        </div>
        <button type="button" class="ab-skip" id="abSkip">跳过</button>
      </div>
      <div class="ab-questions">
        ${this.QUESTIONS.map((q, i) => `
          <div class="ab-question" data-q="${q.key}">
            <div class="ab-q-title"><i class="fas ${q.icon}"></i> ${q.title}</div>
            <div class="option-group ab-options">
              ${q.options.map(o => `
                <label class="option-card ab-option">
                  <input type="radio" name="ab_${q.key}" value="${o.g}">
                  <span class="ab-grade">${o.g}</span>
                  <span class="option-label">${o.range}</span>
                  <span class="option-desc">${o.hint}</span>
                </label>`).join('')}
            </div>
          </div>`).join('')}
      </div>
      <div class="ab-card-foot">
        <span>趣味刻度，非竞技评级 · 只用来点亮你的能力图，不影响训练方案</span>
        <button type="button" class="btn btn-primary" id="abDone" disabled>就这些 <i class="fas fa-arrow-right"></i></button>
      </div>`;

    const done = document.getElementById('abDone');
    root.addEventListener('change', (e) => {
      if (!e.target.name || !e.target.name.startsWith('ab_')) return;
      const answered = this.QUESTIONS.every(q => root.querySelector(`input[name="ab_${q.key}"]:checked`));
      done.disabled = !answered;
    });
    done.addEventListener('click', () => {
      const answers = {};
      this.QUESTIONS.forEach(q => {
        const el = root.querySelector(`input[name="ab_${q.key}"]:checked`);
        if (el) answers[q.key] = el.value;
      });
      if (WenKeleAbility.setOnboarding(answers)) {
        root.hidden = true;
        if (typeof WenKeleTracker !== 'undefined') WenKeleTracker.track('onboarding_done', answers);
        showToast('起点记下了，能力图已经点亮');
      }
    });
    document.getElementById('abSkip').addEventListener('click', () => {
      WenKeleAbility.skipOnboarding();
      root.hidden = true;
      if (typeof WenKeleTracker !== 'undefined') WenKeleTracker.track('onboarding_skipped', {});
    });
  },

  // ---- T3 六边形面板 ----
  // 原生 SVG，6 轴按 naming.md 的 2 字属性名；pending 显示「待点亮」而非 0
  mountAbilityPanel() {
    const root = document.getElementById('abilityPanel');
    if (!root || typeof WenKeleAbility === 'undefined') return;
    const axes = WenKeleAbility.getAxes();
    const tier = WenKeleAbility.getTier();
    const tierNames = ['沙发', '起身', '站稳', '上手', '加片', '有型', '能扛', '失重', '引力'];

    // 六边形顶点：正上方起，顺时针 6 点
    const cx = 170, cy = 160, R = 108;
    const point = (i, r) => {
      const a = -Math.PI / 2 + i * Math.PI / 3;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    const grid = [0.33, 0.66, 1].map(k =>
      `<polygon points="${Array.from({ length: 6 }, (_, i) => point(i, R * k).join(',')).join(' ')}"
        fill="none" stroke="var(--border)" stroke-width="1"/>`
    ).join('');
    const spokes = Array.from({ length: 6 }, (_, i) =>
      `<line x1="${cx}" y1="${cy}" x2="${point(i, R)[0]}" y2="${point(i, R)[1]}"
        stroke="var(--border)" stroke-width="1"/>`
    ).join('');
    const dataPoints = axes.map((a, i) => {
      const v = a.pending ? 0 : Math.max(0.12, Math.min(1, a.value / 20));
      return point(i, R * v).join(',');
    }).join(' ');
    const labels = axes.map((a, i) => {
      const [x, y] = point(i, R + 26);
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
        class="ab-axis-label">${a.label}</text>`;
    }).join('');

    root.innerHTML = `
      <div class="ab-panel-head">
        <div>
          <h2><i class="fas fa-chart-simple"></i> 能力地图</h2>
          <p>第 ${tier} 层 · ${tierNames[tier - 1]}　 只跟自己比</p>
        </div>
      </div>
      <div class="ab-panel-body">
        <div class="ab-hex">
          <svg viewBox="0 0 340 320" width="100%" role="img" aria-label="六边形能力图">
            ${grid}${spokes}
            <polygon points="${dataPoints}" fill="var(--primary-light)" fill-opacity="0.65"
              stroke="var(--primary)" stroke-width="2"/>
            ${labels}
          </svg>
        </div>
        <div class="ab-axis-list">
          ${axes.map(a => `
            <div class="ab-axis-row ${a.pending ? 'is-pending' : ''}">
              <span class="ab-axis-name">${a.label}</span>
              <div class="ab-axis-bar"><div class="ab-axis-fill" style="width:${a.pending ? 0 : Math.min(100, a.value * 5)}%"></div></div>
              <span class="ab-axis-val">${a.pending ? '待点亮' : a.value}</span>
            </div>`).join('')}
          <p class="ab-axis-note">恒力来自你的坚持记录；其余随自测变化</p>
        </div>
      </div>
      <div id="abilityTier"></div>
      <div id="abilityNodes"></div>
      <div id="abilitySelfTest"></div>
      <div id="abilityReport"></div>`;
    this.mountTier(root);
    this.mountNodes(root);
    // T5/T6：自测与报告拆在 ability-report.js，避免本文件超 400 行（C14）
    if (typeof WenKeleAbilityReport !== 'undefined') {
      WenKeleAbilityReport.mountSelfTestIntro(root);
      WenKeleAbilityReport.mountReport(root);
    }
  },

  // ---- T4 主线 9 层段位条 ----
  TIER_NAMES: ['沙发', '起身', '站稳', '上手', '加片', '有型', '能扛', '失重', '引力'],
  TIER_FULL: { 1: '沙发封印者', 9: '引力谈判专家' },

  mountTier(root) {
    const box = root && root.querySelector ? root.querySelector('#abilityTier') : null;
    if (!box) return;
    const tier = WenKeleAbility.getTier();
    const full = this.TIER_FULL[tier];
    box.innerHTML = `
      <div class="ab-tier">
        <div class="ab-tier-head">
          <h3><i class="fas fa-flag-checkered"></i> 成长路线</h3>
          <span>第 ${tier} / 9 层 · ${this.TIER_NAMES[tier - 1]}${full ? `（${full}）` : ''}</span>
        </div>
        <div class="ab-tier-track">
          ${this.TIER_NAMES.map((n, i) => `
            <div class="ab-tier-step ${i + 1 < tier ? 'done' : ''} ${i + 1 === tier ? 'current' : ''}"
              title="第 ${i + 1} 层 · ${n}">
              <span class="ab-tier-dot">${i + 1 < tier ? '✓' : i + 1}</span>
              <span class="ab-tier-label">${n}</span>
            </div>`).join('')}
        </div>
        <p class="ab-tier-note">解锁动作节点即可进阶，不会因为某次自测掉级。</p>
      </div>`;
  },

  // ---- T4 动作阶梯节点：名称直取 data.js，不另起名 ----
  NODE_LINES: [
    { axis: 'arm', key: 'chest', label: '臂力线' },
    { axis: 'leg', key: 'legs', label: '腿力线' },
    { axis: 'waist', key: 'core', label: '腰力线' },
    { axis: 'back', key: 'back', label: '背力线' },
    { axis: 'cardio', key: 'cardio', label: '气力线' }
  ],

  mountNodes(root) {
    const box = root && root.querySelector ? root.querySelector('#abilityNodes') : null;
    if (!box || typeof FITNESS_DATA === 'undefined') return;
    const state = WenKeleAbility.getState();
    box.innerHTML = `
      <div class="ab-nodes">
        <h3><i class="fas fa-list-check"></i> 动作阶梯</h3>
        <p class="ab-nodes-note">每练成一个动作，就点亮一个节点。进阶条件看动作卡上的说明。</p>
        ${this.NODE_LINES.map(line => {
          const lib = FITNESS_DATA.exerciseLibrary[line.key];
          const list = lib ? (lib.home || lib.gym || []) : [];
          const unlocked = state.nodes[line.axis] || [];
          return `
            <div class="ab-node-line">
              <div class="ab-node-title">${line.label} <span>${unlocked.length}/${list.length}</span></div>
              <div class="ab-node-chain">
                ${list.map((ex, i) => `
                  <div class="ab-node ${unlocked.includes(i) ? 'is-unlocked' : ''}" data-axis="${line.axis}" data-node="${i}">
                    <span class="ab-node-dot">${unlocked.includes(i) ? '✓' : i + 1}</span>
                    <span class="ab-node-name">${ex.name}</span>
                  </div>`).join('<span class="ab-node-link"></span>')}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }
};
