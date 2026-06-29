import { useAppStore } from '@/stores/modules/app'

/** 发送任务完成通知（根据玩家设置决定是否弹出） */
export function notifyTaskComplete(title: string, body: string): void {
  const app = useAppStore()

  // 页面内通知
  if (app.taskNotification) {
    // 使用日志系统展示（已在 task.ts 中记录日志）
  }

  // 桌面推送
  if (app.desktopPush && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/favicon.svg' })
    } catch {
      // 静默失败
    }
  }
}
