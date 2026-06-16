export interface ILabAction {
    /** 实验操作名称 */
    name: string;
    /** 
     * 唯一标识符 
     **/
    key: string;
    /** 
     * 描述 
     **/
    description: string;
    /** 
     * 所需时间（秒）0 表示可自定义 
     **/
    time_required: number;
    /** 
     * 所需物品
     */
    required_item?: { key: string; quantity: number, use?: number }[];
    /**
     * 前置科技
     */
    required_techs?: string[];
    /**
     * 是否需要燃烧
     * true表示需要燃烧，false表示不需要，undefined表示不确定
     */
    requires_burning?: boolean;
}

export const LabActions: ILabAction[] = [
    { 
        name: "干馏", 
        key: "dry_distillation", 
        description: "将物体在缺氧条件下加热，产生可燃气体和炭化物。", 
        time_required: 30, 
        required_item: [{ key: "clay_pot", quantity: 1, use: 0.1 }],
        required_techs: ["pottery"],
        requires_burning: true
    },
    {
        name: "搅拌",
        key: "stirring",
        description: "将物体混合在一起，以促进化学反应或物理变化。",
        time_required: 10,
        requires_burning: false
    },
    {
        name: "焙烧",
        key: "roasting",
        description: "将物体在有氧条件下加热，促进化学反应或物理变化。",
        time_required: 20,
        required_item: [{ key: "kiln", quantity: 1, use: 0.1 }],
        requires_burning: true
    },
    {
        name: "加热",
        key: "heating",
        description: "对物体进行加热，以促进化学反应或物理变化。",
        time_required: 20,
        requires_burning: true
    }
];