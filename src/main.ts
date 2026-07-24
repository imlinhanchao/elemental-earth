import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './style.css'
import Icon from "@/components/Icon.vue";
import { setupStore } from '@/stores/'
import 'virtual:svg-icons-register'
import { registerSW } from 'virtual:pwa-register'
import { gameSDK } from '@/utils/sdk'
import { modManager } from '@/mods/manager'

export { gameSDK }

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    // 如果已经存在提示，则不再创建
    if (document.getElementById('pwa-refresh-toast')) return;

    // 创建一个提示框
    const toast = document.createElement('div');
    toast.id = 'pwa-refresh-toast';
    toast.className = 'toast toast-top toast-center z-[10000]';
    toast.innerHTML = `
      <div class="alert shadow-2xl bg-base-100 border-2 border-info items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div class="flex items-center gap-4">
          <span class="text-sm font-bold">发现新版本内容，立即刷新以同步最新版本！</span>
          <button class="btn btn-sm btn-primary rounded-md px-4" id="pwa-refresh-btn">立即更新</button>
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    
    document.getElementById('pwa-refresh-btn')?.addEventListener('click', () => {
      updateServiceWorker(true);
    });
  },
  onOfflineReady() {
    console.log('离线环境已就绪');
  },
})

// 每 60 分钟检查一次更新
setInterval(() => {
  // 仅在非开发环境下自动检查
  if (import.meta.env.PROD) {
    updateServiceWorker();
  }
}, 60 * 60 * 1000);

async function bootstrap() {
  const app = createApp(App)
  
  setupStore(app);
  await preloadStoresForMods();
  modManager.initialize();
  app.use(router)
  app.component('Icon', Icon);
  app.mount('#app')
}

async function preloadStoresForMods() {
  const [
    appModule,
    adminModule,
    fragmentModule,
    labModule,
    logModule,
    packModule,
    productionModule,
    stateModule,
    taskModule,
    toastModule,
    tutorialModule,
  ] = await Promise.all([
    import('@/stores/modules/app'),
    import('@/stores/modules/admin'),
    import('@/stores/modules/fragment'),
    import('@/stores/modules/lab'),
    import('@/stores/modules/log'),
    import('@/stores/modules/pack'),
    import('@/stores/modules/production'),
    import('@/stores/modules/state'),
    import('@/stores/modules/task'),
    import('@/stores/modules/toast'),
    import('@/stores/modules/tutorial'),
  ]);

  appModule.useAppStore();
  adminModule.useAdminStore();
  fragmentModule.useFragmentStore();
  labModule.useLabStore();
  logModule.useLogStore();
  packModule.usePackStore();
  productionModule.useProductionStore();
  stateModule.useStateStore();
  taskModule.useTaskStore();
  toastModule.useToastStore();
  tutorialModule.useTutorialStore();
}

bootstrap();
