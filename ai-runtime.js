/**
 * [INPUT]: planId；宿主环境配置
 * [OUTPUT]: 全局 WenKeleAIRuntime —— AI 功能 L1 kill switch / L2 灰度 / L3 应急降级
 * [POS]: AI 运行时控制面（规格 specs/2026-11-18-ai-killswitch/）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 独立出来的理由：ai-coach.js 逼近 400 行上限；开关是「控制面」，
 * 与 ai-coach.js 的「数据面」职责不同（SRP）。
 */

const WenKeleAIRuntime = {
  RUNTIME: {
    ENABLED: true,        // L1 全局 kill switch：false = 所有 AI 解读关闭
    ROLLOUT_PERCENT: 100, // L2 灰度：0-100，按 planId hash 分流
    PREFER_LOCAL: false   // L3 应急：true = 强制只走规则解读（模型异常时才打开）
  },
  // 宿主注入的 cloud 通道（keyless SDK 适配器）。默认 null = 未启用。
  // 宿主激活云服务后，用 setCloudCall(fn) 注入，产品代码即可走真实模型通道。
  cloudCall: null,
  setCloudCall(fn) {
    this.cloudCall = (typeof fn === 'function') ? fn : null;
    return !!this.cloudCall;
  },
  hasCloud() { return typeof this.cloudCall === 'function'; },

  // 「换个角度」轮转计数器：确定性多样性（可复现），非随机
  variantSeq: 0,
  nextVariant() {
    this.variantSeq = (this.variantSeq + 1) % 3;
    return this.variantSeq;
  },

  // 按 planId 稳定 hash 分流（无账号也能灰度）
  isEnabledFor(planId) {
    if (!this.RUNTIME.ENABLED) return false;
    const pct = this.RUNTIME.ROLLOUT_PERCENT;
    if (pct >= 100) return true;
    if (pct <= 0) return false;
    if (!planId) return true;
    let h = 5381;
    const s = String(planId);
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return (h % 100) < pct;
  },

  // L3：是否强制本地（模型异常时打开）
  preferLocal() { return !!this.RUNTIME.PREFER_LOCAL; }
};

if (typeof module !== 'undefined' && module.exports) module.exports = WenKeleAIRuntime;
