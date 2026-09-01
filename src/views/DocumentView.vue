<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { categoryApi, documentApi, knowledgeBaseApi, tagApi } from '../api'
import { formatDateTime, formatFileSize } from '../utils/format'

const loading = ref(false)
const knowledgeBases = ref([])
const categories = ref([])
const tags = ref([])
const documents = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const selectedRows = ref([])
const query = reactive({ knowledgeBaseId: null, keyword: '', categoryId: null, tagId: null, status: '' })

const editorVisible = ref(false)
const editingId = ref(null)
const form = reactive({ knowledgeBaseId: null, categoryId: null, title: '', summary: '', content: '', status: 'DRAFT', version: 0, tagIds: [] })
const editorCategories = ref([])
const editorTags = ref([])

const fileVisible = ref(false)
const currentDocument = ref(null)
const currentFile = ref(null)
const selectedFile = ref(null)
const fileLoading = ref(false)

const batchStatus = ref('PUBLISHED')
const statusOptions = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'ARCHIVED', label: '已归档' },
]
const canQuery = computed(() => Boolean(query.knowledgeBaseId))

function statusLabel(status) {
  return statusOptions.find((item) => item.value === status)?.label || status
}

async function loadKnowledgeBases() {
  const result = await knowledgeBaseApi.page({ page: 0, size: 200, sort: 'createdTime,desc' })
  knowledgeBases.value = result.content
  if (!query.knowledgeBaseId && knowledgeBases.value.length) query.knowledgeBaseId = knowledgeBases.value[0].id
}

async function loadResources(knowledgeBaseId, forEditor = false) {
  if (!knowledgeBaseId) return
  const [categoryList, tagList] = await Promise.all([categoryApi.list(knowledgeBaseId), tagApi.list(knowledgeBaseId)])
  if (forEditor) {
    editorCategories.value = categoryList
    editorTags.value = tagList
  } else {
    categories.value = categoryList
    tags.value = tagList
  }
}

async function changeKnowledgeBase() {
  query.categoryId = null
  query.tagId = null
  page.value = 1
  try {
    await loadResources(query.knowledgeBaseId)
    await loadDocuments()
  } catch (error) { ElMessage.error(error.message) }
}

async function loadDocuments() {
  if (!canQuery.value) return
  loading.value = true
  const params = { knowledgeBaseId: query.knowledgeBaseId, page: page.value - 1, size: size.value }
  if (query.keyword) params.keyword = query.keyword
  if (query.categoryId) params.categoryId = query.categoryId
  if (query.tagId) params.tagId = query.tagId
  if (query.status) params.status = query.status
  try {
    const result = await documentApi.page(params)
    documents.value = result.content
    total.value = result.totalElements
  } catch (error) { ElMessage.error(error.message) } finally { loading.value = false }
}

async function openCreate() {
  if (!query.knowledgeBaseId) return ElMessage.warning('请先创建知识库')
  editingId.value = null
  Object.assign(form, { knowledgeBaseId: query.knowledgeBaseId, categoryId: null, title: '', summary: '', content: '', status: 'DRAFT', version: 0, tagIds: [] })
  try {
    await loadResources(form.knowledgeBaseId, true)
    editorVisible.value = true
  } catch (error) { ElMessage.error(error.message) }
}

async function openEdit(row) {
  try {
    const detail = await documentApi.detail(row.id)
    editingId.value = detail.id
    Object.assign(form, {
      knowledgeBaseId: detail.knowledgeBaseId,
      categoryId: detail.categoryId,
      title: detail.title,
      summary: detail.summary || '',
      content: detail.content || '',
      status: detail.status,
      version: detail.version,
      tagIds: detail.tags?.map((tag) => tag.id) || [],
    })
    await loadResources(detail.knowledgeBaseId, true)
    editorVisible.value = true
  } catch (error) { ElMessage.error(error.message) }
}

async function changeEditorKnowledgeBase() {
  form.categoryId = null
  form.tagIds = []
  try { await loadResources(form.knowledgeBaseId, true) } catch (error) { ElMessage.error(error.message) }
}

async function saveDocument() {
  if (!form.knowledgeBaseId || !form.title) return ElMessage.warning('请填写必填项')
  try {
    if (editingId.value) {
      await documentApi.update(editingId.value, {
        version: form.version,
        categoryId: form.categoryId || null,
        title: form.title,
        summary: form.summary || null,
        content: form.content || null,
        status: form.status,
        tagIds: form.tagIds,
      })
    } else {
      await documentApi.create({
        knowledgeBaseId: form.knowledgeBaseId,
        categoryId: form.categoryId || null,
        title: form.title,
        summary: form.summary || null,
        content: form.content || null,
        tagIds: form.tagIds,
      })
    }
    editorVisible.value = false
    ElMessage.success('保存成功')
    await loadDocuments()
  } catch (error) { ElMessage.error(error.message) }
}

async function removeDocument(row) {
  try {
    await ElMessageBox.confirm(`确认删除文档“${row.title}”吗？关联附件也会一并删除。`, '删除文档', { type: 'warning' })
    await documentApi.remove(row.id)
    ElMessage.success('删除成功')
    await loadDocuments()
  } catch (error) { if (error !== 'cancel') ElMessage.error(error.message) }
}

async function updateBatchStatus() {
  if (!selectedRows.value.length) return ElMessage.warning('请先选择文档')
  try {
    const count = await documentApi.batchStatus({
      knowledgeBaseId: query.knowledgeBaseId,
      documentIds: selectedRows.value.map((row) => row.id),
      status: batchStatus.value,
    })
    ElMessage.success(`已更新 ${count} 篇文档`)
    await loadDocuments()
  } catch (error) { ElMessage.error(error.message) }
}

async function openFile(row) {
  currentDocument.value = row
  selectedFile.value = null
  fileLoading.value = true
  fileVisible.value = true
  try { currentFile.value = await documentApi.fileInfo(row.id) } catch (error) { ElMessage.error(error.message) } finally { fileLoading.value = false }
}

function chooseFile(event) {
  selectedFile.value = event.target.files?.[0] || null
}

async function saveFile() {
  if (!selectedFile.value) return ElMessage.warning('请选择文件')
  fileLoading.value = true
  try {
    currentFile.value = await documentApi.uploadFile(currentDocument.value.id, selectedFile.value, Boolean(currentFile.value))
    selectedFile.value = null
    ElMessage.success(currentFile.value ? '附件保存成功' : '附件上传成功')
  } catch (error) { ElMessage.error(error.message) } finally { fileLoading.value = false }
}

async function downloadFile() {
  try {
    const access = await documentApi.fileUrl(currentDocument.value.id)
    window.open(access.url, '_blank', 'noopener,noreferrer')
  } catch (error) { ElMessage.error(error.message) }
}

async function removeFile() {
  try {
    await ElMessageBox.confirm(`确认删除附件“${currentFile.value.originalName}”吗？`, '删除附件', { type: 'warning' })
    await documentApi.removeFile(currentDocument.value.id)
    currentFile.value = null
    ElMessage.success('附件已删除')
  } catch (error) { if (error !== 'cancel') ElMessage.error(error.message) }
}

onMounted(async () => {
  try {
    await loadKnowledgeBases()
    if (query.knowledgeBaseId) {
      await loadResources(query.knowledgeBaseId)
      await loadDocuments()
    }
  } catch (error) { ElMessage.error(error.message) }
})
</script>

<template>
  <PageHeader title="文档管理" description="维护正文、发布状态、分类标签和原始附件。"><el-button type="primary" :disabled="!query.knowledgeBaseId" @click="openCreate">新建文档</el-button></PageHeader>
  <div class="panel">
    <div class="filter-bar">
      <el-select v-model="query.knowledgeBaseId" placeholder="选择知识库" style="width: 190px" @change="changeKnowledgeBase"><el-option v-for="item in knowledgeBases" :key="item.id" :label="item.name" :value="item.id" /></el-select>
      <el-input v-model="query.keyword" clearable placeholder="标题或摘要关键词" style="width: 210px" @keyup.enter="page = 1; loadDocuments()" />
      <el-select v-model="query.categoryId" clearable placeholder="分类" style="width: 140px"><el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" /></el-select>
      <el-select v-model="query.tagId" clearable placeholder="标签" style="width: 140px"><el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" /></el-select>
      <el-select v-model="query.status" clearable placeholder="状态" style="width: 120px"><el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
      <el-button type="primary" @click="page = 1; loadDocuments()">查询</el-button>
    </div>
    <div class="batch-bar"><span>已选择 {{ selectedRows.length }} 篇</span><el-select v-model="batchStatus" style="width: 120px"><el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select><el-button :disabled="!selectedRows.length" @click="updateBatchStatus">批量修改状态</el-button></div>
    <el-table v-loading="loading" :data="documents" @selection-change="selectedRows = $event">
      <el-table-column type="selection" width="46" />
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column prop="categoryName" label="分类" width="120" />
      <el-table-column label="标签" min-width="160"><template #default="{ row }"><el-tag v-for="tag in row.tags" :key="tag.id" class="small-tag" type="info">{{ tag.name }}</el-tag></template></el-table-column>
      <el-table-column label="状态" width="90"><template #default="{ row }">{{ statusLabel(row.status) }}</template></el-table-column>
      <el-table-column label="更新时间" width="170"><template #default="{ row }">{{ formatDateTime(row.updatedTime) }}</template></el-table-column>
      <el-table-column label="操作" width="210" fixed="right"><template #default="{ row }"><div class="table-actions"><el-button link type="primary" @click="openEdit(row)">编辑</el-button><el-button link type="primary" @click="openFile(row)">附件</el-button><el-button link type="danger" @click="removeDocument(row)">删除</el-button></div></template></el-table-column>
    </el-table>
    <div class="pagination"><el-pagination v-model:current-page="page" layout="total, prev, pager, next" :total="total" :page-size="size" @current-change="loadDocuments" /></div>
  </div>

  <el-dialog v-model="editorVisible" :title="editingId ? '编辑文档' : '新建文档'" width="760px">
    <el-form label-position="top">
      <el-form-item label="所属知识库" required><el-select v-model="form.knowledgeBaseId" :disabled="Boolean(editingId)" style="width: 100%" @change="changeEditorKnowledgeBase"><el-option v-for="item in knowledgeBases" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item>
      <el-form-item label="标题" required><el-input v-model="form.title" maxlength="200" show-word-limit /></el-form-item>
      <div class="form-grid"><el-form-item label="分类"><el-select v-model="form.categoryId" clearable style="width: 100%"><el-option v-for="item in editorCategories" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item><el-form-item v-if="editingId" label="状态"><el-select v-model="form.status" style="width: 100%"><el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></div>
      <el-form-item label="标签"><el-select v-model="form.tagIds" multiple clearable style="width: 100%"><el-option v-for="item in editorTags" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item>
      <el-form-item label="摘要"><el-input v-model="form.summary" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
      <el-form-item label="正文"><el-input v-model="form.content" type="textarea" :rows="12" /></el-form-item>
    </el-form>
    <template #footer><el-button @click="editorVisible = false">取消</el-button><el-button type="primary" @click="saveDocument">保存</el-button></template>
  </el-dialog>

  <el-dialog v-model="fileVisible" :title="`文档附件：${currentDocument?.title || ''}`" width="600px">
    <div v-loading="fileLoading" class="file-panel">
      <div v-if="currentFile" class="file-info"><div><strong>{{ currentFile.originalName }}</strong><span>{{ currentFile.contentType }} · {{ formatFileSize(currentFile.fileSize) }}</span></div><div><el-button link type="primary" @click="downloadFile">下载</el-button><el-button link type="danger" @click="removeFile">删除</el-button></div></div>
      <el-empty v-else description="当前文档尚未上传附件" :image-size="70" />
      <div class="file-upload"><input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" @change="chooseFile" /><el-button type="primary" :disabled="!selectedFile" @click="saveFile">{{ currentFile ? '替换附件' : '上传附件' }}</el-button></div>
      <p class="help-text">支持 PDF、DOC、DOCX、TXT、PNG、JPG/JPEG，单个文件不超过 20MB。</p>
    </div>
  </el-dialog>
</template>
