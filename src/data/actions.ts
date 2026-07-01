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
   * 奖励概率（用于随机抽选）
   */
  probability: number;
  /**
   * 是否必定掉落（不受随机抽选影响，与随机奖励并行）
   */
  guaranteed?: boolean;
  /**
   * 奖励出现的地图
   * 字符串 = 地图key（使用 reward.probability）
   * 对象 = { key, probability? }（可覆盖 reward.probability）
   */
  map?: (string | { key: string; probability?: number })[];
  /**
   * 需要行动消耗了指定物品（或数组中的任一物品）时才可能出现此奖励
   */
  required_item?: string | string[];
  /**
   * 需要达到的时代
   */
  required_era?: string;
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
   * 所需物品（key 为数组表示可替代材料）
   */
  required_items: { key: string | string[]; quantity: number, use?: number }[];
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
   * 冷却时间（秒）。有冷却时间的行动在任务完成后需等待冷却结束才能再次触发
   */
  cooldown?: number;
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
