import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { Icon } from "@iconify/vue";
import { setupStore } from '@/stores/'


async function bootstrap() {
  const app = createApp(App)
  
  setupStore(app);
  // 预加载 admin store，确保 localStorage 中的 token 被读取
  const { useAdminStore } = await import('@/stores/modules/admin')
  useAdminStore()
  app.use(router)
  app.component('Icon', Icon);
  app.mount('#app')
}

bootstrap();
