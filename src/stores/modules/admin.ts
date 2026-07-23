import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gameSDK } from '@/main'

const STORAGE_KEY = 'admin_token'

/** API 基础路径：开发模式用绝对路径走 CORS，生产模式用相对路径同源 */
const API_BASE = import.meta.env.DEV ? '' : ''

export const useAdminStore = defineStore('admin', () => {
  const token = ref<string | null>(gameSDK.getToken())
  const isLoggedIn = computed(() => !!token.value)

  function setToken(t: string) {
    token.value = t
    localStorage.setItem(STORAGE_KEY, t)
  }

  function logout() {
    token.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  /** 为 fetch 添加 Authorization 头 */
  function authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${gameSDK.getToken()}` }
  }

  /** 带认证的 fetch 封装 */
  async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${API_BASE}${path}`
    const headers = { ...authHeaders(), ...(options.headers as Record<string, string> || {}) }
    return fetch(url, { ...options, headers })
  }

  return { token, isLoggedIn, setToken, logout, authHeaders, apiFetch }
})
