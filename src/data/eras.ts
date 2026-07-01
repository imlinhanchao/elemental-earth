import data from './eras.json'

export interface IEraMilestone {
  /** 里程碑唯一标识符 */
  key: string
  /** 里程碑描述 */
  description: string
}

export interface IEra {
  /** 时代唯一标识符 */
  key: string
  /** 时代名称 */
  name: string
  /** 时代图标（Iconify 图标名） */
  icon: string
  /** 时代描述 */
  description: string
  /** 显示顺序 */
  order: number
  /** 晋级所需达成的里程碑 */
  milestones: IEraMilestone[]
}

export const Eras: IEra[] = data as IEra[]

export function getEra(key: string): IEra | undefined {
  return Eras.find(e => e.key === key)
}
