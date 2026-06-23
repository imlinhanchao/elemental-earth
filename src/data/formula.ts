import data from './formula.json'

export interface IFormula {
    /**
     * 名称
     */
    name: string;
    /**
     * 唯一标识符
     */
    key: string;
    /**
     * 描述
     */
    description: string;
    /**
     * 所需物品
     */
    required_items: { key: string | string[]; quantity: number, use?: number }[];
    /**
     * 要求容器
     */
    required_container?: string;
    /**
     * 所需操作 (key: 操作标识, min: 最少次数(默认1), max: 最多次数(不设置则不限制))
     */
    required_actions?: {
      key: string;
      min?: number;
      max?: number;
    };
    /**
     * 前置科技
     */
    required_techs?: string[];
    /**
     * 所需时间（秒）
     */
    time_required: number; // in seconds
    /**
     * 产物
     */
    products: { key: string; multiple: number; required_chain_operation?: string }[];
}

export const Formulas: IFormula[] = data as IFormula[];
