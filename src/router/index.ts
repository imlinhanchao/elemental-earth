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
        path: 'lab',
        name: 'Lab',
        component: () => import('../views/LabView.vue'),
        meta: { tab: 'lab', label: '实验室', icon: 'fluent:beaker-16-filled' },
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
  // ─── Admin 管理后台 ─────────────────────────────────────────
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    redirect: '/admin/login',
    children: [
      {
        path: 'login',
        name: 'AdminLogin',
        component: () => import('../views/admin/AdminLogin.vue'),
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('../views/admin/AdminDashboard.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ─── 路由守卫：未登录时跳转登录页 ────────────────────────────
router.beforeEach(async (to) => {
  if (to.path.startsWith('/admin')) {
    if (to.name === 'AdminLogin') return true
    // 检查是否已登录（通过 store 中的 token）
    const { useAdminStore } = await import('@/stores/modules/admin')
    const admin = useAdminStore()
    if (!admin.isLoggedIn) return { name: 'AdminLogin' }
  }
  return true
})

export default router
