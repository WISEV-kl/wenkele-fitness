/**
 * [INPUT]: 依赖 @supabase/supabase-js CDN（可选），localStorage
 * [OUTPUT]: 对外提供 WenKeleDB 全局对象：匿名用户 ID、方案保存/查询/删除
 * [POS]: fitness-coach 的数据持久层，Supabase 优先、localStorage 兜底
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * Supabase 建表 SQL（在 Supabase SQL Editor 中执行一次）:
 *
 *   create table plans (
 *     id uuid default gen_random_uuid() primary key,
 *     user_id text not null,
 *     created_at timestamptz default now(),
 *     summary jsonb not null,
 *     plan jsonb not null
 *   );
 *   create index plans_user_idx on plans (user_id, created_at desc);
 *   alter table plans enable row level security;
 *   create policy "anon read own"  on plans for select using (true);
 *   create policy "anon insert"    on plans for insert with check (true);
 *   create policy "anon delete"    on plans for delete using (true);
 *
 * 注：匿名 ID 方案不做强隔离（MVP 阶段），上线正式版建议接入 Supabase Auth。
 */

// ============================================================
// 配置区：创建 Supabase 项目后填入
// 项目设置 → API → Project URL / anon public key
// ============================================================
const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL',      // 例如 https://xxxx.supabase.co
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
};

const WenKeleDB = {
  client: null,
  mode: 'local', // 'supabase' | 'local'
  LOCAL_KEY: 'wenkele_plans',
  UID_KEY: 'wenkele_uid',

  // ---- 初始化 ----
  init() {
    const cfg = SUPABASE_CONFIG;
    const configured = cfg.url && cfg.anonKey &&
      !cfg.url.startsWith('YOUR_') && !cfg.anonKey.startsWith('YOUR_');

    if (configured && typeof supabase !== 'undefined') {
      try {
        this.client = supabase.createClient(cfg.url, cfg.anonKey);
        this.mode = 'supabase';
      } catch (e) {
        console.warn('[WenKeleDB] Supabase 初始化失败，降级到本地存储', e);
        this.mode = 'local';
      }
    } else {
      console.warn('[WenKeleDB] 未配置 Supabase，使用本地存储模式');
      this.mode = 'local';
    }
    return this.mode;
  },

  // ---- 匿名用户 ID ----
  // 隐私模式/配额超限时 localStorage 会抛异常：降级到内存 ID，不让保存流程崩溃
  getUserId() {
    try {
      let uid = localStorage.getItem(this.UID_KEY);
      if (!uid) {
        uid = 'wk_' + this._uuid();
        localStorage.setItem(this.UID_KEY, uid);
      }
      return uid;
    } catch (e) {
      if (!this._memoryUid) this._memoryUid = 'wk_' + this._uuid();
      return this._memoryUid;
    }
  },

  _uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  // ---- 摘要提取（用于历史列表） ----
  extractSummary(result) {
    const p = result.profile;
    return {
      goal: p.goal ? p.goal.label : '',
      bmi: p.bmi,
      bmiLabel: p.bmiCat ? p.bmiCat.label : '',
      targetCal: result.nutrition ? result.nutrition.targetCal : 0,
      split: result.system ? result.system.split : '',
      frequency: result.system ? result.system.frequency : '',
      days: result.system && result.system.timeBudget ? result.system.timeBudget.days : null,
      bodyGoal: result.bodyGoal || null,
      trainingFocus: result.trainingFocus || 'auto'
    };
  },

  // ---- 保存方案 ----
  async savePlan(result) {
    const uid = this.getUserId();
    const summary = this.extractSummary(result);
    const record = {
      user_id: uid,
      summary,
      plan: result
    };

    if (this.mode === 'supabase') {
      try {
        const { data, error } = await this.client
          .from('plans')
          .insert(record)
          .select('id, created_at')
          .single();
        if (error) throw error;
        return { ok: true, id: data.id, mode: 'supabase' };
      } catch (e) {
        console.warn('[WenKeleDB] Supabase 保存失败，降级到本地', e);
        return this._saveLocal(record);
      }
    }
    return this._saveLocal(record);
  },

  _saveLocal(record) {
    try {
      const list = this._readLocal();
      record.id = 'local_' + this._uuid();
      record.created_at = new Date().toISOString();
      list.unshift(record);
      // 本地最多保留 20 条
      localStorage.setItem(this.LOCAL_KEY, JSON.stringify(list.slice(0, 20)));
      return { ok: true, id: record.id, mode: 'local' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // ---- 查询方案列表 ----
  async listPlans() {
    if (this.mode === 'supabase') {
      try {
        const { data, error } = await this.client
          .from('plans')
          .select('id, created_at, summary, plan')
          .eq('user_id', this.getUserId())
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        return { ok: true, list: data, mode: 'supabase' };
      } catch (e) {
        console.warn('[WenKeleDB] Supabase 查询失败，读取本地', e);
        return { ok: true, list: this._readLocal(), mode: 'local' };
      }
    }
    return { ok: true, list: this._readLocal(), mode: 'local' };
  },

  _readLocal() {
    try {
      return JSON.parse(localStorage.getItem(this.LOCAL_KEY) || '[]');
    } catch (e) {
      return [];
    }
  },

  // ---- 删除方案 ----
  async deletePlan(id) {
    if (this.mode === 'supabase' && !id.startsWith('local_')) {
      try {
        const { error } = await this.client
          .from('plans')
          .delete()
          .eq('id', id)
          .eq('user_id', this.getUserId());
        if (error) throw error;
        return { ok: true };
      } catch (e) {
        console.warn('[WenKeleDB] Supabase 删除失败', e);
        return { ok: false, error: e.message };
      }
    }
    // 本地删除（写入失败也返回明确结果，不让隐私模式/配额超限崩溃）
    const list = this._readLocal().filter(r => r.id !== id);
    try {
      localStorage.setItem(this.LOCAL_KEY, JSON.stringify(list));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
};

// 立即初始化
WenKeleDB.init();
