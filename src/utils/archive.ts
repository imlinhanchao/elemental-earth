import EncryptedStorage from './storage';
import { usePackStore } from '@/stores/modules/pack';
import { useStateStore } from '@/stores/modules/state';
import { useTaskStore } from '@/stores/modules/task';
import { useLogStore } from '@/stores/modules/log';
import type { IPackItem } from '@/stores/modules/pack';
import type { IGameState } from '@/stores/modules/state';
import type { ITask } from '@/stores/modules/task';
import type { ILog } from '@/stores/modules/log';
import { ref } from 'vue';
import { shortTime } from './date';

const storage = new EncryptedStorage();
const SAVE_KEY = 'game_save_data';
const SAVE_VERSION = 1;
const AUTO_SAVE_INTERVAL = 30000; // 30 秒（saveGame 为同步操作，无需担心并发）

export interface SaveData {
  version: number;
  timestamp: number;
  state: IGameState;
  items: IPackItem[];
  techs: string[];
  tasks: ITask[];
  logs: ILog[];
}

/** 上次保存时间（毫秒时间戳），用于 UI 反馈 */
export const lastSavedTime = ref<number | null>(null);

/**
 * 保存游戏 —— 序列化所有游戏 Store 的状态并持久化
 */
export function saveGame(): boolean {
  try {
    const packStore = usePackStore();
    const stateStore = useStateStore();
    const taskStore = useTaskStore();
    const logStore = useLogStore();

    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      state: { ...stateStore.state },
      items: JSON.parse(JSON.stringify(packStore.items)),
      techs: JSON.parse(JSON.stringify(packStore.techs)),
      tasks: JSON.parse(JSON.stringify(taskStore.tasks)),
      logs: JSON.parse(JSON.stringify(logStore.logs)),
    };

    storage.setItem(SAVE_KEY, data);
    lastSavedTime.value = Date.now();
    return true;
  } catch (e) {
    console.error('保存游戏失败:', e);
    return false;
  }
}

/**
 * 加载游戏 —— 从持久化存储恢复所有游戏 Store 的状态
 */
export function loadGame(): boolean {
  try {
    const data = storage.getItem<SaveData>(SAVE_KEY);
    if (!data) return false;
    // 版本不匹配时拒绝加载旧存档，防止数据结构变更导致崩溃
    if (data.version !== SAVE_VERSION) {
      console.warn(`存档版本不匹配: 当前 v${SAVE_VERSION}，存档 v${data.version}，跳过加载`);
      return false;
    }

    const packStore = usePackStore();
    const stateStore = useStateStore();
    const taskStore = useTaskStore();
    const logStore = useLogStore();

    // 恢复地图状态
    stateStore.state.map = data.state.map;

    // 恢复地图切换进度（旧存档可能没有这些字段）
    if (data.state.switchingTarget) {
      stateStore.state.switchingTarget = data.state.switchingTarget;
      stateStore.state.switchStartTime = data.state.switchStartTime;
      stateStore.state.switchDuration = data.state.switchDuration;
    }

    // 恢复背包物品
    packStore.items.splice(0, packStore.items.length, ...data.items);

    // 恢复已解锁科技
    packStore.techs.splice(0, packStore.techs.length, ...data.techs);

    // 恢复任务队列
    taskStore.tasks.splice(0, taskStore.tasks.length, ...data.tasks);

    // 恢复日志
    logStore.logs.splice(0, logStore.logs.length, ...data.logs);

    lastSavedTime.value = data.timestamp;
    return true;
  } catch (e) {
    console.error('加载游戏失败:', e);
    return false;
  }
}

/** 检查是否存在存档数据 */
export function hasSaveData(): boolean {
  return storage.hasItem(SAVE_KEY);
}

/** 删除存档数据 */
export function deleteSaveData(): void {
  storage.removeItem(SAVE_KEY);
  lastSavedTime.value = null;
}

/** 获取格式化的上次保存描述（用于按钮 tooltip） */
export function getLastSavedLabel(): string {
  if (lastSavedTime.value === null) return '尚未保存';
  const elapsed = Math.floor((Date.now() - lastSavedTime.value) / 1000);
  if (elapsed < 5) return '刚刚保存';
  return `${shortTime(elapsed)}前保存`;
}

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let hasLoaded = false;
let beforeUnloadHandler: (() => void) | null = null;

/**
 * 初始化自动存档：
 * 1. 尝试加载已有存档
 * 2. 启动定时自动保存
 * 3. 注册页面关闭前保存
 */
export function initAutoSave(): void {
  // 加载已有存档（仅首次挂载时执行一次）
  if (!hasLoaded) {
    loadGame();
    hasLoaded = true;
  }

  // 周期自动保存
  if (autoSaveTimer === null) {
    autoSaveTimer = setInterval(() => {
      saveGame();
    }, AUTO_SAVE_INTERVAL);
  }

  // 关闭前保存
  if (beforeUnloadHandler === null) {
    beforeUnloadHandler = () => {
      saveGame();
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
  }
}

/** 停止自动存档（清理定时器和事件监听） */
export function stopAutoSave(): void {
  if (autoSaveTimer !== null) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
  if (beforeUnloadHandler !== null) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    beforeUnloadHandler = null;
  }
}
