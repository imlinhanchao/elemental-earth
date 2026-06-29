import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import Storage from '@/utils/storage';

const lightTheme = 'corporate'
const darkTheme = 'dark'

type Theme = string

export interface AppConfig {
  theme: Theme;
  left: boolean;
  right: boolean;
  taskNotifyMode: 'each' | 'all';
  desktopPush: boolean;
  notifyOnlyHidden: boolean;
}

export const useAppStore = defineStore('app', () => {
  const storage = new Storage();
  const config = getConfig()
  const theme = ref<Theme>(config?.theme ?? lightTheme)
  const leftSidebarOpen = ref<boolean>(config?.left ?? true)
  const rightSidebarOpen = ref<boolean>(config?.right ?? true)
  const taskNotifyMode = ref<'each' | 'all'>(config?.taskNotifyMode ?? 'all')
  const desktopPush = ref<boolean>(config?.desktopPush ?? false)
  const notifyOnlyHidden = ref<boolean>(config?.notifyOnlyHidden ?? true)

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

  function toggleDesktopPush(): void {
    desktopPush.value = !desktopPush.value
    // 开启时请求权限
    if (desktopPush.value && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    saveConfig()
  }

  function setTaskNotifyMode(mode: 'each' | 'all'): void {
    taskNotifyMode.value = mode
    saveConfig()
  }

  function toggleNotifyOnlyHidden(): void {
    notifyOnlyHidden.value = !notifyOnlyHidden.value
    saveConfig()
  }

  function saveConfig() {
    storage.setItem('config', {
      theme: theme.value,
      left: leftSidebarOpen.value,
      right: rightSidebarOpen.value,
      taskNotifyMode: taskNotifyMode.value,
      desktopPush: desktopPush.value,
      notifyOnlyHidden: notifyOnlyHidden.value,
    } satisfies AppConfig)
  }
  function getConfig() {
    return storage.getItem<AppConfig>('config')
  }

  return {
    theme, isDarkTheme, leftSidebarOpen, rightSidebarOpen,
    taskNotifyMode, desktopPush, notifyOnlyHidden,
    toggleTheme, toggleLeftSidebar, toggleRightSidebar,
    toggleDesktopPush, setTaskNotifyMode, toggleNotifyOnlyHidden,
  }
})
