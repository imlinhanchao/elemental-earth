// Exports app version (from env) and a helper to trigger update checks.
export const appVersion: string | null = (
  (import.meta.env as any).VITE_APP_VERSION ||
  (import.meta.env as any).VITE_VERSION ||
  (import.meta.env as any).APP_VERSION ||
  (import.meta.env as any).VERSION ||
  null
)

type PwaUpdater = (reloadPage?: boolean) => Promise<void>

let pwaUpdater: PwaUpdater | null = null

export function setPwaUpdater(updater: PwaUpdater): void {
  pwaUpdater = updater
}

function isNeedRefreshAvailable(hadToast: boolean, registration?: ServiceWorkerRegistration | null): boolean {
  const hasToastNow = !!document.getElementById('pwa-refresh-toast')
  return !!registration?.waiting || (!hadToast && hasToastNow)
}

async function waitForInstallingDone(registration: ServiceWorkerRegistration): Promise<void> {
  const worker = registration.installing
  if (!worker) return

  if (worker.state === 'installed' || worker.state === 'activated' || worker.state === 'redundant') return

  await new Promise<void>((resolve) => {
    const onStateChange = () => {
      if (worker.state === 'installed' || worker.state === 'activated' || worker.state === 'redundant') {
        worker.removeEventListener('statechange', onStateChange)
        resolve()
      }
    }
    worker.addEventListener('statechange', onStateChange)
  })
}

export async function checkForUpdates(): Promise<boolean> {
  const hadToast = !!document.getElementById('pwa-refresh-toast')

  if (!('serviceWorker' in navigator)) {
    return false
  }

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) {
    console.warn('当前页面没有可用的 Service Worker 注册')
    return false
  }

  if (isNeedRefreshAvailable(hadToast, registration)) {
    return true
  }

  // 尝试触发一次插件内部探测（若已注册）
  if (pwaUpdater) {
    await pwaUpdater().catch((e) => {
      console.error('PWA 更新检查失败', e)
    })
  }

  // 直接向浏览器请求 SW 更新，这是最准确的“检查更新”入口。
  await registration.update().catch((e) => {
    console.error('Service Worker update() 调用失败', e)
  })

  if (isNeedRefreshAvailable(hadToast, registration)) {
    return true
  }

  // 若正在安装新 SW，则等待安装结束后再判断，避免网络慢时误判。
  await waitForInstallingDone(registration)

  return isNeedRefreshAvailable(hadToast, registration)
}
