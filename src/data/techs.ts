
export interface ITech {
  /**
   * 技术名称
   */
  name: string;
  /**
   * 技术唯一标识符
   */
  key: string;
  /**
   * 技术描述
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
   * 所需时间（秒）
   */
  time_required: number; // in seconds
}


export const Techs: ITech[] = [
  {
    name: "石器制作",
    key: "stone_tool_crafting",
    description: "使用石头制作基本的工具，如石斧和石锤。",
    required_items: [
      { key: "stone", quantity: 20 }, // 石头
      { key: "wood", quantity: 10 } // 木材
    ],
    time_required: 10
  },
  {
    name: "火种制作",
    key: "fire_starting",
    description: "使用燧石和木材制作火种，可以用来生火。",
    required_items: [
      { key: "flint", quantity: 5 }, // 燧石
      { key: "wood", quantity: 10 } // 木材
    ],
    time_required: 8
  },
  {
    name: "木材加工",
    key: "wood_processing",
    description: "将木材加工成更有用的材料，如木板和木棍。",
    required_items: [
      { key: "wood", quantity: 50 } // 木材
    ],
    time_required: 15
  },
  {
    name: "陶器制作",
    key: "pottery",
    description: "使用粘土制作陶器，可以用来装水和其他物品。",
    required_items: [
      { key: "clay", quantity: 20 } // 粘土
    ],
    time_required: 12
  }
]