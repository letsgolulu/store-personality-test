export const DIMENSIONS = ["E", "O", "S", "W", "A", "R"] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export type Question = {
  id: number;
  text: string;
  dimension: Dimension;
  reverse?: boolean;
};

export type StoreProfile = {
  id: string;
  name: string;
  emoji: string;
  kicker: string;
  quote: string;
  tags: [string, string, string];
  palette: [string, string, string];
  prototype: Record<Dimension, number>;
  analysis: string[];
  strength: string;
  misunderstood: string;
  lesson: string;
  rule: string;
};

export type AssessmentOutcome = {
  primaryId: string;
  secondaryId: string;
  scores: Record<Dimension, number>;
};

export const dimensionMeta: Record<Dimension, { name: string; short: string; low: string; high: string }> = {
  E: { name: "联结倾向", short: "联结", low: "独处蓄能", high: "主动联结" },
  O: { name: "探索审美", short: "探索", low: "熟悉实用", high: "新奇审美" },
  S: { name: "秩序稳定", short: "秩序", low: "灵活即兴", high: "规划稳定" },
  W: { name: "关系温度", short: "温度", low: "理性清晰", high: "共情照料" },
  A: { name: "自主边界", short: "边界", low: "协同依存", high: "独立自主" },
  R: { name: "刺激节奏", short: "节奏", low: "安静慢速", high: "密集鲜活" },
};

export const questions: Question[] = [
  { id: 1, dimension: "E", text: "周末突然空出半天，我通常会主动约人，而不是等别人来找我。" },
  { id: 2, dimension: "O", text: "面对季节限定或从没尝试过的菜，我愿意承担“踩雷”的可能点一次。" },
  { id: 3, dimension: "S", text: "去陌生地点之前，我通常会确认路线、营业时间以及是否需要预约。" },
  { id: 4, dimension: "W", text: "朋友情绪低落时，我倾向于先听对方讲完，再讨论解决办法。" },
  { id: 5, dimension: "A", text: "集体旅行中，即使大家关系很好，我也希望留一段完全自由的时间。" },
  { id: 6, dimension: "R", text: "一天连续安排几场活动，常常让我兴奋，而不是迅速被掏空。" },
  { id: 7, dimension: "E", text: "在只认识主人的聚会上，我通常能主动找到一个人开始聊天。" },
  { id: 8, dimension: "O", text: "一家店的灯光、气味、音乐和陈列，会明显影响我愿不愿意留下。" },
  { id: 9, dimension: "S", text: "开始重要工作前，我往往想先整理桌面、资料或待办事项。" },
  { id: 10, dimension: "W", text: "大家一起选餐厅时，我会留意那个一直没说话的人是否有不同意见。" },
  { id: 11, dimension: "A", text: "即使很多人推荐同一个热门选择，我仍会按照自己的判断决定。" },
  { id: 12, dimension: "R", reverse: true, text: "对我来说，理想周末通常是不排满日程，让时间慢慢流过去。" },
  { id: 13, dimension: "E", reverse: true, text: "独处一整天之后，我通常感觉充电完成，而不是迫切想找人说话。" },
  { id: 14, dimension: "O", reverse: true, text: "购买日常用品时，我通常认为实用性远比设计、故事或风格重要。" },
  { id: 15, dimension: "S", reverse: true, text: "原定计划临时改变时，我通常能迅速切换，并享受意料之外的安排。" },
  { id: 16, dimension: "W", reverse: true, text: "当朋友反复倾诉同一个问题却迟迟不行动时，我容易失去耐心。" },
  { id: 17, dimension: "A", text: "即使事情不大，别人突然要求我“马上回复”，也会让我想夺回自己的节奏。" },
  { id: 18, dimension: "R", text: "热闹的市集、热门展览或人声嘈杂的店铺，有时反而会提升我的兴致。" },
  { id: 19, dimension: "E", text: "发现一家很喜欢的店时，我最先想到的通常是下次带谁一起来。" },
  { id: 20, dimension: "O", text: "我愿意为了小型展览、老街或一家特别的小店临时绕路。" },
  { id: 21, dimension: "S", text: "邀请朋友来家里时，我通常会提前考虑食物、座位和其他细节。" },
  { id: 22, dimension: "W", text: "朋友需要陪伴但时间不太方便时，只要条件允许，我会调整自己的安排。" },
  { id: 23, dimension: "A", text: "团队合作时，我更喜欢拥有一块能由自己完整决定和负责的工作。" },
  { id: 24, dimension: "R", reverse: true, text: "相比热闹的多人聚会，我更享受和一个人进行很长、很深入的交谈。" },
  { id: 25, dimension: "E", reverse: true, text: "群聊非常热闹时，我经常只是阅读，很少主动加入。" },
  { id: 26, dimension: "O", reverse: true, text: "旅行时，完成预先计划好的景点，会比偶然发现一家小店更让我满足。" },
  { id: 27, dimension: "S", reverse: true, text: "即使任务很重要，我也常常要等到截止日期接近才集中完成。" },
  { id: 28, dimension: "W", reverse: true, text: "发生矛盾时，我通常更想先厘清事实和解决问题，情绪安抚可以稍后进行。" },
  { id: 29, dimension: "A", reverse: true, text: "如果一个决定对我并不重要，我很乐意直接跟随大家的选择。" },
  { id: 30, dimension: "R", text: "生活平稳了一段时间后，我会主动寻找新的活动或刺激。" },
  { id: 31, dimension: "E", text: "旅行时，和店员、司机或当地人聊上几句，常常是体验的一部分。" },
  { id: 32, dimension: "O", text: "即使暂时用不上，我也会收藏那些设计或理念很打动我的店铺和物品。" },
  { id: 33, dimension: "S", text: "固定的习惯和熟悉的路线带给我的通常是安心，而不是束缚。" },
  { id: 34, dimension: "W", text: "相比完全匿名的服务，我更容易留恋那些记得我偏好的店。" },
  { id: 35, dimension: "A", reverse: true, text: "做重要决定时，如果没有信任的人确认，我常常很难真正安心。" },
  { id: 36, dimension: "R", text: "旅行中连续换几个地点，通常比在一个地方慢慢待上一天更让我满足。" },
];

export const storeProfiles: StoreProfile[] = [
  {
    id: "night-convenience",
    name: "深夜便利店",
    emoji: "☾",
    kicker: "可靠而温柔的守夜人",
    quote: "我不一定最耀眼，但总有人在很晚的时候想起我。",
    tags: ["可靠响应", "细节照料", "稳定在场"],
    palette: ["#24314f", "#ffbb83", "#f9ead7"],
    prototype: { E: 1, O: 0, S: 2, W: 2, A: -1, R: 1 },
    analysis: [
      "你习惯用可靠、及时和“我在这里”表达关心。别人真正信任你的原因，往往不是你说了多漂亮的话，而是你记得细节，也很少在重要时刻掉线。",
      "你较高的关系温度与秩序感，让你容易从“被需要”中获得价值感。但随时有空不等于关系亲密，被依赖也不完全等于被爱。真正稳定的关系允许你暂停营业。",
    ],
    strength: "让混乱重新恢复正常",
    misunderstood: "看起来什么都能承受",
    lesson: "在照顾别人之前，先确认自己的余量",
    rule: "可以温柔，但不必24小时营业。",
  },
  {
    id: "corner-cafe",
    name: "街角咖啡馆",
    emoji: "☕",
    kicker: "让关系慢慢升温的人",
    quote: "我喜欢热闹，但更喜欢能坐下来好好说话的热闹。",
    tags: ["温暖联结", "松弛氛围", "深度交流"],
    palette: ["#6f4b3e", "#dca66f", "#fff3df"],
    prototype: { E: 1, O: 1, S: 0, W: 2, A: 0, R: -1 },
    analysis: [
      "你并不排斥社交，只是不喜欢没有温度的社交。相比成为人群中心，你更擅长营造一种让人放松、愿意多坐一会儿的氛围。",
      "外向并不等于一直讲话，它也可以表现为主动建立和维持联系。你的盲点是为了保持舒服的气氛，偶尔会把自己的不满说得太晚。",
    ],
    strength: "把普通见面变成真正的交流",
    misunderstood: "好相处，所以没有脾气",
    lesson: "和谐不应以压低自己的声音为代价",
    rule: "欢迎所有情绪，包括你自己的。",
  },
  {
    id: "indie-bookstore",
    name: "独立书店",
    emoji: "⌑",
    kicker: "安静却辽阔的思考者",
    quote: "我不追赶人群，只收藏那些让我变得更完整的句子。",
    tags: ["独立思考", "意义驱动", "低调深刻"],
    palette: ["#29443d", "#c88e60", "#f2eadf"],
    prototype: { E: -1, O: 2, S: 1, W: 0, A: 2, R: -2 },
    analysis: [
      "你需要意义感胜过即时热闹。你会通过阅读、思考、筛选和长期兴趣建立自己的精神坐标，不容易因为“大家都喜欢”而改变判断。",
      "高探索倾向让你善于理解复杂观点，高自主性让你珍视独立思考。但自主并不等于隔绝，你的课题是让值得信任的人知道如何进入你的内心。",
    ],
    strength: "发现事物背后的结构和意义",
    misunderstood: "安静、疏离、要求高",
    lesson: "不要等到完全想明白才表达",
    rule: "沉默可以保护你，也可能隐藏你。",
  },
  {
    id: "rainy-records",
    name: "雨天唱片行",
    emoji: "♪",
    kicker: "听得见生活背景音的人",
    quote: "我不是情绪太多，只是能听见生活里的背景音乐。",
    tags: ["细腻感受", "自由表达", "审美共振"],
    palette: ["#38364f", "#8aa0c6", "#efe8dc"],
    prototype: { E: -1, O: 2, S: -1, W: 1, A: 2, R: -2 },
    analysis: [
      "你对氛围、语气和细微变化十分敏感。别人只看到一场雨，你可能同时感受到光线、气味、记忆和某段旋律。",
      "这种开放性带来审美、创造力与共情，但较低的结构偏好也可能让行动依赖状态。灵感不需要被控制，却需要一个可以落地的容器。",
    ],
    strength: "把难以言说的感受变成表达",
    misunderstood: "情绪化、想得太多",
    lesson: "给灵感设置一个足够小的行动步骤",
    rule: "不必等心情完美才开始播放。",
  },
  {
    id: "weekend-florist",
    name: "周末花店",
    emoji: "✿",
    kicker: "把在意变成细节的人",
    quote: "我擅长把普通日子，照料成值得纪念的样子。",
    tags: ["审美照料", "温柔细节", "仪式感"],
    palette: ["#476b55", "#e8a59c", "#fff0e6"],
    prototype: { E: 0, O: 2, S: 1, W: 2, A: 0, R: -1 },
    analysis: [
      "你会通过审美和细节表达在意。你记得颜色、纪念日以及别人随口说过的偏好，也愿意为关系创造仪式感。",
      "探索审美与关系温度，让你很容易发现“什么会让生活更好一点”。只是你有时只顾修剪外部世界，却忽略了自己已经缺水。",
    ],
    strength: "把关心变成能被感受到的细节",
    misunderstood: "温柔似乎是你的默认职责",
    lesson: "直接说出需要，而不是等别人察觉",
    rule: "照料自己，不是浪费一束花。",
  },
  {
    id: "concept-store",
    name: "城市买手店",
    emoji: "◇",
    kicker: "有自己标准的趋势编辑",
    quote: "我不是追赶潮流，只是比许多人更早知道自己不要什么。",
    tags: ["敏锐筛选", "清晰标准", "前沿判断"],
    palette: ["#18233c", "#d8d0ff", "#f5f1e8"],
    prototype: { E: 1, O: 2, S: 2, W: 0, A: 1, R: 1 },
    analysis: [
      "你既喜欢新东西，又拥有清晰的筛选标准。你不是单纯追求不同，而是希望从大量可能中选出真正符合自己判断的部分。",
      "探索欲、秩序感和自主性让你适合策划与趋势判断。风险在于，你可能把生活变成一场持续更新的展览，对普通、停留和不完美失去耐心。",
    ],
    strength: "从混杂信息中选出值得关注的东西",
    misunderstood: "挑剔、难取悦",
    lesson: "新鲜感不是价值感的唯一来源",
    rule: "不更新橱窗，也不代表停止成长。",
  },
  {
    id: "vintage-shop",
    name: "复古旧货店",
    emoji: "⌁",
    kicker: "为旧故事续写下一章的人",
    quote: "别人看到旧东西，我看到它还没讲完的故事。",
    tags: ["自由重构", "拒绝模板", "故事感"],
    palette: ["#5b392c", "#d59f62", "#ede0c8"],
    prototype: { E: 0, O: 2, S: -2, W: 0, A: 2, R: 0 },
    analysis: [
      "你擅长重新解释被忽略的事物，也愿意保留与主流审美不同的选择。你的个性不是刻意标新立异，而是很难接受只有一种正确生活。",
      "探索与自主带来创造力，较低的秩序需求则让你依赖直觉。拒绝规则可以带来自由，也可能让重要计划一直停留在“以后再说”。",
    ],
    strength: "给旧事物和旧经验新的意义",
    misunderstood: "随性、不稳定",
    lesson: "建立少量真正为你服务的规则",
    rule: "自由不是没有结构，而是选择自己的结构。",
  },
  {
    id: "midnight-diner",
    name: "深夜食堂",
    emoji: "◡",
    kicker: "让人卸下防备的接纳者",
    quote: "我记得你不吃香菜，也记得你没说出口的累。",
    tags: ["包容接纳", "人情温度", "情绪洞察"],
    palette: ["#662d2d", "#f2a65a", "#f7e2bd"],
    prototype: { E: 2, O: 0, S: 1, W: 2, A: -1, R: 0 },
    analysis: [
      "你在人际互动中敏锐而有包容力。你擅长让不同的人在同一张桌子旁放松下来，也经常成为朋友倾诉和求助的对象。",
      "联结倾向和关系温度，让你从陪伴中获得意义。但长时间承担情绪劳动，也可能让你把疲惫藏在“没关系，我能理解”后面。",
    ],
    strength: "让人感到自己被接纳",
    misunderstood: "永远有精力听别人说",
    lesson: "理解别人不等于替别人承担",
    rule: "今晚可以少接待一个人的情绪。",
  },
  {
    id: "seaside-grocery",
    name: "海边杂货店",
    emoji: "≈",
    kicker: "温柔而有边界的自由灵魂",
    quote: "我欢迎你靠近，也需要海风替我关一会儿门。",
    tags: ["柔软边界", "安静恢复", "自由陪伴"],
    palette: ["#27566a", "#83c3be", "#f3e9d2"],
    prototype: { E: -1, O: 1, S: -1, W: 1, A: 2, R: -2 },
    analysis: [
      "你并不冷淡，只是需要空间才能保持温柔。你喜欢自然发生、没有压迫感的关系，也更容易在安静环境里恢复能量。",
      "自主性与低刺激偏好，使你适合少量但深入的连接。压力过大时，你可能直接消失，而不是告诉别人自己需要暂停。",
    ],
    strength: "给人自由而不失温度",
    misunderstood: "若即若离、不够主动",
    lesson: "把边界说出来，而不是突然关门",
    rule: "需要独处时，也可以留一张说明牌。",
  },
  {
    id: "study-room",
    name: "24小时自习室",
    emoji: "▤",
    kicker: "用长期主义照亮自己的人",
    quote: "我不靠喧闹证明存在，长期主义就是我的灯牌。",
    tags: ["稳定专注", "独立推进", "目标清晰"],
    palette: ["#29344a", "#91a8c7", "#f1eee5"],
    prototype: { E: -2, O: 0, S: 2, W: -1, A: 2, R: 0 },
    analysis: [
      "你相信稳定投入，也喜欢把生活掌握在自己手里。相比被鼓励和围观，你更依赖目标、进度与实际成果获得确定感。",
      "秩序感和自主性让你可靠而专注。但如果总用产出来衡量自己，休息就可能被误认为落后。能力感很重要，却不应成为自我价值的唯一来源。",
    ],
    strength: "在无人监督时持续前进",
    misunderstood: "不需要帮助，也没有情绪",
    lesson: "区分“我做得不够”和“我已经累了”",
    rule: "休息不是退出学习。",
  },
  {
    id: "rooftop-bar",
    name: "屋顶小酒馆",
    emoji: "✦",
    kicker: "主动点亮现场的体验家",
    quote: "我享受人群，但不愿在人群里失去自己。",
    tags: ["鲜活现场", "主动发起", "自由探索"],
    palette: ["#31244c", "#dc7c68", "#f5c76e"],
    prototype: { E: 2, O: 1, S: -1, W: 0, A: 1, R: 2 },
    analysis: [
      "你喜欢变化、现场感和人与人之间突然发生的火花。你通常能快速进入新环境，也敢于主动创造体验。",
      "高联结、高刺激和高自主，使你容易成为活动发起者。但不断寻找下一场体验，也可能让你错过关系和计划需要沉淀的阶段。",
    ],
    strength: "让停滞的场面重新流动",
    misunderstood: "永远快乐、永远不会累",
    lesson: "在兴奋退去后继续完成选择",
    rule: "不是每个夜晚都必须发生故事。",
  },
  {
    id: "community-bakery",
    name: "社区面包店",
    emoji: "◌",
    kicker: "把温柔落实到日常的人",
    quote: "真正的温柔，是每天都准时出炉。",
    tags: ["稳定陪伴", "日常照料", "踏实可信"],
    palette: ["#704634", "#e2a662", "#fff0d2"],
    prototype: { E: 1, O: -1, S: 2, W: 2, A: -1, R: -1 },
    analysis: [
      "你相信照顾不是偶尔的盛大表达，而是稳定、实际、可以依靠的日常。你可能不追求惊喜，却会在许多不起眼的地方保持认真。",
      "秩序感和关系温度，使你擅长建立安全感。你的风险是过度依赖熟悉，把改变自动理解成危险。真正的稳定也应该允许更新。",
    ],
    strength: "把承诺落实成重复的小事",
    misunderstood: "保守、没有冒险精神",
    lesson: "偶尔改变配方不会失去原来的你",
    rule: "熟悉的生活也可以加入一种新口味。",
  },
];

// A neutral outcome is separate from the 12 directional shop profiles. A lack
// of differentiated preferences should not be presented as a specific trait.
export const balancedProfile: StoreProfile = {
  id: "balanced-store",
  name: "街区生活集合店",
  emoji: "⌂",
  kicker: "暂时没有被一种风格定义的人",
  quote: "我的货架上有很多可能，暂时不必只挂一块招牌。",
  tags: ["偏好较均衡", "多面可能", "保留探索"],
  palette: ["#536453", "#be986b", "#f3efe2"],
  prototype: { E: 0, O: 0, S: 0, W: 0, A: 0, R: 0 },
  analysis: [
    "这次作答中，你的六项分数整体接近中间区间，暂时没有足够鲜明的方向来确定一种主店型。这可能反映了你在不同情境中会采用不同方式，也可能是部分题目对你而言难以判断。单凭这些答案，不能推断你一定灵活、全面，或没有个性。",
    "人格特征通常是连续的，而店铺只是帮助理解的比喻。中间分数并不代表能力普通，也不代表各种性格都一样强。你可以回想最近真实发生的一次聚会、一次计划变更或一次冲突，再区分自己实际做了什么，以及自己希望怎么做。",
  ],
  strength: "给自己的多种可能留出位置",
  misunderstood: "中间分数不等于没有个性",
  lesson: "用具体经历辨认偏好，不必刻意选择极端答案",
  rule: "暂时没有唯一招牌，也值得认真了解自己。",
};

export function classifyScores(scores: Record<Dimension, number>): AssessmentOutcome {
  if (DIMENSIONS.some((dimension) => !Number.isFinite(scores[dimension]) || scores[dimension] < 0 || scores[dimension] > 100)) {
    throw new Error("Invalid assessment scores");
  }

  const centered = DIMENSIONS.map((dimension) => (scores[dimension] - 50) / 25);
  const magnitude = Math.hypot(...centered);

  // At most one third of a response point away from neutral on average
  // (quadratic mean). This is a product rule, not an empirical clinical cutoff.
  if (magnitude / Math.sqrt(DIMENSIONS.length) <= 1 / 3) {
    return { primaryId: balancedProfile.id, secondaryId: balancedProfile.id, scores };
  }

  // Compare directions at equal strength. Raw Euclidean distance adds each
  // prototype's squared magnitude to the cost, unfairly favoring short vectors
  // such as the cafe whenever users' averaged scores fall near the center.
  const ranked = storeProfiles
    .map((profile) => {
      const prototypeMagnitude = Math.hypot(...DIMENSIONS.map((dimension) => profile.prototype[dimension]));
      const similarity = DIMENSIONS.reduce(
        (sum, dimension, index) => sum + (centered[index] / magnitude) * (profile.prototype[dimension] / prototypeMagnitude),
        0,
      );
      return { id: profile.id, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id));

  return { primaryId: ranked[0].id, secondaryId: ranked[1].id, scores };
}

export function scoreAssessment(answers: number[]): AssessmentOutcome {
  if (!Array.isArray(answers) || answers.length !== questions.length || questions.some((_, index) => !Number.isInteger(answers[index]) || answers[index] < 1 || answers[index] > 5)) {
    throw new Error("Invalid assessment answers");
  }

  const buckets: Record<Dimension, number[]> = { E: [], O: [], S: [], W: [], A: [], R: [] };
  questions.forEach((question, index) => {
    const value = question.reverse ? 6 - answers[index] : answers[index];
    buckets[question.dimension].push(value);
  });

  const scores = Object.fromEntries(
    DIMENSIONS.map((dimension) => {
      const values = buckets[dimension];
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      return [dimension, Math.round((average - 1) * 25)];
    }),
  ) as Record<Dimension, number>;

  return classifyScores(scores);
}

export function getProfile(id: string) {
  if (id === balancedProfile.id) return balancedProfile;
  return storeProfiles.find((profile) => profile.id === id) ?? storeProfiles[0];
}

export function getDominantDimensions(scores: Record<Dimension, number>) {
  return DIMENSIONS
    .map((dimension) => ({ dimension, score: scores[dimension] }))
    .sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))
    .slice(0, 2);
}
