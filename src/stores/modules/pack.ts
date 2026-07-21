import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';
import { getItem, Items } from '@/data/items';
import { Techs } from '@/data/techs';
import { useStateStore } from './state';
import { useLogStore } from './log';
import { useAppStore } from './app';
export interface IPackItem {
  name: string;
  key: string;
  quantity: number;
  durable: number; // 耐久度，0-1之间，表示物品的使用程度
}

/** 玩家对物品的自定义命名和备注 */
export interface ItemCustomization {
  customName: string;
  note: string;
}

export const usePackStore = defineStore('pack', () => {
  const items = reactive<IPackItem[]>([]);
  const techs = reactive<string[]>([]);
  const provenFormulas = reactive<string[]>([])
  const discoveredItems = reactive<Set<string>>(new Set())
  /** 玩家已执行过的行动 key 列表 */
  const performedActions = reactive<Set<string>>(new Set())
  /** 玩家对物品的自定义命名和备注 key → { customName, note } */
  const itemRenames = reactive<Record<string, ItemCustomization>>({})
  /** 等待命名的发现物品队列（由 AddItem 触发，UI 消费后清除） */
  const discoveryQueue = reactive<string[]>([])
  /** 行动冷却结束时间戳 actionKey → timestamp */
  const cooldowns = reactive<Record<string, number>>({})
  /** 行动替代材料选择 actionKey_groupKey → itemKey */
  const materialChoices = reactive<Record<string, string>>({})
  /** 行动批量执行数量 actionKey → count */
  const batchCounts = reactive<Record<string, number>>({})

  const logStore = useLogStore();

  /** 检查玩家是否有具备储气功能的容器 */
  function hasGasContainer(): boolean {
    return items.some(i => {
      const def = Items.find(d => d.key === i.key);
      return !!def?.type.includes('container') && def?.attrs?.save_gas === true;
    });
  }

  const getItems = computed(() => items);
  const addItem = (itemKey: string, quantity: number, use: number = 0) => {
    const appStore = useAppStore();
    // 气体物品检查：没有 save_gas 容器则无法收集
    const itemData = Items.find(i => i.key === itemKey);
    let ret = true;
    if (itemData?.type.includes('gas') && !hasGasContainer()) {
      //logStore.addLog(`⚠️ 气体 ${getDisplayName(itemKey)} 无法收集——需要具备储气功能的容器`, 'warning');
      return false;
    }
    // 物品获得里程碑
    if (itemData?.milestone) {
      const stateStore = useStateStore();
      stateStore.checkMilestone(itemData.milestone)
    }
    const existingItem = items.find(i => i.key === itemKey);
    if (existingItem) {
      const itemData = Items.find(i => i.key === itemKey);
      if (itemData?.elemental) {
        const stateStore = useStateStore();
        stateStore.addElement(itemData.elemental);
      }
      if (use) {
        const durable = itemData?.durable ?? 1;
        existingItem.durable += use;
        if (existingItem.durable > durable) {
          existingItem.durable = existingItem.durable - durable;
          existingItem.quantity += 1;
        }
      } else {
        existingItem.quantity += quantity;
      }
      return true;
    } else {
      const itemData = Items.find(i => i.key === itemKey);
      if (itemData) {
        items.push({ name: itemData.name, key: itemKey, quantity, durable: itemData.durable ?? 1 });
        discoveredItems.add(itemKey);
        // 重大发现物品：触发命名弹窗（仅硬核模式开启时触发）
        if (itemData.is_discovery && !itemRenames[itemKey]) {
          if (appStore.hardMode) {
            if (!discoveryQueue.includes(itemKey)) {
              discoveryQueue.push(itemKey);
            }
            ret = false; // 阻止添加 log，等待命名
          }
        }
        if (itemData.elemental) {
          const stateStore = useStateStore();
          stateStore.addElement(itemData.elemental);
        }
      } else {
        console.warn(`尝试添加未知物品: ${itemKey}`);
      }
    }
    return ret;
  }
  const removeItem = (key: string, quantity: number, use: number = 0) => {
    const existingItem = items.find(i => i.key === key);
    if (existingItem) {
      // 气体材料被消耗时：归还一个集气瓶
      const itemDef = Items.find(d => d.key === key);
      if (itemDef?.type.includes('gas')) {
        addItem('gas_bottle', 1);
      }
      if (use > 0 && itemDef && itemDef.durable) {
        const maxDur = itemDef.durable;
        // 总计可用耐久为 (quantity - 1) * maxDur + currentDur
        let totalDur = (existingItem.quantity - 1) * maxDur + existingItem.durable;
        totalDur -= use;
        
        if (totalDur <= 0.0001) {
          existingItem.quantity = 0;
        } else {
          existingItem.quantity = Math.ceil(totalDur / maxDur);
          existingItem.durable = totalDur % maxDur || maxDur;
        }
      } else {
        existingItem.quantity -= quantity;
      }
      if (existingItem.quantity <= 0) {
        const index = items.findIndex(i => i.key === key);
        items.splice(index, 1);
      }
    }
  }

  const hasItem = (key: string, quantity: number = 1) => {
    const existingItem = items.find(i => i.key === key);
    return existingItem && existingItem.quantity >= quantity;
  }

  const getItemQuantity = (key: string) => {
    const existingItem = items.find(i => i.key === key);
    return existingItem ? existingItem.quantity : 0;
  }

  const getTotalDurability = (key: string) => {
    const existingItem = items.find(i => i.key === key);
    if (!existingItem) return 0;
    const itemData = getItem(key);
    if (!itemData || (!itemData.durable && itemData.durable !== 0)) return existingItem.quantity;
    const maxDur = itemData.durable || 1;
    return (existingItem.quantity - 1) * maxDur + existingItem.durable;
  }

  const getTechs = computed(() => techs);
  const addTech = (techKey: string) => {
    if (!techs.includes(techKey)) {
      techs.push(techKey);
    }
    // 科技研究里程碑
    const techData = Techs.find(t => t.key === techKey)
    if (techData?.milestone) {
      const stateStore = useStateStore();
      stateStore.checkMilestone(techData.milestone)
    }
  }
  const hasTech = (techKey: string) => techs.includes(techKey);

  const getProvenFormulas = computed(() => provenFormulas);
  const addProvenFormula = (formulaKey: string) => {
    if (!provenFormulas.includes(formulaKey)) {
      provenFormulas.push(formulaKey);
    }
  }
  const hasProvenFormula = (formulaKey: string) => provenFormulas.includes(formulaKey);

  /** 记录已执行过的行动 */
  const addPerformedAction = (actionKey: string) => performedActions.add(actionKey);
  /** 检查行动是否已执行过 */
  const hasPerformedAction = (actionKey: string) => performedActions.has(actionKey);

  /** 玩家是否曾经拥有过某物品（消耗光的也算） */
  const hasEverHad = (itemKey: string) => discoveredItems.has(itemKey);

  /** 获取物品的显示名称（优先使用自定义名称） */
  function getDisplayName(itemKey: string): string {
    const rename = itemRenames[itemKey];
    if (rename?.customName) return rename.customName;
    const def = Items.find(i => i.key === itemKey);
    return def?.name || itemKey;
  }

  function getItemNote(itemKey: string): string {
    const rename = itemRenames[itemKey];
    return rename?.note || '';
  }

  /** 设置物品自定义名称 */
  function setItemName(itemKey: string, name: string) {
    if (!itemRenames[itemKey]) itemRenames[itemKey] = { customName: '', note: '' };
    itemRenames[itemKey].customName = name;
    // 同步 items 中的 name
    const packItem = items.find(i => i.key === itemKey);
    if (packItem) packItem.name = name;
  }

  /** 设置物品备注 */
  function setItemNote(itemKey: string, note: string) {
    if (!itemRenames[itemKey]) itemRenames[itemKey] = { customName: '', note: '' };
    itemRenames[itemKey].note = note;
  }

  /** 清除等待命名的发现（弹出下一个） */
  function clearPendingDiscovery() {
    discoveryQueue.shift();
  }

  /** 设置行动冷却 */
  function setCooldown(actionKey: string, seconds: number) {
    cooldowns[actionKey] = Date.now() + seconds * 1000
  }

  /** 检查行动是否在冷却中 */
  function isOnCooldown(actionKey: string): boolean {
    const end = cooldowns[actionKey]
    if (!end) return false
    if (Date.now() >= end) { delete cooldowns[actionKey]; return false }
    return true
  }

  /** 获取冷却剩余秒数 */
  function getCooldownRemaining(actionKey: string): number {
    const end = cooldowns[actionKey]
    if (!end) return 0
    const r = Math.ceil((end - Date.now()) / 1000)
    if (r <= 0) { delete cooldowns[actionKey]; return 0 }
    return r
  }

  return { 
    items, techs, provenFormulas, discoveredItems, performedActions, itemRenames, discoveryQueue, cooldowns,
    materialChoices, batchCounts,
    getItems, addItem, removeItem, hasItem, getItemQuantity, getTotalDurability, hasGasContainer,
    getTechs, addTech, hasTech, 
    getProvenFormulas, addProvenFormula, hasProvenFormula,
    addPerformedAction, hasPerformedAction,
    hasEverHad, getDisplayName, setItemName, setItemNote, getItemNote,
    clearPendingDiscovery,
    setCooldown, isOnCooldown, getCooldownRemaining,
  }
})

export const usePackStoreWithOut = once(() => usePackStore(store));