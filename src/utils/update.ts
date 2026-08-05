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

export async function checkForUpdates(): Promise<boolean> {
  if (!pwaUpdater) {
    console.warn('PWA 更新器尚未注册')
    return false
  }

  const hadToast = !!document.getElementById('pwa-refresh-toast')

  // Trigger the PWA update probe; if a new version exists,
  // the onNeedRefresh handler in main.ts will show update UI.
  await pwaUpdater().catch((e) => {
    console.error('PWA 更新检查失败', e)
  })

  // Double-check by asking SW registration to update now.
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration?.update().catch((e) => {
      console.error('Service Worker update() 调用失败', e)
    })
  }

  // Give onNeedRefresh hook a short moment to render the prompt.
  await new Promise((resolve) => setTimeout(resolve, 10000))
  const hasToastNow = !!document.getElementById('pwa-refresh-toast')

  return !hadToast && hasToastNow
}
