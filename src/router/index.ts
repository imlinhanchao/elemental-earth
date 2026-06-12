import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('../views/HomeView.vue'),
        meta: { tab: 'home', label: '首页', icon: '🏠' },
      },
      {
        path: 'explore',
        name: 'Explore',
        component: () => import('../views/ExploreView.vue'),
        meta: { tab: 'explore', label: '发现', icon: '🔍' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/SettingsView.vue'),
        meta: { tab: 'settings', label: '设置', icon: '⚙️' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
