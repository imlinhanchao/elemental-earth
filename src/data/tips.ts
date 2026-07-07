import tipsData from './tips.json'

export interface ITip {
  id: string
  content: string
  /** 要求的最小时代 Key */
  era?: string
}

/**
 * 游戏小贴士数据
 */
export const tips: ITip[] = tipsData as ITip[]
