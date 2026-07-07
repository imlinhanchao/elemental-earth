import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'

const ADMIN_STORAGE_KEY = 'admin_token'
function isAdminLoggedIn(): boolean {
  return !!localStorage.getItem(ADMIN_STORAGE_KEY)
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../views/HomeView.vue'),
        meta: { tab: 'home', label: '制造', icon: 'entypo:tools' },
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
        path: 'manuscripts',
        name: 'Manuscripts',
        component: () => import('../views/ManuscriptsView.vue'),
        meta: { tab: 'manuscripts', label: '手稿', icon: 'mingcute:document-fill' },
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
    redirect: '/admin/dashboard',
    children: [
      { path: 'login',     name: 'AdminLogin',     component: () => import('../views/admin/AdminLogin.vue') },
      { path: 'dashboard', name: 'AdminDashboard',  component: () => import('../views/admin/AdminDashboard.vue') },
      { path: 'ai',        name: 'AdminAi',         component: () => import('../views/admin/AiGenerator.vue') },
      // 每种数据类型独立路由和组件
      { path: 'maps',      name: 'AdminMaps',       component: () => import('../views/admin/types/MapsView.vue') },
      { path: 'items',     name: 'AdminItems',      component: () => import('../views/admin/types/ItemsView.vue') },
      { path: 'actions',   name: 'AdminActions',    component: () => import('../views/admin/types/ActionsView.vue') },
      { path: 'techs',     name: 'AdminTechs',      component: () => import('../views/admin/types/TechsView.vue') },
      { path: 'labs',      name: 'AdminLabs',       component: () => import('../views/admin/types/LabsView.vue') },
      { path: 'formulas',  name: 'AdminFormulas',   component: () => import('../views/admin/types/FormulasView.vue') },
      { path: 'elements',  name: 'AdminElements',   component: () => import('../views/admin/types/ElementsView.vue') },
      { path: 'eras',      name: 'AdminEras',       component: () => import('../views/admin/types/ErasView.vue') },
      { path: 'tips',      name: 'AdminTips',       component: () => import('../views/admin/types/TipsView.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// ─── 路由守卫：未登录时跳转登录页 ────────────────────────────
router.beforeEach((to) => {
  if (to.path.startsWith('/admin')) {
    if (to.name === 'AdminLogin') return true
    if (!isAdminLoggedIn()) return { name: 'AdminLogin' }
  }
  return true
})

export default router
