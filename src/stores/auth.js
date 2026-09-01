import { computed, reactive } from 'vue'
import { authApi } from '../api'
import { TOKEN_KEY } from '../api/http'

const state = reactive({
  user: null,
  ready: false,
})

async function loadCurrentUser() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    state.user = null
    state.ready = true
    return null
  }
  try {
    state.user = await authApi.me()
    return state.user
  } finally {
    state.ready = true
  }
}

async function login(credentials) {
  const result = await authApi.login(credentials)
  localStorage.setItem(TOKEN_KEY, result.accessToken)
  state.user = await authApi.me()
  state.ready = true
}

async function logout() {
  try {
    await authApi.logout()
  } finally {
    localStorage.removeItem(TOKEN_KEY)
    state.user = null
  }
}

function hasPermission(code) {
  return state.user?.permissionCodes?.includes(code) ?? false
}

export const authStore = {
  state,
  user: computed(() => state.user),
  isAuthenticated: computed(() => Boolean(state.user)),
  loadCurrentUser,
  login,
  logout,
  hasPermission,
}
