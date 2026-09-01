<script setup>
import { authStore } from '../stores/auth'
</script>

<template>
  <div class="welcome-line">欢迎使用企业知识库，{{ authStore.user.value?.displayName }}。</div>
</template>
