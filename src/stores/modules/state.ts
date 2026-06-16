import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';
import { Maps } from '@/data/maps';
import { useLogStore } from '@/stores/modules/log';
import { getElementById } from '@/data/elements';

export interface IGameState {
  map: string;
  switchingTarget: string | null;
  switchStartTime: number;
  switchDuration: number;
  elements?: number[]; // 已点亮的元素列表，元素编号对应周期表
}

/** 曼哈顿距离 -> 耗时毫秒的倍率 */
const TIME_PER_DISTANCE = 100;

export const useStateStore = defineStore('state', () => {
  const logStore = useLogStore()
  const state = reactive<IGameState>({
    map: Maps[Math.floor(Math.random() * Maps.length)].key,
    switchingTarget: null,
    switchStartTime: 0,
    switchDuration: 0,
    elements: [], // 已点亮的元素列表，元素编号对应周期表
  });

  const getState = computed(() => state);

  const getMap = computed(() => Maps.find(m => m.key === state.map) || null);

  const setMap = (mapKey: string) => {
    if (Maps.find(m => m.key === mapKey)) {
      state.map = mapKey;
    } else {
      console.warn(`尝试设置未知地图: ${mapKey}`);
    }
  }

  // ---- 地图切换过程状态 ----
  const isSwitching = computed(() => state.switchingTarget !== null)
  const now = ref(Date.now())
  setInterval(() => now.value = Date.now(), 100) // 定时更新当前时间，触发切换进度计算

  const switchProgress = computed(() => {
    if (state.switchingTarget === null || state.switchDuration === 0) return 0
    const elapsed = now.value - state.switchStartTime
    return Math.min(1, elapsed / state.switchDuration)
  })

  const getSwitchTargetMap = computed(() => {
    if (!state.switchingTarget) return null
    return Maps.find(m => m.key === state.switchingTarget) || null
  })

  /** 计算从当前地图到目标地图所需的切换时间（毫秒） */
  function calcSwitchDuration(fromKey: string, toKey: string): number {
    const from = Maps.find(m => m.key === fromKey)
    const to = Maps.find(m => m.key === toKey)
    if (!from || !to) return 0
    const dist = Math.abs(from.position.x - to.position.x) + Math.abs(from.position.y - to.position.y)
    return dist * TIME_PER_DISTANCE
  }

  /** 开始切换地图 */
  function startSwitch(targetKey: string) {
    if (targetKey === state.map) return
    const duration = calcSwitchDuration(state.map, targetKey)
    state.switchingTarget = targetKey
    state.switchStartTime = Date.now()
    state.switchDuration = duration
    logStore.addLog(`开始切换地图至 ${Maps.find(m => m.key === targetKey)?.name || targetKey}`, 'process')
  }

  /** 取消切换地图 */
  function cancelSwitch() {
    const targetName = getSwitchTargetMap.value?.name || state.switchingTarget || ''
    state.switchingTarget = null
    state.switchStartTime = 0
    state.switchDuration = 0
    if (targetName) {
      logStore.addLog(`取消切换地图至 ${targetName}`, 'process')
    }
  }

  /** 完成切换地图 */
  function completeSwitch() {
    if (!state.switchingTarget) return
    const targetName = getSwitchTargetMap.value?.name || state.switchingTarget
    state.map = state.switchingTarget
    state.switchingTarget = null
    state.switchStartTime = 0
    state.switchDuration = 0
    logStore.addLog(`切换地图完成，当前位于 ${getMap.value?.name || state.map}`, 'process')
  }

  const getElements = computed(() => state.elements);
  function addElement(element: number) {
    if (!state.elements) state.elements = [];
    if (!state.elements.includes(element)) {
      state.elements.push(element);
      logStore.addLog(`元素 ${getElementById(element)?.name || element} 已点亮！`, 'reward');
    }
  }

  return {
    state, getState, getMap, setMap, now,
    isSwitching, switchProgress, getSwitchTargetMap,
    calcSwitchDuration, startSwitch, cancelSwitch, completeSwitch, 
    getElements, addElement,
  }
})

export const useStateStoreWithOut = once(() => useStateStore(store));
