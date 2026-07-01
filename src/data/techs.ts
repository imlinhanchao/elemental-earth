import data from './techs.json'

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
  /**
   * 研究此科技时触发的时代里程碑 key
   */
  milestone?: string;
}

export const Techs: ITech[] = data as ITech[];
