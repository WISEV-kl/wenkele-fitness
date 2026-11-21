# HANDOFF — 新会话从这里开始

> **唯一目的**：让一个全新会话不读聊天历史就能继续干活。
> 只写「当前状态 / 下一条命令 / 不能碰什么 / 环境陷阱」，**不写历史、不复制规格**。
> 每完成一批工作更新本文件；本文件与代码同仓，随 git 版本化。

**更新**：2026-11-20（含体型方向路由 / 训练学修正 / AI 教练解读全套加固 / 端到端输入验证 / 线上已同步）　|　**代码基线**：`git log -1`
**文档 HEAD**：移动目标，一律 `git log -1` 查（本文档刻意不写死 hash）
**失效条件**：下一批交付后未更新本文件即失效

> 历史决策与「为什么」查 **`DECISIONS.md`**（含矛盾/过期检查）；本文件只管「现在与下一步」。

---

## 0. 启动协议（照做，别重新探索）

1. 已自动注入：`AGENTS.md`（宪法）、`~/.workbuddy/SOUL.md|IDENTITY.md|USER.md`、工作区 `MEMORY.md` —— 不必再读
2. **读本文件**（状态真源）
3. 需要改代码时再读 `CLAUDE.md`（L1 结构地图，119 行）
4. **只按指针读单份规格**，不要通读 `specs/` 全套（1037 行）或全部代码（7408 行）
5. 要追溯「为什么这样定 / 当时否定了什么」→ 读 `DECISIONS.md`；
   要找某决策落在哪次提交 → `git log --oneline`（提交信息含决策摘要）；
   环境经验才查 `.workbuddy/memory/2026-08-19.md`

---

## 1. 当前状态（一句话）

能力地图 **T1–T8 全部已实现**（开场问卷 → 六边形 → 段位节点 → 自测 → 阶段回顾）。
自测与报告拆在 `ability-report.js`；**十五套测试全绿**。
**线上已部署并同步至最新版（2026-11-20，含全部 AI 加固 + 端到端修复 + UI 改造：方法论抽屉/方案四分区→三分区/mixed 动作合并/依据安全隐藏/页脚去黑底 + 四维审计修复）**；
**浏览器手工验收未完成**。
开场问卷已按用户反馈扩为 **5 题**（补引体向上→背力、心肺自评→气力）；表单切步改为滚到进度条。
训练方案调研 + Keep 竞品调研已落 skill，**但 `data.js` 推荐算法未改**——需人类裁决后另立规格。
Keep 调研给出 10 条待改项，建议先做低风险留存项（请假护盾 / 阶段总结 UI / 单动作替换），
再动会改公开契约的动作难度标签与周内轮转。

**✅ 体型方向路由 T1–T6 已完成（2026-11-16 22:xx）**：
规格 `specs/2026-11-15-body-goal-routing/`；男生选性别后不出现方向题（内部 `v_taper`），
女生浮现减脂/塑形/增肌三选一，Step 1 目标自动派生隐藏。
新增 `body-goal.js` + 三套测试（34 / 24 / 36 断言）；**十二套测试全绿、9 JS 语法 OK、CSS 487/487、资源 HTTP 200**。
执行期两次 Replan（goal/heat 解耦、applyFocus 改重排）已写回 requirements.md。
**剩余：浏览器手工 UF 验收与人类最终接受（未达 DoD）**。（此为 11-16 体型路由当时快照；线上部署状态见头部与待办第 5 项，现已同步最新版）

---

## 2. 下一条命令（可直接执行）

```bash
cd C:/Users/86195/WorkBuddy/2026-08-19-16-54-59/fitness-coach
git status --short                    # 应为空
node test_ability.js && node test_ability_ui.js   # 快速确认基线
```

能力地图与体型方向路由均已全部实现；下一步按用户指示（部署 / 验收 / 新功能）行动。
新增验证套件见 `CLAUDE.md` 的「测试」节（共 13 套）。

---

## 3. 三个未完结事项（任务状态原本只在工具里，此处落盘）

| # | 事项 | 状态 |
|---|------|------|
| 1 | ~~重新部署线上~~ | ✅ **已完成（2026-11-16）**：用户明确要求分享链接后发布，线上已确认为最新版 |
| 2 | **浏览器手工验收 UF-1~UF-14 + 方向路由 UF-1~12**：本环境无 jsdom/Playwright/puppeteer | 需人类完成；线上与本地均可验 |
| 3 | ~~推荐体验改进批次 A~~ | ✅ **已实现（2026-11-17）**：器械预告/教学/上次记录/换一个/请假护盾/难度标识/预估热量；新增 `recommendation-ui.js` + `test_recommendation.js`(31)；十四套全绿 |
| 4 | ~~批次 B（训练学真源修正）~~ | ✅ **B1–B4 已实现（2026-11-17）**：容量≥10组 / 5-3-1 九处清理 / 动作梯度 / 周内轮转；新增 `test_training_science.js`(29)；十五套全绿。B5–B8 维持不做 |
| 5 | ~~线上未同步~~ | ✅ **已同步（最新 2026-11-20「部署」）**：线上已验证含全部功能——三体系/训练侧重、训练学、AI 全套加固 + 端到端修复 + UI 改造（方法论抽屉/三分区可折叠/mixed 动作斜杠合并/详情箭头/依据安全隐藏/页脚去黑底）+ 四维审计修复（测试门禁/存储韧性）；逐项 curl 核对 variant-slash/exercise-expand/页脚transparent/_memoryUid 均在线，核心资源全 200；链接不变。发布前 24 套全绿 |
| 6 | ~~训练侧重入口（审计 #1）~~ | ✅ **已实现（2026-11-17）**：新增 `trainingFocus` 正交维度，恢复力量/体能/体态三体系；`training-focus.js`(59 行) + `test_training_focus.js`(46)；16 套全绿。**注意 makePlanId 已变更 → 旧 planId 失效但历史可读** |
| 7 | ~~审计后续 5 项~~ | ✅ **P1–P5 全做（2026-11-17 哥「全做」）**：导出/草稿/目录/无障碍/能力起点建议；新增 `audit-followup.js` + `test_audit_followup.js`(45)；17 套全绿。**C3 铁律有限推翻但引擎输出实测零改**，详见 DECISIONS |
| 8 | ~~AI 教练解读（面试目标）~~ | ✅ **已实现并加固（2026-11-18→19）**：解释层 AI（处方层坚持规则）；5 个 AI 模块 + `test_ai_coach.js`（断言数以测试输出为准）；对抗校验/XSS/数字核验全拦、三层开关、换角度、反馈指纹；`INTERVIEW.md` 面试叙事。18 套全绿 |

**线上分享链接（2026-11-16 首发，2026-11-20 更新至最新版）**：
`https://d7816fb82fa146648c81b449025496b9.app.workbuddy.link/?sharecode=LYXM5YZHNX`
（门面页为入口，应用页加 `/app.html?sharecode=LYXM5YZHNX`；
裸 curl 需 Cookie 鉴权，浏览器带 sharecode 即可访问）

---

## 4. 铁律（碰之前先确认）

- **不部署**、**不 push GitHub**、**不检索网络资料**（资料检索授权全程未给）
- **不追问确认**：用户明确「我说执行方案时执行，不要问了」
- 品牌名 **温可乐健身**，勿改回 Qiaomu / Equilibrium
- `index.html`（门面）+ `data.js`/`db.js`/`vercel.json` 属保护范围，非必要不动
- 前台**禁止出现循证术语**（容量/RPE/一致性/相对力量）；能力数据**绝不进入引擎输出**
  （2026-11-17 C3 有限推翻：仅结果页「起点建议」展示层用弱轴，getSystem/NutritionGen 零改，实测 6257 字符逐字相同）
- 自测一律**次最大努力**，青少年/中老年/产后禁用极限负重
- 新模块走独立文件，`app.js` 已 **1430 行**（超过 AGENTS.md 单文件 ≤800 约束）；
  **架构债已知**：混了 Calc(37)/PlanGen(320)/FitnessApp 三职责，宜拆 `calc.js`+`plangen.js`。
  当前不拆的理由：大量测试从 app.js 的 vm 上下文取 `Calc`/`PlanGen`，拆分需同步改测试，
  收益（行数达标）不抵破坏性风险。**触发条件**：若要在 app.js 加 >100 行新逻辑，则先拆后加
- 按 SDD：**规格先于代码**，缺陷暴露规格缺口时先改 `requirements.md` 再修代码

---

## 5. 环境陷阱（踩过，别重踩）

| 陷阱 | 正确做法 |
|------|---------|
| 本地 8899 常掉到 502 | `python -m http.server 8899 --bind 127.0.0.1` 重启（后台） |
| 线上链接裸 curl 403 | 正常：sites 通道靠 `?sharecode=` + `__wb_rsc` Cookie 会话鉴权，浏览器带 Cookie 即 200 |
| `workbuddy_cloudstudio_deploy` 已不可用 | 用 `workbuddy_sites_deploy` |
| vm 里 `const X` 不挂 ctx | 运行时验证须追加 `;this.X=X` 显式导出（已踩 3 次） |
| 静态 grep 断言假阴性 | 剥离注释后再查代码，否则注释里的类名会命中 |
| 无浏览器自动化 | 用轻量 DOM 桩 + 运行时渲染验证，诚实标注「像素证据待人类」 |
| 六边形/打卡 UI 可能静默跳过挂载 | 跑 `test_mount_contract.js` 与 `test_ability_ui.js` 结构契约 |
| 记忆文件未被 git 跟踪 | 工作区根不是 git 仓库；关键状态必须写进本文件（在项目仓库内） |

---

## 6. 一键全量验证

```bash
for t in test_data.js test_e2e.js test_timeline.js test_tracker.js \
         test_tracker_ui.js test_mount_contract.js test_today_view.js \
         test_ability.js test_ability_ui.js; do node $t || break; done
```
早期九套为基线；**现共十五套**（完整清单见 `CLAUDE.md`「测试」节），另查 JS 语法与 CSS 花括号平衡。

---

## 7. 指针表（按需读，不要全读）

| 想知道 | 去哪 |
|--------|------|
| 项目结构 / 模块契约 / 测试命令 | `CLAUDE.md` |
| 体型方向路由规格（男宽肩窄腰 / 女三分类） | `specs/2026-11-15-body-goal-routing/` |
| 历史决策、依据、被否定的方案、过期检查 | `DECISIONS.md` |
| 训练闭环 P0 与增量 C 的决策 | `specs/2026-11-13-training-loop/{requirements,plan,validation}.md` + `addendum-c-ui-restructure.md` |
| 能力地图规格、命名定稿、验收 | `specs/2026-11-14-ability-map/{requirements,naming,plan,validation}.md` |
| 已实现证据与 Replan 记录 | 各规格 `validation.md` + `git log --oneline` |
| 训练方案调研 / 循证对照 / 待改清单 | `~/.workbuddy/skills/qiaomu-fitness-coach/references/popular-programs-review.md`（C/D 级，**未改 data.js**） |
| Keep 竞品调研 / 10 条 data.js 待改项 | `~/.workbuddy/skills/qiaomu-fitness-coach/references/competitor-keep-review.md`（**未改 data.js**） |
| 环境经验、失败路径 | `.workbuddy/memory/2026-08-19.md`（工作区根下，**不在 git**） |
| GitHub / Vercel 步骤 | `DEPLOY.md` |

**提交链**：`git log --oneline --reverse` 即权威顺序；提交信息本身含完整决策摘要，不必在此复述。
（历史汇报文本中出现过的短 hash 曾与真源不符，见 `DECISIONS.md` 第 2 节）

---

## 8. 执行前必须主动提醒用户的 3 件事
1. **8(6)** 纯本地无云端 / 分享卡边界（用户：「待定，在真正执行时提醒我」）
2. **资料检索授权**：一手循证标准 + 竞品机制 + 网络梗灵感池，全程未授权
3. ~~**上线时机**：线上仍是旧版，是否同步需另行请示~~ → 已完成：用户 11-18、11-19（×2）、11-20（×3）共六次明确发布指令，线上已同步最新版
