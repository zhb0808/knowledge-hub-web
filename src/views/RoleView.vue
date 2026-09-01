<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { permissionApi, roleApi } from '../api'
import { authStore } from '../stores/auth'

const loading = ref(false)
const roles = ref([])
const permissions = ref([])
const editorVisible = ref(false)
const permissionVisible = ref(false)
const editingId = ref(null)
const form = reactive({ code: '', name: '', description: '' })
const permissionForm = reactive({ roleId: null, permissionIds: [] })

async function loadRoles() {
  loading.value = true
  try { roles.value = await roleApi.list() } catch (error) { ElMessage.error(error.message) } finally { loading.value = false }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, { code: '', name: '', description: '' })
  editorVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, { code: row.code, name: row.name, description: row.description || '' })
  editorVisible.value = true
}

async function saveRole() {
  if (!form.name || (!editingId.value && !form.code)) return ElMessage.warning('请填写必填项')
  try {
    if (editingId.value) await roleApi.update(editingId.value, { name: form.name, description: form.description || null })
    else await roleApi.create({ code: form.code, name: form.name, description: form.description || null })
    editorVisible.value = false
    ElMessage.success('保存成功')
    await loadRoles()
  } catch (error) { ElMessage.error(error.message) }
}

function openPermissions(row) {
  permissionForm.roleId = row.id
  permissionForm.permissionIds = [...(row.permissionIds || [])]
  permissionVisible.value = true
}

async function savePermissions() {
  try {
    await roleApi.assignPermissions(permissionForm.roleId, permissionForm.permissionIds)
    permissionVisible.value = false
    ElMessage.success('权限分配成功')
    await loadRoles()
  } catch (error) { ElMessage.error(error.message) }
}

async function removeRole(row) {
  try {
    await ElMessageBox.confirm(`确认删除角色“${row.name}”吗？`, '删除角色', { type: 'warning' })
    await roleApi.remove(row.id)
    ElMessage.success('删除成功')
    await loadRoles()
  } catch (error) { if (error !== 'cancel') ElMessage.error(error.message) }
}

onMounted(async () => {
  await loadRoles()
  if (authStore.hasPermission('permission:manage')) {
    try { permissions.value = await permissionApi.list() } catch (error) { ElMessage.error(error.message) }
  }
})
</script>

<template>
  <PageHeader title="角色管理" description="按业务职责组织权限，再将角色分配给用户。"><el-button type="primary" @click="openCreate">新建角色</el-button></PageHeader>
  <div class="panel">
    <el-table v-loading="loading" :data="roles">
      <el-table-column prop="code" label="角色编码" min-width="150" />
      <el-table-column prop="name" label="角色名称" min-width="140" />
      <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
      <el-table-column label="已分配权限" width="120"><template #default="{ row }">{{ row.permissionIds?.length || 0 }} 项</template></el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }"><div class="table-actions"><el-button link type="primary" @click="openEdit(row)">编辑</el-button><el-button v-if="authStore.hasPermission('permission:manage')" link type="primary" @click="openPermissions(row)">分配权限</el-button><el-button link type="danger" @click="removeRole(row)">删除</el-button></div></template>
      </el-table-column>
    </el-table>
  </div>

  <el-dialog v-model="editorVisible" :title="editingId ? '编辑角色' : '新建角色'" width="520px">
    <el-form label-position="top"><el-form-item v-if="!editingId" label="角色编码" required><el-input v-model="form.code" maxlength="50" /></el-form-item><el-form-item label="角色名称" required><el-input v-model="form.name" maxlength="100" /></el-form-item><el-form-item label="角色说明"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item></el-form>
    <template #footer><el-button @click="editorVisible = false">取消</el-button><el-button type="primary" @click="saveRole">保存</el-button></template>
  </el-dialog>

  <el-dialog v-model="permissionVisible" title="分配权限" width="620px">
    <el-checkbox-group v-model="permissionForm.permissionIds" class="checkbox-list"><el-checkbox v-for="permission in permissions" :key="permission.id" :value="permission.id">{{ permission.name }}（{{ permission.code }}）</el-checkbox></el-checkbox-group>
    <template #footer><el-button @click="permissionVisible = false">取消</el-button><el-button type="primary" @click="savePermissions">保存</el-button></template>
  </el-dialog>
</template>
