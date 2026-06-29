import { useAppStore } from '@/stores/modules/app'

let taskCount = 0

/** 记录一个任务完成，由 taskLoop 调用 */
export function notifyTaskComplete(_title: string, _body: string): void {
  const app = useAppStore()
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (!app.desktopPush) return
  // 仅不在当前页面时通知
  if (app.notifyOnlyHidden && !document.hidden) return

  if (app.taskNotifyMode === 'each') {
    try { new Notification(_title, { body: _body, icon: '/favicon.svg' }) } catch {}
  } else {
    taskCount++
  }
}

/** 任务队列清空时调用，发送全部完成通知 */
export function notifyAllTasksDone(): void {
  const app = useAppStore()
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (!app.desktopPush || app.taskNotifyMode !== 'all' || taskCount === 0) return
  // 仅不在当前页面时通知
  if (app.notifyOnlyHidden && !document.hidden) return
  try {
    new Notification('全部任务已完成', {
      body: `${taskCount} 个任务已执行完毕`,
      icon: '/favicon.svg',
    })
  } catch {}
  taskCount = 0
}
