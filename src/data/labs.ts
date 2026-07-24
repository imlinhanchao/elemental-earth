import data from './labs.json'

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
    required_item?: { key: string | string[]; quantity: number, use?: number }[];
    /**
     * 前置科技
     */
    required_techs?: string[];
    /**
     * 是否需要燃烧
     * true表示需要燃烧，false表示不需要，undefined表示不确定
     */
    requires_burning?: boolean;
    /**
     * 是否需要电力
     */
    requires_electricity?: boolean;
    /**
     * 可追加的操作 chain（构成实验链条）
     */
    chain_operations?: string[];
    /**
     * 是否作为追加操作（不消耗额外材料）
     */
    is_chain?: boolean;
    /**
     * 成功匹配配方时触发的时代里程碑 key
     */
    milestone?: string;
}

const baseLabActions: ILabAction[] = data as ILabAction[];
export const LabActions: ILabAction[] = [...baseLabActions];

let labMap = new Map<string, ILabAction>(LabActions.map(l => [l.key, l]));

function rebuildLabMap(): void {
    labMap = new Map<string, ILabAction>(LabActions.map(l => [l.key, l]));
}

export function replaceLabActions(next: ILabAction[]): void {
    LabActions.splice(0, LabActions.length, ...next);
    rebuildLabMap();
}

export function getLab(key: string) {
    return labMap.get(key);
}
