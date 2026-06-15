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
}

export const Items: IItem[] = [
  { name: "石头", key: "stone", description: "一种常见的矿物，可以用来建造和制作工具。" },
  { name: "木材", key: "wood", description: "一种常见的材料，可以用来建造和制作工具。" },
  { name: "燧石", key: "flint", description: "一种坚硬的矿物，可以用来制作火种和工具。" },
  { name: "树皮", key: "bark", description: "树木的外层，可以用来制作绳子和其他物品。" },
  { name: "树脂", key: "resin", description: "树木分泌的粘稠物质，可以用来制作胶水和其他物品。" },
  { name: "粘土", key: "clay", description: "一种湿润的土壤，可以用来制作陶器和其他物品。" },
  { name: "泥土", key: "mud", description: "一种湿润的土壤，可以用来制作建筑材料和其他物品。" },
  { name: "水", key: "water", description: "生命之源，可以用来饮用和灌溉。" },
  { name: "火种", key: "fire_seed", description: "用燧石和木材制作的火种，可以用来生火。" },
  { name: "骨头", key: "bone", description: "动物的骨骼，可以用来制作工具和装饰品。" },
  { name: "沙金", key: "gold_sand", description: "一种稀有的矿物，可以用来制作贵重物品。", elemental: 79 },
  { name: "石斧", key: "stone_axe", description: "用石头制作的斧头，可以用来砍树和挖掘。", durable: 1 },
  { name: "石镐", key: "stone_pickaxe", description: "用石头制作的镐，可以用来挖掘和采矿。", durable: 1 },
  { name: "木桶", key: "wooden_bucket", description: "用木材制作的桶，可以用来装水和其他物品。", durable: 1 },
]

export function getItem(key: string): IItem | undefined {
  return Items.find(i => i.key === key);
}