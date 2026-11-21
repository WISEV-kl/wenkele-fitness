/**
 * [INPUT]: 无外部依赖，纯数据模块
 * [OUTPUT]: 对外提供 FITNESS_DATA 全局对象，包含评估、训练、动作、营养、恢复、特殊人群全部数据
 * [POS]: fitness-coach 的知识库层，被 app.js 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const FITNESS_DATA = {

  // ============================================================
  // 一、身体评估
  // ============================================================
  assessment: {
    bmiRanges: [
      { min: 0, max: 18.5, label: '偏瘦', color: '#3498db', advice: '增肌为主，注意营养摄入' },
      { min: 18.5, max: 24, label: '正常', color: '#2ecc71', advice: '根据目标选择增肌/减脂/维持' },
      { min: 24, max: 28, label: '超重', color: '#f39c12', advice: '减脂为主，保留力量训练' },
      { min: 28, max: 999, label: '肥胖', color: '#e74c3c', advice: '优先减脂，从低强度开始，注意关节保护' }
    ],

    activityFactors: [
      { value: 1.2, label: '久坐', desc: '办公室工作，几乎不运动' },
      { value: 1.375, label: '轻度活动', desc: '每周1-3次轻度运动' },
      { value: 1.55, label: '中度活动', desc: '每周3-5次中等强度运动' },
      { value: 1.725, label: '高度活动', desc: '每周6-7次高强度运动' },
      { value: 1.9, label: '极高活动', desc: '体力劳动 + 每日训练' }
    ],

    experienceLevels: [
      { value: 'beginner', label: '零基础', desc: '从未系统训练', detail: '动作模式未建立，核心稳定性差' },
      { value: 'novice', label: '入门 (<3月)', desc: '掌握基础动作，但重量和动作质量不稳定', detail: '' },
      { value: 'intermediate', label: '中级 (3月-2年)', desc: '动作模式稳定，有一定力量基础', detail: '' },
      { value: 'advanced', label: '高级 (>2年)', desc: '接近自然极限，需要周期化训练', detail: '' }
    ],

    goals: [
      { value: 'muscle', label: '增肌', icon: 'fas fa-dumbbell' },
      { value: 'fatloss', label: '减脂', icon: 'fas fa-fire' },
      { value: 'strength', label: '力量提升', icon: 'fas fa-weight-hanging' },
      { value: 'conditioning', label: '体能提升', icon: 'fas fa-running' },
      { value: 'posture', label: '体态矫正', icon: 'fas fa-walking' }
    ],

    scenarios: [
      { value: 'home_none', label: '居家无器械', icon: 'fas fa-home' },
      { value: 'home_simple', label: '居家有简单器械', icon: 'fas fa-couch' },
      { value: 'gym', label: '健身房', icon: 'fas fa-building' },
      { value: 'mixed', label: '混合', icon: 'fas fa-random' }
    ],

    specialConditions: [
      { value: 'none', label: '无' },
      { value: 'elderly', label: '中老年 (50+)' },
      { value: 'office', label: '久坐办公族' },
      { value: 'postpartum', label: '产后恢复' },
      { value: 'youth', label: '青少年 (12-18)' },
      { value: 'obese', label: '肥胖 (BMI>=28)' },
      { value: 'injury', label: '有伤病史' }
    ],

    healthyRates: {
      fatloss: '每周 0.5 - 1kg（约体重的 0.5-1%）',
      muscle_beginner: '每月 0.5 - 1kg',
      muscle_intermediate: '每月 0.25 - 0.5kg',
      muscle_advanced: '更慢，需精细周期化'
    }
  },

  // ============================================================
  // 二、训练体系
  // ============================================================
  trainingSystems: {
    muscle: {
      beginner: {
        split: '全身分化 (Full Body)',
        frequency: '每周 3 次',
        schedule: [
          { day: '周一', focus: '全身训练 A', duration: '45min' },
          { day: '周三', focus: '全身训练 B', duration: '45min' },
          { day: '周五', focus: '全身训练 A', duration: '45min' }
        ],
        volume: '每肌群 10-12 组/周',
        reps: '3组 x 8-12次',
        rest: '60-90秒'
      },
      novice: {
        split: '全身分化 (Full Body)',
        frequency: '每周 3 次',
        schedule: [
          { day: '周一', focus: '全身训练 A', duration: '45-60min' },
          { day: '周三', focus: '全身训练 B', duration: '45-60min' },
          { day: '周五', focus: '全身训练 A', duration: '45-60min' }
        ],
        volume: '每肌群 10-12 组/周',
        reps: '3组 x 8-12次',
        rest: '60-90秒'
      },
      intermediate: {
        split: '上下肢分化 (Upper/Lower)',
        frequency: '每周 4 次',
        schedule: [
          { day: '周一', focus: '上肢日（推+拉+核心）', duration: '60min' },
          { day: '周二', focus: '下肢日（股四+腘绳+臀+小腿）', duration: '60min' },
          { day: '周四', focus: '上肢日', duration: '60min' },
          { day: '周五', focus: '下肢日', duration: '60min' }
        ],
        volume: '每肌群 10-16 组/周',
        reps: '3-4组 x 6-12次',
        rest: '90-120秒'
      },
      advanced: {
        split: '推拉腿分化 (PPL)',
        frequency: '每周 6 次',
        schedule: [
          { day: '周一', focus: '推日（胸+肩前中束+三头）', duration: '60-75min' },
          { day: '周二', focus: '拉日（背+肩后束+二头）', duration: '60-75min' },
          { day: '周三', focus: '腿日（股四+腘绳+臀+小腿）', duration: '60-75min' },
          { day: '周四', focus: '推日', duration: '60-75min' },
          { day: '周五', focus: '拉日', duration: '60-75min' },
          { day: '周六', focus: '腿日', duration: '60-75min' }
        ],
        volume: '每肌群 12-20 组/周',
        reps: '4-5组，混合 6-8次(力量) + 10-12次(肌肥大) + 15+次(泵感)',
        rest: '90-180秒'
      }
    },

    fatloss: {
      default: {
        split: '力量保留 + 有氧消耗',
        frequency: '每周 3-4 次力量 + 2-3 次有氧',
        schedule: [
          { day: '周一', focus: '全身力量训练', duration: '45min' },
          { day: '周二', focus: 'HIIT 20min 或 稳态有氧 30-45min', duration: '20-45min' },
          { day: '周三', focus: '休息', duration: '-' },
          { day: '周四', focus: '全身力量训练', duration: '45min' },
          { day: '周五', focus: '稳态有氧 30-45min', duration: '30-45min' },
          { day: '周六', focus: '全身力量训练（可选）', duration: '45min' }
        ],
        volume: '略低于增肌期，强度保持',
        reps: '3组 x 8-12次（力量），组间休息缩短至 60-90秒',
        rest: '60-90秒'
      }
    },

    strength: {
      beginner: {
        split: '5x5 线性递增',
        frequency: '每周 3 次',
        schedule: [
          { day: '周一', focus: '深蹲 5x5 + 卧推 5x5 + 硬拉 1x5', duration: '60min' },
          { day: '周三', focus: '深蹲 5x5 + 推举 5x5 + 硬拉 1x5', duration: '60min' },
          { day: '周五', focus: '深蹲 5x5 + 卧推 5x5 + 硬拉 1x5', duration: '60min' }
        ],
        volume: '三大项为核心',
        reps: '5组 x 5次',
        rest: '2-3分钟',
        note: '每次训练增加 2.5kg（上肢）/ 5kg（下肢）'
      },
      intermediate: {
        split: '力量专项（进阶）',
        frequency: '每周 3-4 次',
        schedule: [
          { day: '周一', focus: '深蹲（主项）+ 辅助', duration: '60min' },
          { day: '周二', focus: '推举（主项）+ 辅助', duration: '60min' },
          { day: '周四', focus: '卧推（主项）+ 辅助', duration: '60min' },
          { day: '周五', focus: '硬拉（主项）+ 辅助', duration: '60min' }
        ],
        volume: '4周一个周期',
        reps: '3组x5次 → 3组x3次 → 3组x1次(PR) → Deload',
        rest: '3-5分钟',
        note: '进阶节奏：主项逐步加重；不必练到力竭，留 1-2 次余量'
      }
    },

    conditioning: {
      default: {
        split: '循环训练 + HIIT',
        frequency: '每周 4-5 次',
        schedule: [
          { day: '周一', focus: '循环训练（5-8动作，3-5轮）', duration: '30-40min' },
          { day: '周二', focus: 'HIIT（20-30秒全力 + 30-60秒休息，8-15组）', duration: '20-30min' },
          { day: '周三', focus: '休息或低强度有氧', duration: '-' },
          { day: '周四', focus: '循环训练', duration: '30-40min' },
          { day: '周五', focus: 'HIIT', duration: '20-30min' }
        ],
        volume: '短休息，多动作组合',
        reps: '每个动作 30-60秒，动作间休息 15-30秒',
        rest: '15-30秒（动作间），1-2分钟（轮间）'
      }
    },

    posture: {
      default: {
        split: '评估 + 激活 + 强化 + 拉伸',
        frequency: '每周 3-4 次',
        schedule: [
          { day: '周一', focus: '上交叉矫正（松解胸肌/上斜方 + 强化中下斜方/菱形肌）', duration: '45min' },
          { day: '周三', focus: '下交叉矫正（松解髂腰肌/竖脊肌 + 强化臀肌/腹横肌）', duration: '45min' },
          { day: '周五', focus: '整合动作模式（深蹲、划船、推举）', duration: '45min' }
        ],
        volume: '松解30-60秒/肌群 + 激活低次数 + 整合正常组数',
        reps: '松解：30-60秒 | 激活：2组x10次 | 整合：3组x10-12次',
        rest: '60秒',
        note: '先松解紧张肌，再强化薄弱肌，最后整合动作模式'
      }
    }
  },

  // ============================================================
  // 三、动作库（含进阶标准）
  // ============================================================
  exerciseLibrary: {
    chest: {
      name: '胸部',
      icon: 'fas fa-heartbeat',
      home: [
        { name: '墙壁俯卧撑', target: '胸肌、三头肌、前三角肌', sets: '3组', reps: '10-15次', rest: '60秒', cue: '身体成直线，双手略宽于肩，下降时胸部靠近墙壁', progress: '能标准完成 3组x15次，RPE<=7，动作无晃动 → 上斜俯卧撑', equipment: '椅子/墙面', teach: { warmup: '先做肩绕环和弹力带外旋，激活肩袖', eccentric: '下放慢一点，胸肌全程有张力', common_error: '耸肩、塌腰、肘部外展过大' } },
        { name: '上斜俯卧撑（手撑椅子）', target: '胸肌、三头肌、前三角肌', sets: '3组', reps: '10-12次', rest: '60秒', cue: '手撑稳固平面，身体从头到脚成直线', progress: '3组x12次，胸部能轻触平面，身体不塌腰 → 跪姿俯卧撑', equipment: '椅子/墙面', teach: { warmup: '先做肩绕环和弹力带外旋，激活肩袖', eccentric: '下放慢一点，胸肌全程有张力', common_error: '耸肩、塌腰、肘部外展过大' } },
        { name: '跪姿俯卧撑', target: '胸肌、三头肌、前三角肌', sets: '3组', reps: '10-12次', rest: '60-90秒', cue: '膝盖着地，小腿交叉抬起，上半身成直线', progress: '3组x12次，全程控制，可轻松完成最后一组 → 标准俯卧撑', equipment: '徒手', teach: { warmup: '先做肩绕环和弹力带外旋，激活肩袖', eccentric: '下放慢一点，胸肌全程有张力', common_error: '耸肩、塌腰、肘部外展过大' } },
        { name: '标准俯卧撑', target: '胸肌、三头肌、前三角肌', sets: '3-4组', reps: '8-12次', rest: '90秒', cue: '双手略宽于肩，身体成直线，下降至胸距地2-3cm', progress: '4组x12次，RPE<=7，连续2次训练 → 下斜俯卧撑', errors: '塌腰、撅臀、肘部外展90度（应45-60度）、半程', equipment: '徒手', teach: { warmup: '先做肩绕环和弹力带外旋，激活肩袖', eccentric: '下放慢一点，胸肌全程有张力', common_error: '耸肩、塌腰、肘部外展过大' } },
        { name: '下斜俯卧撑（脚抬高）', target: '上胸、肩部', sets: '3-4组', reps: '8-12次', rest: '90秒', cue: '脚放椅子/床上，增加上胸和肩部负荷', progress: '4组x12次，身体稳定不晃动 → 钻石俯卧撑', equipment: '徒手', teach: { warmup: '先做肩绕环和弹力带外旋，激活肩袖', eccentric: '下放慢一点，胸肌全程有张力', common_error: '耸肩、塌腰、肘部外展过大' } },
        { name: '钻石俯卧撑', target: '胸内侧、三头肌', sets: '3组', reps: '8-10次', rest: '90秒', cue: '双手食指拇指相触成钻石形，肘部贴近身体', progress: '3组x10次，动作不变形 → 单手俯卧撑（辅助）', equipment: '徒手', teach: { warmup: '先做肩绕环和弹力带外旋，激活肩袖', eccentric: '下放慢一点，胸肌全程有张力', common_error: '耸肩、塌腰、肘部外展过大' } },
      ],
      gym: [
        { name: '史密斯机卧推（轻重量）', target: '胸肌、三头肌、前三角肌', sets: '3-4组', reps: '8-12次', rest: '90秒', cue: '肩胛骨收紧，下背部自然弓起，杠铃下降至乳头位置', progress: '能完成目标次数上限且RPE<=7，加2.5kg → 哑铃卧推', equipment: '杠铃/哑铃', teach: { warmup: '先做肩绕环和弹力带外旋，激活肩袖', eccentric: '下放慢一点，胸肌全程有张力', common_error: '耸肩、塌腰、肘部外展过大' } },
        { name: '哑铃卧推', target: '胸肌、三头肌、前三角肌', sets: '3-4组', reps: '8-12次', rest: '90秒', cue: '哑铃下降至胸两侧，推起时哑铃向内靠拢，顶峰收缩', progress: '活动范围更大，左右侧独立，纠正不平衡 → 杠铃卧推', equipment: '哑铃/水瓶', teach: { warmup: '先做肩绕环和弹力带外旋，激活肩袖', eccentric: '下放慢一点，胸肌全程有张力', common_error: '耸肩、塌腰、肘部外展过大' } },
        { name: '杠铃卧推', target: '胸肌、三头肌、前三角肌', sets: '4组', reps: '6-10次', rest: '90-120秒', cue: '肩胛骨收紧，杠铃下降至乳头位置，推起时不锁死肘部', progress: '增肌4组x6-10次，力量5组x3-5次，加2.5kg → 上斜卧推', equipment: '杠铃/哑铃', teach: { warmup: '先做肩绕环和弹力带外旋，激活肩袖', eccentric: '下放慢一点，胸肌全程有张力', common_error: '耸肩、塌腰、肘部外展过大' } },
        { name: '上斜卧推', target: '上胸肌', sets: '4组', reps: '8-12次', rest: '90秒', cue: '凳子倾斜30-45度，杠铃下降至上胸位置', progress: '4组x12次 → 双杠臂屈伸', equipment: '杠铃/哑铃', teach: { warmup: '先做肩绕环和弹力带外旋，激活肩袖', eccentric: '下放慢一点，胸肌全程有张力', common_error: '耸肩、塌腰、肘部外展过大' } },
      ]
    },

    back: {
      name: '背部',
      icon: 'fas fa-arrows-up',
      home: [
        { name: '俯身 Y-T-W 举起', target: '中下斜方、菱形肌、后三角肌', sets: '3组', reps: '每个字母10次', rest: '60秒', cue: '俯身至背部与地面平行，手臂分别成Y/T/W形举起，顶峰收缩2秒', progress: '3组x12次/字母，可加轻重量', equipment: '徒手', teach: { warmup: '先空手做几次「手肘往裤兜拉」找发力感', eccentric: '还原时别松劲，让背肌控制重量', common_error: '用手臂硬拉、耸肩、身体后仰借力' } },
        { name: '俯身划船（水瓶/哑铃）', target: '背阔肌、中背', sets: '3组', reps: '10-12次', rest: '90秒', cue: '俯身，背部平直，将重量拉向髋部，肘部贴身体，挤压肩胛骨', progress: '3组x12次，背部不弓起 → 弹力带划船/反向划船', equipment: '哑铃/水瓶', teach: { warmup: '先空手做几次「手肘往裤兜拉」找发力感', eccentric: '还原时别松劲，让背肌控制重量', common_error: '用手臂硬拉、耸肩、身体后仰借力' } },
        { name: '反向划船（桌子/单杠下）', target: '背阔肌、中背', sets: '3组', reps: '8-12次', rest: '90秒', cue: '身体在桌子/单杠下方，双手抓住边缘，将胸部拉向桌子，身体成直线', progress: '3组x12次，胸部能触到杠/桌 → 辅助引体向上', equipment: '椅子/墙面', teach: { warmup: '先空手做几次「手肘往裤兜拉」找发力感', eccentric: '还原时别松劲，让背肌控制重量', common_error: '用手臂硬拉、耸肩、身体后仰借力' } },
        { name: '辅助引体向上', target: '背阔肌、二头肌', sets: '3-4组', reps: '6-10次', rest: '120秒', cue: '弹力带套脚/膝盖，全幅度，下巴过杠，下降时手臂完全伸直', progress: '能不用辅助完成3组x8次，动作标准 → 标准引体向上', equipment: '弹力带', teach: { warmup: '先空手做几次「手肘往裤兜拉」找发力感', eccentric: '还原时别松劲，让背肌控制重量', common_error: '用手臂硬拉、耸肩、身体后仰借力', cue2: '想象用手肘去够裤兜，让背肌主导' } },
        { name: '标准引体向上', target: '背阔肌、二头肌', sets: '4组', reps: '6-10次', rest: '120秒', cue: '启动时肩胛下沉，拉至下巴过杠，控制下降', progress: '4组x10次，RPE<=7 → 负重引体', equipment: '徒手', teach: { warmup: '先空手做几次「手肘往裤兜拉」找发力感', eccentric: '还原时别松劲，让背肌控制重量', common_error: '用手臂硬拉、耸肩、身体后仰借力', cue2: '想象用手肘去够裤兜，让背肌主导' } },
      ],
      gym: [
        { name: '高位下拉', target: '背阔肌', sets: '3-4组', reps: '8-12次', rest: '90秒', cue: '宽握，肩胛下沉，拉至上胸，控制还原', progress: '引体的替代，逐步增加重量', equipment: '徒手', teach: { warmup: '先空手做几次「手肘往裤兜拉」找发力感', eccentric: '还原时别松劲，让背肌控制重量', common_error: '用手臂硬拉、耸肩、身体后仰借力' } },
        { name: '坐姿划船', target: '中背', sets: '3-4组', reps: '8-12次', rest: '90秒', cue: '保持背部平直，拉向腹部，挤压肩胛骨', progress: '增加重量', equipment: '杠铃/哑铃', teach: { warmup: '先空手做几次「手肘往裤兜拉」找发力感', eccentric: '还原时别松劲，让背肌控制重量', common_error: '用手臂硬拉、耸肩、身体后仰借力' } },
        { name: '杠铃划船', target: '背阔肌、中背', sets: '4组', reps: '6-10次', rest: '120秒', cue: '俯身45度，杠铃贴腿拉向腹部，背部平直', progress: '大重量复合动作，增加重量', equipment: '杠铃/哑铃', teach: { warmup: '先空手做几次「手肘往裤兜拉」找发力感', eccentric: '还原时别松劲，让背肌控制重量', common_error: '用手臂硬拉、耸肩、身体后仰借力' } },
        { name: '硬拉', target: '全身后链', sets: '5组', reps: '3-5次', rest: '2-3分钟', cue: '杠铃贴腿，髋铰链模式，背部平直，拉起时髋膝同时伸展', progress: '增加5kg，动作质量优先', equipment: '杠铃/哑铃', teach: { warmup: '先空手做几次「手肘往裤兜拉」找发力感', eccentric: '还原时别松劲，让背肌控制重量', common_error: '用手臂硬拉、耸肩、身体后仰借力' } },
      ]
    },

    legs: {
      name: '腿部',
      icon: 'fas fa-running',
      home: [
        { name: '坐站训练（椅子深蹲）', target: '股四头肌、臀肌', sets: '3组', reps: '12-15次', rest: '60秒', cue: '从椅子站起，再缓慢坐下（不完全坐实），膝盖与脚尖方向一致', progress: '3组x15次，不用手辅助 → 徒手深蹲', equipment: '椅子/墙面', teach: { warmup: '先活动髋和膝，做几个徒手慢蹲', eccentric: '下蹲/下放阶段慢一点，膝盖对准脚尖', common_error: '膝盖内扣、身体前倾过多、半程' } },
        { name: '徒手深蹲', target: '股四头肌、臀肌、腘绳肌', sets: '3-4组', reps: '10-15次', rest: '90秒', cue: '双脚与肩同宽，脚尖外展15-30度，下蹲至大腿平行或更低，膝盖不内扣', progress: '4组x15次，下蹲轻松 → 保加利亚分腿蹲', errors: '膝盖内扣、脚跟离地、弯腰、半程', equipment: '杠铃/哑铃', teach: { warmup: '先活动髋和膝，做几个徒手慢蹲', eccentric: '下蹲/下放阶段慢一点，膝盖对准脚尖', common_error: '膝盖内扣、身体前倾过多、半程' } },
        { name: '保加利亚分腿蹲', target: '股四头肌、臀肌（单腿）', sets: '3组', reps: '8-12次/侧', rest: '90秒', cue: '后脚放椅子/床上，前脚距椅子约一步，下蹲至前腿大腿平行，重心在前腿', progress: '3组x12次/侧 → 单腿深蹲（辅助）', equipment: '椅子/墙面', teach: { warmup: '先活动髋和膝，做几个徒手慢蹲', eccentric: '下蹲/下放阶段慢一点，膝盖对准脚尖', common_error: '膝盖内扣、身体前倾过多、半程' } },
        { name: '单腿深蹲（辅助）', target: '股四头肌、臀肌（单腿）', sets: '3组', reps: '5-8次/侧', rest: '120秒', cue: '手扶栏杆/墙，另一条腿前伸，单腿下蹲至大腿平行', progress: '不扶物完成3组x8次/侧 → 手枪深蹲', equipment: '杠铃/哑铃', teach: { warmup: '先活动髋和膝，做几个徒手慢蹲', eccentric: '下蹲/下放阶段慢一点，膝盖对准脚尖', common_error: '膝盖内扣、身体前倾过多、半程' } },
        { name: '臀桥', target: '臀肌、腘绳肌', sets: '3组', reps: '12-15次', rest: '60秒', cue: '仰卧屈膝，臀部发力顶起至膝-髋-肩成直线，顶峰收缩2秒', progress: '3组x15次，可单腿进阶', equipment: '徒手', teach: { warmup: '先活动髋和膝，做几个徒手慢蹲', eccentric: '下蹲/下放阶段慢一点，膝盖对准脚尖', common_error: '膝盖内扣、身体前倾过多、半程' } },
      ],
      gym: [
        { name: '腿举机', target: '股四头肌、臀肌', sets: '3-4组', reps: '10-15次', rest: '90秒', cue: '双脚与肩同宽，膝盖不内扣，下放至大腿与踏板平行', progress: '增加重量 → 史密斯深蹲', equipment: '固定器械', teach: { warmup: '先活动髋和膝，做几个徒手慢蹲', eccentric: '下蹲/下放阶段慢一点，膝盖对准脚尖', common_error: '膝盖内扣、身体前倾过多、半程' } },
        { name: '杠铃后蹲（Back Squat）', target: '股四头肌、臀肌、腘绳肌', sets: '4组', reps: '6-10次', rest: '120秒', cue: '杠铃放斜方肌上部，双脚与肩同宽，下蹲至大腿平行，核心收紧', progress: '增肌4组x6-10次，力量5组x3-5次，加2.5-5kg', equipment: '杠铃/哑铃', teach: { warmup: '先活动髋和膝，做几个徒手慢蹲', eccentric: '下蹲/下放阶段慢一点，膝盖对准脚尖', common_error: '膝盖内扣、身体前倾过多、半程' } },
        { name: '罗马尼亚硬拉', target: '腘绳肌、臀肌', sets: '4组', reps: '8-12次', rest: '90秒', cue: '髋铰链模式，杠铃贴腿下放至腘绳肌拉伸感，背部平直', progress: '增加重量', equipment: '杠铃/哑铃', teach: { warmup: '先活动髋和膝，做几个徒手慢蹲', eccentric: '下蹲/下放阶段慢一点，膝盖对准脚尖', common_error: '膝盖内扣、身体前倾过多、半程' } },
        { name: '腿弯举', target: '腘绳肌', sets: '3组', reps: '10-15次', rest: '60秒', cue: '俯卧，脚踝勾住滚垫，弯曲膝盖至90度，控制还原', progress: '增加重量', equipment: '杠铃/哑铃', teach: { warmup: '先活动髋和膝，做几个徒手慢蹲', eccentric: '下蹲/下放阶段慢一点，膝盖对准脚尖', common_error: '膝盖内扣、身体前倾过多、半程' } },
      ]
    },

    shoulders: {
      name: '肩部',
      icon: 'fas fa-hand-paper',
      home: [
        { name: '墙壁滑臂（Wall Slide）', target: '肩袖、中下斜方、肩胛稳定性', sets: '3组', reps: '10-12次', rest: '60秒', cue: '背贴墙，手臂成W形贴墙，缓慢上滑至Y形，全程不离开墙面', progress: '3组x15次，全程贴墙无代偿', equipment: '椅子/墙面', teach: { warmup: '先做肩绕环和小重量侧平举', eccentric: '下放时控制住，别让重量砸下来', common_error: '耸肩借力、摆动身体、动作太快' } },
        { name: '俯身反向飞鸟', target: '后三角肌、菱形肌', sets: '3组', reps: '12-15次', rest: '60秒', cue: '俯身，手臂自然下垂，向两侧抬起至与肩平，顶峰收缩', progress: '加重量，3组x15次轻松完成', equipment: '徒手', teach: { warmup: '先做肩绕环和小重量侧平举', eccentric: '下放时控制住，别让重量砸下来', common_error: '耸肩借力、摆动身体、动作太快' } },
        { name: 'Pike 俯卧撑', target: '肩部、上胸', sets: '3组', reps: '8-12次', rest: '90秒', cue: '身体成倒V形，头部朝下，下降时头顶向地面靠近', progress: '3组x12次 → 倒立撑（辅助）', equipment: '椅子/墙面', teach: { warmup: '先做肩绕环和小重量侧平举', eccentric: '下放时控制住，别让重量砸下来', common_error: '耸肩借力、摆动身体、动作太快' } },
      ],
      gym: [
        { name: '坐姿哑铃推举', target: '三角肌（前中束）', sets: '3-4组', reps: '8-12次', rest: '90秒', cue: '坐姿，背部贴靠背，哑铃从肩侧推起，不锁死肘部', progress: '4组x12次，核心稳定不晃动 → 站姿推举', equipment: '哑铃/水瓶', teach: { warmup: '先做肩绕环和小重量侧平举', eccentric: '下放时控制住，别让重量砸下来', common_error: '耸肩借力、摆动身体、动作太快' } },
        { name: '站姿杠铃推举', target: '三角肌（前中束）、核心', sets: '4组', reps: '6-10次', rest: '120秒', cue: '站姿，核心收紧，不借力蹬腿，推至头顶上方', progress: '增加重量，注意腰椎不过度前凸', equipment: '杠铃/哑铃', teach: { warmup: '先做肩绕环和小重量侧平举', eccentric: '下放时控制住，别让重量砸下来', common_error: '耸肩借力、摆动身体、动作太快' } },
        { name: '侧平举', target: '三角肌中束', sets: '3-4组', reps: '12-15次', rest: '60秒', cue: '站姿，哑铃从体侧抬起至与肩平，肘微屈，控制还原', progress: '增加重量', equipment: '徒手', teach: { warmup: '先做肩绕环和小重量侧平举', eccentric: '下放时控制住，别让重量砸下来', common_error: '耸肩借力、摆动身体、动作太快' } },
        { name: '面拉（Face Pull）', target: '后三角肌、肩袖', sets: '3组', reps: '15-20次', rest: '60秒', cue: '绳索拉至面部，外旋，肩胛后缩', progress: '改善圆肩的黄金动作', equipment: '绳索', teach: { warmup: '先做肩绕环和小重量侧平举', eccentric: '下放时控制住，别让重量砸下来', common_error: '耸肩借力、摆动身体、动作太快' } },
      ]
    },

    core: {
      name: '核心',
      icon: 'fas fa-circle-notch',
      home: [
        { name: '死虫式（Dead Bug）', target: '腹横肌、核心稳定性', sets: '3组', reps: '10次/侧', rest: '60秒', cue: '仰卧，手臂指向天花板，对侧手脚缓慢伸展，腰部始终贴地', progress: '3组x15次/侧，腰部不抬起', equipment: '徒手', teach: { warmup: '先做几次腹式呼吸，让腰部贴地', eccentric: '还原时慢慢放，别让腰离开地面', common_error: '塌腰、憋气、追求次数不管姿态' } },
        { name: '鸟狗式（Bird Dog）', target: '核心稳定性、下背', sets: '3组', reps: '10次/侧', rest: '60秒', cue: '四足支撑，对侧手脚伸展，身体不旋转，保持2秒', progress: '3组x15次/侧，身体稳定 → 平板支撑', equipment: '徒手', teach: { warmup: '先做几次腹式呼吸，让腰部贴地', eccentric: '还原时慢慢放，别让腰离开地面', common_error: '塌腰、憋气、追求次数不管姿态' } },
        { name: '平板支撑', target: '核心稳定性', sets: '3组', reps: '30-60秒', rest: '60秒', cue: '肘部在肩下方，身体成直线，核心收紧，不塌腰不撅臀', progress: '能保持60秒标准姿势 → 侧平板', equipment: '徒手', teach: { warmup: '先做几次腹式呼吸，让腰部贴地', eccentric: '还原时慢慢放，别让腰离开地面', common_error: '塌腰、憋气、追求次数不管姿态' } },
        { name: '侧平板', target: '侧腹（腹斜肌）', sets: '3组', reps: '20-40秒/侧', rest: '60秒', cue: '单肘支撑，身体成侧面直线，髋部不塌', progress: '每侧40秒稳定 → 悬垂举腿', equipment: '徒手', teach: { warmup: '先做几次腹式呼吸，让腰部贴地', eccentric: '还原时慢慢放，别让腰离开地面', common_error: '塌腰、憋气、追求次数不管姿态' } },
      ],
      gym: [
        { name: '悬垂举腿', target: '下腹、核心', sets: '3组', reps: '8-12次', rest: '90秒', cue: '单杠悬垂，双腿伸直（或屈膝）举至水平，控制下降，不摆动', progress: '增加次数或负重', equipment: '单杠', teach: { warmup: '先做几次腹式呼吸，让腰部贴地', eccentric: '还原时慢慢放，别让腰离开地面', common_error: '塌腰、憋气、追求次数不管姿态' } },
        { name: '绳索卷腹', target: '腹直肌', sets: '3组', reps: '12-15次', rest: '60秒', cue: '跪姿，绳索在头后，卷腹向下，顶峰收缩', progress: '增加重量', equipment: '绳索', teach: { warmup: '先做几次腹式呼吸，让腰部贴地', eccentric: '还原时慢慢放，别让腰离开地面', common_error: '塌腰、憋气、追求次数不管姿态' } },
        { name: 'Pallof Press', target: '抗旋转核心', sets: '3组', reps: '10次/侧', rest: '60秒', cue: '绳索从侧面拉，双手向前推，身体不旋转', progress: '增加重量', equipment: '绳索', teach: { warmup: '先做几次腹式呼吸，让腰部贴地', eccentric: '还原时慢慢放，别让腰离开地面', common_error: '塌腰、憋气、追求次数不管姿态' } },
      ]
    },

    cardio: {
      name: '有氧与体能',
      icon: 'fas fa-heart',
      home: [
        { name: '快走', target: '心肺、脂肪消耗', sets: '1组', reps: '20-40分钟', rest: '-', cue: '心率100-120bpm，能正常说话', progress: '能连续快走40分钟无疲劳 → 走跑交替', equipment: '徒手', teach: { warmup: '先从快走或低强度开始热身 5 分钟', common_error: '一上来就冲强度、呼吸乱、忽视疲劳信号' } },
        { name: '走跑交替', target: '心肺适应', sets: '8-10组', reps: '跑1分钟+走2分钟', rest: '-', cue: '跑的比例逐渐增加', progress: '能连续跑20分钟 → 持续慢跑', equipment: '徒手', teach: { warmup: '先从快走或低强度开始热身 5 分钟', common_error: '一上来就冲强度、呼吸乱、忽视疲劳信号' } },
        { name: '持续慢跑', target: '心肺耐力', sets: '1组', reps: '20-40分钟', rest: '-', cue: '心率120-150bpm，能说短句', progress: '能连续慢跑30分钟 → HIIT', equipment: '徒手', teach: { warmup: '先从快走或低强度开始热身 5 分钟', common_error: '一上来就冲强度、呼吸乱、忽视疲劳信号' } },
        { name: 'HIIT', target: '心肺爆发、后燃效应', sets: '8-15组', reps: '全力20-30秒+休息30-60秒', rest: '30-60秒', cue: '全力冲刺或动作，休息时慢走', progress: '每周不超过2-3次，需要基础心肺', errors: '零基础、关节问题、心血管问题禁忌', equipment: '徒手', teach: { warmup: '先从快走或低强度开始热身 5 分钟', common_error: '一上来就冲强度、呼吸乱、忽视疲劳信号' } },
      ],
      gym: [
        { name: '椭圆机', target: '心肺、低冲击', sets: '1组', reps: '30-45分钟', rest: '-', cue: '阻力中等，心率120-150bpm', progress: '增加阻力或时间', equipment: '固定器械', teach: { warmup: '先从快走或低强度开始热身 5 分钟', common_error: '一上来就冲强度、呼吸乱、忽视疲劳信号' } },
        { name: '划船机', target: '心肺、全身耐力', sets: '1组', reps: '20-30分钟', rest: '-', cue: '腿-核心-手臂顺序发力，控制节奏', progress: '增加距离或强度', equipment: '杠铃/哑铃', teach: { warmup: '先从快走或低强度开始热身 5 分钟', common_error: '一上来就冲强度、呼吸乱、忽视疲劳信号' } },
        { name: '楼梯机', target: '心肺、下肢耐力', sets: '1组', reps: '20-30分钟', rest: '-', cue: '全脚掌踩踏，不扶扶手', progress: '增加速度或时间', equipment: '固定器械', teach: { warmup: '先从快走或低强度开始热身 5 分钟', common_error: '一上来就冲强度、呼吸乱、忽视疲劳信号' } },
      ]
    }
  },

  // ============================================================
  // 四、动作替换速查表
  // ============================================================
  exerciseSubstitutes: [
    { gym: '杠铃卧推', home: '标准/下斜俯卧撑', note: '增加次数放慢离心' },
    { gym: '引体向上', home: '反向划船 + 弹力带', note: '桌子/单杠下方' },
    { gym: '杠铃深蹲', home: '保加利亚分腿蹲', note: '单腿负荷足够' },
    { gym: '硬拉', home: '单腿硬拉（水瓶）', note: '髋铰链模式' },
    { gym: '杠铃划船', home: '俯身哑铃/水瓶划船', note: '增加次数' },
    { gym: '坐姿推举', home: 'Pike 俯卧撑 / 倒立撑（辅助）', note: '侧重肩部' },
    { gym: '腿举', home: '单腿深蹲 / 靠墙静蹲', note: '靠墙静蹲3组x60秒' },
    { gym: '二头弯举', home: '毛巾弯举（脚踩毛巾）', note: '等长收缩' },
    { gym: '三头下压', home: '钻石俯卧撑 / 板凳臂屈伸', note: '椅子双杠臂屈伸' }
  ],

  // ============================================================
  // 五、营养数据
  // ============================================================
  nutrition: {
    calorieAdjust: {
      muscle: { label: '增肌', formula: 'TDEE + 200~300 kcal', desc: '干净增肌，避免过多脂肪' },
      fatloss: { label: '减脂', formula: 'TDEE - 300~500 kcal', desc: '温和缺口，保留肌肉' },
      maintain: { label: '维持', formula: 'TDEE', desc: '维持体重' },
      fast_fatloss: { label: '快速减脂 (BMI>=28)', formula: 'TDEE - 500~750 kcal', desc: '不低于 BMR' }
    },

    minCalories: { male: 1500, female: 1200 },

    macros: {
      muscle: {
        protein: { min: 1.6, max: 2.2, unit: 'g/kg', desc: '增肌期蛋白质范围' },
        fat: { min: 0.8, max: 1.0, unit: 'g/kg', desc: '维持激素水平' },
        carb: { min: 4, max: 6, unit: 'g/kg', desc: '训练能量来源' }
      },
      fatloss: {
        protein: { min: 2.0, max: 2.4, unit: 'g/kg', desc: '减脂期高蛋白保留瘦体重' },
        fat: { min: 0.8, max: 1.0, unit: 'g/kg', desc: '不低于0.7g/kg' },
        carb: { min: 2, max: 4, unit: 'g/kg', desc: '训练日偏高，休息日偏低' }
      },
      maintain: {
        protein: { min: 1.4, max: 1.8, unit: 'g/kg', desc: '维持期蛋白质' },
        fat: { min: 0.8, max: 1.0, unit: 'g/kg', desc: '维持激素水平' },
        carb: { min: 3, max: 5, unit: 'g/kg', desc: '日常能量' }
      }
    },

    meals: [
      {
        name: '早餐', percent: '25-30%', items: [
          '蛋白质：鸡蛋 2-3个 / 牛奶 / 希腊酸奶',
          '碳水：燕麦 / 全麦面包 / 红薯',
          '脂肪：坚果 / 牛油果'
        ], example: '燕麦粥 + 2个水煮蛋 + 一小把坚果'
      },
      {
        name: '午餐', percent: '35-40%', items: [
          '蛋白质：瘦肉 / 鱼 / 鸡胸（一拳大小）',
          '碳水：米饭 / 面（一拳大小）',
          '蔬菜：至少两拳，少油烹饪'
        ], example: '糙米饭 + 香煎鸡胸 + 西兰花 + 胡萝卜'
      },
      {
        name: '晚餐', percent: '25-30%', items: [
          '蛋白质：鱼 / 虾 / 豆腐 / 瘦肉',
          '碳水：可略少（训练日正常，休息日减半）',
          '蔬菜：大量'
        ], example: '杂粮饭半碗 + 清蒸鱼 + 炒时蔬'
      },
      {
        name: '加餐（可选）', percent: '10%', items: [
          '训练前1-2小时：香蕉 + 少量碳水',
          '训练后30分钟内：蛋白质 + 快碳',
          '睡前：酪蛋白 / 牛奶 / 鸡蛋（缓慢吸收）'
        ], example: '蛋白粉 + 香蕉 / 鸡胸 + 米饭'
      }
    ],

    hydration: {
      daily: '30-35ml/kg 体重',
      duringTraining: '每 15-20 分钟 150-200ml',
      afterTraining: '体重每减少 0.5kg，补充 500-750ml',
      indicator: '淡黄色为充足，深黄色需补水'
    },

    supplements: [
      { name: '蛋白粉', desc: '饮食蛋白质不足时补充，方便但非必须' },
      { name: '肌酸', desc: '5g/天，提升力量和爆发力，最安全有效的补剂之一' },
      { name: '咖啡因', desc: '训练前 3-6mg/kg，提升专注和耐力' },
      { name: '维生素D', desc: '日照不足时补充，影响肌肉功能和免疫' }
    ]
  },

  // ============================================================
  // 六、恢复数据
  // ============================================================
  recovery: {
    muscleRecovery: [
      { group: '大肌群（胸、背、腿）', time: '48-72小时', note: '训练量大，恢复慢' },
      { group: '小肌群（肩、臂、小腿）', time: '24-48小时', note: '可较高频率训练' },
      { group: '核心', time: '24-48小时', note: '耐力型，恢复较快' }
    ],

    sleep: {
      duration: '7-9 小时/天',
      trainingDay: '训练日优先保证 8 小时',
      tips: [
        '固定作息时间（包括周末）',
        '睡前 1 小时避免蓝光（手机、电脑）',
        '卧室保持黑暗、凉爽（18-22°C）',
        '睡前避免咖啡因（下午 2 点后不喝咖啡）',
        '睡前避免高强度训练（训练与睡眠间隔至少 2 小时）'
      ],
      sleepDeprivation: [
        '减少训练量 20-30%',
        '降低训练强度（RPE 不超过 7）',
        '优先保证复合动作，减少孤立动作',
        '不安排新动作学习'
      ]
    },

    activeRecovery: [
      { method: '训练后拉伸', detail: '每个目标肌群 20-30秒，2-3组' },
      { method: '泡沫轴放松', detail: '每个部位缓慢滚动 30-60秒，痛点停留 20-30秒' },
      { method: '低强度有氧', detail: '休息日 20-30 分钟快走/慢跑/骑车，心率 50-60% 最大心率' }
    ],

    deload: {
      when: '每 4-8 周训练后安排一次，或出现过度训练信号时',
      method: [
        '训练量减少 40-50%（组数减半）',
        '重量保持或略降（不超过正常的 80%）',
        '次数正常或略减',
        '目的：让神经系统和肌肉充分恢复'
      ],
      example: '正常：深蹲 100kg x 5组 x 5次 → Deload：深蹲 80kg x 2组 x 5次'
    },

    overtrainingSignals: [
      '持续疲劳、睡眠质量下降',
      '训练表现下降（重量、次数减少）',
      '静息心率升高（比平时高 5-10bpm）',
      '免疫力下降（频繁感冒）',
      '情绪低落、易怒',
      '肌肉持续酸痛超过 72 小时'
    ]
  },

  // ============================================================
  // 七、特殊人群适配
  // ============================================================
  specialPopulations: {
    elderly: {
      name: '中老年（50岁以上）',
      adjustments: [
        '强度：RPE 6-7（中等强度），避免极限负重',
        '次数：10-15次/组，以肌耐力和功能为主',
        '组数：2-3组，组间休息 90-120秒',
        '频率：每周 2-3 次力量 + 2-3 次有氧'
      ],
      focus: ['抗阻训练保留肌肉量（尤其下肢）', '平衡训练（单脚站、太极、瑜伽）', '柔韧性训练（每日拉伸）', '低冲击有氧（快走、游泳、骑车）'],
     禁忌: ['避免憋气（Valsalva 动作）', '避免脊柱过度屈曲/旋转', '高血压患者避免头低于心脏的动作', '关节疼痛时立即停止']
    },
    office: {
      name: '久坐办公族',
      problems: ['上交叉综合征：圆肩、驼背、头前伸', '下交叉综合征：骨盆前倾、腰椎过度前凸', '核心无力、髋屈肌紧张、臀肌失忆'],
      priority: ['松解紧张肌群：胸肌、上斜方肌、髂腰肌、竖脊肌', '激活薄弱肌群：中下斜方、菱形肌、臀肌、腹横肌', '整合动作模式：深蹲、划船、硬拉模式', '拉的动作多于推的动作（比例 2:1）'],
      microHabits: ['每 45-60 分钟起身活动 5 分钟', '桌面拉伸：颈部侧屈、肩部环绕、胸肌门框拉伸', '坐姿收腹（腹横肌激活）', '踮脚 / 脚踝环绕']
    },
    postpartum: {
      name: '产后恢复',
      stages: [
        { phase: '产后 0-6 周', advice: '恢复期，仅做呼吸、盆底肌激活和轻柔散步' },
        { phase: '产后 6 周-3 月', advice: '低强度核心 + 有氧，需医生确认后开始' },
        { phase: '产后 3-6 月', advice: '逐步增加力量训练强度' },
        { phase: '产后 6 月后', advice: '可恢复正常训练（根据个人恢复情况）' }
      ],
      principles: ['盆底肌优先：先激活盆底肌，再做其他核心训练', '腹直肌分离评估：2指以内可正常训练', '避免高压动作：卷腹、平板支撑（初期）、跳跃、负重深蹲', '关注呼吸：腹式呼吸，避免憋气'],
      禁忌: ['产后 6 周内禁止任何高强度训练', '腹直肌分离未恢复前禁止卷腹、俄罗斯转体', '哺乳期注意补水和热量摄入（不建议减脂）']
    },
    youth: {
      name: '青少年（12-18岁）',
      principles: ['自重为主：避免大重量极限负重', '全面发展：力量、速度、灵敏、协调、柔韧都要练', '动作模式优先：先学正确动作，再加重量', '趣味性：多样化训练，避免枯燥'],
      禁忌: ['避免大重量 1RM 测试', '避免过度专项化（单一运动全年无休）', '保证充足睡眠（8-10小时）和营养']
    },
    obese: {
      name: '肥胖人群（BMI>=28）',
      adjustments: ['优先保护关节：避免跑步、跳跃等高冲击动作', '从低强度开始：快走、游泳、骑车、椭圆机', '力量训练很重要：保留肌肉，提高基础代谢', '循序渐进：先建立运动习惯，再逐步增加强度'],
      startPlan: ['每周 3 次，每次 30-45 分钟', '力量：坐姿/卧姿器械为主，或自重训练', '有氧：快走 20-30 分钟，心率 110-130bpm', '日常活动：增加步数（目标 8000-10000步/天）']
    }
  },

  // ============================================================
  // 八、进阶判定标准
  // ============================================================
  progressionCriteria: {
    title: '综合进阶判定（四项中满足三项即可进阶）',
    items: [
      { dimension: '容量标准', standard: '能标准完成规定组数 x 次数上限', detail: '如 3组x12次，组间休息达标' },
      { dimension: '质量标准', standard: '动作全程可控，无借力、无代偿、无疼痛', detail: '离心阶段 2-3秒，顶峰收缩 1秒' },
      { dimension: 'RPE 标准', standard: '目标 RPE <= 7（还能再做 3 次以上）', detail: '连续 2 次训练保持' },
      { dimension: '发力感标准', standard: '目标肌群有明确收缩感', detail: '非关节或辅助肌群主导' }
    ],
    progressionAmount: '进阶幅度：重量增加 2.5-5% 或次数增加 1-2 次',
    rpeScale: [
      { rpe: 6, desc: '还能做 4+ 次（很轻松）' },
      { rpe: 7, desc: '还能做 3 次（轻松）' },
      { rpe: 8, desc: '还能做 2 次（中等偏难）' },
      { rpe: 9, desc: '还能做 1 次（困难）' },
      { rpe: 10, desc: '力竭（无法再做一次）' }
    ]
  },

  // ============================================================
  // 九、安全提示
  // ============================================================
  safety: [
    '任何方案前必须确认无急性伤病；有伤病时建议就医',
    '不推荐任何补剂作为必需项；如提及需说明"非必需，均衡饮食优先"',
    '不承诺具体减重/增肌数字，只给健康范围与预期',
    '不制定极端饮食（低于基础代谢、单一食物、断食超过24小时）',
    '高级动作（如大重量深蹲、硬拉、高翻）必须强调动作质量优先，建议有教练指导',
    '出现尖锐疼痛、关节痛或持续超过7天的酸痛，可能是受伤，需就医'
  ],

  // ============================================================
  // 十、时间预算（来源：skill training-systems.md「按时间预算选择」）
  // 原则：经验决定周容量（练多少），天数决定分化与日程（怎么摊）
  // 循证：Schoenfeld 2018 — 容量相等时每周 1 次与 2-3 次效果无显著差异
  // ============================================================
  timeBudget: {
    principle: {
      title: '可用天数决定容量怎么摊，不决定练多少',
      detail: '每周每肌群的总组数由训练经验决定（入门 6-10 组、中级 10-16 组、高级 12-20 组）。天数只决定把这些组数分摊到几次训练：天数少则每次训练量更大、时长更长；天数多则可用更细的分化。容量相等时，训练频率本身不带来额外收益。',
      source: 'Schoenfeld 2018 元分析（容量相等时频率无显著差异）· Schoenfeld 2017（剂量-反应）· ACSM 2026（每周至少 2 次覆盖全肌群，一致性优于复杂性）'
    },

    // 每周训练日的星期分布：3/4/6 天参考 recovery-guide.md，2/5 天按同一「大肌群间隔 48 小时」规则推导
    weekdaysSource: '3/4/6 天安排来自恢复指导；2/5 天按同一肌群恢复间隔规则推导，非文献原文',

    options: [
      {
        days: 2, label: '2 天', hint: '时间很紧',
        split: '全身分化 (Full Body)', weekdays: ['周一', '周四'],
        duration: '60-75min', capacity: '周容量集中在 2 次，单次训练量较大，须保证每次覆盖全身',
        applies: '维持健康、入门；低频时全身分化可保证每周每肌群至少 2 次刺激'
      },
      {
        days: 3, label: '3 天', hint: '经典入门',
        split: '全身分化 (Full Body)', weekdays: ['周一', '周三', '周五'],
        duration: '45-60min', capacity: '周容量分 3 次，动作学习频率高，适合建立基础',
        applies: '增肌入门、力量 5x5'
      },
      {
        days: 4, label: '4 天', hint: '较充裕',
        split: '上下肢分化 (Upper/Lower)', weekdays: ['周一', '周二', '周四', '周五'],
        duration: '60min', capacity: '每次覆盖半身，单肌群组数可提升，组间恢复更充分',
        applies: '增肌中级、减脂'
      },
      {
        days: 5, label: '5 天', hint: '进阶',
        split: '推拉腿 + 补强 (PPL+1)', weekdays: ['周一', '周二', '周三', '周四', '周五'],
        duration: '60-75min', capacity: '主分化 3 天 + 2 天弱项补强，容量上限更高',
        applies: '增肌高级'
      },
      {
        days: 6, label: '6 天', hint: '高频',
        split: '推拉腿 × 2 (PPL)', weekdays: ['周一', '周二', '周三', '周四', '周五', '周六'],
        duration: '60-75min', capacity: '每肌群每周 2 轮刺激，需周期化管理疲劳与 Deload',
        applies: '高级增肌、备赛'
      }
    ],

    // 训练日 focus 模板：按目标 × 可用天数。
    // focus 文案含关键词（全身/推/拉/腿/深蹲/HIIT/循环/矫正），供 app.js 的 getDayExercises 复用选动作。
    // 增肌严格遵循 training-systems.md「按时间预算选择」表；其余目标按该天数摊分其体系要素。
    focusTemplates: {
      muscle: {
        2: ['全身训练 A', '全身训练 B'],
        3: ['全身训练 A', '全身训练 B', '全身训练 A'],
        4: ['上肢日（推+拉+核心）', '下肢日（股四+腘绳+臀+小腿）', '上肢日（推+拉+核心）', '下肢日（股四+腘绳+臀+小腿）'],
        5: ['推日（胸+肩前中束+三头）', '拉日（背+肩后束+二头）', '腿日（股四+腘绳+臀+小腿）', '上肢日（推+拉+核心）', '全身补强'],
        6: ['推日（胸+肩前中束+三头）', '拉日（背+肩后束+二头）', '腿日（股四+腘绳+臀+小腿）', '推日', '拉日', '腿日']
      },
      fatloss: {
        2: ['全身力量训练', 'HIIT 20min 或 稳态有氧 30-45min'],
        3: ['全身力量训练', 'HIIT 20min 或 稳态有氧 30-45min', '全身力量训练'],
        4: ['全身力量训练', '稳态有氧 30-45min', '全身力量训练', 'HIIT 20min'],
        5: ['全身力量训练', '稳态有氧 30-45min', '全身力量训练', 'HIIT 20min', '全身力量训练'],
        6: ['全身力量训练', '稳态有氧 30-45min', '全身力量训练', 'HIIT 20min', '全身力量训练', '稳态有氧 30-45min']
      },
      strength: {
        2: ['深蹲 5x5 + 卧推 5x5 + 硬拉 1x5', '深蹲 5x5 + 推举 5x5 + 硬拉 1x5'],
        3: ['深蹲 5x5 + 卧推 5x5 + 硬拉 1x5', '深蹲 5x5 + 推举 5x5 + 硬拉 1x5', '深蹲 5x5 + 卧推 5x5 + 硬拉 1x5'],
        4: ['深蹲（主项）+ 辅助', '卧推（主项）+ 辅助', '硬拉（主项）+ 辅助', '推举（主项）+ 辅助'],
        5: ['深蹲（主项）+ 辅助', '卧推（主项）+ 辅助', '硬拉（主项）+ 辅助', '推举（主项）+ 辅助', '全身补强（弱项辅助）'],
        6: ['深蹲（主项）+ 辅助', '卧推（主项）+ 辅助', '硬拉（主项）+ 辅助', '推举（主项）+ 辅助', '深蹲 轻量技术日', '卧推 轻量技术日']
      },
      conditioning: {
        2: ['循环训练（5-8动作，3-5轮）', 'HIIT（20-30秒全力 + 30-60秒休息）'],
        3: ['循环训练（5-8动作，3-5轮）', 'HIIT（20-30秒全力 + 30-60秒休息）', '循环训练'],
        4: ['循环训练（5-8动作，3-5轮）', 'HIIT（20-30秒全力 + 30-60秒休息）', '循环训练', 'HIIT'],
        5: ['循环训练（5-8动作，3-5轮）', 'HIIT（20-30秒全力 + 30-60秒休息）', '循环训练', 'HIIT', '循环训练'],
        6: ['循环训练（5-8动作，3-5轮）', 'HIIT（20-30秒全力 + 30-60秒休息）', '循环训练', 'HIIT', '循环训练', 'HIIT']
      },
      posture: {
        2: ['上交叉矫正（松解胸肌/上斜方 + 强化中下斜方/菱形肌）', '下交叉矫正（松解髂腰肌/竖脊肌 + 强化臀肌/腹横肌）'],
        3: ['上交叉矫正（松解胸肌/上斜方 + 强化中下斜方/菱形肌）', '下交叉矫正（松解髂腰肌/竖脊肌 + 强化臀肌/腹横肌）', '整合动作模式（深蹲、划船、推举）'],
        4: ['上交叉矫正（松解胸肌/上斜方 + 强化中下斜方/菱形肌）', '下交叉矫正（松解髂腰肌/竖脊肌 + 强化臀肌/腹横肌）', '整合动作模式（深蹲、划船、推举）', '全身补强（核心稳定）'],
        5: ['上交叉矫正（松解胸肌/上斜方 + 强化中下斜方/菱形肌）', '下交叉矫正（松解髂腰肌/竖脊肌 + 强化臀肌/腹横肌）', '整合动作模式（深蹲、划船、推举）', '上交叉矫正', '下交叉矫正'],
        6: ['上交叉矫正（松解胸肌/上斜方 + 强化中下斜方/菱形肌）', '下交叉矫正（松解髂腰肌/竖脊肌 + 强化臀肌/腹横肌）', '整合动作模式（深蹲、划船、推举）', '上交叉矫正', '下交叉矫正', '整合动作模式']
      }
    }
  },

  // ============================================================
  // 十一、循证依据（来源：skill evidence-base.md，248 行 7 大主题）
  // 结果页展示，供用户核验每个数字的出处；含证据等级与缺失声明
  // ============================================================
  evidence: {
    formulaNote: 'BMI / BMR（Mifflin-St Jeor）/ TDEE / 目标热量为数学公式计算，不是文献结论；其余建议的循证等级如下。',

    levels: [
      { grade: 'A', def: '多项 RCT 或权威机构立场声明', scope: '训练量、蛋白质、ACSM 指南' },
      { grade: 'B', def: '单项 RCT 或高质量系统综述', scope: '睡眠与 MPS、RPE 自动调节' },
      { grade: 'C', def: '观察性研究或专家共识', scope: '产后恢复时间线、特殊人群调整' },
      { grade: 'D', def: '实践经验 / 理论推导', scope: '动作进阶具体数值、发力感判定' }
    ],

    topics: [
      {
        name: '训练量与训练次数', grade: 'A',
        citations: [
          'Schoenfeld BJ, et al. (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis. J Sports Sci, 35(11), 1073-1082. PMID: 27433992',
          'Schoenfeld BJ, et al. (2018). How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis. PMID: 30558493',
          'Schoenfeld BJ, et al. (2022). Resistance Training Variables for Optimization of Muscle Hypertrophy: An Umbrella Review. Front Sports Act Living',
          'ACSM (2026). Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance: Position Stand'
        ],
        findings: '15 项研究 / 390 人：每增加 1 组/周，效应量 +0.023；≤4 组约 5% 增长，10+ 组约 10%。容量相等时每周 1 次与 2-3 次无显著差异。ACSM 2026 基于 137 篇系统综述、30,000+ 参与者，强调每周至少 2 次覆盖全肌群、一致性优于复杂性。',
        applied: '每肌群 6-10 / 10-16 / 12-20 组周容量分档；按可用天数摊分；不推荐 >20-25 组/周'
      },
      {
        name: '蛋白质与营养', grade: 'A',
        citations: [
          'Jäger R, et al. (2017). International Society of Sports Nutrition Position Stand: protein and exercise. JISSN, 14(1), 20. PMC5477153',
          'Morton RW, et al. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. BJSM, 52(6), 376-384'
        ],
        findings: 'Morton 2018 纳入 49 项研究：1.6-2.2 g/kg 体重可最大化肌肥大，超过 2.2 g/kg 无额外显著收益；减脂期高蛋白有助保留瘦体重。ISSN 2017：全天总量与均匀分配优先于训练后精确时机。',
        applied: '增肌 1.6-2.2 g/kg、减脂 2.0-2.4 g/kg、每餐 0.24-0.4 g/kg 均匀分配'
      },
      {
        name: '睡眠与恢复', grade: 'B',
        citations: [
          'Dattilo M, et al. (2020). Antioxidant, anti-inflammatory and immunomodulatory effects of sleep and the relationship with exercise performance. Sports Medicine, 50(1), 89-101. PMID: 31960400',
          'Saner NJ, et al. (2023). Sleep restriction and muscle protein synthesis. J Appl Physiol',
          'Milewski MD, et al. (2014). Chronic lack of sleep is associated with increased sports injuries in adolescent athletes. J Pediatr Orthop'
        ],
        findings: '<7 小时慢性睡眠限制抑制肌肉蛋白合成、睾酮降低、皮质醇升高；<6 小时受伤风险增加 1.7 倍。生长激素 70-80% 在 N3 深睡期分泌。',
        applied: '睡眠 7-9 小时、训练日优先 8 小时；睡眠不足时减量 20-30%'
      },
      {
        name: 'RPE 与进阶判定', grade: 'B',
        citations: [
          'Helms ER, et al. (2016). RPE-based training vs. percentage-based training. JSCR',
          'Zourdos MC, et al. (2019). RPE calibration in resistance training',
          'Steele J, et al. (2017). RIR accuracy in untrained subjects'
        ],
        findings: '常规训练目标 RPE 7-8；新手（<3 月）RIR 估计准确性较低，应以固定次数进阶为主。自动调节进阶比固定百分比进阶力量增长多约 12%（2025, JSCR）。',
        applied: '四维综合进阶判定（容量/质量/RPE/发力感）；新手以固定次数为主'
      },
      {
        name: '特殊人群', grade: 'C',
        citations: [
          'ACOG Committee Opinion No. 804 (2020). Physical Activity and Exercise During Pregnancy and the Postpartum Period',
          'ACSM/AHA (2007, updated). Physical Activity and Public Health in Older Adults. Circulation',
          'AHA Scientific Statement (2023). Resistance Exercise Training in Individuals With and Without Cardiovascular Disease. Circulation'
        ],
        findings: '产后恢复按阶段推进、盆底肌优先、进阶由症状而非单纯时间决定；中老年抗阻训练保留肌肉量、加入平衡训练、避免憋气。',
        applied: '产后 / 中老年 / 久坐 / 青少年 / 肥胖的专属调整与禁忌清单'
      },
      {
        name: '健康变化速度', grade: 'A',
        citations: [
          'ACSM 指南：安全减脂速度为体重的 0.5-1%/周',
          'ISSN：增肌速度因训练经验而异（新手 0.5-1kg/月，中级 0.25-0.5kg/月）'
        ],
        findings: '过快减脂会流失肌肉；增肌速度随训练年限递减。',
        applied: '只给健康范围，不承诺具体数字'
      }
    ],

    // 缺失证据声明（原样保留 evidence-base.md 的诚实边界）
    gaps: [
      '四维进阶判定中「四项满足三项」的阈值为实践经验，无直接研究验证（D 级）',
      '动作进阶路径的难度梯度基于通用训练原则，未针对个体校准（D 级）',
      '特殊人群方案未经过医学专业人士审核（C 级）',
      '居家动作与健身房动作的等效性为近似估计（D 级）',
      '体态矫正、HIIT 组数等部分数值为训练学通识约定，无直接文献'
    ]
  }
};
