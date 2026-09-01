import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const ALLOWED_TAGS = [
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'hr', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody',
  'td', 'th', 'thead', 'tr', 'ul',
]

export function renderMarkdown(content) {
  if (!content) return ''
  return DOMPurify.sanitize(marked.parse(content), {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title'],
  })
}
