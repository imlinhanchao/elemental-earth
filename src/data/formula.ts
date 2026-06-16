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
    required_items: { key: string; quantity: number, use?: number }[];
    /**
     * 要求容器
     */
    required_container?: string;
    /**
     * 所需操作
     */
    required_actions?: string;
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
    products: { key: string; multiple: number }[];
}

export const Formulas: IFormula[] = [
    {
        name: "制作木炭",
        key: "charcoal_production",
        description: "将木材放入干馏装置中进行干馏，得到木炭和可燃气体。",
        required_items: [
            { key: "wood", quantity: 1 }
        ],
        required_container: "clay_pot",
        required_actions: "dry_distillation",
        required_techs: ["pottery"],
        time_required: 30,
        products: [
            { key: "charcoal", multiple: 1 },
            { key: "carbon_monoxide", multiple: 1 }
        ]
    },
    {
        name: "制作粘土",
        key: "clay_production",
        description: "将泥土和水混合，得到粘土。",
        required_items: [
            { key: "mud", quantity: 1 },
            { key: "water", quantity: 1 }
        ],
        required_actions: "stirring",
        time_required: 10,
        products: [
            { key: "clay", multiple: 1 }
        ]
    }
];