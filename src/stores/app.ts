import { defineStore } from 'pinia'
import { ref } from 'vue'
import Storage from '@/utils/storage';

type Theme = 'light' | 'dark'

export const useAppStore = defineStore('app', () => {
  const storage = new Storage();
  const config = getConfig()
  const theme = ref<Theme>(config?.theme ?? 'light')
  const leftSidebarOpen = ref<boolean>(config?.left ?? true)
  const rightSidebarOpen = ref<boolean>(config?.right ?? true)

  function toggleTheme(): void {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    saveConfig();
  }

  function toggleLeftSidebar(): void {
    leftSidebarOpen.value = !leftSidebarOpen.value
    saveConfig();
  }

  function toggleRightSidebar(): void {
    rightSidebarOpen.value = !rightSidebarOpen.value
    saveConfig();
  }

  function saveConfig() {
    storage.setItem('config', {
      theme: theme.value,
      left: leftSidebarOpen.value,
      right: rightSidebarOpen.value,
    })
  }
  function getConfig() {
    return storage.getItem<{
      theme: Theme;
      left: boolean;
      right: boolean;
    }>('config')
  }

  return { theme, leftSidebarOpen, rightSidebarOpen, toggleTheme, toggleLeftSidebar, toggleRightSidebar }
})
