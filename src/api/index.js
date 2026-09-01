import http from './http'

export const authApi = {
  login: (data) => http.post('/auth/login', data),
  me: () => http.get('/auth/me'),
  logout: () => http.post('/auth/logout'),
}

export const userApi = {
  page: (params) => http.get('/users', { params }),
  detail: (id) => http.get(`/users/${id}`),
  create: (data) => http.post('/users', data),
  update: (id, data) => http.put(`/users/${id}`, data),
  remove: (id) => http.delete(`/users/${id}`),
  assignRoles: (id, roleIds) => http.put(`/users/${id}/roles`, { roleIds }),
}

export const roleApi = {
  list: () => http.get('/roles'),
  detail: (id) => http.get(`/roles/${id}`),
  create: (data) => http.post('/roles', data),
  update: (id, data) => http.put(`/roles/${id}`, data),
  remove: (id) => http.delete(`/roles/${id}`),
  assignPermissions: (id, permissionIds) =>
    http.put(`/roles/${id}/permissions`, { permissionIds }),
}

export const permissionApi = {
  list: () => http.get('/permissions'),
  create: (data) => http.post('/permissions', data),
  update: (id, data) => http.put(`/permissions/${id}`, data),
  remove: (id) => http.delete(`/permissions/${id}`),
}

export const knowledgeBaseApi = {
  page: (params) => http.get('/knowledge-bases', { params }),
  create: (data) => http.post('/knowledge-bases', data),
  update: (id, data) => http.put(`/knowledge-bases/${id}`, data),
  remove: (id) => http.delete(`/knowledge-bases/${id}`),
}

export const categoryApi = {
  list: (knowledgeBaseId) => http.get('/categories', { params: { knowledgeBaseId } }),
  create: (data) => http.post('/categories', data),
  update: (id, data) => http.put(`/categories/${id}`, data),
  remove: (id) => http.delete(`/categories/${id}`),
}

export const tagApi = {
  list: (knowledgeBaseId) => http.get('/tags', { params: { knowledgeBaseId } }),
  create: (data) => http.post('/tags', data),
  update: (id, data) => http.put(`/tags/${id}`, data),
  remove: (id) => http.delete(`/tags/${id}`),
}

export const documentApi = {
  page: (params) => http.get('/documents', { params }),
  detail: (id) => http.get(`/documents/${id}`),
  create: (data) => http.post('/documents', data),
  update: (id, data) => http.put(`/documents/${id}`, data),
  remove: (id) => http.delete(`/documents/${id}`),
  batchStatus: (data) => http.patch('/documents/status', data),
  fileInfo: (id) => http.get(`/documents/${id}/file`),
  uploadFile: (id, file, replace = false) => {
    const formData = new FormData()
    formData.append('file', file)
    return http.request({
      url: `/documents/${id}/file`,
      method: replace ? 'put' : 'post',
      data: formData,
    })
  },
  removeFile: (id) => http.delete(`/documents/${id}/file`),
  fileUrl: (id) => http.get(`/documents/${id}/file-url`),
}

export const searchApi = {
  page: (params) => http.get('/search/documents', { params }),
  rebuild: () => http.post('/search/documents/rebuild'),
}

export const operationLogApi = {
  page: (params) => http.get('/operation-logs', { params }),
}

export const aiApi = {
  rebuildKnowledge: () => http.post('/ai/knowledge/rebuild', null, { timeout: 120000 }),
}
