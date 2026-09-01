<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { operationLogApi } from '../api'
import { formatDateTime } from '../utils/format'

const loading = ref(false)
const logs = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const dateRange = ref([])
const query = reactive({ operatorId: null, module: '', action: '', success: null })

async function loadLogs() {
  loading.value = true
  const params = { page: page.value - 1, size: size.value }
  if (query.operatorId) params.operatorId = query.operatorId
  if (query.module) params.module = query.module
  if (query.action) params.action = query.action
  if (query.success !== null && query.success !== '') params.success = query.success
  if (dateRange.value?.length === 2) [params.startDate, params.endDate] = dateRange.value
  try {
    const result = await operationLogApi.page(params)
    logs.value = result.content
    total.value = result.totalElements
  } catch (error) { ElMessage.error(error.message) } finally { loading.value = false }
}

function reset() {
  Object.assign(query, { operatorId: null, module: '', action: '', success: null })
  dateRange.value = []
  page.value = 1
  loadLogs()
}

onMounted(loadLogs)
</script>

<template>
  <PageHeader title="操作日志" description="根据操作人、模块、结果和日期定位写操作。" />
  <div class="panel">
    <div class="filter-bar">
      <el-input-number v-model="query.operatorId" :min="1" controls-position="right" placeholder="操作人 ID" />
      <el-input v-model="query.module" clearable placeholder="模块" style="width: 150px" />
      <el-input v-model="query.action" clearable placeholder="动作" style="width: 170px" />
      <el-select v-model="query.success" clearable placeholder="执行结果" style="width: 120px"><el-option label="成功" :value="true" /><el-option label="失败" :value="false" /></el-select>
      <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
      <el-button type="primary" @click="page = 1; loadLogs()">查询</el-button><el-button @click="reset">重置</el-button>
    </div>
    <el-table v-loading="loading" :data="logs">
      <el-table-column prop="operatorName" label="操作人" width="120" />
      <el-table-column prop="module" label="模块" width="120" />
      <el-table-column prop="action" label="动作" min-width="150" />
      <el-table-column label="请求" min-width="230"><template #default="{ row }"><span class="request-method">{{ row.requestMethod }}</span> {{ row.requestPath }}</template></el-table-column>
      <el-table-column label="结果" width="80"><template #default="{ row }"><el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '成功' : '失败' }}</el-tag></template></el-table-column>
      <el-table-column prop="traceId" label="TraceId" min-width="170" show-overflow-tooltip />
      <el-table-column prop="errorMessage" label="错误信息" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作时间" width="170"><template #default="{ row }">{{ formatDateTime(row.createdTime) }}</template></el-table-column>
    </el-table>
    <div class="pagination"><el-pagination v-model:current-page="page" layout="total, prev, pager, next" :total="total" :page-size="size" @current-change="loadLogs" /></div>
  </div>
</template>
