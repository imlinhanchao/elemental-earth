import data from './actions.json'

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
   * 行动分类（采集、制作等）
   */
  category: string;
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

export const Actions: IAction[] = data as IAction[];
