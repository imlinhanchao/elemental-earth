<template>
  <div class="flex items-center justify-center min-h-screen bg-base-300">
    <div class="card bg-base-200 shadow-xl w-full max-w-sm">
      <div class="card-body">
        <h2 class="card-title text-xl justify-center mb-2">
          <Icon icon="pinhead:bohr-atomic-model" class="text-2xl text-primary"></Icon>
          <span class="text-xl font-bold">元素纪元</span>
          <div class="divider lg:divider-horizontal"></div>
          <span class="text-xl">登录</span>
        </h2>

        <p v-if="error" class="text-error text-sm text-center mb-2">{{ error }}</p>

        <button class="btn btn-primary w-full" :disabled="loading" @click="login">
          {{ loading ? '验证中…' : '通过摸鱼派登录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/modules/admin'
import { gameSDK as sdk } from '@/main'

const router = useRouter()
const admin = useAdminStore()

const loading = ref(true)
const error = ref('')

const init = async () => {
  // 初始化 SDK 认证状态
  const authed = await sdk.initAuth()
  
  if (authed) {
    await checkAdminAccess()
    return
  }

  // 如果已经在 SDK 中登录
  if (await sdk.isAuthenticated()) {
    await checkAdminAccess()
  } else {
    loading.value = false
  }
}
onMounted(init)
onActivated(init)

async function checkAdminAccess() {
  try {
    const profile = await sdk.getUserProfile()
    if (profile.isAdmin) {
      admin.setToken(sdk.getToken() || '')
      router.push('/admin/dashboard')
    } else {
      router.push('/')
    }
  } catch (e) {
    error.value = '获取用户信息失败: ' + (e as Error).message
    loading.value = false
  }
}

async function login() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    await sdk.login()
  } catch (e) {
    error.value = '登录失败: ' + (e as Error).message
    loading.value = false
  }
}
</script>
