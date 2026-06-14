import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { Icon } from "@iconify/vue";
import { setupStore } from '@/stores/'


function bootstrap() {
  const app = createApp(App)
  
  setupStore(app);
  app.use(router)
  app.component('Icon', Icon);
  app.mount('#app')
}

bootstrap();
