import { defineStore } from 'pinia'
import { computed, reactive } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';
import { Items } from '@/data/items';
import { useStateStore } from './state';
import { useLogStore } from './log';
export interface IPackItem {
  name: string;
  key: string;
  quantity: number;
  durable: number; // 耐久度，0-1之间，表示物品的使用程度
}

export const usePackStore = defineStore('pack', () => {
  const items = reactive<IPackItem[]>([]);
  const techs = reactive<string[]>([]);
  const provenFormulas = reactive<string[]>([])
  /** 玩家曾经拥有过的物品 key 集合（用完后被消耗掉的也算） */
  const discoveredItems = reactive<Set<string>>(new Set())

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
    // 气体物品检查：没有 save_gas 容器则无法收集
    const itemData = Items.find(i => i.key === itemKey);
    if (itemData?.type.includes('gas') && !hasGasContainer()) {
      logStore.addLog(`⚠️ 气体 ${itemData.name} 无法收集——需要具备储气功能的容器`, 'warning');
      return;
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
    } else {
      const itemData = Items.find(i => i.key === itemKey);
      if (itemData) {
        items.push({ name: itemData.name, key: itemKey, quantity, durable: itemData.durable ?? 1 });
        discoveredItems.add(itemKey);
        if (itemData.elemental) {
          const stateStore = useStateStore();
          stateStore.addElement(itemData.elemental);
        }
      } else {
        console.warn(`尝试添加未知物品: ${itemKey}`);
      }
    }
  }
  const removeItem = (key: string, quantity: number, use: number = 0) => {
    const existingItem = items.find(i => i.key === key);
    if (existingItem) {
      // 气体材料被消耗时：归还一个集气瓶
      const itemDef = Items.find(d => d.key === key);
      if (itemDef?.type.includes('gas')) {
        addItem('gas_bottle', 1);
      }
      if (use) {
        existingItem.durable -= use;
        if (existingItem.durable <= 0) {
          existingItem.quantity -= quantity;
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

  const getTechs = computed(() => techs);
  const addTech = (techKey: string) => {
    if (!techs.includes(techKey)) {
      techs.push(techKey);
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

  /** 玩家是否曾经拥有过某物品（消耗光的也算） */
  const hasEverHad = (itemKey: string) => discoveredItems.has(itemKey);

  return { 
    items, techs, provenFormulas, discoveredItems,
    getItems, addItem, removeItem, hasItem, getItemQuantity, hasGasContainer,
    getTechs, addTech, hasTech, 
    getProvenFormulas, addProvenFormula, hasProvenFormula,
    hasEverHad,
  }
})

export const usePackStoreWithOut = once(() => usePackStore(store));