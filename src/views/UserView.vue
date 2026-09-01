<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { roleApi, userApi } from '../api'
import { authStore } from '../stores/auth'
import { formatDateTime } from '../utils/format'

const loading = ref(false)
const users = ref([])
const roles = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const editorVisible = ref(false)
const roleVisible = ref(false)
const editingId = ref(null)
const form = reactive({ username: '', displayName: '', password: '', email: '', status: 1 })
const roleForm = reactive({ userId: null, roleIds: [] })

async function loadUsers() {
  loading.value = true
  try {
    const result = await userApi.page({ page: page.value - 1, size: size.value })
    users.value = result.content
    total.value = result.totalElements
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, { username: '', displayName: '', password: '', email: '', status: 1 })
  editorVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, {
    username: row.username,
    displayName: row.displayName,
    password: '',
    email: row.email || '',
    status: row.status,
  })
  editorVisible.value = true
}

async function saveUser() {
  if (!form.displayName || (!editingId.value && (!form.username || !form.password))) {
    ElMessage.warning('请填写必填项')
    return
  }
  try {
    if (editingId.value) {
      await userApi.update(editingId.value, {
        displayName: form.displayName,
        email: form.email || null,
        status: form.status,
      })
    } else {
      await userApi.create({
        username: form.username,
        displayName: form.displayName,
        password: form.password,
        email: form.email || null,
      })
    }
    editorVisible.value = false
    ElMessage.success('保存成功')
    await loadUsers()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

async function openRoles(row) {
  roleForm.userId = row.id
  roleForm.roleIds = [...(row.roleIds || [])]
  roleVisible.value = true
}

async function saveRoles() {
  try {
    await userApi.assignRoles(roleForm.userId, roleForm.roleIds)
    roleVisible.value = false
    ElMessage.success('角色分配成功')
    await loadUsers()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

async function removeUser(row) {
  try {
    await ElMessageBox.confirm(`确认删除用户“${row.displayName}”吗？`, '删除用户', { type: 'warning' })
    await userApi.remove(row.id)
    ElMessage.success('删除成功')
    await loadUsers()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(error.message)
  }
}

onMounted(async () => {
  await loadUsers()
  if (authStore.hasPermission('role:manage')) {
    try {
      roles.value = await roleApi.list()
    } catch (error) {
      ElMessage.error(error.message)
    }
  }
})
</script>

<template>
  <PageHeader title="用户管理" description="维护登录账号、启用状态和用户角色。">
    <el-button type="primary" @click="openCreate">新建用户</el-button>
  </PageHeader>
  <div class="panel">
    <el-table v-loading="loading" :data="users">
      <el-table-column prop="username" label="用户名" min-width="130" />
      <el-table-column prop="displayName" label="显示名称" min-width="130" />
      <el-table-column prop="email" label="邮箱" min-width="190" show-overflow-tooltip />
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="创建时间" width="170"><template #default="{ row }">{{ formatDateTime(row.createdTime) }}</template></el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="authStore.hasPermission('role:manage')" link type="primary" @click="openRoles(row)">分配角色</el-button>
            <el-button link type="danger" @click="removeUser(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination"><el-pagination v-model:current-page="page" v-model:page-size="size" layout="total, prev, pager, next" :total="total" @current-change="loadUsers" /></div>
  </div>

  <el-dialog v-model="editorVisible" :title="editingId ? '编辑用户' : '新建用户'" width="520px">
    <el-form label-position="top">
      <el-form-item v-if="!editingId" label="用户名" required><el-input v-model="form.username" maxlength="50" /></el-form-item>
      <el-form-item label="显示名称" required><el-input v-model="form.displayName" maxlength="100" /></el-form-item>
      <el-form-item v-if="!editingId" label="初始密码" required><el-input v-model="form.password" type="password" show-password /></el-form-item>
      <el-form-item label="邮箱"><el-input v-model="form.email" maxlength="255" /></el-form-item>
      <el-form-item v-if="editingId" label="状态"><el-radio-group v-model="form.status"><el-radio :value="1">启用</el-radio><el-radio :value="0">停用</el-radio></el-radio-group></el-form-item>
    </el-form>
    <template #footer><el-button @click="editorVisible = false">取消</el-button><el-button type="primary" @click="saveUser">保存</el-button></template>
  </el-dialog>

  <el-dialog v-model="roleVisible" title="分配角色" width="520px">
    <el-checkbox-group v-model="roleForm.roleIds" class="checkbox-list">
      <el-checkbox v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}（{{ role.code }}）</el-checkbox>
    </el-checkbox-group>
    <template #footer><el-button @click="roleVisible = false">取消</el-button><el-button type="primary" @click="saveRoles">保存</el-button></template>
  </el-dialog>
</template>
