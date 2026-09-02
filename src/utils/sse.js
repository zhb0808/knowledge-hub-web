import { TOKEN_KEY } from '../api/http'

export async function streamPost(url, body, onEvent) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
    },
    body: JSON.stringify(body),
  })

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  if (!response.ok) {
    let message = '流式请求失败'
    try {
      const result = await response.json()
      message = result.message || message
    } catch {
      // 响应体不是 JSON 时保留通用提示。
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replaceAll('\r\n', '\n')

    let separatorIndex = buffer.indexOf('\n\n')
    while (separatorIndex >= 0) {
      const eventBlock = buffer.slice(0, separatorIndex)
      buffer = buffer.slice(separatorIndex + 2)
      dispatchEventBlock(eventBlock, onEvent)
      separatorIndex = buffer.indexOf('\n\n')
    }

    if (done) {
      if (buffer.trim()) dispatchEventBlock(buffer, onEvent)
      break
    }
  }
}

function dispatchEventBlock(block, onEvent) {
  let event = 'message'
  const dataLines = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
  }
  if (dataLines.length) onEvent({ event, data: dataLines.join('\n') })
}
