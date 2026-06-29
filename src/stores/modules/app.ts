import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import Storage from '@/utils/storage';

const lightTheme = 'corporate'
const darkTheme = 'dark'

type Theme = string

export const useAppStore = defineStore('app', () => {
  const storage = new Storage();
  const config = getConfig()
  const theme = ref<Theme>(config?.theme ?? lightTheme)
  const leftSidebarOpen = ref<boolean>(config?.left ?? true)
  const rightSidebarOpen = ref<boolean>(config?.right ?? true)

  function toggleTheme(): void {
    theme.value = theme.value === lightTheme ? darkTheme : lightTheme
    saveConfig();
  }

  const isDarkTheme = computed(() => {
    return theme.value === darkTheme
  })

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

  return { theme, isDarkTheme, leftSidebarOpen, rightSidebarOpen, toggleTheme, toggleLeftSidebar, toggleRightSidebar }
})
