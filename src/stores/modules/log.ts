import { defineStore } from 'pinia'
import { computed, reactive } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';
import { useToastStore } from './toast';
import { useAppStore } from './app';

export interface ILog {
  content: string;
  type: string; // 'process', 'main-event', 'sub-event', 'reward', 'tech', etc.
}

export const useLogStore = defineStore('log', () => {
  const logs = reactive<ILog[]>([]);

  const getLog = computed(() => logs);

  const addLog = (content: string, type: string) => {
    logs.push({ content, type });
    
    const appStore = useAppStore();
    const toastStore = useToastStore();
    if (appStore.isMobile) {
      toastStore.addToast(content, type);
    }
  }

  const clearLogs = () => {
    logs.length = 0;
  }

  return { logs, getLog, addLog, clearLogs }
})

export const useLogStoreWithOut = once(() => useLogStore(store));