# 温可乐健身 - 全阶段科学健身私教 Web 应用

纯前端静态站（门面页 + 应用页并存，B 方案）+ Supabase 云端同步 + Vercel 部署

> **新会话入口：`HANDOFF.md`**（当前状态 / 下一条命令 / 铁律 / 环境陷阱 / 指针表）。
> **历史决策索引：`DECISIONS.md`**（为什么这样定 / 被否定的方案 / 矛盾与过期检查）。
> 本文件是 GEB L1 结构地图；前两者分别是状态快照与决策索引，三者不重复内容。

<directory>
fitness-coach/ - 应用根目录（无子目录，扁平结构）
</directory>

<config>
index.html - 门面页（默认入口）：全屏循环视频背景 + liquid-glass 导航/按钮 + 左下 Hero；所有 CTA 跳转 app.html
landing.css - 门面页样式：liquid-glass 渐变边框（mask 合成）、Geist 字体、响应式；与 styles.css 完全隔离
app.html - 完整应用页（4 步表单向导）：含「每周可训练天数」必填项；结果展示 + 历史方案面板
data.js - 知识库层（FITNESS_DATA）：评估/训练体系/动作库/营养/恢复/特殊人群 + timeBudget（时间预算分化表 + focusTemplates）+ evidence（循证文献库、A-D 等级、缺失证据声明）
app.js - 应用逻辑层：Calc + PlanGen（getSystem 按经验定容量 / applyTimeBudget 按天数定分化）+ NutritionGen + FitnessApp
db.js - 数据持久层：WenKeleDB，方案快照（不可变），Supabase 优先、localStorage 兜底、匿名 ID；摘要含 days
ability.js - 能力数据层：WenKeleAbility，开场 ABCD / 6 轴能力分 / 自测时间戳 / 4 周到期 / 节点与段位 / 报告数据
ability-ui.js - 能力 UI 层：WenKeleAbilityUI，开场问卷（T2）+ 原生 SVG 六边形（T3）+ 段位与节点（T4）
ability-report.js - 自测与报告层：WenKeleAbilityReport，周期自测（T5）+ 阶段回顾（T6），从 UI 层拆出守 400 行上限
body-goal.js - 体型方向契约：WenKeleBodyGoal，方向取值域 / goal+heat 解耦 / 部位权重 / BMI 守卫
ai-coach.js - AI 教练解读层（约 200 行）：WenKeleAICoach，结构化输出/白名单校验/越权拦截/三级降级
  解释层 AI；规则引擎零改（C1）；local 标注「规则解读」不冒充 AI；可插拔 cloud provider
audit-followup.js - 审计后续层（约 200 行）：WenKeleAuditFollowup，数据导出/草稿/目录/无障碍/能力起点建议
training-focus.js - 训练侧重契约（59 行）：WenKeleTrainingFocus，auto/strength/conditioning/posture
  与 bodyGoal 正交 —— 方向管热量+部位，侧重管体系；体态优先触发 skipFocus 互斥
tracker.js - 训练状态层：WenKeleTracker，打卡 CRUD / 周聚合 / 连续周数 / 完成率建议 / 5 事件队列（本地 FIFO 500）
tracker-ui.js - 规划态 UI：WenKeleTrackerUI.mount(result, planId)，进度卡片 / 8 周柱图 / 动作勾选 / 事件委托
today-view.js - 执行态 UI：WenKeleTodayView.mount(result, planId)，今日训练大卡 / 星期判定 / 整卡勾选 / 双向同步
styles.css - 应用页样式：品牌绿主题、Equilibrium 呼吸首屏、证据区/时间预算/打卡/建议/双视图 Tab/今日大卡
vercel.json - Vercel 部署配置：cleanUrls=false（保留 .html 锚点）+ 安全头 + 静态资源缓存
package.json - 项目元数据 + serve 脚本
.gitignore - 忽略依赖/构建产物/环境文件
test_data.js - 数据完整性测试（BMI/BMR/TDEE 计算验证 + 全库字段检查）
test_e2e.js - 端到端逻辑测试（3 个用户画像用例的动作生成验证）
test_timeline.js - 时间预算与循证专项测试（断言数动态）
test_tracker.js - 训练状态层（断言数以测试输出为准：CRUD/聚合/8周/连续/事件FIFO/损坏降级/完成率）
test_tracker_ui.js - UI 层接线（断言数以测试输出为准：结构守卫/建议推导/5 事件/C6 行数）
test_mount_contract.js - DOM 挂载契约（断言数以测试输出为准：25 组合 + 5 类特殊人群结构对齐，防 UI 静默跳过）
test_today_view.js - 增量 C（断言数以测试输出为准：今日判定 / 双向同步 / 回访接线 / C13-C15）
test_ability.js - 能力数据层（断言数以测试输出为准：ABCD/待点亮/4周/>8周基线/节点段位/木桶/降级）
test_ability_ui.js - 能力 UI 渲染契约（断言数以测试输出为准：问卷与六边形真实产出 DOM）
PLAN.md - 产品化计划书（技术方案/功能路线图/部署方案决策记录）
DEPLOY.md - GitHub 推送 + Vercel 导入执行清单、验证项与已知约束
specs/2026-11-13-training-loop/ - 训练记录闭环功能契约（已实现）：requirements/plan/validation + addendum-c
specs/2026-11-14-ability-map/ - 能力地图功能契约（T1-T8 已实现）：requirements/plan/validation/naming
specs/2026-11-15-body-goal-routing/ - 体型方向路由契约（T1–T6 已实现）：requirements/plan/validation
specs/2026-11-16-recommendation-refinement/ - 推荐体验改进契约（批次 A 已实现 / 批次 B 待裁决）：requirements/plan/validation
  批次 A = 不改训练学的体验补齐（已交付）；批次 B = 改 data.js 真源（逐项裁决，本规格不实现）
specs/2026-11-17-training-science-correction/ - 训练学真源修正契约（**B1-B4 已实现**，B5-B8 维持不做）
  B1 容量≥10组 / B2 5-3-1降级（9处含时间预算表）/ B3 动作梯度 / B4 周内轮转
specs/2026-11-17-training-focus-entry/ - 训练侧重入口契约（**已实现**，审计 #1 缺口修复）
  恢复力量/体能/体态三体系入口；trainingFocus 正交维度；makePlanId 破坏性变更
specs/2026-11-17-audit-followup/ - 产品审计后续契约（**P1-P5 已实现**，2026-11-17）
  P1 数据导出 / P2 草稿保存 / P3 结果页导航 / P4 无障碍 / P5 能力有限参与（C3 有限推翻）；登录不做
specs/2026-11-18-ai-coach/ - AI 教练解读契约（**已实现**，2026-11-18）：解释层 AI，处方层坚持规则
INTERVIEW.md - 面试叙事（AI 产品经理作品）：场景→技术→交互→指标→失败迭代闭环，含 90 秒速讲与演示脚本
README.md - 对外第一入口（面试官/新会话）：3 分钟上手 + 5 个必讲点 + 诚实边界
</config>

法则: 极简·稳定·导航·版本精确

## 页面拓扑（B 方案）
```
/ (index.html 门面页) --CTA--> /app.html (完整应用)
```
两页并存；门面页仅负责品牌呈现与导流，应用页承载全部功能。
改动任一页面时，只需维护自身的 css；data.js/app.js/db.js 只被 app.html 引用。

## 建议生成契约（补齐规格缺口后的真源）
- **经验决定练多少**：getSystem(goal, experience, bmi) → 周容量 volume / reps / rest
- **天数决定怎么摊**：applyTimeBudget(system, goal, days) → split（仅 muscle）+ frequency + schedule
  - 循证：Schoenfeld 2018（容量相等时频率无显著差异）、ACSM 2026（每周≥2 次覆盖全肌群）
  - 分化表仅对增肌严格适用；其余目标保留各自体系名，只重排训练日
- **focus 关键词契约**：focusTemplates 的文案含「全身/推/拉/腿/深蹲/循环/HIIT/矫正/整合/补强」，
  getDayExercises 按此选动作；分支顺序必须「整体性专项目 → 局部」，且 hiit 判断用小写。
- **证据可核验**：结果页展示 A-D 等级、6 类文献出处、5 条缺失证据声明；宣传语禁用「100% 循证」。

## 外部依赖
- 背景视频（CloudFront CDN，门面页）：循环 mp4
- Geist（Google Fonts，门面页）：字体
- Supabase JS Client v2（CDN，应用页）：云端方案存储，未配置时自动降级 localStorage
- Font Awesome 6.5.1（CDN，应用页）：图标
- Noto Sans SC（Google Fonts，应用页）：字体

## Supabase 初始化
建表 SQL 见 db.js 头部注释。配置填入 db.js 的 SUPABASE_CONFIG。

## 训练记录契约（已批准并实现，SDD）
规格 `specs/2026-11-13-training-loop/`（requirements/plan/validation），2026-11-13 用户「全部采纳」批准。
- **存储两相分离**：`db.js` 存不可变方案快照；`tracker.js` 存可变训练记录（KEY_RECORDS / KEY_EVENTS），不得混写
- **planId 确定性**：`makePlanId(form)` 基于输入字段 hash，同一份方案保存前后/历史加载共用同一 ID；旧方案用 `saved_<id>` 兜底
- **DOM 挂载契约**：`buildResultHTML` 输出的 `.day-block` 与 `.exercise-item` 数量必须与 `weeklyPlan` 严格对齐，
  否则 `WenKeleTrackerUI` 的结构守卫会静默跳过挂载 → 由 `test_mount_contract.js` 守门
- **完成率**：D3 按动作数；分母用 `ensurePlan` 存的 `totalEx` 快照；建议只提示与预选，不自动改计划
- **脚本顺序**：data → db → tracker → tracker-ui → app（app.js 依赖前三者）
- **B2 裁决**：删除方案时一并 `clearPlan(planId)` 清理训练记录
- 验收状态见 `validation.md`：自动化全绿，**UF 手工用户流与人类最终接受尚未完成，未达 DoD**

## 增量 C：执行/规划双视图（2026-11-13 已批准并实现）
规格 `specs/2026-11-13-training-loop/addendum-c-ui-restructure.md`
- **时态分离**：结果页顶部 Tab「今日训练」（默认，执行态）/「完整方案」（规划态，收纳全部报告卡片）
- **回访直达**：`tracker.js` 的 `KEY_LAST_PLAN` 缓存 `{planId, result, savedAt}`；`init` 经 `restoreLastPlan()`
  直接渲染结果页并停在今日训练，不再重填表单；删除最近方案时 `clearLastPlan()` 清悬空入口
- **C11 单一数据源**：`today-view.js` 与 `tracker-ui.js` 都只读写 `WenKeleTracker`；
  任一处打卡都调用对方的 `render()` / `syncCheckboxes()` 双向同步，禁止两套状态
- **DOM 契约**：`#viewTabs` / `#wkTodayView` / `#planOnlyBlocks`；结果视图靠 `view-today` / `view-plan` class 切换显隐
- **脚本顺序**：以 `app.html` 底部为准（data → db → tracker → ... → ai-* → app；AI 控制模块必须在 `ai-coach.js` 之前）
- 「重新制定方案」按钮回表单；回访恢复带 `restored:true`，不重复缓存、不误记 `plan_generated`
- **部署状态读 `HANDOFF.md` 头部**（已多次同步最新版）；UI 改造后可能暂未部署，以 HANDOFF 为准；UF-9~14 待人类浏览器验收

## 能力地图（✅ T1–T8 已实现，2026-11-16）
规格 `specs/2026-11-14-ability-map/`；证据见其 `validation.md` 第 1b / 1c 节。
- **三态视图**：`switchView` 支持 `today / ability / plan`；第三个 Tab「能力地图」，
  显隐由 `#resultView` 的 `view-*` class 控制；切到 ability 时调用 `mountAbilityPanel()` 刷新
- **开场问卷**（5 题）：俯卧撑/深蹲/平板/引体向上/心肺，ABCD 范围选项，可跳过，
  复用 `.option-group` 范式，**不占 4 步表单**；结果只进 `wenkele_ability`，不参与 `PlanGen`（C3）
- **六边形**：原生 SVG，6 轴 `臂力/背力/腿力/腰力/气力/恒力`；pending 显示「待点亮」不填 0；
  恒力来自行为数据、口径与其余 5 轴不同；报告木桶排除恒力（Replan 1）
- **段位与节点**：主线 9 层短名（顶层「引力谈判专家」）；5 条动作阶梯线 24 节点，
  节点名直取 `exerciseLibrary`，不另起名（C10）；段位只由已解锁节点推进，自测不掉级
- **自测与报告**（`ability-report.js`，158 行）：默认 4 周轻提示不弹窗；可只测 1–2 轴；
  青少年/产后/中老年禁自测（C5）；报告用户点才生成、可关闭，无排名/评级/百分比
- **段位阈值**按真实节点总数 28 校准为 `[0,2,5,8,12,16,20,24,28]`，顶层可达
- **脚本顺序**：data → db → tracker → tracker-ui → today-view → ability → ability-ui → ability-report → body-goal → training-focus → audit-followup → ai-coach → app
- 硬约束：前台禁循证术语 / 能力数据与打卡数据分离 / 次最大努力禁 1RM / 不部署 / 不检索网络资料
- **C3 有限推翻（2026-11-17 用户「全做」）**：能力数据仍**绝不进入** getSystem/applyTimeBudget/
  NutritionGen/getDayExercises（实测能力有无 → 引擎输出 6257 字符逐字相同），
  但允许在结果页显示「起点建议」卡（弱轴对应肌群确实在方案中才显示）。详见 audit-followup 规格
- 未达 DoD：浏览器手工 UF 验收与人类最终接受待完成

## 推荐体验改进（✅ 批次 A 已实现，2026-11-17）
规格 `specs/2026-11-16-recommendation-refinement/`；**批次 B 未实现，待逐项裁决**。
- `recommendation-ui.js`（143 行）：器械预告 / 教学要点 / 上次记录 / 换一个 / 请假护盾 / 难度标识 / 热量估算
- `data.js` 49 个动作新增 `equipment` + `teach` 字段（既有值零改动，C10）
- **C1 硬约束**：`getSystem` / `applyTimeBudget` / `getDayExercises` 选动作逻辑一行未改；
  换动作只改当日动作对象、不动 planId、不碰记录位（C5）
- 请假护盾每周 1 次、只记 shield 不写打卡、不涨恒力；训练日难度为纯展示（C3/C4）
- 一次性脚本 `tools/add-equipment-fields.js`（幂等，保留供审计）
- **线上分享链接仍是 11-16 版，不含本批次**；需用户明确指示才重新部署

## 体型方向路由（✅ T1–T6 已实现，2026-11-16）
规格 `specs/2026-11-15-body-goal-routing/`；证据见其 `validation.md`。
新增 `body-goal.js` + `test_body_goal.js`(34) / `test_body_goal_engine.js`(24) / `test_body_goal_ui.js`(36)；
十二套测试全绿。未达 DoD：浏览器 UF 验收与人类最终接受待完成。
- 男生选性别后**不出现方向题**，内部自动 `bodyGoal='v_taper'`（宽肩窄腰）；
  女生选性别后在性别字段下方浮现 `减脂 / 塑形 / 增肌` 三选一，必填不预选
- Step 1「训练目标」由方向自动派生并隐藏，避免「减脂」被问两遍
- 数据契约：`state.form.bodyGoal` ∈ `v_taper|cut|tone|build|null`；
  **`makePlanId` 的 hash 必须纳入 bodyGoal**，否则换方向会共用 planId 导致打卡串台
- 共用一套 `PlanGen`/`NutritionGen`，只传三参数（goal 选体系 / heat 选热量 / focus 部位权重）；
  热量沿用 `data.js` 现有 `calorieAdjust` 与 `minCalories`，不引入新常量
- **Replan 1**：goal 与 heat 解耦（`NutritionGen.buildPlan` 第 4 参数可选，不传时旧行为不变）
- **Replan 2**：`applyFocus` 高权重肌群稳定排序到前段＋未覆盖才追加；只追加不重排会让四方向动作相同
- 健康下限守卫：BMI < 18.5 且 cut → 转维持并提示（依据中科院样本理想 BMI 17.87 < 18.5）
- 与旧决策冲突已在 `requirements.md` 第 6 节显式记录：男生由「用户自选」改为「系统自动」，
  属人类新决策取代旧决策，非实现缺陷

## 测试
```
node test_data.js           # 数据完整性（失败真实 exit 1）
node test_e2e.js            # 端到端逻辑（3 用例，失败真实 exit 1）
node test_storage_resilience.js # 存储韧性：配额超限/隐私模式不崩
node test_timeline.js       # 时间预算 + 循证（断言数动态）
node test_tracker.js        # 训练状态层（断言数动态）
node test_tracker_ui.js     # UI 接线（断言数动态）
node test_mount_contract.js # DOM 挂载契约（断言数动态）
node test_today_view.js     # 增量 C 双视图（断言数动态）
node test_ability.js        # 能力数据层（断言数动态）
node test_ability_ui.js     # 能力 UI 渲染契约（断言数动态）
node test_ability_contract.js # 能力面板/段位/报告一致性（断言数动态）
node test_body_goal.js      # 方向数据契约（断言数动态）
node test_body_goal_engine.js # 引擎参数化与守卫（断言数动态）
node test_body_goal_ui.js   # 前台禁用词与回访还原（断言数动态）
node test_recommendation.js # 推荐体验批次 A（断言数动态）
node test_training_science.js # 训练学 B1-B4（断言数动态）
node test_training_focus.js # 训练侧重入口（断言数动态）
node test_audit_followup.js # 审计后续 P1-P5（断言数动态）
node test_ai_coach.js       # AI 教练解读 golden set（断言数以测试输出为准）
node test_input_validation.js # 端到端输入健壮性：全模块加载 + 畸形表单不产 NaN
node test_landing_contract.js # 门面契约：无虚假登录 + CTA 锚点真实存在
node test_render_hardening.js # 读回路径：篡改不注入 XSS、损坏结构不白屏
node test_ui_layout.js       # UI 布局：方法论抽屉 + 完整方案三分区
node test_content_simplify.js # 内容精简：rationale/依据隐藏 + mixed 动作合并
python -m http.server 8899  # 本地预览，访问 / 与 /app.html
```
