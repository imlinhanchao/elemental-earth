<template>
  <div class="flex flex-col h-screen">
    <header class="navbar bg-base-200 border-b border-base-300 px-4 flex-none">
      <div class="flex-1"><span class="text-lg font-bold inline-flex items-center gap-1"><Icon icon="tabler:settings" class="inline-block align-middle mr-1" />数据管理后台</span></div>
      <div class="flex-none"><button class="btn btn-ghost btn-xs" @click="logout">退出</button></div>
    </header>
    <div class="flex-1 overflow-y-auto p-6">
      <h2 class="text-xl font-bold mb-2">选择要管理的数据类型</h2>
      <p class="text-sm text-base-content/50 mb-6">每种数据有独立的维护页面，包含增删改查功能。</p>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <router-link v-for="m in models" :key="m.key"
          :to="`/admin/${m.key}`"
          class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
        >
          <div class="card-body p-4">
            <h3 class="font-bold text-base">{{ m.label }}</h3>
            <p class="text-xs text-base-content/40">{{ m.file }}</p>
          </div>
        </router-link>

        <router-link to="/admin/ai"
          class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer border border-primary/30"
        >
          <div class="card-body p-4">
            <h3 class="font-bold text-base inline-flex items-center gap-1">
              <Icon icon="humbleicons:ai" class="inline" /> AI 生成
            </h3>
            <p class="text-xs text-base-content/40">通过 AI 自动生成游戏数据</p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/modules/admin'
import { gameSDK } from '@/main'

const router = useRouter()
const admin = useAdminStore()
const models = ref<any[]>([])

onMounted(async () => {
  const res = await admin.apiFetch('/api')
  models.value = await res.json()
})

function logout() { gameSDK.logout(); router.push('/login') }
</script>
