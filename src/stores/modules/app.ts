import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
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
  hardMode: boolean;
  foldTasks: boolean;
}

export const useAppStore = defineStore('app', () => {
  const storage = new Storage();
  const config = getConfig();
  const isReady = ref(false);
  
  // 默认根据浏览器模式选择主题
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = ref<Theme>(config?.theme ?? (systemDark ? darkTheme : lightTheme))
  
  // 监听主题变化并应用到 body
  watch(theme, (newTheme) => {
    document.body.dataset.theme = newTheme
  }, { immediate: true })

  // 移动端默认关闭侧边栏
  const isMobile = ref(window.innerWidth < 768)
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
  })

  const leftSidebarOpen = ref<boolean>(isMobile.value ? false : (config?.left ?? true))
  const rightSidebarOpen = ref<boolean>(isMobile.value ? false : (config?.right ?? true))
  const taskNotifyMode = ref<'each' | 'all'>(config?.taskNotifyMode ?? 'all')
  const desktopPush = ref<boolean>(config?.desktopPush ?? false)
  const notifyOnlyHidden = ref<boolean>(config?.notifyOnlyHidden ?? true)
  const hardMode = ref<boolean>(config?.hardMode ?? false)
  const foldTasks = ref<boolean>(config?.foldTasks ?? true)

  // 动画状态
  const showLabSuccess = ref(false)
  const labSuccessFormula = ref<string | null>(null)
  const labSuccessProducts = ref<{ key: string; quantity: number }[]>([])

  function triggerLabSuccess(formulaKey: string, products: { key: string; quantity: number }[]) {
    labSuccessFormula.value = formulaKey
    labSuccessProducts.value = products
    showLabSuccess.value = true
  }

  function toggleTheme(): void {
    theme.value = theme.value === lightTheme ? darkTheme : lightTheme
    saveConfig();
  }

  function toggleFoldTasks(): void {
    foldTasks.value = !foldTasks.value
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

  function toggleHardMode(): void {
    hardMode.value = !hardMode.value
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
      hardMode: hardMode.value,
      foldTasks: foldTasks.value,
    } satisfies AppConfig)
  }
  function getConfig() {
    return storage.getItem<AppConfig>('config')
  }

  return {
    theme, isDarkTheme, leftSidebarOpen, rightSidebarOpen, isMobile, isReady,
    taskNotifyMode, desktopPush, notifyOnlyHidden, hardMode, foldTasks,
    showLabSuccess, labSuccessFormula, labSuccessProducts,
    toggleTheme, toggleLeftSidebar, toggleRightSidebar, toggleFoldTasks,
    toggleDesktopPush, setTaskNotifyMode, toggleNotifyOnlyHidden, toggleHardMode,
    triggerLabSuccess
  }
})
