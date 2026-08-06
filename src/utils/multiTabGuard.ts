
import { ref, onMounted, onBeforeUnmount } from 'vue'

// Multi-tab guard using BroadcastChannel with localStorage fallback.
const heartbeatPrefix = 'ashes_tab_'
const channelName = 'ashes_tab_channel'

export function useMultiTabGuard(pageId: number) {
  const showMultiTabWarning = ref(false)
  const multiTabDismissed = ref(false)
  const startupGrace = ref(true)

  let bc: BroadcastChannel | null = null
  const lastSeen = new Map<string, number>()
  let aliveTimer: number | null = null
  let checkTimer: number | null = null
  let suppressed = false

  const heartbeatKey = `${heartbeatPrefix}${pageId}`

  function sendAliveBC() {
    if (!bc) return
    try {
      bc.postMessage({ type: 'alive', id: pageId, ts: Date.now() })
    } catch (e) {}
  }

  function handleBCMessage(ev: MessageEvent) {
    const msg = ev.data || {}
    if (!msg || typeof msg !== 'object') return
    const { type, id, ts } = msg as { type: string; id?: number; ts?: number }
    if (type === 'alive' && id && id !== pageId) {
      lastSeen.set(String(id), ts || Date.now())
    }
    if (type === 'bye' && id) {
      lastSeen.delete(String(id))
    }
    if (type === 'clear') {
      suppressed = true
      setTimeout(() => { suppressed = false }, 2000)
    }
  }

  function checkOthers() {
    const now = Date.now()
    // remove stale
    for (const [id, ts] of Array.from(lastSeen.entries())) {
      if (now - (ts || 0) > 5000) lastSeen.delete(id)
    }
    const others = lastSeen.size
    showMultiTabWarning.value = others > 0 && !multiTabDismissed.value && !startupGrace.value && !suppressed
  }

  // localStorage fallback
  let lsTimer: number | null = null
  function writeLS() {
    try { localStorage.setItem(heartbeatKey, String(Date.now())) } catch (e) {}
  }
  function checkLS() {
    const now = Date.now()
    let others = 0
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        if (!key.startsWith(heartbeatPrefix)) continue
        if (key === heartbeatKey) continue
        const val = Number(localStorage.getItem(key)) || 0
        if (now - val < 5000) others++
      }
    } catch (e) {}
    showMultiTabWarning.value = others > 0 && !multiTabDismissed.value && !startupGrace.value && !suppressed
  }

  function start() {
    startupGrace.value = true
    suppressed = false

    // Try BroadcastChannel first
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel(channelName)
        bc.addEventListener('message', handleBCMessage)
        // announce ourselves
        sendAliveBC()
        aliveTimer = window.setInterval(sendAliveBC, 2000) as unknown as number
        checkTimer = window.setInterval(checkOthers, 1000) as unknown as number
      }
    } catch (e) {
      bc = null
    }

    // fallback to localStorage if no BroadcastChannel
    if (!bc) {
      writeLS()
      lsTimer = window.setInterval(() => { writeLS(); checkLS() }, 2000) as unknown as number
      window.addEventListener('storage', checkLS)
      checkLS()
    }

    setTimeout(() => { startupGrace.value = false }, 1500)

    // beforeunload cleanup
    window.addEventListener('beforeunload', stop)
  }

  function stop() {
    try {
      if (bc) {
        try { bc.postMessage({ type: 'bye', id: pageId }) } catch (e) {}
        bc.removeEventListener('message', handleBCMessage)
        bc.close()
        bc = null
      }
    } catch (e) {}

    if (aliveTimer) {
      clearInterval(aliveTimer)
      aliveTimer = null
    }
    if (checkTimer) {
      clearInterval(checkTimer)
      checkTimer = null
    }
    if (lsTimer) {
      clearInterval(lsTimer)
      lsTimer = null
    }
    try { localStorage.removeItem(heartbeatKey) } catch (e) {}
    window.removeEventListener('storage', checkLS)
    window.removeEventListener('beforeunload', stop)
  }

  function removeHeartbeat() {
    try { localStorage.removeItem(heartbeatKey) } catch (e) {}
    try { if (bc) bc.postMessage({ type: 'bye', id: pageId }) } catch (e) {}
  }

  // helpers to clear across tabs (useful before SW update)

  // auto-start/stop
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

// Implement removeAllMultiTabHeartbeats as a BroadcastChannel broadcast (or localStorage clear fallback)
export function removeAllMultiTabHeartbeats() {
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(channelName)
      try { bc.postMessage({ type: 'clear' }) } catch (e) {}
      bc.close()
    } else {
      // fallback: remove keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (!key) continue
        if (key.startsWith(heartbeatPrefix)) localStorage.removeItem(key)
      }
    }
  } catch (e) {}
}

