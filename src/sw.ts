/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope

// 监听消息，配合 registerSW({ registerType: 'prompt' }) 实现手动更新
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

clientsClaim()

// 清理旧版本的缓存
cleanupOutdatedCaches()

// 预缓存由 VitePWA 自动生成的静态资源
precacheAndRoute(self.__WB_MANIFEST)

// 处理推送通知
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icons.svg',
      badge: '/icons.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2'
      }
    }
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow('/')
  )
})
