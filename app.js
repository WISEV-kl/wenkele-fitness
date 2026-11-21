/**
 * [INPUT]: 依赖 data.js 的 FITNESS_DATA 全局对象
 * [OUTPUT]: 对外提供 FitnessApp 全局对象，包含表单逻辑、计算引擎、计划生成与渲染
 * [POS]: fitness-coach 的应用逻辑层，连接数据层与 UI 层
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================
// 计算引擎
// ============================================================
const Calc = {
  // BMI
  bmi(weightKg, heightCm) {
    const h = heightCm / 100;
    return weightKg / (h * h);
  },

  // BMR - Mifflin-St Jeor
  bmr(weightKg, heightCm, age, gender) {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return gender === 'male' ? base + 5 : base - 161;
  },

  // TDEE
  tdee(bmrValue, activityFactor) {
    return bmrValue * activityFactor;
  },

  // 目标热量
  targetCalories(tdeeValue, goal, bmiValue) {
    if (goal === 'muscle') return tdeeValue + 250;
    if (goal === 'fatloss') return tdeeValue - 400;
    if (goal === 'maintain') return tdeeValue;
    return tdeeValue; // strength/conditioning/posture 默认维持
  },

  // BMI 分类
  bmiCategory(bmiValue) {
    const ranges = FITNESS_DATA.assessment.bmiRanges;
    for (const r of ranges) {
      if (bmiValue >= r.min && bmiValue < r.max) return r;
    }
    return ranges[0];
  }
};

// ============================================================
// 训练计划生成引擎
// ============================================================
const PlanGen = {
  // 根据目标 + 经验选择训练体系：经验决定「周容量」，即练多少
  getSystem(goal, experience, bmiValue, specialCondition) {
    // 体态矫正优先
    if (goal === 'posture') return FITNESS_DATA.trainingSystems.posture.default;

    // 肥胖优先减脂
    if (bmiValue >= 28 && goal !== 'fatloss' && goal !== 'muscle') {
      return FITNESS_DATA.trainingSystems.fatloss.default;
    }

    switch (goal) {
      case 'muscle':
        return FITNESS_DATA.trainingSystems.muscle[experience] || FITNESS_DATA.trainingSystems.muscle.novice;
      case 'fatloss':
        return FITNESS_DATA.trainingSystems.fatloss.default;
      case 'strength':
        return FITNESS_DATA.trainingSystems.strength[experience] || FITNESS_DATA.trainingSystems.strength.beginner;
      case 'conditioning':
        return FITNESS_DATA.trainingSystems.conditioning.default;
      default:
        return FITNESS_DATA.trainingSystems.muscle.novice;
    }
  },

  // 时间预算：天数决定「怎么摊」（分化与周日程），不改周容量（Schoenfeld 2018）
  // 分化表仅对增肌严格适用（skill「按时间预算选择」表的适用目标列）；
  // 其余目标只借用天数维度重排训练日，保留各自体系的 split / volume / reps / rest。
  applyTimeBudget(system, goal, days) {
    const tb = FITNESS_DATA.timeBudget;
    const opt = tb.options.find(o => o.days === Number(days));
    const templates = tb.focusTemplates[goal];
    if (!opt || !templates || !templates[days]) return system;

    const focuses = templates[days];
    const schedule = opt.weekdays.map((day, i) => ({
      day,
      focus: focuses[i] || focuses[focuses.length - 1],
      duration: opt.duration
    }));

    return {
      ...system,
      split: goal === 'muscle' ? opt.split : system.split,
      frequency: `每周 ${days} 次`,
      schedule,
      timeBudget: {
        days: Number(days),
        originalFrequency: system.frequency,
        capacityNote: opt.capacity,
        applies: opt.applies,
        weekdaysSource: tb.weekdaysSource,
        principle: tb.principle,
        capacityByExperience: system.volume
      }
    };
  },

  // 选择训练日的动作
  getDayExercises(dayFocus, scenario, specialCondition, params) {
    const exercises = [];
    const isGym = scenario === 'gym' || scenario === 'mixed';
    const isHome = scenario === 'home_none' || scenario === 'home_simple' || scenario === 'mixed';

    // B3/B4：按经验等级选起点、同 focus 第二次出现时轮转。
    // 不传 params / 非法 level / rotation=0 时索引恒为 0 —— 旧行为逐字不变（C2）。
    const levelIndex = { beginner: 0, novice: 0, intermediate: 1, advanced: 2 };
    const baseIdx = params && Object.prototype.hasOwnProperty.call(levelIndex, params.level)
      ? Math.min(levelIndex[params.level], 99) : 0;
    const rotation = params && Number.isInteger(params.rotation) && params.rotation > 0
      ? params.rotation : 0;
    const pick = (pool) => {
      if (!pool || pool.length === 0) return null;
      const idx = (baseIdx + rotation) % pool.length;
      return pool[idx];
    };
    const push = (group, variant) => {
      const lib = FITNESS_DATA.exerciseLibrary[group];
      if (!lib) return;
      const pool = variant === 'gym' ? lib.gym : lib.home;
      const ex = pick(pool);
      if (ex) exercises.push({ group: lib.name, ...ex });
    };

    const focus = dayFocus.toLowerCase();

    // 分支顺序原则：整体性/专项目 → 局部，否则复合 focus 会被首个关键词截胡。
    // 1) 矫正：focus 含「胸肌/上斜方」，排在「推/胸」后会被误判为胸部训练日
    // 2) 整合/全身补强：focus 含「推举/深蹲」，排在「推」后会被误判为推日
    // 3) HIIT 判断必须用小写：focus 已 toLowerCase，旧代码 includes('HIIT') 恒为 false（既有缺陷）
    if (focus.includes('矫正') || focus.includes('松解') || focus.includes('激活')) {
      if (isGym) { push('shoulders', 'gym'); push('core', 'gym'); }
      else { push('shoulders', 'home'); push('core', 'home'); }
    } else if (focus.includes('整合') || focus.includes('补强') || focus.includes('技术日')) {
      // 整合动作模式：走全身组合，覆盖腿/推/拉/核心
      const legGroup = isGym ? FITNESS_DATA.exerciseLibrary.legs.gym[0] : FITNESS_DATA.exerciseLibrary.legs.home[1];
      const pushGroup = isGym ? FITNESS_DATA.exerciseLibrary.chest.gym[1] : FITNESS_DATA.exerciseLibrary.chest.home[3];
      const pullGroup = isGym ? FITNESS_DATA.exerciseLibrary.back.gym[1] : FITNESS_DATA.exerciseLibrary.back.home[1];
      const coreGroup = isGym ? FITNESS_DATA.exerciseLibrary.core.gym[0] : FITNESS_DATA.exerciseLibrary.core.home[2];
      exercises.push({ group: '腿部', ...legGroup });
      exercises.push({ group: '胸部', ...pushGroup });
      exercises.push({ group: '背部', ...pullGroup });
      exercises.push({ group: '核心', ...coreGroup });
    } else if (focus.includes('推') || focus.includes('胸') || focus.includes('上肢')) {
      if (isGym) { push('chest', 'gym'); push('shoulders', 'gym'); push('core', 'gym'); }
      else { push('chest', 'home'); push('shoulders', 'home'); push('core', 'home'); }
    } else if (focus.includes('拉') || focus.includes('背')) {
      if (isGym) { push('back', 'gym'); push('core', 'gym'); }
      else { push('back', 'home'); push('core', 'home'); }
    } else if (focus.includes('腿')) {
      if (isGym) { push('legs', 'gym'); }
      else { push('legs', 'home'); }
      if (focus.includes('有氧') === false && exercises.length < 2) push('core', isGym ? 'gym' : 'home');
    } else if (focus.includes('全身') || focus.includes('力量训练')) {
      // 全身训练：腿 + 推 + 拉。B4：索引加 rotation，但 rotation=0 时与旧代码逐字一致。
      const isGymDay = isGym;
      const at = (group, variant, base) => {
        const lib = FITNESS_DATA.exerciseLibrary[group];
        const pool = (variant === 'gym' || isGymDay) ? lib.gym : lib.home;
        const list = pool && pool.length ? pool : (lib.home || []);
        // B3：baseIdx 来自经验等级；rotation 来自 B4；两者叠加，旧行为（均为 0）逐字不变。
        return list[(base + baseIdx + rotation) % list.length];
      };
      exercises.push({ group: '腿部', ...at('legs', isGym ? 'gym' : 'home', isGym ? 0 : 1) });
      exercises.push({ group: '胸部', ...at('chest', isGym ? 'gym' : 'home', isGym ? 1 : 3) });
      exercises.push({ group: '背部', ...at('back', isGym ? 'gym' : 'home', 1) });
      exercises.push({ group: '核心', ...at('core', isGym ? 'gym' : 'home', isGym ? 0 : 2) });
    } else if (focus.includes('深蹲') || focus.includes('卧推') || focus.includes('硬拉')) {
      // 力量训练日
      if (focus.includes('深蹲')) { exercises.push({ group: '腿部', ...(isGym ? FITNESS_DATA.exerciseLibrary.legs.gym[1] : FITNESS_DATA.exerciseLibrary.legs.home[1]) }); }
      if (focus.includes('卧推')) { exercises.push({ group: '胸部', ...(isGym ? FITNESS_DATA.exerciseLibrary.chest.gym[2] : FITNESS_DATA.exerciseLibrary.chest.home[3]) }); }
      if (focus.includes('硬拉')) { exercises.push({ group: '背部', ...(isGym ? FITNESS_DATA.exerciseLibrary.back.gym[3] : FITNESS_DATA.exerciseLibrary.back.home[1]) }); }
      if (exercises.length < 2) { exercises.push({ group: '核心', ...(isGym ? FITNESS_DATA.exerciseLibrary.core.gym[0] : FITNESS_DATA.exerciseLibrary.core.home[2]) }); }
    } else if (focus.includes('循环')) {
      // 循环训练：多动作
      const groups = ['legs', 'chest', 'back', 'core', 'shoulders'];
      const used = [];
      for (const g of groups) {
        if (used.length >= 6) break;
        const lib = FITNESS_DATA.exerciseLibrary[g];
        const pool = isGym ? (lib.gym || []) : (lib.home || []);
        if (pool.length > 0 && !used.includes(g)) {
          exercises.push({ group: lib.name, ...pool[0] });
          used.push(g);
        }
      }
    } else if (focus.includes('hiit') || focus.includes('有氧')) {
      // 有氧日：取前两个不同动作，避免重复
      const lib = FITNESS_DATA.exerciseLibrary.cardio;
      const pool = isGym ? (lib.gym || []) : (lib.home || []);
      pool.slice(0, 2).forEach(ex => exercises.push({ group: lib.name, ...ex }));
    } else if (focus.includes('休息')) {
      return exercises; // 休息日无动作
    }

    // 特殊人群适配
    if (specialCondition && specialCondition !== 'none' && exercises.length > 0) {
      PlanGen.adaptForSpecial(exercises, specialCondition, isGym);
    }

    // T4：按体型方向补足高优先肌群（只追加、不删改既有动作，保证旧行为不变）
    if (params && params.focus) {
      PlanGen.applyFocus(exercises, params.focus, isGym, dayFocus, params.skipFocus);
    }

    // mixed：为每个动作附「居家/健身房」两个版本，供渲染层斜杠合并显示。
    // 主动作（gym）用自身；居家版优先同名，否则取同组第一项（KISS，不破坏主动作）。
    if (scenario === 'mixed') {
      const nameToKey = { '胸部': 'chest', '背部': 'back', '腿部': 'legs',
        '肩部': 'shoulders', '核心': 'core', '有氧与体能': 'cardio' };
      exercises.forEach(ex => {
        const key = nameToKey[ex.group];
        const lib = key && FITNESS_DATA.exerciseLibrary[key];
        if (!lib || !lib.home || !lib.home.length) return;
        const homeEx = lib.home.find(e => e.name === ex.name) || lib.home[0];
        ex.variants = { home: homeEx, gym: ex };
      });
    }

    return exercises.slice(0, 5);
  },

  // 部位侧重：① 高权重肌群排到训练前段（先练重点）；② 权重>=2 且未覆盖的肌群追加。
  // 只重排与追加、不删改既有动作；不传 params 时完全不执行 —— 旧行为零影响（C13）。
  // T4 验收发现：全身日已覆盖主要肌群，仅追加会让四方向动作几乎无差异，故必须重排。
  applyFocus(exercises, focus, isGym, dayFocus, skipFocus) {
    if (!exercises.length || (dayFocus || '').includes('休息')) return;
    // 体态优先互斥：体态体系走矫正/激活分支，不被部位权重重排串味（C4）
    if (skipFocus) return;
    const nameToKey = {
      '胸部': 'chest', '背部': 'back', '腿部': 'legs',
      '肩部': 'shoulders', '核心': 'core', '有氧与体能': 'cardio'
    };
    const weight = (e) => focus[nameToKey[e.group]] || 0;
    // 稳定排序：高权重靠前，同权重保持原顺序（现代 JS 引擎保证 Array.sort 稳定）
    exercises.sort((a, b) => weight(b) - weight(a));
    const present = new Set(exercises.map(e => nameToKey[e.group]).filter(Boolean));
    const high = Object.keys(focus).filter(k => focus[k] >= 2 && !present.has(k)).slice(0, 2);
    high.forEach(key => {
      const lib = FITNESS_DATA.exerciseLibrary[key];
      if (!lib) return;
      const pool = isGym ? (lib.gym || []) : (lib.home || []);
      if (pool.length) exercises.push({ group: lib.name, ...pool[0] });
    });
  },

  // 特殊人群动作替换
  adaptForSpecial(exercises, condition, isGym) {
    const adaptation = {
      elderly: { push: { home: '墙壁俯卧撑', gym: '史密斯机卧推（轻重量）' }, legs: '坐站训练（椅子深蹲）', core: '死虫式（Dead Bug）' },
      office: { shoulders: '俯身反向飞鸟', core: '鸟狗式（Bird Dog）' },
      postpartum: { core: '死虫式（Dead Bug）', push: '墙壁俯卧撑', legs: '臀桥' },
      youth: { push: '标准俯卧撑', legs: '徒手深蹲' },
      obese: { push: '墙壁俯卧撑', legs: '坐站训练（椅子深蹲）', cardio: '快走' },
      injury: { push: '墙壁俯卧撑', legs: '臀桥', core: '死虫式（Dead Bug）' }
    };
    const map = adaptation[condition];
    if (!map) return;
    exercises.forEach(ex => {
      const key = ex.group.includes('胸') ? 'push' :
                  ex.group.includes('腿') ? 'legs' :
                  ex.group.includes('背') ? 'back' :
                  ex.group.includes('肩') ? 'shoulders' :
                  ex.group.includes('核心') ? 'core' : 'cardio';
      if (map[key]) {
        // 找到替换动作
        const lib = FITNESS_DATA.exerciseLibrary[key === 'push' ? 'chest' :
          key === 'legs' ? 'legs' :
          key === 'back' ? 'back' :
          key === 'shoulders' ? 'shoulders' :
          key === 'core' ? 'core' : 'cardio'];
        const pool = isGym ? (lib.gym || []) : (lib.home || []);
        const replacement = pool.find(e => e.name === map[key]) || pool[0];
        if (replacement) { ex.name = replacement.name; ex.target = replacement.target; ex.sets = replacement.sets; ex.reps = replacement.reps; ex.rest = replacement.rest; ex.cue = replacement.cue; ex.progress = replacement.progress; }
      }
    });
  },

  // 完整周计划
  buildWeeklyPlan(system, scenario, specialCondition, params) {
    // B4：同一 focus 第二次出现时轮转取池，避免周一周五动作完全相同。
    // 只影响动作选择，不改 schedule / duration / 完成率分母（规格 C2）。
    const seenFocus = {};
    return system.schedule.map(day => {
      const key = day.focus || '';
      const rotation = seenFocus[key] || 0;
      seenFocus[key] = rotation + 1;
      // 副本传参：不污染调用方给的 params（后续天各自独立）
      const dayParams = params && rotation > 0 ? { ...params, rotation } : params;
      return {
        day: day.day,
        focus: day.focus,
        duration: day.duration,
        exercises: PlanGen.getDayExercises(day.focus, scenario, specialCondition, dayParams)
      };
    });
  }
};

// ============================================================
// 营养方案生成引擎
// ============================================================
const NutritionGen = {
  // heat 为可选第 4 参数（Replan 1）：不传时完全沿用旧 goal 分支，旧测试零影响
  buildPlan(user, tdeeValue, bmiValue, heat) {
    const goal = user.goal;
    const data = FITNESS_DATA.nutrition;

    // 目标热量：heat 解耦「体系选择」与「热量模式」；不传时走旧逻辑
    let targetCal;
    let calDesc;
    const blocked = heat === 'deficit' && WenKeleBodyGoal.shouldBlockDeficit(user.bodyGoal, bmiValue);
    const mode = blocked ? 'maintain' : heat;

    if (mode === 'maintain') { targetCal = tdeeValue; calDesc = data.calorieAdjust.maintain; }
    else if (mode === 'surplus') { targetCal = tdeeValue + 250; calDesc = data.calorieAdjust.muscle; }
    else if (mode === 'deficit') {
      targetCal = bmiValue >= 28 ? tdeeValue - 600 : tdeeValue - 400;
      calDesc = bmiValue >= 28 ? data.calorieAdjust.fast_fatloss : data.calorieAdjust.fatloss;
    }
    else if (goal === 'muscle') { targetCal = tdeeValue + 250; calDesc = data.calorieAdjust.muscle; }
    else if (goal === 'fatloss') { targetCal = bmiValue >= 28 ? tdeeValue - 600 : tdeeValue - 400; calDesc = bmiValue >= 28 ? data.calorieAdjust.fast_fatloss : data.calorieAdjust.fatloss; }
    else { targetCal = tdeeValue; calDesc = data.calorieAdjust.maintain; }

    // 最低热量红线
    const minCal = user.gender === 'male' ? data.minCalories.male : data.minCalories.female;
    if (targetCal < minCal) targetCal = minCal;

    // 宏量营养素：传入 heat 时按热量模式选，否则沿用旧 goal 口径
    const macroKey = mode === 'surplus' ? 'muscle' : mode === 'deficit' ? 'fatloss'
      : mode === 'maintain' ? 'maintain'
      : goal === 'muscle' ? 'muscle' : goal === 'fatloss' ? 'fatloss' : 'maintain';
    const macros = data.macros[macroKey];
    const proteinG = Math.round(user.weightKg * macros.protein.min);
    const proteinMaxG = Math.round(user.weightKg * macros.protein.max);
    const fatG = Math.round(user.weightKg * macros.fat.min);
    const carbG = Math.max(0, Math.round((targetCal - proteinG * 4 - fatG * 9) / 4));

    return {
      tdee: isFinite(tdeeValue) ? Math.round(tdeeValue) : 2400,
      targetCal: isFinite(targetCal) ? Math.round(targetCal) : 2000,
      calDesc,
      minCal,
      deficitBlocked: blocked,   // T4 健康下限守卫：结果页据此提示
      protein: { min: proteinG, max: proteinMaxG, formula: macros.protein },
      fat: { g: fatG, formula: macros.fat },
      carb: { g: carbG, formula: macros.carb },
      meals: data.meals,
      hydration: data.hydration,
      supplements: data.supplements
    };
  }
};

// ============================================================
// 主应用控制器
// ============================================================
const FitnessApp = {
  state: {
    step: 0,
    form: {
      heightCm: null,
      weightKg: null,
      age: null,
      gender: null,
      experience: null,
      goal: null,
      scenario: null,
      activity: null,
      daysPerWeek: null,
      bodyGoal: null,   // 体型方向：男自动 v_taper；女由用户选 cut/tone/build
      trainingFocus: null, // 训练侧重：auto/strength/conditioning/posture，不预选
      specialCondition: 'none'
    },
    currentResult: null,   // 当前生成的方案，用于保存
    currentSavedId: null,  // 当前方案已保存的记录 id
    daysSinceLast: null    // T5 回访天数（≥1 天且有历史方案才记事件）
  },

  init() {
    this.bindEvents();
    this.showStep(0, false); // 首次进入停在首屏，不自动滚动
    this.renderSpecialConditions();
    // T4：按最近完成率预选更接近实际的天数（只预选，不自动提交）
    this.applyAdjustmentAdvice();
    // 预加载历史方案
    this.loadHistory();
    // T5：form_start；回访天数先暂存，等确认「加载了历史方案」才记 return_visit
    if (typeof WenKeleTracker !== 'undefined') {
      this.state.daysSinceLast = WenKeleTracker.checkReturnVisit();
      WenKeleTracker.track('form_start', {});
    }
    // T9：视图 Tab + 回访直达（打开即回到当前方案的今日训练）
    this.bindViewTabs();
    this.restoreLastPlan();
    // T2：开场能力问卷（首次访问才显示）
    if (typeof WenKeleAbilityUI !== 'undefined') WenKeleAbilityUI.mountOnboarding();
  },

  // ---- T9 双视图切换 ----
  bindViewTabs() {
    const tabs = document.getElementById('viewTabs');
    const resultView = document.getElementById('resultView');
    if (!tabs || !resultView) return;
    resultView.classList.add('view-today');
    tabs.querySelectorAll('.view-tab').forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });
    const newBtn = document.getElementById('btnNewPlan');
    if (newBtn) newBtn.addEventListener('click', () => this.backToForm());
  },

  switchView(view) {
    const resultView = document.getElementById('resultView');
    const tabs = document.getElementById('viewTabs');
    if (!resultView || !tabs) return;
    const valid = ['today', 'ability', 'plan'];
    const name = valid.includes(view) ? view : 'today';
    resultView.classList.remove('view-today', 'view-ability', 'view-plan');
    resultView.classList.add('view-' + name);
    tabs.querySelectorAll('.view-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.view === name);
      b.setAttribute('aria-selected', b.dataset.view === name ? 'true' : 'false');
    });
    this.state.currentView = name;
    if (name === 'ability' && typeof WenKeleAbilityUI !== 'undefined') {
      WenKeleAbilityUI.mountAbilityPanel();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ---- T9 回访直达 ----
  restoreLastPlan() {
    if (typeof WenKeleTracker === 'undefined') return false;
    const cached = WenKeleTracker.getLastPlan();
    if (!cached) return false;
    const result = cached.result;
    this.state.currentResult = result;
    this.state.currentSavedId = null;
    // T5：还原体型方向与派生目标，否则回访后表单状态与方案不一致
    if (typeof WenKeleBodyGoal !== 'undefined') this.restoreBodyGoal(result);
    this.renderResult(result, { planId: cached.planId, restored: true });
    this.switchView('today');
    showToast('已回到你上次的训练计划');
    return true;
  },

  // ---- T4 完成率回读与预选 ----
  applyAdjustmentAdvice() {
    if (typeof WenKeleTracker === 'undefined') return null;
    const advice = WenKeleTracker.getAdjustmentAdvice(null);
    if (!advice) return null;
    const radio = document.querySelector(`input[name="daysPerWeek"][value="${advice.suggestedDays}"]`);
    if (radio) {
      radio.checked = true;
      this.state.form.daysPerWeek = Number(advice.suggestedDays);
    }
    const hint = document.getElementById('adjustHint');
    if (hint) { hint.textContent = advice.message; hint.style.display = 'block'; }
    return advice;
  },

  // ---- 事件绑定 ----
  bindEvents() {
    // 下一步 / 上一步
    document.getElementById('btnNext').addEventListener('click', () => this.nextStep());
    document.getElementById('btnPrev').addEventListener('click', () => this.prevStep());
    document.getElementById('btnRegenerate').addEventListener('click', () => this.regenerate());
    document.getElementById('btnEdit').addEventListener('click', () => this.backToForm());
    const btnSave = document.getElementById('btnSave');
    if (btnSave) btnSave.addEventListener('click', () => this.saveCurrentPlan());

    // 输入实时保存
    const bindInput = (id, key) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(el.type === 'radio' ? 'change' : 'input', () => {
        this.state.form[key] = el.type === 'number' ? parseFloat(el.value) || null : el.value;
      });
    };
    bindInput('height', 'heightCm');
    bindInput('weight', 'weightKg');
    bindInput('age', 'age');
    bindInput('experience', 'experience');

    // 性别、目标、场景、活动系数、特殊人群 - 使用事件委托
    document.querySelectorAll('.option-group').forEach(group => {
      group.addEventListener('change', (e) => {
        const name = group.dataset.field;
        if (name && e.target.type === 'radio') {
          this.state.form[name] = e.target.value;
          // T2：性别联动体型方向（男自动 / 女浮现三选一 / 切换清脏值）
          if (name === 'gender') this.onGenderChange(e.target.value);
        }
      });
    });

    // 顶部导航「能力/方法论」→ 展开关于抽屉并定位（锚点仍有效）
    document.querySelectorAll('[data-about-link]').forEach(link => {
      link.addEventListener('click', () => {
        const drawer = document.getElementById('aboutDrawer');
        if (drawer) drawer.open = true;
        // details 展开后目标才可见，稍延迟滚动
        setTimeout(() => {
          const target = document.getElementById(link.dataset.aboutLink);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      });
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.nextStep();
    });
  },

  // ---- T2 体型方向与性别联动 ----
  onGenderChange(gender, opts) {
    const field = document.getElementById('bodyGoalField');
    const keep = opts && opts.keep; // 回访还原时不重置已有方向
    if (!keep) {
      this.state.form.bodyGoal = WenKeleBodyGoal.deriveFromGender(gender);
      document.querySelectorAll('input[name="bodyGoal"]').forEach(r => { r.checked = false; });
    }
    if (field) field.hidden = gender !== 'female';
  },

  // 供回访还原：按 result.bodyGoal 恢复条件块与单选状态
  restoreBodyGoal(result) {
    const bg = WenKeleBodyGoal.fromResult(result);
    this.state.form.bodyGoal = bg;
    this.onGenderChange(result && result.profile ? result.profile.gender : null, { keep: true });
    const radio = document.querySelector(`input[name="bodyGoal"][value="${bg}"]`);
    if (radio) radio.checked = true;
  },

  // ---- 表单步骤导航 ----
  getTotalSteps() { return 4; },

  showStep(index, shouldScroll = true) {
    this.state.step = index;
    document.querySelectorAll('.form-step').forEach((s, i) => {
      s.classList.toggle('active', i === index);
    });
    const prev = document.getElementById('btnPrev');
    const next = document.getElementById('btnNext');
    prev.style.visibility = index === 0 ? 'hidden' : 'visible';
    next.textContent = index === this.getTotalSteps() - 1 ? '生成我的方案 →' : '下一步 →';
    this.updateProgress(index);
    // T3：训练目标由体型方向自动派生，隐藏该字段，避免「减脂」被问两遍
    if (index >= 1) this.applyDerivedGoal();
    // 最后一步显示信息回顾
    if (index === this.getTotalSteps() - 1) this.renderReview();
    if (shouldScroll) this.scrollToFormNav();
  },

  applyDerivedGoal() {
    const f = this.state.form;
    // C3：显式选了训练侧重就尊重它；auto/null 才跟随体型方向派生
    const tf = typeof WenKeleTrainingFocus !== 'undefined' ? f.trainingFocus : 'auto';
    const derived = typeof WenKeleTrainingFocus !== 'undefined'
      ? WenKeleTrainingFocus.deriveGoal(f.bodyGoal, tf)
      : WenKeleBodyGoal.deriveGoal(f.bodyGoal);
    if (derived) f.goal = derived;
    const field = document.getElementById('goalField');
    if (field) field.hidden = !!derived;
  },

  // 切步后滚到「信息导航栏」而非页面顶部：
  // 顶部有 hero + sticky 导航，回 top:0 会让用户每次都要手动下滑才能填下一项。
  scrollToFormNav() {
    const bar = document.querySelector('.progress-bar');
    const form = document.getElementById('fitnessForm');
    const target = bar || form;
    if (!target) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const header = document.querySelector('.site-header');
    const offset = (header ? header.getBoundingClientRect().height : 0) + 16;
    const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  },

  // ---- 回顾已填信息 ----
  renderReview() {
    const box = document.getElementById('reviewBox');
    const f = this.state.form;
    const rows = [];
    const add = (label, value) => {
      if (value) rows.push(`<div class="review-row"><span class="review-label">${label}</span><span class="review-value">${value}</span></div>`);
    };
    add('身高', f.heightCm ? `${f.heightCm} cm` : null);
    add('体重', f.weightKg ? `${f.weightKg} kg` : null);
    add('年龄', f.age ? `${f.age} 岁` : null);
    add('性别', f.gender === 'male' ? '男' : f.gender === 'female' ? '女' : null);
    add('训练方向', WenKeleBodyGoal.getLabel(f.bodyGoal) || '宽肩窄腰');
    add('训练侧重', typeof WenKeleTrainingFocus !== 'undefined'
      ? WenKeleTrainingFocus.getLabel(f.trainingFocus) : '跟随方向');
    add('训练经验', f.experience ? (FITNESS_DATA.assessment.experienceLevels.find(e => e.value === f.experience) || {}).label : null);
    add('训练目标', f.goal ? (FITNESS_DATA.assessment.goals.find(g => g.value === f.goal) || {}).label : null);
    add('训练场景', f.scenario ? (FITNESS_DATA.assessment.scenarios.find(s => s.value === f.scenario) || {}).label : null);
    add('每周可训练', f.daysPerWeek ? `${f.daysPerWeek} 天` : null);
    add('活动水平', f.activity ? (FITNESS_DATA.assessment.activityFactors.find(a => String(a.value) === String(f.activity)) || {}).label : null);
    const sc = f.specialCondition && f.specialCondition !== 'none'
      ? (FITNESS_DATA.assessment.specialConditions.find(c => c.value === f.specialCondition) || {}).label : null;
    add('特殊情况', sc);
    box.innerHTML = rows.length
      ? `<div class="review-list">${rows.join('')}</div>`
      : '<p class="review-placeholder">请返回前面步骤填写信息</p>';
  },

  updateProgress(index) {
    document.querySelectorAll('.step-dot').forEach((d, i) => {
      d.classList.toggle('active', i <= index);
      d.classList.toggle('done', i < index);
    });
  },

  nextStep() {
    if (!this.validateStep(this.state.step)) return;
    if (this.state.step < this.getTotalSteps() - 1) {
      this.showStep(this.state.step + 1);
    } else {
      // T5：表单全部校验通过
      if (typeof WenKeleTracker !== 'undefined') {
        const f = this.state.form;
        WenKeleTracker.track('form_complete', {
          goal: f.goal, days: f.daysPerWeek, experience: f.experience
        });
      }
      this.generate();
    }
  },

  prevStep() {
    if (this.state.step > 0) this.showStep(this.state.step - 1);
  },

  backToForm() {
    document.getElementById('resultView').style.display = 'none';
    document.getElementById('formView').style.display = 'block';
    this.showStep(0);
  },

  regenerate() {
    this.generate(true);
  },

  // ---- 表单校验 ----
  validateStep(step) {
    const f = this.state.form;
    const showError = (msg) => {
      const el = document.getElementById('formError');
      el.textContent = msg;
      el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 3000);
    };

    if (step === 0) {
      if (!f.heightCm || !f.weightKg || !f.age) { showError('请填写完整的身高、体重和年龄'); return false; }
      if (f.heightCm < 100 || f.heightCm > 250) { showError('身高需要在 100-250cm 之间'); return false; }
      if (f.weightKg < 30 || f.weightKg > 250) { showError('体重需要在 30-250kg 之间'); return false; }
      if (f.age < 12 || f.age > 90) { showError('年龄需要在 12-90 岁之间'); return false; }
      if (!f.gender) { showError('请选择性别'); return false; }
      if (f.gender === 'female' && !f.bodyGoal) { showError('请选择训练方向'); return false; }
    } else if (step === 1) {
      if (!f.experience) { showError('请选择训练经验'); return false; }
      if (!f.goal) { showError('训练方向未就绪，请返回上一步重新选择'); return false; }
      if (!f.trainingFocus) { showError('请选择训练侧重'); return false; }
      if (!f.scenario) { showError('请选择训练场景'); return false; }
      if (!f.daysPerWeek) { showError('请选择每周可训练天数'); return false; }
    } else if (step === 2) {
      if (!f.activity) { showError('请选择活动水平'); return false; }
    }
    return true;
  },

  // ---- 生成方案 ----
  // 数值卫生：非数字/越界 → 合理默认值，防 NaN 污染方案与 AI context
  // 幂等：合法值原样返回（正常用户输入结果逐字不变）
  sanitizeForm(form) {
    const num = (v, min, max, fallback) => {
      const n = typeof v === 'number' ? v : parseFloat(v);
      return (isNaN(n) || !isFinite(n)) ? fallback : Math.min(max, Math.max(min, n));
    };
    const cleaned = {
      age: num(form.age, 14, 100, 28),
      heightCm: num(form.heightCm, 120, 230, 170),
      weightKg: num(form.weightKg, 30, 250, 65),
      daysPerWeek: num(form.daysPerWeek, 2, 7, 3)
    };
    const act = parseFloat(form.activity);
    cleaned.activity = isNaN(act) || !isFinite(act) ? 1.55 : form.activity;
    const changed = Object.keys(cleaned).some(k => String(cleaned[k]) !== String(form[k]));
    Object.assign(form, cleaned);
    return changed;
  },

  generate(regenerate) {
    const f = this.state.form;
    if (this.sanitizeForm(f) && typeof showToast === 'function') {
      showToast('部分输入超出合理范围，已按默认值计算');
    }
    const bmi = Calc.bmi(f.weightKg, f.heightCm);
    const bmr = Calc.bmr(f.weightKg, f.heightCm, f.age, f.gender);
    const tdee = Calc.tdee(bmr, parseFloat(f.activity));
    const bmiCat = Calc.bmiCategory(bmi);

    // T4：方向 → 三参数（体系 goal / 热量 heat / 部位权重 focus），共用一套引擎
    // B3：把已有 experience 映射为动作梯度 level，复用同一 params 通道（C3 不新增提问）
    const bgParams = WenKeleBodyGoal.getParams(f.bodyGoal);
    if (bgParams) {
      bgParams.level = f.experience;
      // 训练侧重决定体系（goal），体型方向继续决定热量（heat）与部位（focus）
      if (typeof WenKeleTrainingFocus !== 'undefined') {
        bgParams.goal = WenKeleTrainingFocus.deriveGoal(f.bodyGoal, f.trainingFocus);
        // 体态优先互斥：跳过部位权重重排，避免串味（规格 C4）
        const ext = WenKeleTrainingFocus.getAskExtension(f.trainingFocus);
        bgParams.skipFocus = ext.skipFocus;
      }
    }
    // 用派生后的 goal 选体系，不用可能残留的旧 form.goal
    const effectiveGoal = bgParams && bgParams.goal ? bgParams.goal : f.goal;
    const baseSystem = PlanGen.getSystem(effectiveGoal, f.experience, bmi, f.specialCondition);
    const system = PlanGen.applyTimeBudget(baseSystem, effectiveGoal, f.daysPerWeek);
    const weeklyPlan = PlanGen.buildWeeklyPlan(system, f.scenario, f.specialCondition, bgParams);
    const nutrition = NutritionGen.buildPlan(f, tdee, bmi, bgParams ? bgParams.heat : undefined);

    const result = {
      // 确定性 ID：同一组输入生成同一份方案，打卡记录天然共享且保存前后一致
      planId: this.makePlanId(f),
      bodyGoal: f.bodyGoal,   // 方向随快照保存，供回访还原与历史辨识
      trainingFocus: f.trainingFocus || 'auto', // 侧重随快照保存（旧方案视为 auto）
      profile: {
        heightCm: f.heightCm, weightKg: f.weightKg, age: f.age, gender: f.gender,
        // 出口兜底：任何路径的 NaN/Infinity 都不进 HTML（纵深防御）
        bmi: (isFinite(bmi) ? bmi : 22).toFixed(1), bmiCat,
        bmr: isFinite(bmr) ? Math.round(bmr) : 1600,
        tdee: isFinite(tdee) ? Math.round(tdee) : 2400,
        experience: FITNESS_DATA.assessment.experienceLevels.find(e => e.value === f.experience),
        goal: FITNESS_DATA.assessment.goals.find(g => g.value === effectiveGoal),
        scenario: FITNESS_DATA.assessment.scenarios.find(s => s.value === f.scenario)
      },
      system,
      weeklyPlan,
      nutrition,
      special: f.specialCondition !== 'none' ? FITNESS_DATA.specialPopulations[f.specialCondition] : null
    };

    this.state.currentResult = result;
    this.state.currentSavedId = null;
    // 重置保存按钮状态
    const btnSave = document.getElementById('btnSave');
    if (btnSave) {
      btnSave.classList.remove('saved');
      btnSave.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> 保存方案';
    }

    this.renderResult(result);
  },

  // ============================================================
  // 云端方案保存 / 历史
  // ============================================================

  // ---- 保存当前方案 ----
  async saveCurrentPlan() {
    const result = this.state.currentResult;
    if (!result) { showToast('请先生成方案'); return; }
    if (this.state.currentSavedId) { showToast('该方案已保存过'); return; }

    const btnSave = document.getElementById('btnSave');
    btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中…';

    const res = await WenKeleDB.savePlan(result);
    if (res.ok) {
      this.state.currentSavedId = res.id;
      btnSave.classList.add('saved');
      btnSave.innerHTML = '<i class="fas fa-check"></i> 已保存';
      showToast(res.mode === 'supabase' ? '方案已同步到云端 ✓' : '方案已保存到本地（未配置云端）');
      this.loadHistory();
    } else {
      btnSave.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> 保存方案';
      showToast('保存失败：' + (res.error || '未知错误'));
    }
  },

  // ---- 加载历史方案列表 ----
  async loadHistory() {
    const panel = document.getElementById('historyPanel');
    const listEl = document.getElementById('historyList');
    const countEl = document.getElementById('historyCount');
    if (!panel || !listEl) return;

    listEl.innerHTML = '<div class="history-loading"><i class="fas fa-spinner fa-spin"></i> 加载中…</div>';

    const res = await WenKeleDB.listPlans();
    const list = res.list || [];
    countEl.textContent = list.length + ' 条记录' + (res.mode === 'local' ? '（本地）' : '');

    // T5：距上次 ≥1 天且确有历史方案，才记为回访
    if (list.length > 0 && this.state.daysSinceLast !== null && this.state.daysSinceLast !== undefined
        && typeof WenKeleTracker !== 'undefined') {
      WenKeleTracker.track('return_visit', { daysSinceLast: this.state.daysSinceLast });
      this.state.daysSinceLast = null; // 一次会话只记一次
    }

    if (list.length === 0) {
      listEl.innerHTML = '<div class="history-empty"><i class="fas fa-inbox"></i> 暂无保存的方案，生成后点击"保存方案"即可留存</div>';
      return;
    }

    listEl.innerHTML = list.map(item => {
      const s = item.summary || {};
      const date = new Date(item.created_at);
      const dateStr = date.getMonth() + 1 + '/' + date.getDate() + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
      const pid = (item.plan && item.plan.planId) || '';
      return `
        <div class="history-item" data-id="${item.id}" data-plan="${pid}">
          <div class="hi-icon"><i class="fas fa-file-lines"></i></div>
          <div class="hi-main">
            <div class="hi-title">${s.goal || '健身方案'} · ${s.split || ''}</div>
            <div class="hi-meta">${dateStr} · BMI ${s.bmi || '-'}（${s.bmiLabel || '-'}） · ${s.targetCal || '-'} kcal</div>
          </div>
          <button class="hi-del" data-del="${item.id}" data-plan="${pid}" title="删除"><i class="fas fa-trash"></i></button>
        </div>`;
    }).join('');

    // 绑定点击加载 / 删除
    listEl.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.hi-del')) return;
        this.loadPlanFromHistory(el.dataset.id);
      });
    });
    listEl.querySelectorAll('.hi-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.deletePlanFromHistory(btn.dataset.del, btn.dataset.plan);
      });
    });
  },

  // ---- 从历史加载方案 ----
  async loadPlanFromHistory(id) {
    const res = await WenKeleDB.listPlans();
    const item = (res.list || []).find(r => r.id === id);
    if (!item) { showToast('未找到该方案'); return; }

    this.state.currentResult = item.plan;
    this.state.currentSavedId = item.id;
    // 兼容补齐功能前保存的旧方案：无 planId 时用记录 id，保证打卡互不串台
    if (!item.plan.planId) item.plan.planId = 'saved_' + item.id;

    const btnSave = document.getElementById('btnSave');
    if (btnSave) {
      btnSave.classList.add('saved');
      btnSave.innerHTML = '<i class="fas fa-check"></i> 已保存';
    }
    // T5：历史方案同样还原方向，保证「重新制定方案」时表单状态一致
    if (typeof WenKeleBodyGoal !== 'undefined') this.restoreBodyGoal(item.plan);
    this.renderResult(item.plan, { planId: item.plan.planId });
    if (item.plan.planId && typeof WenKeleTracker !== 'undefined') {
      WenKeleTracker.saveLastPlan(item.plan.planId, item.plan);
    }
    this.switchView('today');
    showToast('已加载历史方案');
  },

  // ---- 删除历史方案 ----
  // B2 裁决：删除方案时一并删除其训练记录（隐私优先）
  async deletePlanFromHistory(id, planId) {
    const res = await WenKeleDB.deletePlan(id);
    if (res.ok) {
      if (typeof WenKeleTracker !== 'undefined') {
        if (planId) WenKeleTracker.clearPlan(planId);
        // 若删除的正是「最近方案」，清缓存避免回访落到悬空入口
        const last = WenKeleTracker.getLastPlan();
        if (last && (!planId || last.planId === planId || last.planId === 'saved_' + id)) {
          WenKeleTracker.clearLastPlan();
        }
      }
      showToast('已删除');
      if (this.state.currentSavedId === id) {
        this.state.currentSavedId = null;
        const btnSave = document.getElementById('btnSave');
        if (btnSave) {
          btnSave.classList.remove('saved');
          btnSave.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> 保存方案';
        }
      }
      this.loadHistory();
    } else {
      showToast('删除失败：' + (res.error || '未知错误'));
    }
  },

  // ---- 渲染特殊人群选项 ----
  renderSpecialConditions() {
    const container = document.getElementById('specialConditions');
    if (!container) return;
    container.innerHTML = FITNESS_DATA.assessment.specialConditions.map(c => `
      <label class="option-card small">
        <input type="radio" name="specialCondition" value="${c.value}">
        <span>${c.label}</span>
      </label>
    `).join('');
  },

  // 确定性方案 ID：基于影响方案内容的输入字段（djb2 变体），不含时间戳
  makePlanId(f) {
    // C5：bodyGoal 与 trainingFocus 必须入 hash，否则换方向/换侧重共用 planId 导致打卡串台
    const key = [f.heightCm, f.weightKg, f.age, f.gender, f.experience,
      f.goal, f.scenario, f.activity, f.daysPerWeek, f.bodyGoal,
      f.trainingFocus, f.specialCondition].join('|');
    let h = 5381;
    for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
    return 'plan_' + h.toString(36);
  },

  // AI 教练解读：只消费已校验的结构化结果，原文绝不进 DOM（规格 C4）
  generateAiCoach(planId) {
    if (typeof WenKeleAICoach === 'undefined' || !this.state.currentResult) return;
    if (!WenKeleAICoach.isEnabledFor(planId)) return; // kill switch / 灰度未命中
    const body = document.getElementById('aiCoachBody');
    const fb = document.getElementById('btnAiFeedback');
    if (!body) return;
    body.textContent = '正在整理…';
    let ctx = null;
    try {
      let axes = null;
      if (typeof WenKeleAbility !== 'undefined') {
        const weakest = WenKeleAbility.getAxes().filter(a => a.key !== 'steady' && !a.pending)
          .sort((a, b) => a.value - b.value)[0];
        axes = weakest || null;
      }
      const stats = typeof WenKeleTracker !== 'undefined'
        ? WenKeleTracker.getProgress(planId, this.state.currentResult.weeklyPlan) : null;
      ctx = WenKeleAICoach.buildContext(this.state.currentResult, planId, axes, stats);
    } catch (e) { ctx = null; }
    const render = (res) => {
      if (!res || !res.text) {
        body.textContent = '暂时无法生成解读，请稍后再试。';
        if (fb) fb.hidden = true;
        return;
      }
      WenKeleAICoach._lastResult = res; // 供「不准？」绑定被评解读指纹
      const t = res.text;
      // XSS 纵深防御：即使校验层漏了，渲染前也统一转义（不依赖单一防线）
      const esc = (s) => typeof WenKeleAICoach !== 'undefined'
        ? WenKeleAICoach.escapeHTML(s) : String(s);
      body.innerHTML = `
        <div class="ai-coach-section"><b>本周观察</b><p>${esc(t.observation)}</p></div>
        <div class="ai-coach-section"><b>为什么会这样</b><p>${esc(t.reason)}</p></div>
        <div class="ai-coach-section"><b>下周一个小调整</b><p>${esc(t.adjustment)}</p></div>
        <p class="ai-coach-source"><i class="fas fa-info-circle"></i> 来源：${res.label}${res.degraded ? ' · 本地规则解读' : ''}
          · ${res.confidence === 'high' ? '确定性解读' : '生成式解读'} · ${new Date(res.at).toLocaleString('zh-CN')}</p>
        ${res.confidenceNote ? `<p class="ai-coach-confidence">${esc(res.confidenceNote)}</p>` : ''}
        ${Array.isArray(res.basis) && res.basis.length ? `
          <details class="ai-coach-basis">
            <summary><i class="fas fa-list-check"></i> 这次解读依据了什么（${res.basis.length} 项）</summary>
            <ul>${res.basis.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
          </details>` : ''}`;
      if (fb) fb.hidden = false;
      // 生成后按钮语义切换：「换个角度」而非暗示 AI 重新思考（产品诚实）
      const aiBtn = document.getElementById('btnAiExplain');
      if (aiBtn) aiBtn.innerHTML = '<i class="fas fa-rotate"></i> 换个角度';
      const hint = document.getElementById('aiVariantHint');
      if (hint) hint.hidden = false;
      // AI 使用漏斗埋点：曝光 → 生成 → 反馈；复用 tracker 现有事件通道（不另造方案）
      if (typeof WenKeleTracker !== 'undefined') {
        WenKeleTracker.track('ai_explain_generated', {
          source: res.source, degraded: !!res.degraded, label: res.label
        });
      }
    };
    if (!ctx) { render(WenKeleAICoach.explain(null)); return; }
    // 默认 local：不配置云服务也能完整演示；cloud 为可选注入点
    // 不硬指定 provider：宿主若注入 cloud 通道走模型，否则自动 local（消除死路径）
    Promise.resolve(WenKeleAICoach.explain(ctx)).then(render).catch(() => {
      body.textContent = '解读生成失败，已跳过。';
    });
  },

  // ---- 渲染结果 ----
  // 渲染转义：外部存储读回的方案字段必须过这一层（纵深防御，不污染存储原文）
  esc(v) {
    return typeof WenKeleAICoach !== 'undefined'
      ? WenKeleAICoach.escapeHTML(v) : String(v == null ? '' : v);
  },

  // 结构守卫：损坏/旧版历史方案不导致白屏（外部存储属不可信输入）
  // 范式：递归合并到安全骨架，不逐字段打补丁（KISS/DRY，避免打地鼠式脆弱）
  mergeSafe(got, safe) {
    if (Array.isArray(safe)) return Array.isArray(got) ? got : safe;
    if (safe && typeof safe === 'object') {
      const g = got && typeof got === 'object' ? got : {};
      const out = {};
      for (const k of Object.keys(safe)) out[k] = this.mergeSafe(g[k], safe[k]);
      // 保留骨架外的合法字段（如新增字段），但跳过 undefined
      for (const k of Object.keys(g)) if (!(k in out) && g[k] !== undefined) out[k] = g[k];
      return out;
    }
    // 基元：数字骨架要求有限数，否则回退
    if (typeof safe === 'number') return isFinite(got) ? got : safe;
    return (got === undefined || got === null) ? safe : got;
  },

  normalizeResult(r) {
    const src = r && typeof r === 'object' ? r : {};
    const data = FITNESS_DATA.nutrition;
    const safe = {
      planId: '', bodyGoal: '', trainingFocus: 'auto',
      profile: { heightCm: 170, weightKg: 65, age: 28, gender: 'male', bmi: '22.0',
        bmiCat: { label: '正常', color: 'var(--border)' }, bmr: 1600, tdee: 2400 },
      system: { split: '全身分化', frequency: '每周 3 次', volume: '—' },
      weeklyPlan: [],
      nutrition: {
        tdee: 2400, targetCal: 2000, minCal: 1500, deficitBlocked: false,
        calDesc: { label: '维持', formula: '按维持热量估算' },
        protein: { min: 100, max: 150, formula: { desc: '按体重估算', min: 1.2, max: 2.0 } },
        fat: { g: 60, formula: { desc: '按体重估算', min: 0.6 } },
        carb: { g: 250, formula: { desc: '剩余热量' } },
        meals: data ? data.meals : [],
        hydration: data ? data.hydration : {},
        supplements: data ? data.supplements : []
      }
    };
    return this.mergeSafe(src, safe);
  },

  renderResult(result, options) {
    const opts = options || {};
    result = this.normalizeResult(result);
    document.getElementById('formView').style.display = 'none';
    const view = document.getElementById('resultView');
    view.style.display = 'block';

    const resultBody = document.getElementById('resultBody');
    resultBody.innerHTML = this.buildResultHTML(result);
    // P1/P3：导出与目录导航（事件委托，重渲染不重复绑定）
    if (typeof WenKeleAuditFollowup !== 'undefined') {
      if (!resultBody.dataset.afBound) {
        resultBody.addEventListener('click', (e) => {
          const nav = e.target.closest && e.target.closest('[data-af-nav]');
          if (nav) { WenKeleAuditFollowup.scrollTo(nav.dataset.afNav); return; }
          if (e.target.closest && e.target.closest('#btnExportData')) {
            const r = WenKeleAuditFollowup.downloadJSON(this.state.currentResult);
            if (typeof showToast === 'function') {
              showToast(r.ok ? `已导出 ${r.name}` : (r.reason || '导出失败'));
            }
          }
          const aiBtn = e.target.closest && e.target.closest('#btnAiExplain');
          if (aiBtn) { this.generateAiCoach(result.planId); return; }
          const fbBtn = e.target.closest && e.target.closest('#btnAiFeedback');
          if (fbBtn) {
            // 绑定被评解读的指纹：eval 候选能复现「当时说了什么」，飞轮才闭合
            const last = WenKeleAICoach._lastResult || null;
            WenKeleAICoach.recordFeedback({
              reason: '用户标记不准确',
              output: last && last.text,
              source: last && last.source,
              variant: last && last.variant
            });
            if (typeof WenKeleTracker !== 'undefined') {
              WenKeleTracker.track('ai_explain_feedback', { reason: '用户标记不准确' });
            }
            if (typeof showToast === 'function') showToast('已记录，感谢反馈');
          }
        });
        resultBody.dataset.afBound = '1';
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // T2：挂载训练打卡 UI（planId 缺失时按记录 id / 表单现场生成兜底）
    const planId = opts.planId || result.planId || this.state.currentSavedId || this.makePlanId(this.state.form);
    if (typeof WenKeleTrackerUI !== 'undefined') WenKeleTrackerUI.mount(result, planId);

    // T8：挂载今日训练执行视图（与报表共用同一份 WenKeleTracker 数据）
    if (typeof WenKeleTodayView !== 'undefined') WenKeleTodayView.mount(result, planId);

    // T9：缓存最近方案，供下次打开直达（回访恢复时不必重复写）
    if (!opts.restored && typeof WenKeleTracker !== 'undefined') {
      WenKeleTracker.saveLastPlan(planId, result);
    }

    // T5：方案渲染完成（回访恢复不算新生成）
    if (!opts.restored && typeof WenKeleTracker !== 'undefined') {
      WenKeleTracker.track('plan_generated', {
        planId, systemSplit: result.system ? result.system.split : ''
      });
    }

    // P4：结果卡补 aria-labelledby（零视觉改动）
    if (typeof WenKeleAuditFollowup !== 'undefined') WenKeleAuditFollowup.enhanceA11y();
    // AI 漏斗：曝光（回访还原不重复计，与 plan_generated 同口径）
    if (!opts.restored && typeof WenKeleTracker !== 'undefined'
        && !['youth', 'elderly', 'postpartum'].includes(this.state.form.specialCondition)) {
      WenKeleTracker.track('ai_coach_impression', { planId });
    }

    // 生成分享文本
    this.buildShareText(result);
  },

  buildResultHTML(r) {
    r = this.normalizeResult(r); // 独立调用也有守卫（幂等）
    const p = r.profile;
    const genderLabel = p.gender === 'male' ? '男' : '女';
    // 外部存储读回的标签字段先转义再进模板（XSS 纵深防御）
    const expLabel = p.experience ? this.esc(p.experience.label) : '';
    const goalLabel = p.goal ? this.esc(p.goal.label) : '';
    const scenarioLabel = p.scenario ? this.esc(p.scenario.label) : '';

    // T4：结果页顶部的调整建议（排除当前方案自身，避免自己跟自己比）
    let adviceCard = '';
    if (typeof WenKeleTracker !== 'undefined') {
      const advice = WenKeleTracker.getAdjustmentAdvice(r.planId);
      if (advice) {
        adviceCard = `
          <section class="result-card advice-card">
            <h2><i class="fas fa-lightbulb"></i> 基于上次执行的建议</h2>
            <p>${advice.message}</p>
            <p class="advice-note">这是建议，不会自动改动本次方案。若要调整，请返回修改「每周可训练天数」后重新生成。</p>
          </section>`;
      }
    }

    // T4：方向卡片（男生方向不显示，仅女生显示正式分类名）＋健康下限守卫提示
    let goalCard = '';
    const bodyGoalLabel = typeof WenKeleBodyGoal !== 'undefined'
      ? WenKeleBodyGoal.getLabel(r.bodyGoal) : '';
    const blocked = r.nutrition && r.nutrition.deficitBlocked;
    if (bodyGoalLabel || blocked) {
      goalCard = `
        <section class="result-card goal-card">
          <h2><i class="fas fa-bullseye"></i> 训练方向</h2>
          ${bodyGoalLabel ? `<p class="goal-name">${bodyGoalLabel}</p>` : ''}
          ${blocked ? `<p class="goal-warning"><i class="fas fa-triangle-exclamation"></i>
            当前体重已低于健康范围，本次按维持热量安排，未设置热量缺口。如有需要请咨询专业人士。</p>` : ''}
        </section>`;
    }

    // 用户画像卡片
    const profileCard = `
      <section class="result-card profile-card" id="secPlan">
        <h2><i class="fas fa-user"></i> 用户画像</h2>
        <div class="profile-grid">
          <div class="profile-item"><span class="label">身高</span><span class="value">${p.heightCm} cm</span></div>
          <div class="profile-item"><span class="label">体重</span><span class="value">${p.weightKg} kg</span></div>
          <div class="profile-item"><span class="label">年龄</span><span class="value">${p.age} 岁</span></div>
          <div class="profile-item"><span class="label">性别</span><span class="value">${genderLabel}</span></div>
          <div class="profile-item"><span class="label">经验</span><span class="value">${expLabel}</span></div>
          <div class="profile-item"><span class="label">目标</span><span class="value">${goalLabel}</span></div>
          <div class="profile-item"><span class="label">场景</span><span class="value">${scenarioLabel}</span></div>
        </div>
        <div class="bmi-display" style="--bmi-color: ${p.bmiCat.color}">
          <div class="bmi-big">BMI <strong>${p.bmi}</strong></div>
          <div class="bmi-tag" style="background: ${this.esc(p.bmiCat.color)}">${this.esc(p.bmiCat.label)}</div>
          <div class="bmi-advice">${p.bmiCat.advice}</div>
          <div class="bmi-calc">
            <span>BMR（基础代谢）<strong>${p.bmr} kcal</strong></span>
            <span>TDEE（每日消耗）<strong>${p.tdee} kcal</strong></span>
          </div>
        </div>
      </section>`;

    // 周计划卡片
    const weekCard = `
      <section class="result-card">
        <h2><i class="fas fa-calendar-week"></i> 每周训练计划 — ${this.esc(r.system.split)}</h2>
        <div class="system-info">
          <span><i class="fas fa-clock"></i> ${r.system.frequency}</span>
          <span><i class="fas fa-layer-group"></i> 训练量：${r.system.volume}</span>
          <span><i class="fas fa-sync-alt"></i> 组次：${r.system.reps}</span>
          <span><i class="fas fa-pause-circle"></i> 休息：${r.system.rest}</span>
        </div>
        ${r.weeklyPlan.map((day, i) => `
          <div class="day-block">
            <div class="day-header">
              <span class="day-name">${day.day}</span>
              <span class="day-focus">${day.focus}</span>
              <span class="day-duration"><i class="fas fa-clock"></i> ${day.duration}</span>
              ${typeof WenKeleRecommendationUI !== 'undefined' && r.nutrition
                ? (() => { const k = WenKeleRecommendationUI.estimateDayKcal(day, r.nutrition.targetCal);
                    return k ? `<span class="day-kcal" title="粗估，非精确值">≈ ${k} kcal</span>` : ''; })()
                : ''}
            </div>
            ${day.exercises.length > 0 ? `
            <div class="exercise-list">
              ${day.exercises.map((ex, j) => {
                // mixed：居家 / 健身房 斜杠合并显示
                const nameText = ex.variants
                  ? `${ex.variants.home.name} <span class="variant-slash">/</span> ${ex.variants.gym.name}`
                  : ex.name;
                // 详情内容：备注 cue + 动作要求 teach（点击箭头展开，默认收起）
                const teach = ex.teach || {};
                const details = [
                  ex.cue ? `<div class="detail-row"><b>要点</b>${ex.cue}</div>` : '',
                  teach.warmup ? `<div class="detail-row"><b>热身</b>${teach.warmup}</div>` : '',
                  teach.eccentric ? `<div class="detail-row"><b>节奏</b>${teach.eccentric}</div>` : '',
                  ex.errors || teach.common_error
                    ? `<div class="detail-row"><b>常见错误</b>${ex.errors || teach.common_error}</div>` : '',
                  ex.progress ? `<div class="detail-row"><b>进阶</b>${ex.progress}</div>` : ''
                ].filter(Boolean).join('');
                return `
                <div class="exercise-item">
                  <div class="exercise-main">
                    <span class="exercise-num">${j + 1}</span>
                    <div class="exercise-info">
                      <div class="exercise-name">${nameText} <span class="exercise-group">${ex.group}</span></div>
                      <div class="exercise-detail">
                        <span><i class="fas fa-layer-group"></i> ${ex.sets} x ${ex.reps}</span>
                        <span><i class="fas fa-hourglass-half"></i> 休息 ${ex.rest}</span>
                      </div>
                    </div>
                    ${details ? `<details class="exercise-expand"><summary title="查看动作详情"><i class="fas fa-chevron-right"></i></summary><div class="exercise-detail-body">${details}</div></details>` : ''}
                  </div>
                </div>`;
              }).join('')}
            </div>` : `<div class="rest-day"><i class="fas fa-coffee"></i> 休息日，好好恢复</div>`}
          </div>
        `).join('')}
      </section>`;

    // 进阶标准卡片
    const progressCard = `
      <section class="result-card">
        <h2><i class="fas fa-chart-line"></i> 动作进阶判定标准</h2>
        <div class="progress-criteria">
          <div class="criteria-grid">
            ${FITNESS_DATA.progressionCriteria.items.map(item => `
              <div class="criteria-item">
                <div class="criteria-title">${item.dimension}</div>
                <div class="criteria-standard">${item.standard}</div>
                <div class="criteria-detail">${item.detail}</div>
              </div>
            `).join('')}
          </div>
          <div class="criteria-note">
            <i class="fas fa-lightbulb"></i> 四项中满足三项即可进阶。${FITNESS_DATA.progressionCriteria.progressionAmount}
          </div>
          <div class="rpe-scale">
            <div class="rpe-title">RPE 自感用力程度量表</div>
            <div class="rpe-row">
              ${FITNESS_DATA.progressionCriteria.rpeScale.map(r => `
                <div class="rpe-item"><span class="rpe-num">${r.rpe}</span><span class="rpe-desc">${r.desc}</span></div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>`;

    // 营养方案卡片
    const n = r.nutrition;
    const nutritionCard = `
      <section class="result-card" id="secNutrition">
        <h2><i class="fas fa-utensils"></i> 营养方案</h2>
        <div class="nutrition-summary">
          <div class="calorie-box">
            <div class="cal-big">目标热量 <strong>${n.targetCal} kcal/天</strong></div>
            <div class="cal-desc">${n.calDesc.label}：${n.calDesc.formula}</div>
            <div class="cal-safe"><i class="fas fa-shield-alt"></i> 安全红线：不低于 ${n.minCal} kcal/天</div>
          </div>
          <div class="macro-grid">
            <div class="macro-item protein">
              <div class="macro-icon"><i class="fas fa-drumstick-bite"></i></div>
              <div class="macro-name">蛋白质</div>
              <div class="macro-value">${n.protein.min}~${n.protein.max} g</div>
              <div class="macro-desc">${n.protein.formula.desc}（${n.protein.formula.min}-${n.protein.formula.max}g/kg）</div>
            </div>
            <div class="macro-item fat">
              <div class="macro-icon"><i class="fas fa-pepper-hot"></i></div>
              <div class="macro-name">脂肪</div>
              <div class="macro-value">${n.fat.g} g</div>
              <div class="macro-desc">${n.fat.formula.desc}（${n.fat.formula.min}-${n.fat.formula.max}g/kg）</div>
            </div>
            <div class="macro-item carb">
              <div class="macro-icon"><i class="fas fa-bread-slice"></i></div>
              <div class="macro-name">碳水</div>
              <div class="macro-value">${n.carb.g} g</div>
              <div class="macro-desc">剩余热量分配（${n.carb.formula.min}-${n.carb.formula.max}g/kg）</div>
            </div>
          </div>
        </div>
        <div class="meal-plan">
          <div class="meal-title"><i class="fas fa-calendar-day"></i> 每日三餐框架</div>
          <div class="meal-grid">
            ${n.meals.map(m => `
              <div class="meal-card">
                <div class="meal-header"><span>${m.name}</span><span class="meal-percent">${m.percent}</span></div>
                <ul class="meal-items">
                  ${m.items.map(item => `<li>${item}</li>`).join('')}
                </ul>
                <div class="meal-example"><i class="fas fa-star"></i> ${m.example}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="hydration-box">
          <div class="meal-title"><i class="fas fa-tint"></i> 补水建议</div>
          <ul>
            <li>每日基础：${n.hydration.daily}（如 70kg → 2100-2450ml）</li>
            <li>训练中：${n.hydration.duringTraining}</li>
            <li>训练后：${n.hydration.afterTraining}</li>
            <li>判断标准：${n.hydration.indicator}</li>
          </ul>
        </div>
        <div class="supplement-box">
          <div class="meal-title"><i class="fas fa-pills"></i> 补剂说明（非必需）</div>
          <div class="supplement-grid">
            ${n.supplements.map(s => `
              <div class="supplement-item"><strong>${s.name}</strong>：${s.desc}</div>
            `).join('')}
          </div>
        </div>
      </section>`;

    // 恢复建议卡片
    const recoveryCard = `
      <section class="result-card" id="secRecovery">
        <h2><i class="fas fa-moon"></i> 恢复与休息</h2>
        <div class="recovery-grid">
          <div class="recovery-col">
            <div class="recovery-title"><i class="fas fa-bed"></i> 睡眠</div>
            <ul>
              <li>时长：${FITNESS_DATA.recovery.sleep.duration}</li>
              <li>${FITNESS_DATA.recovery.sleep.trainingDay}</li>
            </ul>
            <div class="recovery-sub">提升睡眠质量：</div>
            <ul>
              ${FITNESS_DATA.recovery.sleep.tips.map(t => `<li>${t}</li>`).join('')}
            </ul>
          </div>
          <div class="recovery-col">
            <div class="recovery-title"><i class="fas fa-spa"></i> 主动恢复</div>
            <ul>
              ${FITNESS_DATA.recovery.activeRecovery.map(r => `<li><strong>${r.method}</strong>：${r.detail}</li>`).join('')}
            </ul>
            <div class="recovery-title"><i class="fas fa-download"></i> Deload 减载周</div>
            <ul>
              <li>何时：${FITNESS_DATA.recovery.deload.when}</li>
              ${FITNESS_DATA.recovery.deload.method.map(m => `<li>${m}</li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="overtraining-box">
          <div class="recovery-title"><i class="fas fa-exclamation-triangle"></i> 过度训练信号（出现即减量）</div>
          <div class="signal-grid">
            ${FITNESS_DATA.recovery.overtrainingSignals.map(s => `<span class="signal-tag">${s}</span>`).join('')}
          </div>
        </div>
      </section>`;

    // 特殊人群适配
    const specialCard = r.special ? `
      <section class="result-card special-card">
        <h2><i class="fas fa-user-cog"></i> 特殊人群适配 — ${r.special.name}</h2>
        ${r.special.adjustments ? `
          <div class="special-title">训练调整</div>
          <ul>${r.special.adjustments.map(a => `<li>${a}</li>`).join('')}</ul>
        ` : ''}
        ${r.special.focus ? `
          <div class="special-title">训练重点</div>
          <div class="signal-grid">${r.special.focus.map(f => `<span class="signal-tag">${f}</span>`).join('')}</div>
        ` : ''}
        ${r.special.principles ? `
          <div class="special-title">核心原则</div>
          <ul>${r.special.principles.map(p => `<li>${p}</li>`).join('')}</ul>
        ` : ''}
        ${r.special.禁忌 ? `
          <div class="special-title danger">⚠️ 禁忌与注意</div>
          <ul class="danger-list">${r.special.禁忌.map(t => `<li>${t}</li>`).join('')}</ul>
        ` : ''}
        ${r.special.microHabits ? `
          <div class="special-title">每日微习惯（工作中）</div>
          <ul>${r.special.microHabits.map(m => `<li>${m}</li>`).join('')}</ul>
        ` : ''}
      </section>
    ` : '';

    // 动作替换速查表
    const substituteCard = `
      <section class="result-card">
        <h2><i class="fas fa-exchange-alt"></i> 居家 ↔ 健身房动作替换</h2>
        <table class="substitute-table">
          <thead><tr><th>健身房动作</th><th>居家替代</th><th>备注</th></tr></thead>
          <tbody>
            ${FITNESS_DATA.exerciseSubstitutes.map(s => `
              <tr><td>${s.gym}</td><td>${s.home}</td><td>${s.note}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </section>`;

    // 循证依据（可折叠，供用户核验每个数字的出处）
    const ev = FITNESS_DATA.evidence;
    const evidenceCard = `
      <section class="result-card evidence-card" id="secEvidence">
        <h2><i class="fas fa-book-open"></i> 循证依据与证据等级</h2>
        <p class="evidence-intro">${ev.formulaNote}</p>
        <div class="grade-legend">
          ${ev.levels.map(l => `<span class="grade-badge grade-${l.grade.toLowerCase()}">${l.grade}</span><span class="grade-def">${l.def} · ${l.scope}</span>`).join('')}
        </div>
        <details class="evidence-details">
          <summary><i class="fas fa-chevron-right"></i> 展开查看 6 类建议的文献出处</summary>
          <div class="evidence-body evidence-topics">
            ${ev.topics.map(t => `
              <div class="evidence-topic">
                <div class="topic-head">
                  <strong>${t.name}</strong>
                  <span class="grade-badge grade-${t.grade.toLowerCase()}">${t.grade} 级</span>
                </div>
                <div class="topic-finding">${t.findings}</div>
                <div class="topic-applied"><i class="fas fa-arrow-right"></i> 本方案应用：${t.applied}</div>
                <ul class="topic-citations">
                  ${t.citations.map(c => `<li>${c}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </details>
        <details class="evidence-details gaps">
          <summary><i class="fas fa-chevron-right"></i> 诚实声明：哪些数值没有直接研究支持（${ev.gaps.length} 项）</summary>
          <div class="evidence-body">
            <ul class="gap-list">${ev.gaps.map(g => `<li>${g}</li>`).join('')}</ul>
          </div>
        </details>
      </section>`;

    // 安全提示
    const safetyCard = `
      <section class="result-card safety-card" id="secSafety">
        <h2><i class="fas fa-shield-alt"></i> 安全提示</h2>
        <ul class="safety-list">
          ${FITNESS_DATA.safety.map(s => `<li>${s}</li>`).join('')}
        </ul>
        <div class="disclaimer">
          <i class="fas fa-info-circle"></i> 本方案基于科学健身文献生成，仅供参考。如有伤病、慢性疾病或术后恢复情况，请务必咨询专业医师或物理治疗师。
        </div>
      </section>`;

    // AI 教练解读卡：解释层，不碰处方；特殊人群不渲染（C6）
    let aiCoachCard = '';
    if (typeof WenKeleAICoach !== 'undefined' && WenKeleAICoach.isEnabledFor(r.planId)
        && !['youth', 'elderly', 'postpartum'].includes(this.state.form.specialCondition)) {
      aiCoachCard = `
        <section class="result-card ai-coach-card" id="aiCoachCard">
          <h2><i class="fas fa-comments"></i> AI 教练解读</h2>
          <p class="ai-coach-disclaimer">解读仅供参考，不替代医疗建议；不修改你的训练处方。</p>
          <div class="ai-coach-body" id="aiCoachBody">
            <p class="ai-coach-hint">把你的打卡记录变成一句教练反馈。</p>
          </div>
          <div class="ai-coach-actions">
            <button type="button" class="btn btn-secondary" id="btnAiExplain"><i class="fas fa-wand-magic-sparkles"></i> 生成解读</button>
            <span class="ai-coach-variant-hint" id="aiVariantHint" hidden>同一份记录，换个角度再读一遍</span>
            <button type="button" class="btn btn-ghost" id="btnAiFeedback" hidden>不准？</button>
          </div>
        </section>`;
    }

    // P1 导出 + P3 目录条：只在「完整方案」Tab 内，不污染今日训练视图
    const utilityBar = `
      <div class="af-bar">
        ${typeof WenKeleAuditFollowup !== 'undefined' ? WenKeleAuditFollowup.navHTML() : ''}
        <button type="button" class="af-export" id="btnExportData">
          <i class="fas fa-download"></i> 导出我的数据
        </button>
      </div>`;
    // P5：能力起点建议（只展示，不改任何引擎输出；特殊人群/无数据/无对应动作均不显示）
    let startHintCard = '';
    if (typeof WenKeleAuditFollowup !== 'undefined') {
      const hint = WenKeleAuditFollowup.buildStartHint(r, this.state.form.specialCondition);
      if (hint) {
        startHintCard = `
          <section class="result-card start-hint-card">
            <h2><i class="fas fa-seedling"></i> 起点建议</h2>
            <p>${hint.text}</p>
          </section>`;
      }
    }
    // ---- 分区装配：把 13 张平铺卡片归入 4 个语义组，建立信息层级（UI 改造）----
    const group = (icon, title, sub, cls, body) => `
      <details class="result-group ${cls}" open>
        <summary class="group-head">
          <span class="group-icon"><i class="fas ${icon}"></i></span>
          <div class="group-title"><h2>${title}</h2><p>${sub}</p></div>
          <span class="group-chevron"><i class="fas fa-chevron-down"></i></span>
        </summary>
        <div class="group-body">${body}</div>
      </details>`;

    // 概览条：一眼看懂这份方案（视觉锚点，减少逐卡扫读）
    const overview = `
      <div class="plan-overview">
        <div class="overview-item"><span>训练体系</span><strong>${this.esc(r.system.split)}</strong></div>
        <div class="overview-item"><span>频率</span><strong>${this.esc(r.system.frequency)}</strong></div>
        <div class="overview-item"><span>目标热量</span><strong>${r.nutrition.targetCal} kcal</strong></div>
        <div class="overview-item"><span>证据等级</span><strong>A–D 透明标注</strong></div>
      </div>`;

    return utilityBar
      + `<div class="plan-overview-wrap">${overview}</div>`
      + group('fa-bolt', '训练计划', '从你的数据到每周安排，一步一步', 'group-plan',
          adviceCard + startHintCard + goalCard + profileCard + weekCard + progressCard)
      + group('fa-robot', 'AI 教练解读', '用自然语言解释这份方案为什么这样排', 'group-ai', aiCoachCard)
      + group('fa-utensils', '营养 · 恢复 · 适配', '吃、睡、恢复与特殊情况的完整闭环', 'group-life',
          nutritionCard + recoveryCard + specialCard + substituteCard);
  },

  // ---- 分享文本 ----
  buildShareText(r) {
    const p = r.profile;
    const text = `我的健身方案
身高${p.heightCm}cm | 体重${p.weightKg}kg | BMI ${p.bmi}（${p.bmiCat.label}）
目标：${p.goal ? p.goal.label : ''} | ${r.system.split}
训练频率：${r.system.frequency}${r.system.timeBudget ? '（按我每周可训练 ' + r.system.timeBudget.days + ' 天安排）' : ''}
训练量：${r.system.volume}
目标热量：${r.nutrition.targetCal} kcal/天
来自 温可乐健身`;
    const el = document.getElementById('shareText');
    if (el) el.value = text;
  }
};

// 复制分享文本（供 HTML onclick 调用）
function copyShareText() {
  const el = document.getElementById('shareText');
  if (!el || !el.value) return;
  el.select();
  el.setSelectionRange(0, 99999);
  try {
    navigator.clipboard.writeText(el.value).then(() => {
      showToast('已复制分享文本 ✓');
    }).catch(() => {
      document.execCommand('copy');
      showToast('已复制分享文本 ✓');
    });
  } catch (e) {
    document.execCommand('copy');
    showToast('已复制分享文本 ✓');
  }
}

// 轻提示
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:500;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);transition:opacity 0.3s;opacity:0;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => FitnessApp.init());
