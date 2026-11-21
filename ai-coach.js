/**
 * [INPUT]: 当前方案 result / 打卡统计 planId / 能力弱轴（白名单字段，脱敏）
 * [OUTPUT]: 全局 WenKeleAICoach —— 结构化教练解读 + 校验层 + 确定性降级
 * [POS]: 解释层 AI；规则引擎（getSystem/getDayExercises/NutritionGen）零改动（规格 2026-11-18-ai-coach C1）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 设计要点（面试可讲）：
 * - AI 只做「解释层」，不进「处方层」——处方是循证硬约束，必须确定性可审计
 * - 输出强制结构化 JSON + 白名单校验；原文绝不直接进 DOM
 * - 三级降级：cloud → local 模板 → 不显示；local 明确标注「规则解读」不冒充 AI
 * - 不存 API Key，不新增依赖；cloud 走宿主 keyless 通道（若可用）
 */

const WenKeleAICoach = {
  VERSION: 1,
  TIMEOUT_MS: 3000,
  // 运行时开关委托给独立控制面模块（SRP：本模块只管数据面）
  get RUNTIME() {
    return typeof WenKeleAIRuntime !== 'undefined' ? WenKeleAIRuntime.RUNTIME
      : { ENABLED: true, ROLLOUT_PERCENT: 100, PREFER_LOCAL: false };
  },
  FEEDBACK_KEY: 'wenkele_ai_feedback',
  FIELDS: ['observation', 'reason', 'adjustment'],

  // 输出禁止出现的词（精确匹配保留，兼容旧调用）
  BANNED: [
    '保证', '一定', '百分百', '治愈', '治疗', '诊断', '处方',
    '腰椎间盘突出', '颈椎病', '伤病', '痊愈', '减脂10斤', '瘦十斤',
    '做到力竭', '极限重量', '1RM', '突破极限', '医疗建议'
  ],
  // 归一化后的词根（防空格/繁体/同音变形）
  BANNED_NORM: [
    '保证', '包证', '保証', '必定', '肯定有效', '百分百', '一定瘦',
    '治愈', '治疗', '诊治', '诊断', '处方', '痊愈', '康复保证',
    '力竭', '极限重量', '突破极限', '1rm', '最大重量',
    '微信号', '加微信', '加v信', 'qq号',
    // 英文绝对承诺（中文产品仍防一手）
    'guarantee', 'guaranteed', 'cure', '100%effective'
  ],
  // 归一化后的模式（数字变体等）
  BANNED_PATTERNS: [
    /(瘦|减|掉)(脂)?\d+(斤|公斤|kg)/,
    /(月|周|天)\d+(斤|公斤|kg)/,
    /(保证|包证|必定)[^，。！？]{0,8}(瘦|减|有效|见效)/
  ],
  // XSS/注入载荷（归一化后检测；命中即整条降级）
  DANGER_PATTERNS: [
    /<\s*script/i, /<\s*\/?\s*(?:img|iframe|svg|object|embed|link|meta|style)/i,
    /\bon(?:error|load|click|mouseover|focus)\s*=/i, /javascript\s*:/i,
    /data\s*:\s*text\/html/i, /expression\s*\(/i, /<\s*\//i,
    // 常见 HTML 标签开头（归一化后连写也能抓）；不误伤 a<b 这类数学比较
    /<\s*(?:script|img|iframe|svg|object|embed|link|meta|style|div|span|p|a|b|i|u|form|input|button|video|audio|source|canvas|math|details)[ >/=]/i
  ],

  // PII 分层正则（在归一化文本上运行）
  PII_PATTERNS: [
    /1[3-9]\d{9}/,                    // 手机
    /0\d{2,3}-?\d{7,8}/,              // 座机
    /[\w.+-]+@[\w-]+\.[\w.]+/,        // 邮箱
    /\d{17}[\dx]/,                     // 身份证 18 位
    /\d{15}/,                          // 身份证 15 位
    /(微信|wechat|qq|加v)[^，。]{0,6}[a-z0-9]{5,}/i // 社交账号
  ],
  PII_PATTERN: /(1[3-9]\d{9})|([\w.+-]+@[\w-]+\.[\w.]+)|(身份证)|(真实姓名)/,
  // 繁简 + 同音常用字映射（检测用；不追求完整，只覆盖攻击面）
  NORM_MAP: {
    '証': '证', '證': '证', '保': '保', '証': '证',
    '確': '确', '實': '实', '治': '治', '癒': '愈', '療': '疗',
    '斷': '断', '處': '处', '極': '极', '限': '限', '重': '重',
    '量': '量', '包': '包', '證': '证', '肯': '肯', '定': '定',
    '減': '减', '掉': '掉', '斤': '斤', '裡': '里', '〇': '零',
    '壹': '一', '貳': '二', '兩': '两', '參': '三', '肆': '四',
    '伍': '五', '陸': '六', '柒': '七', '捌': '八', '玖': '九', '拾': '十',
    '加': '加', '微': '微', '信': '信', '號': '号', '微信号': '微信号'
  },
  // 动作模式词根：归一化后含这些词根的词组必须能匹配白名单
  ACTION_ROOTS: ['蹲', '推', '拉', '举', '划', '飞鸟', '支撑', '桥', '硬拉', '俯卧撑', '卷腹', '深蹲', '死虫', '鸟狗', '滑臂', '面拉', '臀桥', '行走', '平板', '举腿', '弯举', '下拉', '抬腿', '扭转'],
  // 未加引号时的强词根（排除「走/跑/跳」这类日常动词，防「练完走路回家」误伤）
  ACTION_ROOTS_STRONG: ['蹲', '推', '拉', '举', '划', '飞鸟', '支撑', '桥', '硬拉', '俯卧撑', '卷腹', '死虫', '鸟狗', '滑臂', '面拉', '臀桥', '行走', '举腿', '弯举', '下拉', '抬腿'],

  // ---- 文本归一化：只用于检测，不改输出原文（C2）----
  normalize(text) {
    let s = String(text == null ? '' : text);
    // 全角 → 半角
    s = s.replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
    s = s.replace(/\u3000/g, ' ');
    // 去所有空白（含换行）
    s = s.replace(/\s+/g, '');
    // 繁简/同音映射
    s = Array.from(s).map(ch => this.NORM_MAP[ch] || ch).join('');
    // 中文数字 → 阿拉伯（计量语境）
    const cn = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    s = s.replace(/[一二两三四五六七八九十]/g, ch => String(cn[ch]));
    return s.toLowerCase();
  },

  // ---- 上下文构造：只提取白名单字段，脱敏 ----
  buildContext(result, planId, abilityAxes, stats) {
    if (!result || !result.weeklyPlan) return null;
    const days = result.weeklyPlan.filter(d => (d.exercises || []).length > 0);
    const actionNames = [];
    days.forEach(d => (d.exercises || []).forEach(e => {
      if (e && e.name && actionNames.length < 40) actionNames.push(e.name);
    }));
    const wk = stats && typeof stats === 'object' ? stats : {};
    // 只保留数字与枚举，不携带任何用户身份信息
    return {
      version: this.VERSION,
      focus: (result.system && result.system.split) || '',
      frequency: (result.system && result.system.frequency) || '',
      dayCount: days.length,
      actionNames: [...new Set(actionNames)],
      doneEx: Number(wk.doneEx) || 0,
      totalEx: Number(wk.totalEx) || 0,
      rate: typeof wk.rate === 'number' ? wk.rate : 0,
      weakest: abilityAxes && abilityAxes.label ? abilityAxes.label : null,
      special: result.special ? true : false
    };
  },

  // ---- Prompt：明确只引用给定事实，禁止编造与医疗判断 ----
  buildPrompt(ctx) {
    if (!ctx) return null;
    return [
      '你是健身教练助手，只根据用户提供的客观数据给出解释性文字。',
      '严格规则：',
      '1. 只能引用下面提供的数据与动作名，禁止编造动作或数字。',
      '2. 不做医疗诊断、不承诺效果、不建议极限负重。',
      '3. 输出严格的 JSON，仅含 observation / reason / adjustment 三个字符串字段。',
      '4. 每段不超过 60 字，语气平和，不使用专业术语。',
      '',
      '数据：' + JSON.stringify({
        frequency: ctx.frequency, dayCount: ctx.dayCount,
        completed: ctx.doneEx, total: ctx.totalEx, rate: ctx.rate,
        actions: ctx.actionNames, weakest: ctx.weakest
      })
    ].join('\n');
  },

  // ---- 校验层：结构化字段 + 动作白名单 + 越权词 + PII ----
  validate(payload, ctx) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { ok: false, reason: '输出非对象' };
    }
    const extra = Object.keys(payload).filter(k => !this.FIELDS.includes(k));
    if (extra.length) return { ok: false, reason: '字段越界: ' + extra.join(',') };
    for (const f of this.FIELDS) {
      if (typeof payload[f] !== 'string' || !payload[f].trim()) {
        return { ok: false, reason: '缺少字段: ' + f };
      }
      if (payload[f].length > 200) return { ok: false, reason: '字段过长: ' + f };
    }
    const all = this.FIELDS.map(f => payload[f]).join(' ');
    // 数字事实一致性（groundedness）：句式锚定，防编造完成率/组数
    const numberCheck = this.validateNumbers(all, ctx);
    if (!numberCheck.ok) return numberCheck;
    // 归一化后做所有检测（防空格/繁体/同音/数字变形）
    const norm = this.normalize(all);
    if (this.BANNED.some(w => all.includes(w))) return { ok: false, reason: '命中禁用词' };
    if (this.BANNED_NORM.some(w => norm.includes(this.normalize(w)))) {
      return { ok: false, reason: '命中禁用词（归一化）' };
    }
    if (this.BANNED_PATTERNS.some(re => re.test(norm))) {
      return { ok: false, reason: '命中禁用模式' };
    }
    if (this.DANGER_PATTERNS.some(re => re.test(norm))) {
      return { ok: false, reason: '命中危险载荷' };
    }
    if (this.PII_PATTERN.test(all) || this.PII_PATTERNS.some(re => re.test(norm))) {
      return { ok: false, reason: '疑似 PII' };
    }
    // grounding（反向）：只校验「」引号内明确引用的动作名。
    // 不对普通叙述做中文切词（不可靠且会误伤）——这是精度/召回的刻意取舍（C4 误伤率 0）。
    const whitelist = ctx && Array.isArray(ctx.actionNames) ? ctx.actionNames : [];
    if (whitelist.length) {
      const normList = whitelist.map(a => this.normalize(a));
      const quoted = all.match(/[「『《]([^」』》]{1,12})[」』》]/g) || [];
      for (const raw of quoted) {
        const cand = raw.replace(/[「『《」』》]/g, '');
        const nc = this.normalize(cand);
        // 只有「像动作名」的引用才校验（含动作词根）；像「腿力」「38%」这类不误伤
        const looksLikeAction = this.ACTION_ROOTS.some(r => nc.includes(this.normalize(r)));
        if (!looksLikeAction) continue;
        // 归一化后与白名单比对；允许白名单包含引用 或 引用包含白名单动作核心
        const legal = normList.some(a => a === nc || a.includes(nc) || nc.includes(a));
        if (!legal) return { ok: false, reason: '幻觉动作名: ' + cand };
      }
      // 未加引号的候选：只取紧贴「做/练/试试/换成/安排」等动词后的 2-6 字动作词组
      const unquoted = all.match(/(?:做了|做|练了|练|试试|换成|安排)([\u4e00-\u9fa5]{2,6})/g) || [];
      for (const raw of unquoted) {
        const cand = raw.replace(/^(?:做了|做|练了|练|试试|换成|安排)/, '');
        const nc = this.normalize(cand);
        if (!this.ACTION_ROOTS_STRONG.some(r => nc.includes(this.normalize(r)))) continue;
        const legal = normList.some(a => a === nc || a.includes(nc) || nc.includes(a));
        if (!legal) return { ok: false, reason: '幻觉动作名: ' + cand };
      }
    }
    return { ok: true, value: {
      observation: payload.observation.trim(),
      reason: payload.reason.trim(),
      adjustment: payload.adjustment.trim()
    } };
  },

  // 数字事实一致性委托给独立核验层（SRP，模块行数守住上限）
  validateNumbers(text, ctx) {
    return typeof WenKeleAIGrounding !== 'undefined'
      ? WenKeleAIGrounding.validateNumbers(text, ctx, this)
      : { ok: true };
  },

  // ---- 渲染层转义（纵深防御：即使校验漏了也不执行）----
  escapeHTML(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/`/g, '&#96;');
  },

  // 上下文字段清洗：防止恶意 actionNames 让降级链失效
  sanitizeText(text) {
    return String(text == null ? '' : text)
      .replace(/<\/?[^>]*>/g, '').replace(/[<>]/g, '')
      .replace(/javascript\s*:/gi, '').replace(/on\w+\s*=/gi, '')
      .slice(0, 40);
  },

  // ---- 确定性本地解读：标注「规则解读」，绝不冒充 AI ----
  // 三个变体模板委托给独立模块（SRP）；字段先清洗，保证降级链不被恶意数据击穿
  localExplain(ctx, variant) {
    if (!ctx) return null;
    const total = ctx.totalEx > 0 ? ctx.totalEx : (ctx.dayCount || 0) * 4;
    const done = ctx.doneEx > 0 ? ctx.doneEx : 0;
    const rate = ctx.totalEx > 0 ? Math.round(ctx.rate * 100) : 0;
    const f = {
      recorded: ctx.totalEx > 0, done, total, rate,
      dayCount: ctx.dayCount || 0,
      low: ctx.totalEx > 0 && rate < 60,
      weakest: ctx.weakest ? this.sanitizeText(ctx.weakest) : null,
      firstAction: ctx.actionNames && ctx.actionNames.length
        ? (this.sanitizeText(ctx.actionNames[0]) || null) : null,
      focusLabel: ctx.focus ? `（${this.sanitizeText(ctx.focus)}）` : '',
      frequency: ctx.frequency ? this.sanitizeText(ctx.frequency) : String(ctx.dayCount || 0)
    };
    const obj = typeof WenKeleAITemplates !== 'undefined'
      ? WenKeleAITemplates.build(variant, f) : null;
    if (!obj) return null;
    const check = this.validate(obj, ctx);
    return check.ok ? check.value : null;
  },

  // 灰度分流委托给控制面（兼容旧调用）
  isEnabledFor(planId) {
    return typeof WenKeleAIRuntime !== 'undefined'
      ? WenKeleAIRuntime.isEnabledFor(planId) : true;
  },

  // ---- 依据明细：列出本次解读实际引用的数据点（可核对，禁编造）----
  buildBasis(ctx) {
    if (!ctx) return [];
    const basis = [];
    if (ctx.totalEx > 0) basis.push(`本周完成 ${ctx.doneEx} / ${ctx.totalEx} 组动作`);
    else basis.push(`方案安排 ${ctx.dayCount} 个训练日`);
    if (ctx.focus) basis.push(`训练体系：${this.sanitizeText(ctx.focus)}`);
    if (ctx.frequency) basis.push(`频率：${this.sanitizeText(ctx.frequency)}`);
    if (ctx.weakest) basis.push(`较弱项：${this.sanitizeText(ctx.weakest)}`);
    if (ctx.actionNames && ctx.actionNames.length) {
      basis.push(`动作示例：${ctx.actionNames.slice(0, 3).map(a => this.sanitizeText(a)).join('、')}`);
    }
    return basis.slice(0, 6);
  },

  // ---- 统一入口：provider 选择 + 超时 + 三级降级 ----
  explain(ctx, opts) {
    if (!ctx) return { text: null, source: 'none', degraded: true, reason: '无上下文', confidence: 'none', basis: [] };
    const o = opts || {};
    // L3：PREFER_LOCAL 时强制本地，不尝试模型通道
    if (this.RUNTIME.PREFER_LOCAL && o.provider === 'cloud') o.provider = 'local';
    // 「换个角度」：显式 variant 优先，否则确定性轮转（可复现的多样性）
    const variant = typeof o.variant === 'number' ? o.variant
      : (typeof WenKeleAIRuntime !== 'undefined' ? WenKeleAIRuntime.nextVariant() : 0);
    const local = () => {
      const v = this.localExplain(ctx, variant);
      if (!v) return { text: null, source: 'none', degraded: true, reason: '本地解读失败' };
      return {
        text: v, source: 'local', degraded: true, variant,
        label: '规则解读', at: new Date().toISOString(),
        // 确定性模板不是模型推测 —— 标 high 但说清是「规则确定」，不是「AI 确信」
        confidence: 'high',
        confidenceNote: '基于规则与你的记录逐字生成，可核对',
        basis: this.buildBasis(ctx)
      };
    };
    // provider 选择：显式 opts > 宿主注入通道 > 默认 local。
    // 宿主激活云服务后调用 WenKeleAIRuntime.setCloudCall(fn) 即可启用，无需改产品代码。
    // 不伪造 fetch：没有 publicConfig 时手写请求违反云服务接入规范（见 skill）。
    const hostCloud = typeof WenKeleAIRuntime !== 'undefined' && WenKeleAIRuntime.hasCloud()
      ? WenKeleAIRuntime.cloudCall : null;
    const useCloud = o.provider === 'cloud' || (!o.provider && hostCloud);
    if (!useCloud) return local();
    const call = typeof o.cloudCall === 'function' ? o.cloudCall : hostCloud;
    if (typeof call !== 'function') {
      const r = local();
      r.cloudUnavailable = true;
      r.cloudReason = '未配置 keyless 模型通道，已使用本地规则解读';
      return r;
    }
    try {
      const raw = call(this.buildPrompt(ctx));
      // 支持 Promise 与同步返回；超时由调用方注入（测试可模拟 reject）
      const settle = (v) => {
        let parsed = v;
        if (typeof v === 'string') {
          try { parsed = JSON.parse(v); } catch (e) { return local(); }
        }
        const checked = this.validate(parsed, ctx);
        if (!checked.ok) return local();
        return {
          text: checked.value, source: 'cloud', degraded: false, variant,
          label: 'AI 生成', at: new Date().toISOString(),
          // 不虚构模型自报的精确百分比（常未校准，overconfident）
          confidence: 'medium',
          confidenceNote: 'AI 生成，建议对照依据核实',
          basis: this.buildBasis(ctx)
        };
      };
      if (raw && typeof raw.then === 'function') {
        return Promise.race([
          raw.then(settle).catch(() => local()),
          new Promise(res => setTimeout(() => res(local()), this.TIMEOUT_MS))
        ]);
      }
      return settle(raw);
    } catch (e) {
      return local();
    }
  },

  // 反馈/可追溯委托给独立模块（SRP，模块行数守住上限）
  hashOutput(text) {
    return typeof WenKeleAIFeedback !== 'undefined' ? WenKeleAIFeedback.hashOutput(text) : null;
  },
  recordFeedback(payload) {
    return typeof WenKeleAIFeedback !== 'undefined' ? WenKeleAIFeedback.record(payload) : false;
  },
  readFeedback() {
    return typeof WenKeleAIFeedback !== 'undefined' ? WenKeleAIFeedback.read() : [];
  },
  exportEvalCandidates() {
    return typeof WenKeleAIFeedback !== 'undefined' ? WenKeleAIFeedback.exportCandidates() : [];
  },

  // AI 使用漏斗：从 tracker 现有事件流聚合（曝光→生成→反馈），不另造存储
  getFunnel(events) {
    const list = Array.isArray(events) ? events : [];
    const count = (name) => list.filter(e => e && e.name === name).length;
    const impression = count('ai_coach_impression');
    const generated = count('ai_explain_generated');
    const feedback = count('ai_explain_feedback');
    return {
      impression, generated, feedback,
      generateRate: impression ? +(generated / impression).toFixed(3) : 0,
      feedbackRate: generated ? +(feedback / generated).toFixed(3) : 0
    };
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleAICoach;
