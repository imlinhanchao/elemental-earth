<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { gameSDK } from '@/utils/sdk'
import { syncCloudArchive } from '@/utils/archive'

onMounted(async () => {
  const isFreshLogin = await gameSDK.initAuth()
  console.log('isFreshLogin:', isFreshLogin)
  
  // 处理存档同步
  if (isFreshLogin) {
    // 刚刚登录（从平台重定向回来），检查差异
    await syncCloudArchive(false)
  }

  if (await gameSDK.isAuthenticated()) {
    gameSDK.connectRealtime((msg) => {
      console.log('Received message:', msg);
    });
  }
})
</script>
