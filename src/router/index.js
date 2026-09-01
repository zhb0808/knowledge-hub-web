import { createRouter, createWebHistory } from 'vue-router'
import { authStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import AppLayout from '../layout/AppLayout.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', name: 'welcome', component: () => import('../views/WelcomeView.vue'), meta: { title: '欢迎页' } },
      { path: 'knowledge-bases', name: 'knowledge-bases', component: () => import('../views/KnowledgeBaseView.vue'), meta: { title: '知识库管理', permission: 'knowledge_base:manage' } },
      { path: 'documents', name: 'documents', component: () => import('../views/DocumentView.vue'), meta: { title: '文档管理', permission: 'document:manage' } },
      { path: 'search', name: 'search', component: () => import('../views/SearchView.vue'), meta: { title: '全文搜索', permission: 'document:search' } },
      { path: 'ai', name: 'ai', component: () => import('../views/AiView.vue'), meta: { title: 'AI 对话', permission: 'ai:chat' } },
      { path: 'users', name: 'users', component: () => import('../views/UserView.vue'), meta: { title: '用户管理', permission: 'user:manage' } },
      { path: 'roles', name: 'roles', component: () => import('../views/RoleView.vue'), meta: { title: '角色管理', permission: 'role:manage' } },
      { path: 'permissions', name: 'permissions', component: () => import('../views/PermissionView.vue'), meta: { title: '权限管理', permission: 'permission:manage' } },
      { path: 'operation-logs', name: 'operation-logs', component: () => import('../views/OperationLogView.vue'), meta: { title: '操作日志', permission: 'operation_log:view' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  if (!authStore.state.ready) {
    try {
      await authStore.loadCurrentUser()
    } catch {
      // 认证失败会由请求拦截器清理登录状态。
    }
  }

  if (to.name === 'login') {
    return authStore.isAuthenticated.value ? { name: 'welcome' } : true
  }
  if (!authStore.isAuthenticated.value) {
    return { name: 'login' }
  }
  if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
    return { name: 'welcome' }
  }
  return true
})

export default router
