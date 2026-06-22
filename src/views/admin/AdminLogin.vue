<template>
  <div class="flex items-center justify-center min-h-screen bg-base-300">
    <div class="card bg-base-200 shadow-xl w-full max-w-sm">
      <div class="card-body">
        <h2 class="card-title text-xl justify-center mb-2">⚙️ 数据管理后台</h2>
        <p class="text-sm text-base-content/60 text-center mb-4">请输入管理员密码登录</p>

        <div class="form-control gap-1 mb-4">
          <input
            v-model="password"
            type="password"
            placeholder="管理员密码"
            class="input input-bordered"
            @keyup.enter="login"
            :disabled="loading"
          />
        </div>

        <p v-if="error" class="text-error text-sm text-center mb-2">{{ error }}</p>

        <button class="btn btn-primary w-full" :disabled="loading || !password" @click="login">
          {{ loading ? '验证中…' : '登录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/modules/admin'

const router = useRouter()
const admin = useAdminStore()

const password = ref('')
const loading = ref(false)
const error = ref('')

async function login() {
  if (!password.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await admin.apiFetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value }),
    })
    const json = await res.json()
    if (!res.ok) {
      error.value = json.error || '登录失败'
      return
    }
    admin.setToken(json.token)
    router.push('/admin/dashboard')
  } catch (e) {
    error.value = '网络错误: ' + (e as Error).message
  } finally {
    loading.value = false
  }
}
</script>
