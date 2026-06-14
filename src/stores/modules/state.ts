import { defineStore } from 'pinia'
import { computed, reactive } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';
import { Maps } from '@/data/maps';
export interface IGameState {
  map: string;
}

export const useStateStore = defineStore('state', () => {
  const state = reactive<IGameState>({
    map: Maps[Math.floor(Math.random() * Maps.length)].key,
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

  return { state, getState, getMap, setMap }
})

export const useStateStoreWithOut = once(() => useStateStore(store));