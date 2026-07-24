import data from './maps.json'

export interface IMap {
  /**
   * 图标
   */
  icon?: string;
  /**
   * 地图名称
   */
  name: string;
  /**
   * 地图唯一标识符
   */
  key: string;
  /**
   * 地图描述
   */
  description: string;
  /**
   * 地图位置
   */
  position: { x: number; y: number };
}

const baseMaps: IMap[] = data as IMap[];
export const Maps: IMap[] = [...baseMaps];

export function replaceMaps(next: IMap[]): void {
  Maps.splice(0, Maps.length, ...next);
}
