import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 30000
})

// Inject Bearer token on every request
apiClient.interceptors.request.use(async (config) => {
  const tokens = await window.api.getTokens()
  if (tokens?.access_token) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`
  }
  return config
})

// On 401: try refresh → retry. On failure → logout.
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const tokens = await window.api.getTokens()
        if (!tokens?.refresh_token) throw new Error('No refresh token')

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/refresh`,
          { refresh_token: tokens.refresh_token }
        )
        await window.api.setTokens({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        })
        original.headers.Authorization = `Bearer ${data.access_token}`
        return apiClient(original)
      } catch {
        await window.api.clearTokens()
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
