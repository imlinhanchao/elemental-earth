import { defineStore } from 'pinia'
import { computed, reactive } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';
import { Items } from '@/data/items';
export interface IPackItem {
  name: string;
  key: string;
  quantity: number;
  durable: number; // 耐久度，0-1之间，表示物品的使用程度
}

export const usePackStore = defineStore('pack', () => {
  const items = reactive<IPackItem[]>([]);
  const techs = reactive<string[]>([]);

  const getItems = computed(() => items);
  const addItem = (itemKey: string, quantity: number, use: number = 0) => {
    const existingItem = items.find(i => i.key === itemKey);
    if (existingItem) {
      if (use) {
        const itemData = Items.find(i => i.key === itemKey);
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
      } else {
        console.warn(`尝试添加未知物品: ${itemKey}`);
      }
    }
  }
  const removeItem = (key: string, quantity: number, use: number = 0) => {
    const existingItem = items.find(i => i.key === key);
    if (existingItem) {
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

  const getTechs = computed(() => techs);
  const addTech = (techKey: string) => {
    if (!techs.includes(techKey)) {
      techs.push(techKey);
    }
  }
  const hasTech = (techKey: string) => techs.includes(techKey);

  return { items, techs, getItems, addItem, removeItem, hasItem, getTechs, addTech, hasTech }
})

export const usePackStoreWithOut = once(() => usePackStore(store));