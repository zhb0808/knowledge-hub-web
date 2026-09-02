<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()

const groups = computed(() => [
  {
    title: '工作台',
    items: [{ label: '欢迎页', route: 'welcome' }],
  },
  {
    title: '知识管理',
    items: [
      authStore.hasPermission('knowledge_base:manage') && { label: '知识库管理', route: 'knowledge-bases' },
      authStore.hasPermission('document:manage') && { label: '文档管理', route: 'documents' },
    ].filter(Boolean),
  },
  {
    title: '检索与问答',
    items: [
      authStore.hasPermission('document:search') && { label: '全文搜索', route: 'search' },
      authStore.hasPermission('ai:chat') && { label: 'AI 对话', route: 'ai' },
    ].filter(Boolean),
  },
  {
    title: '系统管理',
    items: [
      authStore.hasPermission('user:manage') && { label: '用户管理', route: 'users' },
      authStore.hasPermission('role:manage') && { label: '角色管理', route: 'roles' },
      authStore.hasPermission('permission:manage') && { label: '权限管理', route: 'permissions' },
      authStore.hasPermission('operation_log:view') && { label: '操作日志', route: 'operation-logs' },
    ].filter(Boolean),
  },
].filter((group) => group.items.length))

async function handleLogout() {
  try {
    await authStore.logout()
  } catch (error) {
    console.warn('服务端退出请求失败，本地登录状态已清理：', error.message)
  } finally {
    await router.replace({ name: 'login' })
  }
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">知</span>
        <span>企业知识库</span>
      </div>
      <nav class="navigation">
        <section v-for="group in groups" :key="group.title" class="nav-group">
          <div class="nav-title">{{ group.title }}</div>
          <router-link
            v-for="item in group.items"
            :key="item.route"
            :to="{ name: item.route }"
            class="nav-item"
          >
            {{ item.label }}
          </router-link>
        </section>
      </nav>
    </aside>

    <section class="main-shell">
      <header class="topbar">
        <div class="page-location">{{ route.meta.title || route.name }}</div>
        <div class="user-area">
          <span>{{ authStore.user.value?.displayName }}</span>
          <span class="username">{{ authStore.user.value?.username }}</span>
          <el-button link @click="handleLogout">退出</el-button>
        </div>
      </header>
      <main class="page-body">
        <router-view />
      </main>
    </section>
  </div>
</template>
