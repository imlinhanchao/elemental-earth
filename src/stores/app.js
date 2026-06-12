import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const theme = ref('light')
  const leftSidebarOpen = ref(true)
  const rightSidebarOpen = ref(true)

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function toggleLeftSidebar() {
    leftSidebarOpen.value = !leftSidebarOpen.value
  }

  function toggleRightSidebar() {
    rightSidebarOpen.value = !rightSidebarOpen.value
  }

  return { theme, leftSidebarOpen, rightSidebarOpen, toggleTheme, toggleLeftSidebar, toggleRightSidebar }
})
