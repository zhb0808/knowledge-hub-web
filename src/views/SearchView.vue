<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { categoryApi, knowledgeBaseApi, searchApi, tagApi } from '../api'
import { authStore } from '../stores/auth'
import { formatDateTime } from '../utils/format'

const loading = ref(false)
const rebuilding = ref(false)
const searched = ref(false)
const results = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const knowledgeBases = ref([])
const categories = ref([])
const tags = ref([])
const query = reactive({ keyword: '', knowledgeBaseId: null, categoryId: null, tagId: null })

function safeHighlight(value) {
  if (!value) return ''
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('&lt;em&gt;', '<em>')
    .replaceAll('&lt;/em&gt;', '</em>')
}

async function search() {
  if (!query.keyword.trim()) return ElMessage.warning('请输入搜索关键词')
  loading.value = true
  const params = { keyword: query.keyword.trim(), page: page.value - 1, size: size.value }
  if (query.knowledgeBaseId) params.knowledgeBaseId = query.knowledgeBaseId
  if (query.categoryId) params.categoryId = query.categoryId
  if (query.tagId) params.tagId = query.tagId
  try {
    const result = await searchApi.page(params)
    results.value = result.content
    total.value = result.totalElements
    searched.value = true
  } catch (error) { ElMessage.error(error.message) } finally { loading.value = false }
}

async function changeKnowledgeBase() {
  query.categoryId = null
  query.tagId = null
  categories.value = []
  tags.value = []
  if (!query.knowledgeBaseId) return
  try {
    ;[categories.value, tags.value] = await Promise.all([
      categoryApi.list(query.knowledgeBaseId),
      tagApi.list(query.knowledgeBaseId),
    ])
  } catch (error) { ElMessage.error(error.message) }
}

async function rebuildIndex() {
  rebuilding.value = true
  try {
    const task = await searchApi.rebuild()
    ElMessage.success(`索引重建任务已提交：${task.taskId}`)
  } catch (error) { ElMessage.error(error.message) } finally { rebuilding.value = false }
}

onMounted(async () => {
  if (!authStore.hasPermission('knowledge_base:manage')) return
  try {
    const result = await knowledgeBaseApi.page({ page: 0, size: 200 })
    knowledgeBases.value = result.content
  } catch (error) { ElMessage.error(error.message) }
})
</script>

<template>
  <PageHeader title="全文搜索" description="从已发布文档的标题、摘要和正文中查找企业知识。">
    <el-button v-if="authStore.hasPermission('document:manage')" :loading="rebuilding" @click="rebuildIndex">重建搜索索引</el-button>
  </PageHeader>
  <div class="search-box">
    <div class="search-row"><el-input v-model="query.keyword" size="large" maxlength="100" clearable placeholder="输入要查找的关键词" @keyup.enter="page = 1; search()" /><el-button type="primary" size="large" @click="page = 1; search()">搜索</el-button></div>
    <div v-if="authStore.hasPermission('knowledge_base:manage')" class="search-filters">
      <el-select v-model="query.knowledgeBaseId" clearable placeholder="全部知识库" @change="changeKnowledgeBase"><el-option v-for="item in knowledgeBases" :key="item.id" :label="item.name" :value="item.id" /></el-select>
      <el-select v-model="query.categoryId" clearable placeholder="全部分类"><el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" /></el-select>
      <el-select v-model="query.tagId" clearable placeholder="全部标签"><el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" /></el-select>
    </div>
  </div>

  <div v-loading="loading" class="search-results">
    <div v-if="searched" class="result-count">找到 {{ total }} 条结果</div>
    <article v-for="item in results" :key="item.id" class="search-result">
      <h2 v-html="safeHighlight(item.title)" />
      <div class="result-meta"><span>{{ item.knowledgeBaseName }}</span><span v-if="item.categoryName">{{ item.categoryName }}</span><span>{{ formatDateTime(item.updatedTime) }}</span></div>
      <p v-if="item.summary" v-html="safeHighlight(item.summary)" />
      <p v-if="item.contentHighlight" class="content-highlight" v-html="safeHighlight(item.contentHighlight)" />
    </article>
    <el-empty v-if="searched && !results.length" description="没有找到匹配的已发布文档" />
    <div v-if="searched && total > size" class="pagination"><el-pagination v-model:current-page="page" :page-size="size" layout="total, prev, pager, next" :total="total" @current-change="search" /></div>
  </div>
</template>
