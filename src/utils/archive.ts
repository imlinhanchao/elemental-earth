import EncryptedStorage from './storage';
import { usePackStore } from '@/stores/modules/pack';
import { useStateStore } from '@/stores/modules/state';
import { useTaskStore } from '@/stores/modules/task';
import { useLogStore } from '@/stores/modules/log';
import { useFragmentStore } from '@/stores/modules/fragment';
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
  formulas: string[];
  /** 玩家曾拥有过的物品 key 列表（v1 新增） */
  discovered: string[];
  /** 玩家自定义的物品命名和备注（v2 新增） */
  renames: Record<string, { customName: string; note: string }>;
  /** 行动冷却时间戳（v3 新增） */
  cooldowns: Record<string, number>;
  /** 行动替代材料选择（v4 新增） */
  materialChoices?: Record<string, string>;
  /** 行动批量执行数量（v4 新增） */
  batchCounts?: Record<string, number>;
  /** 玩家收集的手稿（碎片） key 列表 */
  fragments: string[];
  /** 未读手稿列表 */
  unreadFragments: string[];
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
    const fragmentStore = useFragmentStore();

    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      state: { ...stateStore.state },
      items: JSON.parse(JSON.stringify(packStore.items)),
      techs: JSON.parse(JSON.stringify(packStore.techs)),
      tasks: JSON.parse(JSON.stringify(taskStore.tasks)),
      logs: JSON.parse(JSON.stringify(logStore.logs)),
      formulas: JSON.parse(JSON.stringify(packStore.provenFormulas)),
      discovered: Array.from(packStore.discoveredItems),
      renames: JSON.parse(JSON.stringify(packStore.itemRenames)),
      cooldowns: JSON.parse(JSON.stringify(packStore.cooldowns)),
      materialChoices: JSON.parse(JSON.stringify(packStore.materialChoices)),
      batchCounts: JSON.parse(JSON.stringify(packStore.batchCounts)),
      fragments: JSON.parse(JSON.stringify(fragmentStore.fragments)),
      unreadFragments: JSON.parse(JSON.stringify(fragmentStore.unreadFragments)),
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
    // 版本检查：拒绝加载未来版本的存档，支持加载旧版本并自动升级
    if (data.version > SAVE_VERSION) {
      console.warn(`存档版本太新: 存档 v${data.version}，当前支持 v${SAVE_VERSION}，请更新程序`);
      return false;
    }

    const packStore = usePackStore();
    const stateStore = useStateStore();
    const taskStore = useTaskStore();
    const logStore = useLogStore();
    const fragmentStore = useFragmentStore();

    // 恢复地图状态
    stateStore.state.map = data.state.map;

    // 恢复地图切换进度（旧存档可能没有这些字段）
    if (data.state.switchingTarget) {
      stateStore.state.switchingTarget = data.state.switchingTarget;
      stateStore.state.switchStartTime = data.state.switchStartTime;
      stateStore.state.switchDuration = data.state.switchDuration;
    }
    stateStore.state.elements = data.state.elements || [];
    // 恢复时代（旧存档可能没有此字段）
    if (data.state.currentEra) stateStore.state.currentEra = data.state.currentEra;
    if (Array.isArray(data.state.completedMilestones)) stateStore.state.completedMilestones = data.state.completedMilestones;

    // 恢复手稿（碎片）
    fragmentStore.fragments = data.fragments || [];
    fragmentStore.unreadFragments = data.unreadFragments || [];

    // 恢复背包物品
    packStore.items.splice(0, packStore.items.length, ...data.items);

    // 恢复已解锁科技
    packStore.techs.splice(0, packStore.techs.length, ...data.techs);

    // 恢复任务队列
    taskStore.tasks.splice(0, taskStore.tasks.length, ...data.tasks);

    // 恢复日志
    logStore.logs.splice(0, logStore.logs.length, ...data.logs);

    // 恢复已验证配方（旧存档可能没有此字段）
    if (Array.isArray(data.formulas)) {
      packStore.provenFormulas.splice(0, packStore.provenFormulas.length, ...data.formulas);
    }

    // 恢复曾拥有物品记录（v1 新增），兼容旧存档则从 items 推算
    packStore.discoveredItems.clear();
    if (Array.isArray(data.discovered)) {
      for (const k of data.discovered) packStore.discoveredItems.add(k);
    }
    // 兜底：当前背包里的物品肯定被拥有过
    for (const item of packStore.items) {
      packStore.discoveredItems.add(item.key);
    }

    // 恢复物品自定义命名和备注（v2 新增）
    if (data.renames) {
      for (const [k, v] of Object.entries(data.renames)) {
        packStore.itemRenames[k] = v;
        // 同步背包中的 name
        const packItem = packStore.items.find(i => i.key === k);
        if (packItem && v.customName) packItem.name = v.customName;
      }
    }

    // 恢复行动冷却（v3 新增）
    if (data.cooldowns) {
      Object.assign(packStore.cooldowns, data.cooldowns)
    }

    // 恢复行动选项与批量设置（v4 新增）
    if (data.materialChoices) {
      Object.assign(packStore.materialChoices, data.materialChoices)
    }
    if (data.batchCounts) {
      Object.assign(packStore.batchCounts, data.batchCounts)
    }

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

/** 删除新手引导相关存档数据 */
export function deleteTutorialData(): void {
  storage.removeItem('tutorial_status');
  storage.removeItem('tutorial_step');
  storage.removeItem('tutorial_max_step');
}

/** 导出存档为加密 + base64 字符串 */
export function exportSaveData(): string | null {
  try {
    const fullKey = 'es_' + SAVE_KEY;
    const encrypted = localStorage.getItem(fullKey);
    if (!encrypted) { alert('没有存档数据可导出'); return null; }
    return btoa(unescape(encodeURIComponent(encrypted)));
  } catch (e) {
    console.error('导出存档失败:', e);
    alert('导出失败: ' + (e as Error).message);
    return null;
  }
}

/** 下载存档文件 */
export function downloadSaveData(): void {
  const data = exportSaveData();
  if (!data) return;
  const blob = new Blob([data], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `elemental-earth-save-${new Date().toISOString().slice(0, 10)}.sav`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 从 base64 字符串导入存档 */
export function importSaveDataFromText(text: string): boolean {
  try {
    const raw = decodeURIComponent(escape(atob(text.trim())));
    // 校验：AES 加密数据以 "U2FsdGVkX1" 的 base64 形式开头
    if (!raw.startsWith('U2FsdGVkX1')) {
      alert('无效的存档数据：格式不正确');
      return false;
    }
    stopAutoSave();
    const fullKey = 'es_' + SAVE_KEY;
    localStorage.setItem(fullKey, raw);
    alert('存档已导入，页面将重新加载');
    window.location.reload();
    return true;
  } catch (e) {
    alert('导入失败: ' + (e as Error).message);
    return false;
  }
}

/** 从文件导入存档（支持 .sav 加密格式 和 .json 明文格式） */
export function importSaveDataFromFile(): Promise<boolean> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sav,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(false); return; }
      try {
        const text = await file.text();
        // 尝试作为加密 base64 导入
        try {
          const raw = decodeURIComponent(escape(atob(text.trim())));
          if (raw.startsWith('U2FsdGVkX1')) {
            stopAutoSave();
            localStorage.setItem('es_' + SAVE_KEY, raw);
            alert('存档已导入，页面将重新加载');
            window.location.reload();
            resolve(true); return;
          }
        } catch {}
        // 尝试作为明文 JSON（旧格式兼容）
        const data = JSON.parse(text) as SaveData;
        if (!data.version || !data.state || !Array.isArray(data.items)) {
          alert('无效的存档文件');
          resolve(false); return;
        }
        storage.setItem(SAVE_KEY, data);
        alert('存档已导入，页面将重新加载');
        window.location.reload();
        resolve(true);
      } catch (e) {
        alert('导入失败: ' + (e as Error).message);
        resolve(false);
      }
    };
    input.click();
  });
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
