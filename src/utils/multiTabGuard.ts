import { ref, onMounted, onBeforeUnmount } from 'vue'

// Multi-tab guard using localStorage heartbeat
const heartbeatPrefix = 'ashes_tab_'

export function useMultiTabGuard(pageId: number) {
  const showMultiTabWarning = ref(false)
  const multiTabDismissed = ref(false)
  const startupGrace = ref(true)
  const heartbeatKey = `${heartbeatPrefix}${pageId}`
  let heartbeatTimer: number | null = null

  function writeHeartbeat() {
    try {
      localStorage.setItem(heartbeatKey, String(Date.now()))
    } catch (e) {
      // ignore
    }
  }

  function checkOtherTabs() {
    const now = Date.now()
    let others = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (!key.startsWith(heartbeatPrefix)) continue
      if (key === heartbeatKey) continue
      const val = Number(localStorage.getItem(key)) || 0
      if (now - val < 5000) {
        others++
      } else {
        try { localStorage.removeItem(key) } catch (e) {}
      }
    }
    showMultiTabWarning.value = others > 0 && !multiTabDismissed.value && !startupGrace.value
  }

  function storageHandler(e: StorageEvent) {
    if (!e.key) return
    if (!e.key.startsWith(heartbeatPrefix)) return
    checkOtherTabs()
  }

  function start() {
    writeHeartbeat()
    checkOtherTabs()
    heartbeatTimer = window.setInterval(() => {
      writeHeartbeat()
      checkOtherTabs()
    }, 2000) as unknown as number
    window.addEventListener('storage', storageHandler)
    setTimeout(() => { startupGrace.value = false }, 1500)
    window.addEventListener('beforeunload', removeHeartbeat)
  }

  function stop() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    try { localStorage.removeItem(heartbeatKey) } catch (e) {}
    window.removeEventListener('storage', storageHandler)
    window.removeEventListener('beforeunload', removeHeartbeat)
  }

  function removeHeartbeat() {
    try { localStorage.removeItem(heartbeatKey) } catch (e) {}
  }

  // auto-start if used inside setup() lifecycle
  onMounted(() => start())
  onBeforeUnmount(() => stop())

  return {
    showMultiTabWarning,
    multiTabDismissed,
    start,
    stop,
    removeHeartbeat,
  }
}

// standalone helper to remove any heartbeat keys for this page id
export function removeMultiTabHeartbeatById(pageId: number) {
  try { localStorage.removeItem(`${heartbeatPrefix}${pageId}`) } catch (e) {}
}

// helper to remove all heartbeat keys (useful before service worker update)
export function removeAllMultiTabHeartbeats() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith(heartbeatPrefix)) localStorage.removeItem(key)
    }
  } catch (e) {}
}
