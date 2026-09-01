<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { categoryApi, knowledgeBaseApi, tagApi } from '../api'
import { formatDateTime } from '../utils/format'

const loading = ref(false)
const knowledgeBases = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const editorVisible = ref(false)
const editingId = ref(null)
const form = reactive({ code: '', name: '', description: '', status: 1 })

const resourceVisible = ref(false)
const activeTab = ref('categories')
const currentKnowledgeBase = ref(null)
const categories = ref([])
const tags = ref([])
const categoryVisible = ref(false)
const tagVisible = ref(false)
const categoryId = ref(null)
const tagId = ref(null)
const categoryForm = reactive({ parentId: null, name: '', sortOrder: 0 })
const tagForm = reactive({ name: '' })

async function loadKnowledgeBases() {
  loading.value = true
  try {
    const result = await knowledgeBaseApi.page({ page: page.value - 1, size: size.value })
    knowledgeBases.value = result.content
    total.value = result.totalElements
  } catch (error) { ElMessage.error(error.message) } finally { loading.value = false }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, { code: '', name: '', description: '', status: 1 })
  editorVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, { code: row.code, name: row.name, description: row.description || '', status: row.status })
  editorVisible.value = true
}

async function saveKnowledgeBase() {
  if (!form.name || (!editingId.value && !form.code)) return ElMessage.warning('请填写必填项')
  try {
    if (editingId.value) await knowledgeBaseApi.update(editingId.value, { name: form.name, description: form.description || null, status: form.status })
    else await knowledgeBaseApi.create({ code: form.code, name: form.name, description: form.description || null })
    editorVisible.value = false
    ElMessage.success('保存成功')
    await loadKnowledgeBases()
  } catch (error) { ElMessage.error(error.message) }
}

async function removeKnowledgeBase(row) {
  try {
    await ElMessageBox.confirm(`确认删除知识库“${row.name}”吗？`, '删除知识库', { type: 'warning' })
    await knowledgeBaseApi.remove(row.id)
    ElMessage.success('删除成功')
    await loadKnowledgeBases()
  } catch (error) { if (error !== 'cancel') ElMessage.error(error.message) }
}

async function loadResources() {
  try {
    ;[categories.value, tags.value] = await Promise.all([
      categoryApi.list(currentKnowledgeBase.value.id),
      tagApi.list(currentKnowledgeBase.value.id),
    ])
  } catch (error) { ElMessage.error(error.message) }
}

async function openResources(row) {
  currentKnowledgeBase.value = row
  resourceVisible.value = true
  await loadResources()
}

function openCategory(row = null) {
  categoryId.value = row?.id || null
  Object.assign(categoryForm, { parentId: row?.parentId || null, name: row?.name || '', sortOrder: row?.sortOrder || 0 })
  categoryVisible.value = true
}

async function saveCategory() {
  if (!categoryForm.name) return ElMessage.warning('请输入分类名称')
  try {
    const data = { parentId: categoryForm.parentId || null, name: categoryForm.name, sortOrder: categoryForm.sortOrder }
    if (categoryId.value) await categoryApi.update(categoryId.value, data)
    else await categoryApi.create({ knowledgeBaseId: currentKnowledgeBase.value.id, ...data })
    categoryVisible.value = false
    ElMessage.success('保存成功')
    await loadResources()
  } catch (error) { ElMessage.error(error.message) }
}

async function removeCategory(row) {
  try {
    await ElMessageBox.confirm(`确认删除分类“${row.name}”吗？`, '删除分类', { type: 'warning' })
    await categoryApi.remove(row.id)
    ElMessage.success('删除成功')
    await loadResources()
  } catch (error) { if (error !== 'cancel') ElMessage.error(error.message) }
}

function openTag(row = null) {
  tagId.value = row?.id || null
  tagForm.name = row?.name || ''
  tagVisible.value = true
}

async function saveTag() {
  if (!tagForm.name) return ElMessage.warning('请输入标签名称')
  try {
    if (tagId.value) await tagApi.update(tagId.value, { name: tagForm.name })
    else await tagApi.create({ knowledgeBaseId: currentKnowledgeBase.value.id, name: tagForm.name })
    tagVisible.value = false
    ElMessage.success('保存成功')
    await loadResources()
  } catch (error) { ElMessage.error(error.message) }
}

async function removeTag(row) {
  try {
    await ElMessageBox.confirm(`确认删除标签“${row.name}”吗？`, '删除标签', { type: 'warning' })
    await tagApi.remove(row.id)
    ElMessage.success('删除成功')
    await loadResources()
  } catch (error) { if (error !== 'cancel') ElMessage.error(error.message) }
}

onMounted(loadKnowledgeBases)
</script>

<template>
  <PageHeader title="知识库管理" description="维护知识库及其分类、标签。"><el-button type="primary" @click="openCreate">新建知识库</el-button></PageHeader>
  <div class="panel">
    <el-table v-loading="loading" :data="knowledgeBases">
      <el-table-column prop="code" label="知识库编码" min-width="150" />
      <el-table-column prop="name" label="知识库名称" min-width="160" />
      <el-table-column prop="description" label="说明" min-width="260" show-overflow-tooltip />
      <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template></el-table-column>
      <el-table-column label="更新时间" width="170"><template #default="{ row }">{{ formatDateTime(row.updatedTime) }}</template></el-table-column>
      <el-table-column label="操作" width="240" fixed="right"><template #default="{ row }"><div class="table-actions"><el-button link type="primary" @click="openResources(row)">分类与标签</el-button><el-button link type="primary" @click="openEdit(row)">编辑</el-button><el-button link type="danger" @click="removeKnowledgeBase(row)">删除</el-button></div></template></el-table-column>
    </el-table>
    <div class="pagination"><el-pagination v-model:current-page="page" layout="total, prev, pager, next" :total="total" :page-size="size" @current-change="loadKnowledgeBases" /></div>
  </div>

  <el-dialog v-model="editorVisible" :title="editingId ? '编辑知识库' : '新建知识库'" width="560px">
    <el-form label-position="top"><el-form-item v-if="!editingId" label="知识库编码" required><el-input v-model="form.code" maxlength="50" /></el-form-item><el-form-item label="知识库名称" required><el-input v-model="form.name" maxlength="100" /></el-form-item><el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item><el-form-item v-if="editingId" label="状态"><el-radio-group v-model="form.status"><el-radio :value="1">启用</el-radio><el-radio :value="0">停用</el-radio></el-radio-group></el-form-item></el-form>
    <template #footer><el-button @click="editorVisible = false">取消</el-button><el-button type="primary" @click="saveKnowledgeBase">保存</el-button></template>
  </el-dialog>

  <el-dialog v-model="resourceVisible" :title="`${currentKnowledgeBase?.name || ''}：分类与标签`" width="760px">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="分类" name="categories"><div class="subsection-action"><el-button type="primary" plain @click="openCategory()">新建分类</el-button></div><el-table :data="categories" max-height="420"><el-table-column prop="name" label="分类名称" /><el-table-column prop="parentId" label="父分类 ID" width="120" /><el-table-column prop="sortOrder" label="排序" width="90" /><el-table-column label="操作" width="120"><template #default="{ row }"><el-button link type="primary" @click="openCategory(row)">编辑</el-button><el-button link type="danger" @click="removeCategory(row)">删除</el-button></template></el-table-column></el-table></el-tab-pane>
      <el-tab-pane label="标签" name="tags"><div class="subsection-action"><el-button type="primary" plain @click="openTag()">新建标签</el-button></div><el-table :data="tags" max-height="420"><el-table-column prop="name" label="标签名称" /><el-table-column label="操作" width="120"><template #default="{ row }"><el-button link type="primary" @click="openTag(row)">编辑</el-button><el-button link type="danger" @click="removeTag(row)">删除</el-button></template></el-table-column></el-table></el-tab-pane>
    </el-tabs>
  </el-dialog>

  <el-dialog v-model="categoryVisible" :title="categoryId ? '编辑分类' : '新建分类'" width="500px"><el-form label-position="top"><el-form-item label="分类名称" required><el-input v-model="categoryForm.name" maxlength="100" /></el-form-item><el-form-item label="父分类"><el-select v-model="categoryForm.parentId" clearable style="width: 100%"><el-option v-for="item in categories.filter((item) => item.id !== categoryId)" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item><el-form-item label="排序值"><el-input-number v-model="categoryForm.sortOrder" :min="0" /></el-form-item></el-form><template #footer><el-button @click="categoryVisible = false">取消</el-button><el-button type="primary" @click="saveCategory">保存</el-button></template></el-dialog>
  <el-dialog v-model="tagVisible" :title="tagId ? '编辑标签' : '新建标签'" width="460px"><el-form label-position="top"><el-form-item label="标签名称" required><el-input v-model="tagForm.name" maxlength="50" /></el-form-item></el-form><template #footer><el-button @click="tagVisible = false">取消</el-button><el-button type="primary" @click="saveTag">保存</el-button></template></el-dialog>
</template>
