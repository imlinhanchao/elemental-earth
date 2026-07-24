import tipsData from './tips.json'

export interface ITip {
  id: string
  content: string
  /** 要求的最小时代 Key */
  era?: string
  /** 暗示的物品 Key */
  item?: string
}

/**
 * 游戏小贴士数据
 */
const baseTips: ITip[] = tipsData as ITip[]
export const tips: ITip[] = [...baseTips]

export function replaceTips(next: ITip[]): void {
  tips.splice(0, tips.length, ...next)
}
