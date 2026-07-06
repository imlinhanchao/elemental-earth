import OpenAI from 'openai';

// ============================================================
// 类型定义
// ============================================================

/** 上下文数据类型 — 与 JSON 数据文件结构一致 */
export interface ContextData {
  items?: Record<string, unknown>[]
  actions?: Record<string, unknown>[]
  techs?: Record<string, unknown>[]
  labs?: Record<string, unknown>[]
  formulas?: Record<string, unknown>[]
  maps?: Record<string, unknown>[]
  [key: string]: unknown[] | undefined
}

/** AI 生成的游戏数据输出结构 */
export interface GeneratedOutput {
  items: Record<string, unknown>[]
  actions: Record<string, unknown>[]
  techs: Record<string, unknown>[]
  labs: Record<string, unknown>[]
  formulas: Record<string, unknown>[]
  modifications?: {
    type: string
    key: string
    action: string
    data: Record<string, unknown>
  }[]
}

export type GenerateGameData = (
  userPrompt: string,
  contextData: ContextData,
  apiKey?: string,
  baseURL?: string,
) => Promise<GeneratedOutput>;

// ============================================================
// 主生成函数
// ============================================================

/**
 * 调用 OpenAI 生成游戏数据。
 * 根据用户输入的材料/元素名，自动生成相关的物品、行动、科技、实验操作和实验配方。
 */
export const generateGameData: GenerateGameData = async (
  userPrompt,
  contextData,
  apiKey,
  baseURL,
) => {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('未设置 OPENAI_API_KEY 环境变量');
  }

  const client = new OpenAI({
    apiKey: key,
    baseURL: baseURL || process.env.OPENAI_BASE_URL || undefined,
    timeout: 60000,
    maxRetries: 2,
  });

  const systemPrompt = buildSystemPrompt(contextData);
  const userMessage = buildUserPrompt(userPrompt, contextData);

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 8192,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI 返回为空');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error(`OpenAI 返回非 JSON 格式: ${content.slice(0, 200)}`);
  }

  return normalizeOutput(parsed);
};

// ============================================================
// 提示词构建
// ============================================================

function buildSystemPrompt(contextData: ContextData): string {
  const existingItemNames = contextData.items?.map(i => `${i.key} (${i.name})`) || [];

  return `你是一个化学模拟文字游戏的 AI 数据生成器。你的任务是根据用户输入的一种材料、矿物或元素名称，基于现实世界的化学、矿物学和地理学原理，自动生成游戏中合理的新增数据。

## 游戏简介
这是一个以化学元素和炼金术为主题的增量/放置类文字游戏。玩家通过「行动」获取基础材料，研究「科技」解锁能力，在「实验室」进行「实验操作」来获得新物质「配方」。

### 各部分用途（生成时请严格遵循）

**物品 (items)** — 所有可持有的物品，包括材料、工具、容器、燃料、气体、液体等。
\`\`\`json
{
  "name": "物品名称",
  "key": "唯一标识符（英文小写+下划线）",
  "category": "分类（材料/工具/容器/燃料/气体/液体/火源）",
  "description": "描述（中文）",
  "type": ["类型标签（material, tool, container, fuel, gas, liquid, fire_source 等）"],
  "elemental": 6,           // 可选，关联的元素周期表序数
  "durable": 1,             // 可选，耐久度 0-1
  "attrs": { "burn_time": 30 }  // 可选，额外属性
}
\`\`\`

**地图 (maps)** — 游戏中的地点。不同地图上的「行动」奖励不同，某些稀有材料只在特定地图出现。
\`\`\`json
{
  "name": "地图名称",
  "key": "唯一标识符",
  "description": "描述",
  "icon": "Iconify 图标名",
  "position": { "x": 数字, "y": 数字 }
}
\`\`\`
行动可以通过 map 字段限定只在某些地图可用，奖励也可以通过 map 字段限定只在某些地图产出。

**行动 (actions)** — 玩家执行的采集/制作。主要用途是生产「工具」类物品。
\`\`\`json
{
  "name": "行动名称",
  "key": "唯一标识符",
  "category": "行动分类（采集/制作等）",
  "description": "描述",
  "required_items": [{ "key": "所需物品key", "quantity": 数量, "use": 0.01 （耐久消耗）}],
  "required_techs": ["前置科技key"],
  "rewards": [{ "key": "奖励物品key", "quantity": 数量或[随机最小,最大], "probability": 权重 }],
  "time_required": 时间秒,
  "map": ["可执行的地图key"],        // 不填则所有地图可用
  "formula": { "key": "配方key", "operation": "操作key" }  // 可选，引用配方时弹出对话框
}
\`\`\`

**科技 (techs)** — 解锁新能力的科技树节点。主要用途是解锁「制作工具」类的行动。
\`\`\`json
{
  "name": "科技名称",
  "key": "唯一标识符",
  "description": "描述",
  "required_items": [{ "key": "所需物品key", "quantity": 数量 }],
  "required_techs": ["前置科技key"],
  "time_required": 研究时间秒
}
\`\`\`

**实验操作 (labs)** — 实验室中的操作动作。用途：配方的材料处理/气体收集等，不是制作工具。
\`\`\`json
{
  "name": "操作名称",
  "key": "唯一标识符",
  "description": "描述",
  "time_required": 时间秒,
  "required_item": [{ "key": "所需物品key（设备/容器）", "quantity": 数量, "use": 0.01（耐久消耗）}],
  "required_techs": ["前置科技key"],
  "requires_burning": true,    // true=需要燃烧, false=无需燃烧, undefined=不确定
  "is_chain": true             // 标记为追加操作（不消耗材料，仅增加耗时）
}
\`\`\`
追加操作：在主操作之后附加执行，不消耗额外材料，仅用于收集特定产物。例如：
  - 焙烧锌矿石后追加「冷凝」操作才能收集锌
  - 焙烧/干馏后追加「气体收集」操作才能收集气体产物
可以通过在产品上设置 required_chain_operation 来指定哪些产物需要追加操作。

**配方 (formulas)** — 定义如何通过实验室操作生成新材料（非工具的制作在行动中完成）。
\`\`\`json
{
  "name": "配方名称",
  "key": "唯一标识符",
  "description": "描述",
  "required_items": [
    { "key": "原料key", "quantity": 数量, "isMain": true }, // 核心反应物设为 isMain: true
    { "key": "辅助key", "quantity": 数量 }
  ],
  "required_container": "要求容器items的key（如 kiln, clay_pot）",
  "required_actions": { "key": "操作key", "min": 最少次数, "max": 最多次数 },
  "required_techs": ["前置科技key"],
  "required_era": "时代key (stone, alchemy, modern_chem, electrochem, rare_earth, atomic_age)",
  "time_required": 时间秒,
  "fragment_description": "碎片描述（使用 #材料Key# 和 $操作key$ 占位）",
  "products": [
    { "key": "产物物品key", "multiple": 数量倍率 },
    { "key": "产物key", "multiple": 1, "required_chain_operation": "操作key" }  // 需追加操作才能收集
  ]
}
\`\`\`
时代节点参考：
- \`stone\`: 石器时代 (基础采集、手工制作)
- \`alchemy\`: 炼金术时代 (窑炉焙烧、简单金属提取)
- \`modern_chem\`: 近代化学 (酸碱制备、气体收集、复杂合金)
- \`electrochem\`: 电化学时代 (电池应用、电解产物)
- \`rare_earth\`: 稀土时代 (稀有金属、锂系化学)
- \`atomic_age\`: 原子时代 (放射性元素、核物理相关)
建议根据所需操作和前置科技合理分配 \`required_era\`。

## 生成规则

### 核心原则
1. **基于现实科学**：所有生成的物品、行动、配方必须基于真实的化学、矿物学和地理学知识。
2. **游戏平衡**：生成的数据应该符合游戏的渐进难度——新手可以从简单材料开始，高级材料需要前置科技。
3. **合理关联**：新生成的行动可以产出已有物品，新配方可以使用已有物品作为原料。
4. **中文命名**：所有名称和描述使用中文。

### 物品生成规则
- 如果是新元素（在已有元素列表中不存在），需要先生成对应的元素信息（元素名称、符号、类别等）
- 矿物名称使用真实矿物名（如赤铁矿、方铅矿、闪锌矿）
- 化工产物使用正确的化学名称（如硫酸、硝酸、氨）
- type 分类：纯元素/矿物用 ["material"]，可作燃料的添加 "fuel"，气体加 "gas"，液体加 "liquid"
- 如有对应的元素序数，添加 elemental 字段
- **注意**：只有**元素单质**（如铁锭、铜锭）才填 element 字段。**矿石矿物**（如赤铁矿、孔雀石）虽然含有该元素，但不填写 element 字段
- 工具的耐久度 durable 设为 1，容器 durable 设为 1
- **矿石/矿物类物品**（如赤铁矿、孔雀石、方铅矿等）默认标记为重大发现：is_discovery = true，玩家首次获得时触发命名弹窗
- **描述规范**：不同类别的物品采用不同的描述风格
  - **材料 / 气体 / 液体**：从纯外观视角描写——颜色、形状、质感、光泽、气味等感官特征，不使用用途说明。如「灰褐色、表面粗糙的碎块，边缘不规则，握在手心能感受沉实的重量」；「无色无味的气体，看不见也摸不着，但靠近时感到一股莫名的晕眩和憋闷」
  - **工具 / 容器 / 燃料 / 火源**：保持用途说明风格——描述其功能和作用。如「用石头制作的斧头，可以用来砍树和挖掘」

### 行动生成规则
- 行动主要用途是生产「工具」类物品。工具消耗耐久（use 字段）
- 采集类行动应该有合适的 map（地图）关联
- 如果有对应的元素（如铁），可增加在该元素产地的采集行动
- 概率 probability 按稀有度设置：常见 800-1000，较常见 300-700，稀有 50-200，极稀有 5-30
- quantity 使用数字或 [最小,最大] 范围

### 科技生成规则
- 科技的唯一用途是：解锁「制作工具」类的行动。**不要生成新物质的制备/冶炼科技**
- 新物质的生成应该通过「配方」来实现，而不是科技
- 科技应该有层级关系（比如"石器制作"→"铁器制作"）
- required_items 中的物品应该已有或本次同步生成
- 科技描述应聚焦于「掌握了什么技术/原理」，不要包含「使用什么材料制作什么物品」的内容
  - ✅「掌握了将石块打磨成锋利工具的技术。」
  - ❌「使用石头制作基本的工具，如石斧和石锤。」
  - ❌「掌握冶炼铁锭的技术。」（这是配方的职责，不是科技的）

### 实验操作生成规则
- 用途：配方的材料处理/气体收集等，不是制作工具
- 如果需要加热/燃烧，requires_burning: true
- 需要特殊设备时添加 required_item
- 如果需要前置科技才能使用，添加 required_techs
- 某些操作可标记为 is_chain: true，表示作为追加操作（不消耗额外材料，仅增加耗时用于收集产物）

### 配方生成规则
- 用途：定义如何通过实验室操作生成新材料（非工具的制作，工具制作由行动完成）
- **核心材料标记**：配方中的主要反应物（例如冶炼时的矿石、合成时的底物）必须设置 \`"isMain": true\`。这决定了玩家在接触到这些材料前不会掉落该配方碎片。
- required_container 用于需要特定容器的反应（窑炉、烧杯、蒸馏瓶等）
- required_actions 对应实验室操作（搅拌、焙烧、加热、蒸馏、过滤等）
- 多个输入可以用逗号分隔 key 表示可替代材料
- 化学反应要符合真实化学方程式（虽简化但不要造出违背科学原理的反应）
- 副产物也应该考虑在内
- 某些产物可以通过追加操作才能收集：products 中设置 required_chain_operation 指向操作 key
- **碎片描述规范**：\`fragment_description\` 必须包含配方关键步骤的描述。
  - 必须使用 **#材料Key#** (加粗) 引用参与反应的主要原材料。
  - 必须使用 **$操作Key$** (倾斜或特定格式) 引用实验操作或容器。
  - 描述应像实验记录的一块碎片，如：「在 #kiln# 中对 #malachite# 进行 $roasting$，绿色粉末逐渐转黑...」；「将 #sulfuric_acid# 滴入 #zinc#，通过 $gas_collecting$ 收集产生的气体。」
- **时代锁**：必须分配合理的 \`required_era\`。默认分配规则：
    - \`stone\`: 基础手工制作
    - \`alchemy\`: 窑炉焙烧、简单金属提取
    - \`modern_chem\`: 近代化学，酸碱、复杂冶金
    - \`electrochem\`: 电化学（如电解铝、电池生产）
    - \`rare_earth\`: 稀土提取（如独居石分解）
    - \`atomic_age\`: 核能、锕系元素关联
- **引力引导**：如果生成的配方需要新的操作，请同步生成该操作。

## 修改已有数据

**非常重要**：当用户输入的材料可以通过修改现有行动/配方来实现时，优先使用 modifications 修改现有数据，而不是创建重复的新行动/配方。

### 修改规则
- **采集类行动**：新矿石/材料应当在现有采集行动上添加奖励，而不是创建新的采集行动。例如新的矿物"方铅矿"应该在已有的「挖掘」或「采矿」行动中添加奖励项，通过 map 字段限定只在特定合理的地图产出。
- **爆破行动**（key: \`blasting\`）：生成的矿石/矿物类物品，若适合通过爆破获取，应同时添加到 \`blasting\` 行动的奖励中（使用 modifications 的 \`add_reward\` 操作）。例如生成了"方铅矿"，应在 blasting 的奖励中添加 \`{ "key": "galena", "quantity": [2, 5], "probability": 200, "map": ["cave"] }\`。
- **定向爆破**（key: \`directional_blasting\`）：稀有矿物（如辰砂、辉银矿、辉锑矿、砷铂矿、辉钼矿、白钨矿等）只添加到 \`directional_blasting\` 行动的奖励中，不要添加到普通爆破和挖掘。
- **行动奖励**：使用 \`modifications\` 中的 \`add_reward\` 在现有行动中追加奖励
- **批量新增**：如果修改涉及 3 个以上的现有记录，优先创建新的行动而不是修改多个旧记录

支持的操作类型：
| action | 说明 | data 格式 |
|--------|------|-----------|
| \`update\` | 覆盖指定字段 | \`{ "field1": value1, "field2": value2 }\` |
| \`add_reward\` | 在行动奖励中追加一项 | \`{ "key": "物品key", "quantity": 数量, "probability": 权重, "map": ["地图key"] }\` |
| \`add_required_tech\` | 为行动追加前置科技（仅当新材料的工具需要新科技时） | \`{ "tech": "科技key" }\` |

## 输出格式

始终输出以下 JSON 结构，即使某些数组为空：
\`\`\`json
{
  "items": [...],         // 新物品列表
  "actions": [...],       // 新行动列表
  "techs": [...],         // 新科技列表
  "labs": [...],          // 新实验操作列表
  "formulas": [...],      // 新配方列表
  "modifications": [      // 对已有数据的修改（非必填）
    {
      "type": "actions",           // 数据类型
      "key": "dig",               // 要修改的记录 key
      "action": "add_reward",     // 操作类型
      "data": { "key": "galena", "quantity": 1, "probability": 300, "map": ["cave"] }
    }
  ]
}
\`\`\`

生成的数量控制在合理范围内：
- items: 2-8 个
- actions: 1-4 个  
- techs: 1-3 个
- labs: 0-2 个（尽量复用已有的实验操作）
- formulas: 1-4 个`;
}

function buildUserPrompt(userPrompt: string, contextData: ContextData): string {
  const summaries = {
    items: (contextData.items || []).map(i =>
      `${i.key}（${i.name}）[${i.category}][type:${(i.type as string[] || []).join(',')}]${i.elemental ? ` 元素#${i.elemental}` : ''}`
    ),
    actions: (contextData.actions || []).map(a =>
      `${a.key}（${a.name}）[${a.category}] 产出: ${(a.rewards as Array<Record<string, unknown>> || []).map(r => String(r.key)).join(',')}`
    ),
    techs: (contextData.techs || []).map(t =>
      `${t.key}（${t.name}）${t.required_techs ? ` 前置:${(t.required_techs as string[]).join(',')}` : ''}`
    ),
    labs: (contextData.labs || []).map(l =>
      `${l.key}（${l.name}）${l.requires_burning ? '[需燃烧]' : '[无需燃烧]'}`
    ),
    maps: (contextData.maps || []).map(m => `${m.key}（${m.name}）`),
    formulas: (contextData.formulas || []).map(f =>
      `${f.key}（${f.name}） 产物: ${(f.products as Array<Record<string, unknown>> || []).map(p => String(p.key)).join(',')}`
    ),
  };

  return `## 用户需求
用户希望基于「${userPrompt}」生成新的游戏数据。

## 已有数据摘要（供你引用参考）

### 地图
${summaries.maps.join('\n') || '(暂无)'}

### 已有物品
${summaries.items.join('\n') || '(暂无)'}

### 已有行动
${summaries.actions.join('\n') || '(暂无)'}

### 已有科技
${summaries.techs.join('\n') || '(暂无)'}

### 已有实验操作
${summaries.labs.join('\n') || '(暂无)'}

### 已有配方
${summaries.formulas.join('\n') || '(暂无)'}

## 要求
1. 根据「${userPrompt}」在现实世界化学/矿物学/地理学中的真实情况，生成游戏数据
2. 可以引用已有的物品、科技、地图、操作作为新行动和配方的输入/前置条件
3. 合理设计科技树和游戏流程
4. 如果是矿物，考虑它的主要产地（关联地图）、化学成分（关联配方）、用途（关联物品和行动）
5. 如果是元素，考虑它的单质形态、主要化合物、矿石来源、提取方法
6. 新物品的 key 使用英文小写+下划线，确保不与已有 key 冲突`;
}

// ============================================================
// 输出规范化
// ============================================================

function normalizeOutput(parsed: Record<string, unknown>): GeneratedOutput {
  return {
    items: (Array.isArray(parsed.items) ? parsed.items.map(cleanItem) : []).filter(Boolean) as Record<string, unknown>[],
    actions: (Array.isArray(parsed.actions) ? parsed.actions.map(cleanAction) : []).filter(Boolean) as Record<string, unknown>[],
    techs: (Array.isArray(parsed.techs) ? parsed.techs.map(cleanTech) : []).filter(Boolean) as Record<string, unknown>[],
    labs: (Array.isArray(parsed.labs) ? parsed.labs.map(cleanLab) : []).filter(Boolean) as Record<string, unknown>[],
    formulas: (Array.isArray(parsed.formulas) ? parsed.formulas.map(cleanFormula) : []).filter(Boolean) as Record<string, unknown>[],
    modifications: Array.isArray(parsed.modifications) ? parsed.modifications as GeneratedOutput['modifications'] : undefined,
  };
}

function cleanItem(item: unknown): Record<string, unknown> | null {
  if (!item || typeof item !== 'object') return null;
  const cleaned: Record<string, unknown> = { ...item as Record<string, unknown> };
  if (!cleaned.name) cleaned.name = cleaned.key || '未命名';
  if (!cleaned.key) cleaned.key = 'unknown';
  if (!cleaned.category) cleaned.category = '材料';
  if (!cleaned.description) cleaned.description = cleaned.name;
  if (!Array.isArray(cleaned.type)) cleaned.type = ['material'];
  if (Array.isArray(cleaned.type) && cleaned.type.length === 0) delete cleaned.type;
  if (cleaned.elemental === undefined || cleaned.elemental === null) delete cleaned.elemental;
  if (cleaned.durable === undefined || cleaned.durable === null) delete cleaned.durable;
  if (cleaned.attrs && typeof cleaned.attrs === 'object' && Object.keys(cleaned.attrs as Record<string, unknown>).length === 0) delete cleaned.attrs;
  return cleaned;
}

function cleanAction(action: unknown): Record<string, unknown> | null {
  if (!action || typeof action !== 'object') return null;
  const cleaned: Record<string, unknown> = { ...action as Record<string, unknown> };
  if (!cleaned.name) cleaned.name = cleaned.key || '未命名';
  if (!cleaned.key) cleaned.key = 'unknown';
  if (!cleaned.category) cleaned.category = '采集';
  if (!cleaned.description) cleaned.description = cleaned.name;
  if (!Array.isArray(cleaned.required_items)) cleaned.required_items = [];
  if (Array.isArray(cleaned.required_items) && cleaned.required_items.length === 0) delete cleaned.required_items;
  if (!Array.isArray(cleaned.rewards)) cleaned.rewards = [];
  if (Array.isArray(cleaned.rewards) && cleaned.rewards.length === 0) delete cleaned.rewards;
  if (!cleaned.required_techs || (Array.isArray(cleaned.required_techs) && cleaned.required_techs.length === 0)) delete cleaned.required_techs;
  if (!cleaned.map || (Array.isArray(cleaned.map) && cleaned.map.length === 0)) delete cleaned.map;
  if (cleaned.time_required === undefined) cleaned.time_required = 10;
  return cleaned;
}

function cleanTech(tech: unknown): Record<string, unknown> | null {
  if (!tech || typeof tech !== 'object') return null;
  const cleaned: Record<string, unknown> = { ...tech as Record<string, unknown> };
  if (!cleaned.name) cleaned.name = cleaned.key || '未命名';
  if (!cleaned.key) cleaned.key = 'unknown';
  if (!cleaned.description) cleaned.description = cleaned.name;
  if (!Array.isArray(cleaned.required_items)) cleaned.required_items = [];
  if (Array.isArray(cleaned.required_items) && cleaned.required_items.length === 0) delete cleaned.required_items;
  if (!cleaned.required_techs || (Array.isArray(cleaned.required_techs) && cleaned.required_techs.length === 0)) delete cleaned.required_techs;
  if (cleaned.time_required === undefined) cleaned.time_required = 30;
  return cleaned;
}

function cleanLab(lab: unknown): Record<string, unknown> | null {
  if (!lab || typeof lab !== 'object') return null;
  const cleaned: Record<string, unknown> = { ...lab as Record<string, unknown> };
  if (!cleaned.name) cleaned.name = cleaned.key || '未命名';
  if (!cleaned.key) cleaned.key = 'unknown';
  if (!cleaned.description) cleaned.description = cleaned.name;
  if (!Array.isArray(cleaned.required_item)) cleaned.required_item = [];
  if (Array.isArray(cleaned.required_item) && cleaned.required_item.length === 0) delete cleaned.required_item;
  if (!cleaned.required_techs || (Array.isArray(cleaned.required_techs) && cleaned.required_techs.length === 0)) delete cleaned.required_techs;
  if (cleaned.time_required === undefined) cleaned.time_required = 20;
  return cleaned;
}

function cleanFormula(formula: unknown): Record<string, unknown> | null {
  if (!formula || typeof formula !== 'object') return null;
  const cleaned: Record<string, unknown> = { ...formula as Record<string, unknown> };
  if (!cleaned.name) cleaned.name = cleaned.key || '未命名';
  if (!cleaned.key) cleaned.key = 'unknown';
  if (!cleaned.description) cleaned.description = cleaned.name;
  if (!Array.isArray(cleaned.required_items)) cleaned.required_items = [];
  if (Array.isArray(cleaned.required_items) && cleaned.required_items.length === 0) delete cleaned.required_items;
  if (!cleaned.required_techs || (Array.isArray(cleaned.required_techs) && cleaned.required_techs.length === 0)) delete cleaned.required_techs;
  if (!cleaned.products || (Array.isArray(cleaned.products) && cleaned.products.length === 0)) delete cleaned.products;
  if (cleaned.time_required === undefined) cleaned.time_required = 30;
  // 确保 required_actions 格式正确
  if (cleaned.required_actions && typeof cleaned.required_actions === 'object' && !(cleaned.required_actions as Record<string, unknown>).key) {
    delete cleaned.required_actions;
  }
  return cleaned;
}
