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

const baseEras: IEra[] = data as IEra[]
export const Eras: IEra[] = [...baseEras]

let eraMap = new Map<string, IEra>(Eras.map(e => [e.key, e]))

function rebuildEraMap(): void {
  eraMap = new Map<string, IEra>(Eras.map(e => [e.key, e]))
}

export function replaceEras(next: IEra[]): void {
  Eras.splice(0, Eras.length, ...next)
  rebuildEraMap()
}

export function getEra(key: string): IEra | undefined {
  return eraMap.get(key)
}
