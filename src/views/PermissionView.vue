<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { permissionApi } from '../api'

const loading = ref(false)
const permissions = ref([])
const visible = ref(false)
const editingId = ref(null)
const form = reactive({ code: '', name: '', menuPath: '', apiRules: '', parentId: null, sortOrder: 0 })

async function loadPermissions() {
  loading.value = true
  try { permissions.value = await permissionApi.list() } catch (error) { ElMessage.error(error.message) } finally { loading.value = false }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, { code: '', name: '', menuPath: '', apiRules: '', parentId: null, sortOrder: 0 })
  visible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, { code: row.code, name: row.name, menuPath: row.menuPath || '', apiRules: row.apiRules, parentId: row.parentId, sortOrder: row.sortOrder })
  visible.value = true
}

async function savePermission() {
  if (!form.name || !form.apiRules || (!editingId.value && !form.code)) return ElMessage.warning('请填写必填项')
  const data = { name: form.name, menuPath: form.menuPath || null, apiRules: form.apiRules, parentId: form.parentId || null, sortOrder: form.sortOrder }
  try {
    if (editingId.value) await permissionApi.update(editingId.value, data)
    else await permissionApi.create({ code: form.code, ...data })
    visible.value = false
    ElMessage.success('保存成功')
    await loadPermissions()
  } catch (error) { ElMessage.error(error.message) }
}

async function removePermission(row) {
  try {
    await ElMessageBox.confirm(`确认删除权限“${row.name}”吗？`, '删除权限', { type: 'warning' })
    await permissionApi.remove(row.id)
    ElMessage.success('删除成功')
    await loadPermissions()
  } catch (error) { if (error !== 'cancel') ElMessage.error(error.message) }
}

onMounted(loadPermissions)
</script>

<template>
  <PageHeader title="权限管理" description="一项权限对应一组菜单入口和 API 访问规则。"><el-button type="primary" @click="openCreate">新建权限</el-button></PageHeader>
  <div class="panel">
    <el-table v-loading="loading" :data="permissions">
      <el-table-column prop="code" label="权限编码" min-width="170" />
      <el-table-column prop="name" label="权限名称" min-width="140" />
      <el-table-column prop="menuPath" label="菜单路径" min-width="150" show-overflow-tooltip />
      <el-table-column prop="apiRules" label="API 规则" min-width="320" show-overflow-tooltip />
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column label="操作" width="120" fixed="right"><template #default="{ row }"><div class="table-actions"><el-button link type="primary" @click="openEdit(row)">编辑</el-button><el-button link type="danger" @click="removePermission(row)">删除</el-button></div></template></el-table-column>
    </el-table>
  </div>

  <el-dialog v-model="visible" :title="editingId ? '编辑权限' : '新建权限'" width="650px">
    <el-form label-position="top"><el-form-item v-if="!editingId" label="权限编码" required><el-input v-model="form.code" placeholder="例如 document:search" /></el-form-item><el-form-item label="权限名称" required><el-input v-model="form.name" /></el-form-item><el-form-item label="菜单路径"><el-input v-model="form.menuPath" placeholder="例如 /search" /></el-form-item><el-form-item label="API 规则" required><el-input v-model="form.apiRules" type="textarea" :rows="4" placeholder="多条规则使用英文逗号分隔" /></el-form-item><el-form-item label="父权限 ID"><el-input-number v-model="form.parentId" :min="1" controls-position="right" /></el-form-item><el-form-item label="排序值" required><el-input-number v-model="form.sortOrder" :min="0" controls-position="right" /></el-form-item></el-form>
    <template #footer><el-button @click="visible = false">取消</el-button><el-button type="primary" @click="savePermission">保存</el-button></template>
  </el-dialog>
</template>
