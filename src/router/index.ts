import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('../views/HomeView.vue'),
        meta: { tab: 'home', label: '行动', icon: 'entypo:tools' },
      },
      {
        path: 'tech',
        name: 'Tech',
        component: () => import('../views/TechView.vue'),
        meta: { tab: 'tech', label: '科技', icon: 'streamline:ai-technology-spark-remix' },
      },
      {
        path: 'explore',
        name: 'Explore',
        component: () => import('../views/ExploreView.vue'),
        meta: { tab: 'explore', label: '图鉴', icon: 'si:book-duotone' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/SettingsView.vue'),
        meta: { tab: 'settings', label: '设置', icon: 'uil:setting' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
