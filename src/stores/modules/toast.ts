import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface IToast {
  id: number
  message: string
  type: string
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<IToast[]>([])
  let nextId = 0

  const addToast = (message: string, type: string = 'info') => {
    const id = nextId++
    toasts.value.push({ id, message, type })
    
    // Limit to latest 2 toasts
    if (toasts.value.length > 2) {
      toasts.value.shift()
    }
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      removeToast(id)
    }, 3000)
  }

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  return { toasts, addToast, removeToast }
})
