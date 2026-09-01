<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authStore } from '../stores/auth'

const router = useRouter()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

async function submit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await authStore.login(form)
    router.replace({ name: 'welcome' })
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <header class="login-header">
      <div class="brand brand-light">
        <span class="brand-mark">知</span>
        <span>企业知识库</span>
      </div>
      <span>企业知识与 AI 应用平台</span>
    </header>
    <main class="login-main">
      <section class="login-card">
        <div class="login-title">
          <span class="brand-mark large">知</span>
          <h1>登录企业知识库</h1>
          <p>使用已分配的账号进入系统</p>
        </div>
        <el-form label-position="top" @submit.prevent="submit">
          <el-form-item label="用户名">
            <el-input v-model="form.username" maxlength="50" placeholder="请输入用户名" @keyup.enter="submit" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" @keyup.enter="submit" />
          </el-form-item>
          <el-button class="login-button" type="primary" :loading="loading" @click="submit">登录</el-button>
        </el-form>
      </section>
    </main>
  </div>
</template>
