
export interface IReward {
  /**
   * 奖励物品Key
   */
  key: string;
  /**
   * 奖励数量
   */
  quantity: number | number[];
  /**
   * 奖励概率
   */
  probability: number;
  /**
   * 奖励出现的地图
   */
  map?: string[];
}

export interface IAction {
  /**
   * 行动名称
   */
  name: string;
  /**
   * 行动唯一标识符
   */
  key: string;
  /**
   * 行动描述
   */
  description: string;
  /**
   * 所需物品
   */
  required_items: { key: string; quantity: number, use?: number }[];
  /**
   * 前置科技
   */
  required_techs?: string[];
  /**
   * 奖励
   */
  rewards: IReward[];
  /**
   * 所需时间（秒）
   */
  time_required: number; // in seconds,
  /**
   * 解锁地图
   */
  map?: string[];
}


export const Actions: IAction[] = 
[
  {
    name: "捡石头",
    key: "pick_stone",
    description: "在地上捡起石头，可以用来建造和制作工具。",
    required_items: [],
    rewards: [
      { key: "stone", quantity: 1, probability: 1000 }, // 石头
      { key: "flint", quantity: 1, probability: 50 }, // 燧石
      { key: "clay", quantity: 1, probability: 100, map: ["river_side"] }, // 粘土
      { key: "bone", quantity: 1, probability: 20, map: ["mountain"] }, // 骨头
      { key: "gold_sand", quantity: 1, probability: 5, map: ["river_side"] }, // 沙金
    ],
    time_required: 0
  },
  {
    name: "捡树枝",
    key: "pick_branch",
    description: "在地上捡起树枝，可以用来建造和制作工具。",
    required_items: [],
    rewards: [
      { key: "wood", quantity: 1, probability: 990 }, // 木材
      { key: "bark", quantity: 1, probability: 500 }, // 树皮
      { key: "resin", quantity: 1, probability: 100, map: ["forest"] }, // 树脂
    ],
    time_required: 0
  },
  {
    name: "挖掘",
    key: "dig",
    description: "使用工具挖掘地面，可以获得各种资源。",
    required_items: [
      { key: "stone_pickaxe", quantity: 1, use: 0.01 } // 石镐
    ],
    rewards: [
      { key: "mud", quantity: 1, probability: 100 }, // 泥土
      { key: "flint", quantity: 1, probability: 50, map: ["volcano"] }, // 燧石
      { key: "clay", quantity: 1, probability: 50, map: ["river_side"] }, // 粘土
    ],
    time_required: 5
  },
  {
    name: "打水",
    key: "fetch_water",
    description: "使用工具从水源打水，可以获得水资源。",
    required_items: [
      { key: "wooden_bucket", quantity: 1, use: 0.01 } // 木桶
    ],
    rewards: [
      { key: "water", quantity: 1, probability: 1000 }, // 水
    ],
    time_required: 5,
    map: ["river_side"]
  },
  {
    name: '伐木',
    key: 'chop_wood',
    description: '使用石斧砍伐树木，可以获得更多的木材。',
    required_items: [
      { key: "stone_axe", quantity: 1, use: 0.01 } // 石斧
    ],
    rewards: [
      { key: "wood", quantity: [5, 7, 10], probability: 1000 } // 木材
    ],
    time_required: 5,
    map: ["forest"]
  },
  {
    name: "打造石斧",
    key: "craft_stone_axe",
    description: "使用石头和木材制作石斧，可以用来砍树和挖掘。",
    required_items: [
      { key: "stone", quantity: 5 }, // 石头
      { key: "wood", quantity: 2 } // 木材
    ],
    required_techs: ["stone_tool_crafting"],
    rewards: [
      { key: "stone_axe", quantity: 1, probability: 1000 } // 石斧
    ],
    time_required: 10
  },
  {
    name: "打造石镐",
    key: "craft_stone_pickaxe",
    description: "使用石头和木材制作石镐，可以用来挖掘和采矿。",
    required_items: [
      { key: "stone", quantity: 5 }, // 石头
      { key: "wood", quantity: 2 } // 木材
    ],
    required_techs: ["stone_tool_crafting"],
    rewards: [
      { key: "stone_pickaxe", quantity: 1, probability: 1000 } // 石镐
    ],
    time_required: 10
  },
  {
    name: '制作木桶',
    key: 'craft_wooden_bucket',
    description: '使用木材制作木桶，可以用来装水和其他物品。',
    required_items: [
      { key: "wood", quantity: 20 } // 木材
    ],
    required_techs: ["wood_processing"],
    rewards: [
      { key: "wooden_bucket", quantity: 1, probability: 1000 } // 木桶
    ],
    time_required: 15
  },
  {
    name: '制作火种',
    key: 'craft_fire_seed',
    description: '使用燧石和木材制作火种，可以用来生火。',
    required_items: [
      { key: "flint", quantity: 2 }, // 燧石
      { key: "wood", quantity: 10 } // 木材
    ],
    required_techs: ["fire_starting"],
    rewards: [
      { key: "fire_seed", quantity: 1, probability: 1000 } // 火种
    ],
    time_required: 8
  },
  {
    name: '制作陶罐',
    key: 'craft_clay_pot',
    description: '使用粘土制作陶罐，可以用来装水和其他物品。',
    required_items: [
      { key: "clay", quantity: 5 } // 粘土
    ],
    required_techs: ["pottery"],
    rewards: [
      { key: "clay_pot", quantity: 1, probability: 1000 } // 陶罐
    ],
    time_required: 12
  }
]
