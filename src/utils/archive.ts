import EncryptedStorage from './storage';
import { usePackStore } from '@/stores/modules/pack';
import { useStateStore } from '@/stores/modules/state';
import { useTaskStore } from '@/stores/modules/task';
import { useLogStore } from '@/stores/modules/log';
import { useFragmentStore } from '@/stores/modules/fragment';
import { useProductionStore } from '@/stores/modules/production';
import type { IPackItem, IManuscriptGroup } from '@/stores/modules/pack';
import type { IGameState } from '@/stores/modules/state';
import type { ITask } from '@/stores/modules/task';
import type { ILog } from '@/stores/modules/log';
import type { IProductionLine, IProductionLineStep } from '@/stores/modules/production';
import { ref } from 'vue';
import { shortTime } from './date';
import { gameSDK } from './sdk';

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
  tasksMap?: Record<string, ITask[]>;
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
  /** 玩家已执行过的行动 key 列表 */
  performedActions?: string[];
  /** 玩家收集的手稿（碎片） key 列表 */
  fragments: string[];
  /** 未读手稿列表 */
  unreadFragments: string[];
  /** 生产线草稿（v6 新增） */
  productionDraft?: IProductionLineStep[];
  /** 生产线列表（v5 新增） */
  productionLines?: IProductionLine[];
  /** 玩家手札分组（v7 新增） */
  manuscripts?: IManuscriptGroup[];
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
    const productionStore = useProductionStore();

    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      state: { ...stateStore.state },
      items: JSON.parse(JSON.stringify(packStore.items)),
      techs: JSON.parse(JSON.stringify(packStore.techs)),
      tasks: [], // 保持向下兼容
      tasksMap: JSON.parse(JSON.stringify(taskStore.tasksMap)),
      logs: JSON.parse(JSON.stringify(logStore.logs)),
      formulas: JSON.parse(JSON.stringify(packStore.provenFormulas)),
      discovered: Array.from(packStore.discoveredItems),
      renames: JSON.parse(JSON.stringify(packStore.itemRenames)),
      cooldowns: JSON.parse(JSON.stringify(packStore.cooldowns)),
      materialChoices: JSON.parse(JSON.stringify(packStore.materialChoices)),
      batchCounts: JSON.parse(JSON.stringify(packStore.batchCounts)),
      performedActions: Array.from(packStore.performedActions),
      fragments: JSON.parse(JSON.stringify(fragmentStore.fragments)),
      unreadFragments: JSON.parse(JSON.stringify(fragmentStore.unreadFragments)),
      productionDraft: JSON.parse(JSON.stringify(productionStore.draftSteps)),
      productionLines: JSON.parse(JSON.stringify(productionStore.productionLines)),
      manuscripts: JSON.parse(JSON.stringify(packStore.manuscripts)),
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
    const productionStore = useProductionStore();

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
    if (data.state.eraDetailsSeen !== undefined) stateStore.state.eraDetailsSeen = data.state.eraDetailsSeen;

    // 恢复手稿（碎片）
    fragmentStore.fragments = data.fragments || [];
    fragmentStore.unreadFragments = data.unreadFragments || [];

    // 恢复背包物品
    packStore.items.splice(0, packStore.items.length, ...data.items);

    // 恢复已解锁科技
    packStore.techs.splice(0, packStore.techs.length, ...data.techs);

    // 恢复任务队列（支持多地图任务迁移）
    if (data.tasksMap) {
      // 清空旧任务
      for (const key in taskStore.tasksMap) {
        delete taskStore.tasksMap[key];
      }
      Object.assign(taskStore.tasksMap, data.tasksMap);
    } else if (data.tasks) {
      // 旧版本迁移到当前地图
      for (const key in taskStore.tasksMap) {
        delete taskStore.tasksMap[key];
      }
      const currentMap = data.state.map || stateStore.state.map || 'woods';
      taskStore.tasksMap[currentMap] = data.tasks;
    }

    // 恢复日志
    logStore.logs.splice(0, logStore.logs.length, ...data.logs);

    // 恢复已验证配方（旧存档可能没有此字段）
    if (Array.isArray(data.formulas)) {
      packStore.provenFormulas.splice(0, packStore.provenFormulas.length, ...data.formulas);
    }

    // 恢复已执行行动记录
    packStore.performedActions.clear();
    if (Array.isArray(data.performedActions)) {
      for (const k of data.performedActions) packStore.performedActions.add(k);
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

    // 恢复生产线（v5 新增）
    if (Array.isArray(data.productionLines)) {
      productionStore.productionLines.splice(0, productionStore.productionLines.length, ...data.productionLines);
    }

    // 恢复生产线草稿（v6 新增）
    if (Array.isArray(data.productionDraft)) {
      productionStore.draftSteps.splice(0, productionStore.draftSteps.length, ...data.productionDraft);
    }

    // --- 迁移之前的遗留生产线数据 (如果有) ---
    const legacyProductionKey = 'production_lines';
    const legacyData = localStorage.getItem(legacyProductionKey);
    if (legacyData) {
      try {
        const parsed = JSON.parse(legacyData);
        if (Array.isArray(parsed)) {
          // 合并到当前生产线列表中，避免 ID 重复
          const existingIds = new Set(productionStore.productionLines.map(l => l.id));
          for (const line of parsed) {
            if (line && line.id && Array.isArray(line.steps)) {
              if (existingIds.has(line.id)) {
                line.id = Date.now() + Math.random().toString(36).substr(2, 9);
              }
              productionStore.productionLines.push(line);
              existingIds.add(line.id);
            }
          }
          console.log(`成功从 localStorage 迁移了 ${parsed.length} 条生产线数据`);
        }
        // 迁移完成后删除旧数据
        localStorage.removeItem(legacyProductionKey);
      } catch (e) {
        console.error('迁移遗留生产线数据失败:', e);
      }
    }

    // 恢复手札分组（v7 新增）
    if (Array.isArray(data.manuscripts)) {
      packStore.manuscripts.splice(0, packStore.manuscripts.length, ...data.manuscripts);
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
  a.download = `elemental-earth-save-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 从 base64 字符串导入存档 */
export function importSaveDataFromText(text: string, silent: boolean = false): boolean {
  try {
    const raw = decodeURIComponent(escape(atob(text.trim())));
    // 校验：AES 加密数据以 "U2FsdGVkX1" 的 base64 形式开头
    if (!raw.startsWith('U2FsdGVkX1')) {
      if (!silent) alert('无效的存档数据：格式不正确');
      return false;
    }
    stopAutoSave();
    const fullKey = 'es_' + SAVE_KEY;
    localStorage.setItem(fullKey, raw);
    if (!silent) {
      alert('存档已导入，页面将重新加载');
    }
    window.location.reload();
    return true;
  } catch (e) {
    if (!silent) alert('导入失败: ' + (e as Error).message);
    return false;
  }
}

/** 从文件导入存档（支持 .txt 加密格式 和 .json 明文格式） */
export function importSaveDataFromFile(): Promise<boolean> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json';
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

/** 手动上传存档到云端 */
export async function uploadCloudArchive(): Promise<boolean> {
  if (!gameSDK.getToken()) {
    alert('请先登录后再进行云端同步');
    return false;
  }
  
  try {
    // 确保本地先保存一次最新的
    saveGame();
    
    const encrypted = localStorage.getItem('es_' + SAVE_KEY);
    if (!encrypted) {
      alert('没有本地存档可供上传');
      return false;
    }
    
    const base64 = btoa(unescape(encodeURIComponent(encrypted)));
    await gameSDK.saveArchive(base64);
    alert('存档云端同步成功');
    return true;
  } catch (e) {
    console.error('上传存档失败:', e);
    alert('上传失败: ' + (e as Error).message);
    return false;
  }
}

/** 手动从云端拉取存档 */
export async function pullCloudArchive(): Promise<boolean> {
  if (!gameSDK.getToken()) {
    alert('请先登录后再进行云端同步');
    return false;
  }
  
  try {
    const cloudArchive = await gameSDK.getArchive();
    if (!cloudArchive) {
      alert('云端没有找到存档记录');
      return false;
    }
    
    const { content: cloudBase64, updatedAt } = cloudArchive;
    const timeStr = new Date(updatedAt).toLocaleString();
    
    if (confirm(`确定要从云端拉取存档吗？\n\n云端时间：${timeStr}\n注意：拉取后将覆盖当前本地进度并重新加载页面。`)) {
      return importSaveDataFromText(cloudBase64, false);
    }
    return false;
  } catch (e) {
    console.error('拉取存档失败:', e);
    alert('拉取失败: ' + (e as Error).message);
    return false;
  }
}

/**
 * 同步云端存档
 * @param silent - 是否静默同步。若为 true (自动同步)，仅当云端更新时静默拉取；若为 false (刚登录)，只要有差异就弹窗提醒。
 */
export async function syncCloudArchive(silent: boolean = false): Promise<void> {
  if (!gameSDK.getToken()) return;

  try {
    const cloudArchive = await gameSDK.getArchive();
    if (!cloudArchive) {
      // 云端没有存档，将当前本地存档上传
      if (!silent) saveGame();
      return;
    }

    const { content: cloudBase64, updatedAt } = cloudArchive;
    const cloudTime = new Date(updatedAt).getTime();
    
    // 获取本地状态用于对比
    const localEncrypted = localStorage.getItem('es_' + SAVE_KEY);
    const localBase64 = localEncrypted ? btoa(unescape(encodeURIComponent(localEncrypted))) : null;
    const localData = storage.getItem<SaveData>(SAVE_KEY);
    const localTime = localData ? localData.timestamp : 0;

    // 如果内容一致，无需任何操作
    if (cloudBase64 === localBase64) return;

    if (!silent) {
      // 刚登录情况：无论时间戳，只要内容不同就提醒
      const timeStr = new Date(cloudTime).toLocaleString();
      if (confirm(`发现云端有存档（更新于 ${timeStr}），是否同步到本地？\n\n注意：此操作将覆盖当前本地进度。`)) {
        importSaveDataFromText(cloudBase64, false);
      }
    } else {
      // 页面加载自动同步：只有云端比本地新时才静默同步
      if (cloudTime > localTime) {
        console.log('检测到云端存档较新，正在静默同步...');
        importSaveDataFromText(cloudBase64, true);
      }
    }
  } catch (e) {
    console.error('同步云端存档失败:', e);
  }
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
