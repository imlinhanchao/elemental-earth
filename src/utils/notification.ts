import { useAppStore } from '@/stores/modules/app'

let taskCount = 0

/** 弹出通知（优先使用 Service Worker 背景弹出） */
async function showNotification(title: string, options: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  try {
    // 尝试通过 Service Worker 弹出，这在某些情况下对后台运行的 PWA 更友好
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, {
        ...options,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
      })
      return
    }
  } catch (e) {
    console.warn('SW notification failed, falling back to window.Notification', e)
  }

  // 回退到普通 Web Notification API
  try {
    new Notification(title, { ...options, icon: '/favicon.svg' })
  } catch {}
}

/** 记录一个任务完成，由 taskLoop 调用 */
export function notifyTaskComplete(_title: string, _body: string): void {
  const app = useAppStore()
  if (!app.desktopPush) return

  // 如果设置了"仅在后台通知"且当前页面可见，则跳过
  if (app.notifyOnlyHidden && !document.hidden) return

  if (app.taskNotifyMode === 'each') {
    showNotification(_title, { body: _body })
  } else {
    taskCount++
  }
}

/** 任务队列清空时调用，发送全部完成通知 */
export function notifyAllTasksDone(): void {
  const app = useAppStore()
  if (!app.desktopPush || app.taskNotifyMode !== 'all' || taskCount === 0) return

  // 如果设置了"仅在后台通知"且当前页面可见，则跳过
  if (app.notifyOnlyHidden && !document.hidden) return

  showNotification('全部任务已完成', {
    body: `${taskCount} 个任务已执行完毕`,
  })
  taskCount = 0
}
