import data from './items.json'

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
   * 物品分类（材料、工具、容器等）
   */
  category: string;
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
  /**
   * 是否为重大发现物品，首次获得时触发命名弹窗
   */
  is_discovery?: boolean;
}

export const Items: IItem[] = data as IItem[];

export function getItem(key: string): IItem | undefined {
  return Items.find(i => i.key === key);
}
