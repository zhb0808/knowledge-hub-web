<script setup>
import { nextTick, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { aiApi } from '../api'
import { authStore } from '../stores/auth'
import { renderMarkdown } from '../utils/markdown'
import { streamPost } from '../utils/sse'

const activeTab = ref('knowledge')
const rebuilding = ref(false)
const messageBox = ref(null)
const panels = reactive({
  general: { input: '', loading: false, messages: [] },
  knowledge: { input: '', loading: false, messages: [] },
})

function uniqueSources(sources) {
  const sourceMap = new Map()
  for (const source of sources || []) sourceMap.set(source.documentId, source)
  return [...sourceMap.values()]
}

async function scrollToBottom() {
  await nextTick()
  if (messageBox.value) messageBox.value.scrollTop = messageBox.value.scrollHeight
}

async function send(type) {
  const panel = panels[type]
  const question = panel.input.trim()
  if (!question || panel.loading) return

  panel.messages.push({ role: 'user', content: question })
  const answer = reactive({ role: 'assistant', content: '', sources: [] })
  panel.messages.push(answer)
  panel.input = ''
  panel.loading = true
  await scrollToBottom()

  try {
    const url = type === 'general' ? '/api/ai/chat/stream' : '/api/ai/knowledge-chat/stream'
    await streamPost(url, { message: question }, ({ event, data }) => {
      if (event === 'sources') {
        answer.sources = uniqueSources(JSON.parse(data))
      } else {
        answer.content += data
      }
      scrollToBottom()
    })
    if (!answer.content) answer.content = '本次回答没有返回内容。'
  } catch (error) {
    answer.content ||= '回答中断，请稍后重试。'
    ElMessage.error(error.message)
  } finally {
    panel.loading = false
    await scrollToBottom()
  }
}

function handleComposerKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  send(activeTab.value)
}

async function rebuildKnowledge() {
  rebuilding.value = true
  try {
    const result = await aiApi.rebuildKnowledge()
    ElMessage.success(`已处理 ${result.documentCount} 篇文档，生成 ${result.chunkCount} 个知识片段`)
  } catch (error) { ElMessage.error(error.message) } finally { rebuilding.value = false }
}
</script>

<template>
  <PageHeader title="AI 对话" description="对比通用大模型回答与基于企业知识的回答。">
    <el-button v-if="authStore.hasPermission('document:manage')" :loading="rebuilding" @click="rebuildKnowledge">重建企业知识向量</el-button>
  </PageHeader>
  <div class="ai-panel">
    <el-tabs v-model="activeTab" class="ai-tabs">
      <el-tab-pane label="企业知识问答" name="knowledge" />
      <el-tab-pane label="通用 AI 助手" name="general" />
    </el-tabs>
    <div ref="messageBox" class="message-list">
      <div v-if="!panels[activeTab].messages.length" class="ai-empty">
        <h2>{{ activeTab === 'knowledge' ? '询问企业内部制度与知识' : '向通用 AI 助手提问' }}</h2>
        <p>{{ activeTab === 'knowledge' ? '回答会使用已重建的企业知识，并标出来源文档。' : '回答来自大模型自身知识，不会检索企业文档。' }}</p>
      </div>
      <div v-for="(message, index) in panels[activeTab].messages" :key="index" :class="['message-row', message.role]">
        <div class="message-role">{{ message.role === 'user' ? '你' : 'AI' }}</div>
        <div class="message-content">
          <div v-if="message.role === 'user'" class="message-text">{{ message.content }}</div>
          <div v-else-if="message.content" class="message-text markdown-body" v-html="renderMarkdown(message.content)" />
          <div v-else class="message-text"><span v-if="panels[activeTab].loading" class="typing">正在生成回答…</span></div>
          <div v-if="message.sources?.length" class="source-list"><span class="source-label">参考文档</span><el-tag v-for="source in message.sources" :key="source.documentId" type="info">{{ source.title }}</el-tag></div>
        </div>
      </div>
    </div>
    <div class="composer">
      <el-input v-model="panels[activeTab].input" type="textarea" :rows="3" maxlength="2000" show-word-limit placeholder="请输入问题，Enter 发送，Shift + Enter 换行" @keydown="handleComposerKeydown" />
      <div class="composer-actions"><span>当前页面刷新后会清空本次显示的消息</span><el-button type="primary" :loading="panels[activeTab].loading" :disabled="!panels[activeTab].input.trim()" @click="send(activeTab)">发送</el-button></div>
    </div>
  </div>
</template>
