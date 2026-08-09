import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Info, Sparkles, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

const tipsData = [
  {
    id: 'week1',
    weeksRange: '0–1',
    titleZh: '第 1 周 (0–7 天)',
    titleEn: 'Week 1 (0–7 Days)',
    ageBadgeZh: '新生儿期 • 0-7天',
    ageBadgeEn: 'Newborn • 0-7 Days',
    summaryZh: '醒来喂奶、按需/按时排班、脐带护理',
    summaryEn: 'Wake to feed, 2-3h schedule, umbilical care',
    feeding: {
      amountZh: '每餐 30–60 mL (1–2 oz)',
      amountEn: '30–60 mL (1–2 oz) per feed',
      freqZh: '每天 8–12 次 / 24小时',
      freqEn: '8–12 feeds / 24h',
      rulesZh: [
        '严格24小时按时喂养：白天黑夜每 2–3 小时唤醒宝宝喂奶。',
        '新生儿胃容量小（如樱桃至核桃大小），少量多次。',
        '初乳/新生儿配方奶，注意喂奶后拍嗝5-10分钟。'
      ],
      rulesEn: [
        'Strict 24/7 schedule: wake baby every 2–3 hours to feed.',
        'Stomach size is tiny (size of a cherry to walnut), feed small amounts frequently.',
        'Colostrum or formula; remember to burp baby 5-10 minutes after feeding.'
      ]
    },
    sleep: {
      wakeWindowZh: '清醒时间：30–45 分钟',
      wakeWindowEn: 'Wake window: 30–45 min',
      napsZh: '白天单次小睡上限：2–2.5 小时（到点唤醒喂奶）',
      napsEn: 'Cap daytime naps at 2–2.5 hours (wake to feed)',
      nightZh: '夜间睡眠：频繁醒来喂奶，总睡眠约 16–18 小时/天',
      nightEn: 'Nighttime: Frequent wake-ups for feeds. Total sleep ~16–18h/day',
      rulesZh: [
        '保持安全睡姿：仰卧睡觉，睡床无软枕无被褥。',
        '分不清昼夜属于正常现象，白天保持自然光线。'
      ],
      rulesEn: [
        'Safe sleep practice: always place baby on back, firm flat surface.',
        'Day/night confusion is normal; keep daytime environment bright.'
      ]
    },
    diaper: {
      countZh: '尿布更换：8–12 次 / 24小时',
      countEn: 'Diaper count: 8–12 / 24h',
      detailsZh: [
        '湿尿布：每天 6–8 片以上。',
        '大便：第1-2天排黑绿色胎便，第3-5天转为黄绿色/金黄色，每天3-4次以上。',
        '建议每次白天喂奶前或喂奶后更换尿布。'
      ],
      detailsEn: [
        'Wet diapers: 6–8+ heavy wet diapers per day.',
        'Stool: Dark meconium transitions to mustard yellow by day 3-5 (3-4+ times/day).',
        'Change diaper with every daytime feeding session.'
      ]
    },
    careTips: {
      itemsZh: [
        '脐带护理：保持脐带残端清洁干燥，脱落前仅擦浴。',
        '趴趴练习（Tummy Time）：可在家长胸口进行 1–2 分钟俯卧体验。',
        '体温监测：保持室内温度 22–24°C，穿衣比大人多一件。'
      ],
      itemsEn: [
        'Umbilical cord care: Keep stump dry and clean. Sponge baths only until cord falls off.',
        'Tummy Time: 1–2 minutes of gentle chest-to-chest tummy time on parent.',
        'Room temperature: Keep comfortable around 20–22°C (68–72°F).'
      ]
    }
  },
  {
    id: 'weeks2_4',
    weeksRange: '2–4',
    titleZh: '第 2–4 周 (半月~1个月)',
    titleEn: 'Weeks 2–4 (0.5–1 Month)',
    ageBadgeZh: '满月准备期 • 2-4周',
    ageBadgeEn: 'Transition • 2-4 Weeks',
    summaryZh: '奶量增加、猛长期频喂、白天控睡',
    summaryEn: 'Increased intake, growth spurt, daytime nap capping',
    feeding: {
      amountZh: '每餐 90–120 mL (3–4 oz)',
      amountEn: '90–120 mL (3–4 oz) per feed',
      freqZh: '每天 8–12 次 / 24小时 (全天总量约 600–750 mL)',
      freqEn: '8–12 feeds / 24h (Total ~600–750 mL/day)',
      rulesZh: [
        '第2-3周常出现第一个猛长期（Growth Spurt），表现为密集求奶（Cluster Feeding）。',
        '按需喂养，注意观察早期饥饿信号（吮手指、转头觅食）。'
      ],
      rulesEn: [
        'First growth spurt usually occurs around weeks 2–3 (cluster feeding is normal).',
        'Feed on demand; watch for early hunger cues (rooting, lip smacking, hand sucking).'
      ]
    },
    sleep: {
      wakeWindowZh: '清醒时间：45–60 分钟',
      wakeWindowEn: 'Wake window: 45–60 min',
      napsZh: '白天：每 2–3 小时唤醒喂奶，单次小睡控制在 2 小时以内',
      napsEn: 'Daytime: Wake to feed every 2–3 hours; cap naps at 2 hours',
      nightZh: '夜间：若体重增长达标，可顺应宝宝睡眠，按需喂奶',
      nightEn: 'Nighttime: If weight gain is healthy, let baby sleep and feed on demand',
      rulesZh: [
        '总睡眠时间约 15–17 小时/天。',
        '建立白天与夜晚的区别：夜间喂奶保持暗光、安静、少互动。'
      ],
      rulesEn: [
        'Total daily sleep around 15–17 hours.',
        'Differentiate day & night: keep night feeds quiet with dim light and minimal interaction.'
      ]
    },
    diaper: {
      countZh: '尿布更换：8–12 次 / 24小时',
      countEn: 'Diaper count: 8–12 / 24h',
      detailsZh: [
        '湿尿布 6–8 片重尿布/天。',
        '母乳宝宝可能每餐后均有大便或数天一次；配方奶宝宝每天 1–3 次。',
        '勤涂护臀膏，预防红屁股（尿布疹）。'
      ],
      detailsEn: [
        '6–8 heavy wet diapers per day.',
        'Breastfed babies may poop after every feed or once every few days; formula 1-3 times daily.',
        'Apply diaper barrier cream proactively to prevent diaper rash.'
      ]
    },
    careTips: {
      itemsZh: [
        '俯卧抬头：在地垫上练习 Tummy Time，每天 2–3 次，每次 3–5 分钟。',
        '肠绞痛/胀气预防：喂奶后充分拍嗝，做排气操、飞机抱。',
        '黑白追视：使用黑白卡在距眼睛 20–30 cm 处吸引视线。'
      ],
      itemsEn: [
        'Tummy time: 3–5 minutes, 2–3 times daily on a firm mat.',
        'Gas pain prevention: Burp thoroughly, practice bicycle legs and tummy massages.',
        'Visual tracking: Use black & white contrast cards 20–30 cm from baby’s face.'
      ]
    }
  },
  {
    id: 'weeks5_8',
    weeksRange: '5–8',
    titleZh: '第 5–8 周 / 第 2 个月',
    titleEn: 'Weeks 5–8 / Month 2',
    ageBadgeZh: '2个月大 • 社交微笑期',
    ageBadgeEn: '2 Months • Social Smiles',
    summaryZh: '社交微笑、夜间大觉延伸、2月疫苗',
    summaryEn: 'Social smiling, longer night sleep stretch, 2m vaccines',
    feeding: {
      amountZh: '每餐 120–150 mL (4–5 oz)',
      amountEn: '120–150 mL (4–5 oz) per feed',
      freqZh: '每天 6–8 次 / 24小时 (全天总量约 720–900 mL)',
      freqEn: '6–8 feeds / 24h (Total ~720–900 mL/day)',
      rulesZh: [
        '第6周前后可能迎来第二次猛长期。',
        '喂奶间隔逐渐延长至 3–4 小时。'
      ],
      rulesEn: [
        'Second growth spurt often occurs around week 6.',
        'Feeding intervals gradually stretch to 3–4 hours.'
      ]
    },
    sleep: {
      wakeWindowZh: '清醒时间：60–90 分钟 (1~1.5小时)',
      wakeWindowEn: 'Wake window: 60–90 min (1-1.5 hours)',
      napsZh: '白天小睡：3–4 次小睡，单次控制在 2 小时内',
      napsEn: 'Daytime naps: 3–4 naps, cap each nap at 2 hours max',
      nightZh: '夜间睡眠：连续睡眠可能延长至 4–5 小时，总睡眠约 14–16 小时',
      nightEn: 'Night sleep: Continuous night stretch expands to 4–5 hours. Total sleep ~14–16h',
      rulesZh: [
        '捕捉睡眠信号：揉眼睛、打哈欠、眼神发呆时及时安抚入睡。',
        '开始建立简短的睡前仪式（洗澡、换衣、抱抱、音乐）。'
      ],
      rulesEn: [
        'Catch sleepy cues early: eye rubbing, yawning, staring off into space.',
        'Establish a simple bedtime routine (bath, diaper, dim lights, lullaby).'
      ]
    },
    diaper: {
      countZh: '尿布更换：6–8 次 / 24小时',
      countEn: 'Diaper count: 6–8 / 24h',
      detailsZh: [
        '湿尿布 6 片以上/天，尿量充沛。',
        '大便规律基本固定，黄色或浅褐色软便。'
      ],
      detailsEn: [
        '6+ heavy wet diapers per day.',
        'Stool pattern stabilizes; soft yellow or light brown consistency.'
      ]
    },
    careTips: {
      itemsZh: [
        '社交互动：出现有意识的社交微笑，发“呜呜/啊啊”的咕咕声（Cooing）。',
        '疫苗接种：按医嘱完成 2 个月体检与常规疫苗。',
        '俯卧能力：Tummy Time 提升至每天 10–15 分钟，胸部可稍微抬离床面。'
      ],
      itemsEn: [
        'Social milestones: First intentional social smile! Cooing sound responses.',
        'Health check: Complete 2-month pediatric checkup and vaccinations.',
        'Tummy time: Increase to 10–15 minutes total daily; baby lifts chest slightly.'
      ]
    }
  },
  {
    id: 'weeks9_12',
    weeksRange: '9–12',
    titleZh: '第 9–12 周 / 第 3 个月',
    titleEn: 'Weeks 9–12 / Month 3',
    ageBadgeZh: '3个月大 • 抓握发声期',
    ageBadgeEn: '3 Months • Grasping & Cooing',
    summaryZh: '手部探索、趴抬头90度、夜眠更稳',
    summaryEn: 'Hand exploration, 90° head lift, stable night sleep',
    feeding: {
      amountZh: '每餐 150–180 mL (5–6 oz)',
      amountEn: '150–180 mL (5–6 oz) per feed',
      freqZh: '每天 5–6 次 / 24小时 (全天总量约 800–950 mL)',
      freqEn: '5–6 feeds / 24h (Total ~800–950 mL/day)',
      rulesZh: [
        '奶量保持稳定，母乳/配方奶仍是唯一营养来源（无需加水或辅食）。',
        '吞咽能力增强，吐奶现象相比前两个月明显减少。'
      ],
      rulesEn: [
        'Milk intake stabilizes; breastmilk/formula is still 100% of nutrition.',
        'Swallowing coordination improves; spit-up frequency decreases.'
      ]
    },
    sleep: {
      wakeWindowZh: '清醒时间：75–120 分钟 (1.25~2小时)',
      wakeWindowEn: 'Wake window: 75–120 min (1.25–2 hours)',
      napsZh: '白天小睡：3–4 次小睡',
      napsEn: 'Daytime naps: 3–4 naps per day',
      nightZh: '夜间连续睡眠可达 5–6 小时，总睡眠约 14–15 小时/天',
      nightEn: 'Night sleep stretch can reach 5–6 hours. Total sleep ~14–15h/day',
      rulesZh: [
        '尝试培养“醒着放在床上”自愈入睡（Drowsy but awake）。',
        '夜晚最后一次喂奶后保持安静环境。'
      ],
      rulesEn: [
        'Try putting baby down "drowsy but awake" to practice self-soothing.',
        'Keep environment peaceful during late evening cluster feeds.'
      ]
    },
    diaper: {
      countZh: '尿布更换：6–8 次 / 24小时',
      countEn: 'Diaper count: 6–8 / 24h',
      detailsZh: [
        '每天 6 片以上沉沉的湿尿布。',
        '排便次数可能变少（母乳宝宝几天一次亦属正常，只要大便松软且体重增长良好）。'
      ],
      detailsEn: [
        '6+ heavy wet diapers per day.',
        'Stool frequency may decrease (breastfed babies going days between bowel movements is normal if stool remains soft).'
      ]
    },
    careTips: {
      itemsZh: [
        '抬头与支撑：俯卧时能稳定抬头 45~90 度，前臂支撑身体。',
        '手部发现：吃手、吃拳头、尝试抓握悬挂玩具，手眼协调开启。',
        '互动练习：多与宝宝对话，模仿宝宝的发音，朗读绘本。'
      ],
      itemsEn: [
        'Head control: Lifts head & chest up to 90 degrees during tummy time supported by forearms.',
        'Hand discovery: Sucks on hands/fingers, reaches and bats at hanging toys.',
        'Parent engagement: Talk frequently, mirror baby’s sounds, read board books.'
      ]
    }
  },
  {
    id: 'weeks13_16',
    weeksRange: '13–16',
    titleZh: '第 13–16 周 / 第 4 个月',
    titleEn: 'Weeks 13–16 / Month 4',
    ageBadgeZh: '4个月大 • 翻身与倒退期',
    ageBadgeEn: '4 Months • Rolling & Sleep Regression',
    summaryZh: '4月睡眠倒退、翻身动作、戒防惊跳包巾',
    summaryEn: '4m sleep regression, rolling over, stop swaddling',
    feeding: {
      amountZh: '每餐 180–210 mL (6–7 oz)',
      amountEn: '180–210 mL (6–7 oz) per feed',
      freqZh: '每天 5–6 次 / 24小时 (全天总量约 850–1000 mL)',
      freqEn: '5–6 feeds / 24h (Total ~850–1000 mL/day)',
      rulesZh: [
        '宝宝开始对周围环境极度好奇，喂奶时容易分心。',
        '建议在安静、光线较暗的房间喂奶，减少干扰。'
      ],
      rulesEn: [
        'Baby becomes easily distracted by surroundings while feeding.',
        'Feed in a quiet, dimly lit room to minimize outer noise.'
      ]
    },
    sleep: {
      wakeWindowZh: '清醒时间：90–120 分钟 (1.5~2小时)',
      wakeWindowEn: 'Wake window: 90–120 min (1.5–2 hours)',
      napsZh: '白天小睡：3 次小睡（早睡、午睡、傍晚小憩）',
      napsEn: 'Daytime naps: 3 naps (morning, afternoon, late afternoon catnap)',
      nightZh: '夜间睡眠：可能经历 4个月睡眠倒退期（睡眠模式成熟，频繁夜醒）',
      nightEn: 'Night sleep: 4-month sleep regression may occur (sleep structure matures, frequent waking)',
      rulesZh: [
        '【重要安全提醒】一旦宝宝表现出翻身迹象，必须立即停止使用襁褓包巾（Swaddle），改用睡袋！',
        '保持耐心，睡眠倒退通常持续 2–4 周。'
      ],
      rulesEn: [
        '【CRITICAL SAFETY】STOP swaddling immediately once baby shows signs of rolling over; switch to a wearable sleep sack!',
        'Stay consistent; sleep regression typically lasts 2–4 weeks.'
      ]
    },
    diaper: {
      countZh: '尿布更换：5–6 次 / 24小时',
      countEn: 'Diaper count: 5–6 / 24h',
      detailsZh: [
        '每天 5–6 片沉沉的湿尿布。',
        '随着活动量加大，注意及时更换，保持干爽。'
      ],
      detailsEn: [
        '5–6 heavy wet diapers per 24 hours.',
        'Change promptly as mobility increases to maintain skin dryness.'
      ]
    },
    careTips: {
      itemsZh: [
        '大动作发育：开始尝试从仰卧翻到俯卧（或俯卧翻到仰卧）。',
        '疫苗接种：按时完成 4 个月体检与疫苗。',
        '语言与表情：大声发出“咯咯”笑声，能根据声音方向转头。'
      ],
      itemsEn: [
        'Motor skills: Attempts rolling (back-to-front or front-to-back).',
        'Health check: Complete 4-month pediatric checkup & vaccinations.',
        'Social & Speech: Laughs out loud, turns head towards voices.'
      ]
    }
  },
  {
    id: 'weeks17_20',
    weeksRange: '17–20',
    titleZh: '第 17–20 周 / 第 5 个月',
    titleEn: 'Weeks 17–20 / Month 5',
    ageBadgeZh: '5个月大 • 靠坐与观察期',
    ageBadgeEn: '5 Months • Supported Sitting',
    summaryZh: '双向翻身、靠坐探索、辅食准备观察',
    summaryEn: 'Two-way rolling, supported sitting, solid food cues',
    feeding: {
      amountZh: '每餐 180–210 mL (6–7 oz)',
      amountEn: '180–210 mL (6–7 oz) per feed',
      freqZh: '每天 4–5 次 / 24小时 (全天总量约 850–1000 mL)',
      freqEn: '4–5 feeds / 24h (Total ~850–1000 mL/day)',
      rulesZh: [
        '母乳/奶粉仍是主要营养来源。',
        '观察辅食准备信号：挺舌反射消失、头部稳定、对大人食物表现出强烈兴趣、能在扶持下坐稳。',
        '儿基会/AAP建议满 6 个月（24周）后再添加辅食。'
      ],
      rulesEn: [
        'Milk remains the primary source of nutrition.',
        'Watch for solid readiness cues: good head control, sitting with support, showing keen interest in food.',
        'AAP/WHO recommends exclusive milk feeding until ~6 months (24 weeks).'
      ]
    },
    sleep: {
      wakeWindowZh: '清醒时间：105–150 分钟 (1.75~2.5小时)',
      wakeWindowEn: 'Wake window: 105–150 min (1.75–2.5 hours)',
      napsZh: '白天小睡：3 次小睡，总睡眠约 13.5–14.5 小时/天',
      napsEn: 'Daytime naps: 3 naps per day. Total daily sleep ~13.5–14.5 hours',
      nightZh: '夜间睡眠：夜间连续睡眠可达 6–8 小时（夜奶 1-2 次）',
      nightEn: 'Night sleep: Continuous stretch can reach 6–8 hours (1-2 night feeds)',
      rulesZh: [
        '傍晚小憩（第3次小睡）控制在 30-45 分钟以内，避免影响夜晚入睡。'
      ],
      rulesEn: [
        'Keep late afternoon catnap short (30-45 min max) to avoid bedtime resistance.'
      ]
    },
    diaper: {
      countZh: '尿布更换：5–6 次 / 24小时',
      countEn: 'Diaper count: 5–6 / 24h',
      detailsZh: [
        '每天 5–6 片湿尿布。',
        '排便规律稳定。'
      ],
      detailsEn: [
        '5–6 wet diapers per 24 hours.',
        'Regular bowel movement routine.'
      ]
    },
    careTips: {
      itemsZh: [
        '大动作：能灵活向双侧翻身，双手向前支撑成三脚架坐姿（Tripod sit）。',
        '精细动作：双手能精准抓握玩具并传手（左手换到右手），喜欢抓脚玩。',
        '互动游戏：做“躲猫猫”（Peek-a-boo）游戏，反应热烈。'
      ],
      itemsEn: [
        'Gross motor: Rolls both ways smoothly; tripod sits with hand support.',
        'Fine motor: Transfers objects between hands; discovers and plays with feet.',
        'Interactive play: Loves playing Peek-a-boo and laughing at silly expressions.'
      ]
    }
  },
  {
    id: 'weeks21_26',
    weeksRange: '21–26',
    titleZh: '第 21–26 周 / 第 6 个月',
    titleEn: 'Weeks 21–26 / Month 6',
    ageBadgeZh: '6个月大 • 辅食启蒙与独立坐',
    ageBadgeEn: '6 Months • Solids & Solo Sitting',
    summaryZh: '引入辅食、独坐片刻、出牙护齿、6月体检',
    summaryEn: 'Introducing solids, brief sitting, teething care',
    feeding: {
      amountZh: '每餐 210–240 mL (7–8 oz) 奶量',
      amountEn: '210–240 mL (7–8 oz) milk per feed',
      freqZh: '每天 4–5 次奶 + 1 次辅食尝鲜 (全天奶量保持 700–900 mL)',
      freqEn: '4–5 milk feeds + 1 solid tasting meal/day (Maintain 700–900 mL milk)',
      rulesZh: [
        '【满6个月添加辅食】：优先选择富含铁的单一食材（高铁米粉、泥状牛肉、泥状胡萝卜/南瓜/牛油果）。',
        '遵循“由少到多、由稀到稠、单一添加观察 3 天”原则，排查过敏。',
        '一岁以内禁止添加食盐、糖、蜂蜜及鲜牛奶！奶类仍是主食。'
      ],
      rulesEn: [
        '【Solids Introduction at 6m】 Start single-ingredient iron-rich purees (iron-fortified rice cereal, pureed beef, pumpkin, avocado).',
        'Introduce one new food at a time; wait 3 days to test for food allergies.',
        'NO added salt, sugar, honey, or cow’s milk under 12 months! Milk remains primary nutrition.'
      ]
    },
    sleep: {
      wakeWindowZh: '清醒时间：120–180 分钟 (2~3小时)',
      wakeWindowEn: 'Wake window: 120–180 min (2–3 hours)',
      napsZh: '白天小睡：逐步过渡到 2–3 次小睡',
      napsEn: 'Daytime naps: Gradually transitioning to 2–3 naps daily',
      nightZh: '夜间睡眠：连续睡眠 8–10 小时（0–1 次夜奶），总睡眠约 13–14 小时/天',
      nightEn: 'Night sleep: 8–10 continuous hours (0–1 night feed). Total sleep ~13–14h/day',
      rulesZh: [
        '逐渐固定早睡与午睡时间点。'
      ],
      rulesEn: [
        'Schedule more consistent morning and afternoon nap routines.'
      ]
    },
    diaper: {
      countZh: '尿布更换：5–6 次 / 24小时',
      countEn: 'Diaper count: 5–6 / 24h',
      detailsZh: [
        '每天 5–6 片湿尿布。',
        '【大便变化】：吃辅食后大便颜色变深、变得粘稠有型、气味变浓，属于正常生理现象。'
      ],
      detailsEn: [
        '5–6 wet diapers per 24 hours.',
        '【Stool Changes】: Stool becomes firmer, darker, and stronger in odor after solid food introduction.'
      ]
    },
    careTips: {
      itemsZh: [
        '独坐能力：不需支撑能短暂独坐数秒至数分钟。',
        '出牙期护理：可能开始萌出下门牙（流口水、咬人、牙龈肿胀），可给冰凉牙胶安抚。',
        '6个月体检：完成 6 个月儿保体检与疫苗接种（检测血红蛋白排查贫血）。',
        '家居安全：宝宝活动范围扩大，注意清理地板小物品，做好桌角防撞。'
      ],
      itemsEn: [
        'Sitting: Can sit unsupported briefly for a few seconds to minutes.',
        'Teething care: Lower central incisors may erupt (drooling, gnawing); provide chilled teethers.',
        'Health check: Complete 6-month wellness visit, vaccines, and hemoglobin screen.',
        'Babyproofing: Keep small objects off floors; cushion sharp furniture edges.'
      ]
    }
  }
];

export default function NewbornTips({ lang }) {
  // Store expanded state for each stage ID
  const [expandedStages, setExpandedStages] = useState({
    week1: true,
    weeks2_4: false,
    weeks5_8: false,
    weeks9_12: false,
    weeks13_16: false,
    weeks17_20: false,
    weeks21_26: false,
  });

  const [selectedFilterStage, setSelectedFilterStage] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleStage = (id) => {
    setExpandedStages((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    tipsData.forEach((item) => {
      allExpanded[item.id] = true;
    });
    setExpandedStages(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed = {};
    tipsData.forEach((item) => {
      allCollapsed[item.id] = false;
    });
    setExpandedStages(allCollapsed);
  };

  const filteredData = tipsData.filter((item) => {
    // Stage filter pill
    if (selectedFilterStage !== 'all' && item.id !== selectedFilterStage) {
      return false;
    }
    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const textToSearch = [
      item.titleZh, item.titleEn,
      item.summaryZh, item.summaryEn,
      item.feeding.amountZh, item.feeding.amountEn,
      item.sleep.wakeWindowZh, item.sleep.wakeWindowEn,
      ...item.feeding.rulesZh, ...item.feeding.rulesEn,
      ...item.sleep.rulesZh, ...item.sleep.rulesEn,
      ...item.careTips.itemsZh, ...item.careTips.itemsEn,
    ].join(' ').toLowerCase();

    return textToSearch.includes(q);
  });

  const isZh = lang === 'zh';

  return (
    <div className="tips-container">
      {/* Header Banner */}
      <div className="glass-panel tips-header-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="tips-header-icon">
            <BookOpen size={24} color="#8b5cf6" />
          </div>
          <div>
            <h2 className="tips-main-title">
              {isZh ? '0–26周 新生儿育儿指南' : '0–26 Weeks Newborn Care Tips'}
            </h2>
            <p className="tips-subtitle">
              {isZh ? '科学参考 • 喂养 / 睡眠 / 排泄 / 护理里程碑' : 'Evidence-based reference for feeding, sleep, diaper & care'}
            </p>
          </div>
        </div>

        {/* Search bar & Controls */}
        <div className="tips-controls">
          <div className="tips-search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="input-field tips-search-input"
              placeholder={isZh ? '搜索关键字 (例: 30-60ml, 翻身, 醒着睡, 辅食)...' : 'Search tips (e.g. wake window, rolling, solids)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="glass-button tips-small-btn" onClick={expandAll}>
              <ChevronDown size={14} />
              {isZh ? '展开全部' : 'Expand All'}
            </button>
            <button className="glass-button tips-small-btn" onClick={collapseAll}>
              <ChevronUp size={14} />
              {isZh ? '折叠全部' : 'Collapse All'}
            </button>
          </div>
        </div>

        {/* Stage Filter Quick Pills */}
        <div className="stage-pills-scroll">
          <button
            className={`stage-pill ${selectedFilterStage === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilterStage('all')}
          >
            {isZh ? '全部阶段 (0-26周)' : 'All (0–26w)'}
          </button>
          {tipsData.map((stage) => (
            <button
              key={stage.id}
              className={`stage-pill ${selectedFilterStage === stage.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedFilterStage(stage.id);
                // Automatically expand the selected stage if it's currently collapsed
                setExpandedStages((prev) => ({ ...prev, [stage.id]: true }));
              }}
            >
              {isZh ? stage.titleZh.split(' ')[0] + ' ' + stage.titleZh.split(' ')[1] : stage.titleEn.split(' ')[0] + ' ' + stage.titleEn.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion List */}
      <div className="tips-accordion-list">
        {filteredData.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <Info size={32} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
            <p>{isZh ? '未找到相关育儿指南内容' : 'No care recommendations match your search.'}</p>
          </div>
        ) : (
          filteredData.map((item) => {
            const isExpanded = !!expandedStages[item.id];
            return (
              <div key={item.id} className={`glass-panel stage-card ${isExpanded ? 'is-open' : ''}`}>
                {/* Accordion Header */}
                <div className="stage-card-header" onClick={() => toggleStage(item.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <span className="stage-weeks-badge">{item.weeksRange} {isZh ? '周' : 'W'}</span>
                    <div style={{ minWidth: 0 }}>
                      <h3 className="stage-card-title">
                        {isZh ? item.titleZh : item.titleEn}
                      </h3>
                      <p className="stage-card-summary">
                        {isZh ? item.summaryZh : item.summaryEn}
                      </p>
                    </div>
                  </div>

                  <button className="stage-expand-btn" aria-label="Toggle stage details">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="stage-card-body">
                    <div className="stage-meta-bar">
                      <span className="badge badge-activity">
                        <Sparkles size={12} /> {isZh ? item.ageBadgeZh : item.ageBadgeEn}
                      </span>
                    </div>

                    {/* Section 1: Feeding */}
                    <div className="tip-section feeding-section">
                      <div className="tip-section-header">
                        <span className="badge badge-feeding">🍼 {isZh ? '喂养 Guidance' : 'Feeding Guidance'}</span>
                      </div>
                      <div className="tip-highlight-grid">
                        <div className="highlight-box">
                          <span className="hl-label">{isZh ? '单次奶量 Intake' : 'Amount / Feed'}</span>
                          <span className="hl-value hl-feeding">
                            {isZh ? item.feeding.amountZh : item.feeding.amountEn}
                          </span>
                        </div>
                        <div className="highlight-box">
                          <span className="hl-label">{isZh ? '喂奶频次 Frequency' : '24h Frequency'}</span>
                          <span className="hl-value">
                            {isZh ? item.feeding.freqZh : item.feeding.freqEn}
                          </span>
                        </div>
                      </div>
                      <ul className="tip-bullet-list">
                        {(isZh ? item.feeding.rulesZh : item.feeding.rulesEn).map((rule, idx) => (
                          <li key={idx} className="tip-bullet-item">
                            <CheckCircle2 size={15} className="bullet-icon feeding-icon" />
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Section 2: Sleep */}
                    <div className="tip-section sleep-section">
                      <div className="tip-section-header">
                        <span className="badge badge-sleep">😴 {isZh ? '睡眠 Guidance' : 'Sleep Guidance'}</span>
                      </div>
                      <div className="tip-highlight-grid">
                        <div className="highlight-box">
                          <span className="hl-label">{isZh ? '清醒窗口 Wake Window' : 'Wake Window'}</span>
                          <span className="hl-value hl-sleep">
                            {isZh ? item.sleep.wakeWindowZh : item.sleep.wakeWindowEn}
                          </span>
                        </div>
                        <div className="highlight-box">
                          <span className="hl-label">{isZh ? '白天控睡 / 夜眠' : 'Naps & Night Sleep'}</span>
                          <span className="hl-value">
                            {isZh ? item.sleep.napsZh : item.sleep.napsEn}
                          </span>
                        </div>
                      </div>
                      <p className="tip-text-sub">
                        <strong>{isZh ? '夜间睡眠与总计:' : 'Nighttime & Total:'}</strong> {isZh ? item.sleep.nightZh : item.sleep.nightEn}
                      </p>
                      <ul className="tip-bullet-list">
                        {(isZh ? item.sleep.rulesZh : item.sleep.rulesEn).map((rule, idx) => (
                          <li key={idx} className="tip-bullet-item">
                            <CheckCircle2 size={15} className="bullet-icon sleep-icon" />
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Section 3: Diaper */}
                    <div className="tip-section diaper-section">
                      <div className="tip-section-header">
                        <span className="badge badge-diaper">👶 {isZh ? '排泄与尿布 Diapers' : 'Diapers & Elimination'}</span>
                      </div>
                      <div className="highlight-box single-hl">
                        <span className="hl-label">{isZh ? '24小时更换 Frequency' : 'Daily Replacement'}</span>
                        <span className="hl-value hl-diaper">
                          {isZh ? item.diaper.countZh : item.diaper.countEn}
                        </span>
                      </div>
                      <ul className="tip-bullet-list">
                        {(isZh ? item.diaper.detailsZh : item.diaper.detailsEn).map((detail, idx) => (
                          <li key={idx} className="tip-bullet-item">
                            <CheckCircle2 size={15} className="bullet-icon diaper-icon" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Section 4: Care & Milestones */}
                    <div className="tip-section care-section">
                      <div className="tip-section-header">
                        <span className="badge badge-health">💡 {isZh ? '发育与护理要点 Milestones' : 'Care & Milestones'}</span>
                      </div>
                      <ul className="tip-bullet-list">
                        {(isZh ? item.careTips.itemsZh : item.careTips.itemsEn).map((care, idx) => (
                          <li key={idx} className="tip-bullet-item">
                            <CheckCircle2 size={15} className="bullet-icon health-icon" />
                            <span>{care}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
