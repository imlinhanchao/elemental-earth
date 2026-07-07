import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface IToast {
  id: number
  message: string
  type: string
  count?: number
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<IToast[]>([])
  let nextId = 0
  const queue: IToast[] = []
  let isProcessing = false

  const addToast = (message: string, type: string = 'info') => {
    // 检查是否与正在显示的或队列中的最后一条相同
    const lastInToasts = toasts.value[toasts.value.length - 1]
    const lastInQueue = queue[queue.length - 1]

    if (lastInToasts && lastInToasts.message === message && lastInToasts.type === type) {
      lastInToasts.count = (lastInToasts.count || 1) + 1
      return
    }

    if (lastInQueue && lastInQueue.message === message && lastInQueue.type === type) {
      lastInQueue.count = (lastInQueue.count || 1) + 1
      return
    }

    const id = nextId++
    queue.push({ id, message, type, count: 1 })
    
    // 如果队列过长，丢弃过旧的，保持及时性
    if (queue.length > 10) {
        queue.shift()
    }

    processQueue()
  }

  const processQueue = () => {
    if (isProcessing || queue.length === 0) return
    isProcessing = true

    const toast = queue.shift()!
    toasts.value.push(toast)
    
    if (toasts.value.length > 2) {
      toasts.value.shift()
    }

    // 自动移除
    setTimeout(() => {
      removeToast(toast.id)
    }, 3000)

    // 控制每条 Toast 出现的间隔，避免快速连续更新导致的 UI 闪烁 (略大于 CSS 过渡时间)
    setTimeout(() => {
      isProcessing = false
      processQueue()
    }, 350)
  }

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  return { toasts, addToast, removeToast }
})

