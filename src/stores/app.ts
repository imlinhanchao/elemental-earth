import { defineStore } from 'pinia'
import { ref } from 'vue'

type Theme = 'light' | 'dark'

export const useAppStore = defineStore('app', () => {
  const theme = ref<Theme>('light')
  const leftSidebarOpen = ref<boolean>(true)
  const rightSidebarOpen = ref<boolean>(true)

  function toggleTheme(): void {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function toggleLeftSidebar(): void {
    leftSidebarOpen.value = !leftSidebarOpen.value
  }

  function toggleRightSidebar(): void {
    rightSidebarOpen.value = !rightSidebarOpen.value
  }

  return { theme, leftSidebarOpen, rightSidebarOpen, toggleTheme, toggleLeftSidebar, toggleRightSidebar }
})
