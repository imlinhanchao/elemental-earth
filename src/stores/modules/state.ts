import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';
import { Maps } from '@/data/maps';
import { useLogStore } from '@/stores/modules/log';
import { useTaskStore } from '@/stores/modules/task';
import { getElementById } from '@/data/elements';
import { Eras, type IEra } from '@/data/eras';

export interface IGameState {
  map: string;
  switchingTarget: string | null;
  switchStartTime: number;
  switchDuration: number;
  elements?: number[]; // 已点亮的元素列表，元素编号对应周期表
  currentEra: string; // 当前时代 key
  completedMilestones: string[]; // 已完成的里程碑 key 列表
  allowedMapKeys: string[] | null; // 允许显示的地图 key 列表（用于教程引导）
  eraDetailsSeen?: boolean; // 是否已点击查看过纪元详情
  /** 统计数据 */
  stats: {
    mining: number;      // 挖掘/爆破次数
    woodcutting: number; // 伐木次数
    water: number;       // 打水次数
    hunting: number;     // 狩猎次数
  }
}

export const useStateStore = defineStore('state', () => {
  const logStore = useLogStore()
  const state = reactive<IGameState>({
    map: 'mountain',
    switchingTarget: null,
    switchStartTime: 0,
    switchDuration: 0,
    elements: [],
    currentEra: 'stone',
    completedMilestones: [],
    allowedMapKeys: null,
    eraDetailsSeen: false,
    stats: {
      mining: 0,
      woodcutting: 0,
      water: 0,
      hunting: 0
    }
  });

  const getState = computed(() => state);

  /** 当前时代数据 */
  const currentEra = computed<IEra | undefined>(() => Eras.find(e => e.key === state.currentEra))

  /** 曼哈顿距离 -> 耗时毫秒的倍率，随时代演进减少 */
  const timePerDistance = computed(() => {
    const order = currentEra.value?.order || 0
    return Math.max(25, 100 - order * 15)
  })

  /** 可见地图列表（支持教程引导过滤） */
  const availableMaps = computed(() => {
    if (state.allowedMapKeys) {
      return Maps.filter(m => state.allowedMapKeys!.includes(m.key))
    }
    return Maps
  })

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
    return dist * timePerDistance.value
  }

  /** 开始切换地图（任务列表不为空时禁止切换） */
  function startSwitch(targetKey: string) {
    if (targetKey === state.map) return
    const { tasks } = useTaskStore()
    const duration = calcSwitchDuration(state.map, targetKey)
    state.switchingTarget = targetKey
    state.switchStartTime = Date.now()
    state.switchDuration = duration
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
  }

  const getElements = computed(() => state.elements);

  /** 等待命名的元素发现队列（由 addElement 触发，UI 消费后清除） */
  const discoveryQueue = reactive<number[]>([])

  function addElement(element: number) {
    if (!state.elements) state.elements = [];
    if (!state.elements.includes(element)) {
      state.elements.push(element);
      if (!discoveryQueue.includes(element)) {
        discoveryQueue.push(element);
      }
      logStore.addLog(`元素 ${getElementById(element)?.name || element} 已点亮！`, 'elements');
    }
  }

  /** 记录动作统计 */
  function recordAction(actionKey: string) {
    if (actionKey === 'mining' || actionKey === 'blasting' || actionKey === 'directional_blasting') {
      state.stats.mining++;
    } else if (actionKey === 'chop_wood' || actionKey === 'chop_trees') {
      state.stats.woodcutting++;
    } else if (actionKey === 'fetch_water') {
      state.stats.water++;
    } else if (actionKey === 'hunting') {
      state.stats.hunting++;
    }
  }

  function clearPendingDiscovery() {
    discoveryQueue.shift();
  }

  // ─── 时代系统 ────────────────────────────────────────────────

  /** 下一个时代 */
  const nextEra = computed<IEra | undefined>(() => {
    const cur = currentEra.value
    if (!cur) return undefined
    return Eras.find(e => e.order === cur.order + 1)
  })

  /** 当前时代已完成的里程碑数（只统计属于当前时代的） */
  const completedMilestoneCount = computed(() => {
    const eraKeys = currentEra.value?.milestones.map(m => m.key) || []
    return state.completedMilestones.filter(k => eraKeys.includes(k)).length
  })

  /** 当前时代总里程碑数 */
  const totalMilestoneCount = computed(() => currentEra.value?.milestones.length || 1)

  /** 晋级进度（0-1） */
  const eraProgress = computed(() => completedMilestoneCount.value / totalMilestoneCount.value)

  /** 完成一个里程碑 */
  function completeMilestone(key: string) {
    if (state.completedMilestones.includes(key)) return
    state.completedMilestones.push(key)
    logStore.addLog(`里程碑达成: ${Eras.map(e => e.milestones).flat().find(m => m.key === key)?.description || key}`, 'reward')
    // 检查是否可以晋级
    if (currentEra.value && completedMilestoneCount.value >= currentEra.value!.milestones.length) {
      pendingEraTransition.value = currentEra.value.key
      logStore.addLog(`✨ 你的文明进入了「${currentEra.value.name}」`, 'elements')
      if (nextEra.value) state.currentEra = nextEra.value.key
    }
  }

  /** 等待播放的时代晋级动画 */
  const pendingEraTransition = ref<string | null>(null)

  function clearEraTransition() {
    pendingEraTransition.value = null
  }

  function markEraDetailsSeen() {
    state.eraDetailsSeen = true
  }

  /** 检查并完成里程碑（外部调用：物品获得、科技研究等） */
  function checkMilestone(milestoneKey: string) {
    if (!state.completedMilestones.includes(milestoneKey)) {
      completeMilestone(milestoneKey)
    }
  }

  return {
    state, getState, getMap, setMap, now,
    availableMaps,
    isSwitching, switchProgress, getSwitchTargetMap,
    calcSwitchDuration, startSwitch, cancelSwitch, completeSwitch, 
    getElements, addElement, recordAction, discoveryQueue, clearPendingDiscovery,
    currentEra, timePerDistance, nextEra, eraProgress, completedMilestoneCount, totalMilestoneCount,
    pendingEraTransition, clearEraTransition, checkMilestone, markEraDetailsSeen
  }
})

export const useStateStoreWithOut = once(() => useStateStore(store));
