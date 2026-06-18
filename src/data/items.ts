export interface IItem {
  /**
   * 物品名称
   */
  name: string;
  /**
   * 物品唯一标识符
   */
  key: string;
  /**
   * 物品描述
   */
  description: string;
  /**
   * 点亮的元素序数
   */
  elemental?: number;
  /**
   * 耐久度，0-1之间，表示物品的使用程度
   */
  durable?: number;
  /**
   * 类型
   */
  type: string[];
  /**
   * 其他属性
   */
  attrs?: Record<string, any>;
}

export const Items: IItem[] = [
  { name: "石头", key: "stone", description: "一种常见的矿物，可以用来建造和制作工具。", type: ["material"] },
  { name: "木材", key: "wood", description: "一种常见的材料，可以用来建造和制作工具。", type: ["material", "fuel"], attrs: { burn_time: 30 } },
  { name: "燧石", key: "flint", description: "一种坚硬的矿物，可以用来制作火种和工具。", type: ["material"] },
  { name: "树皮", key: "bark", description: "树木的外层，可以用来制作绳子和其他物品。", type: ["material"] },
  { name: "树脂", key: "resin", description: "树木分泌的粘稠物质，可以用来制作胶水和其他物品。", type: ["material"] },
  { name: "粘土", key: "clay", description: "一种湿润的土壤，可以用来制作陶器和其他物品。", type: ["material"] },
  { name: "泥土", key: "mud", description: "一种湿润的土壤，可以用来制作建筑材料和其他物品。", type: ["material"] },
  { name: "水", key: "water", description: "生命之源，可以用来饮用和灌溉。", type: ["material"] },
  { name: "木炭", key: "charcoal", description: "木材燃烧后的产物，可以用来制作火种和其他物品。", type: ["material", "fuel"], elemental: 6, attrs: { burn_time: 60 } },
  { name: "草木灰", key: "wood_ash", description: "木材燃烧后的灰烬，可以用来制作肥料和其他物品。", type: ["material"] },
  { name: "火种", key: "fire_seed", description: "用燧石和木材制作的火种，可以用来生火。", durable: 1, type: ["fire_source"] },
  { name: "砂金", key: "gold_sand", description: "一种稀有的矿物，可以用来制作贵重物品。", elemental: 79, type: ["material"] },
  { name: "石斧", key: "stone_axe", description: "用石头制作的斧头，可以用来砍树和挖掘。", durable: 1, type: ["tool"] },
  { name: "石镐", key: "stone_pickaxe", description: "用石头制作的镐，可以用来挖掘和采矿。", durable: 1, type: ["tool"] },
  { name: "木桶", key: "wooden_bucket", description: "用木材制作的桶，可以用来装水和其他物品。", durable: 1, type: ["container"] },
  { name: "陶罐", key: "clay_pot", description: "用粘土制作的罐子，可以用来装水和其他物品。", durable: 1, type: ["container"], attrs: { can_heat: true }   },
  { name: "窑炉", key: "kiln", description: "用来烧制陶器和其他物品的设备。", durable: 1, type: ["container"], attrs: { can_heat: true } },
  { name: "过滤布", key: "filter_cloth", description: "用来过滤液体的布料。", durable: 1, type: ["tool"] },
  { name: "鼓风机", key: "bellows", description: "用来吹风的工具，可以增加火焰的温度。", durable: 1, type: ["tool"] },
  { name: "一氧化碳", key: "carbon_monoxide", description: "一种有毒的气体，可以通过干馏产生。", type: ["material", "gas"] },
  { name: "二氧化碳", key: "carbon_dioxide", description: "一种常见的气体，可以灭火。", type: ["material", "gas"] },
  { name: "孔雀石", key: "malachite", description: "一种绿色的矿物，可以用来制作颜料和装饰品。", type: ["material"] },
  { name: "铜", key: "copper", description: "一种金属，可以用来制作工具和其他物品。", elemental: 29, type: ["material"] },
  { name: "碱水", key: "alkaline_solution", description: "一种碱性的液体，可以用来中和酸性物质。", type: ["material", "liquid"] },
]

export function getItem(key: string): IItem | undefined {
  return Items.find(i => i.key === key);
}