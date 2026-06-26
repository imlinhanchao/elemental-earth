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
   * 字符串 = 地图key（使用 reward.probability）
   * 对象 = { key, probability? }（可覆盖 reward.probability）
   */
  map?: (string | { key: string; probability?: number })[];
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
  /**
   * 引用的配方（若有，则点击此行动时弹出配方执行对话框）
   */
  formula?: {
    /** 配方 key */
    key: string;
    /** 实验室操作 key（决定是否需要燃烧等） */
    operation: string;
  };
}

export const Actions: IAction[] = data as IAction[];
