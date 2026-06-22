import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const client = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let pendingQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return client(original)
      })
    }

    isRefreshing = true
    const { refreshToken, setTokens, clear } = useAuthStore.getState()

    try {
      const resp = await axios.post('/auth/refresh', { refresh_token: refreshToken })
      const { access_token, refresh_token } = resp.data
      setTokens(access_token, refresh_token)
      pendingQueue.forEach((p) => p.resolve(access_token))
      pendingQueue = []
      original.headers.Authorization = `Bearer ${access_token}`
      return client(original)
    } catch {
      pendingQueue.forEach((p) => p.reject(new Error('Session expired')))
      pendingQueue = []
      clear()
      window.location.href = '/login'
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

export default client
