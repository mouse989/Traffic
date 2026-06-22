import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  username: string | null
  role: 'ADMIN' | 'STAFF' | null
  setTokens: (access: string, refresh: string) => void
  clear: () => void
}

function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}

const stored = sessionStorage.getItem('auth')
const initial = stored ? JSON.parse(stored) : null

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: initial?.accessToken ?? null,
  refreshToken: initial?.refreshToken ?? null,
  username: initial?.username ?? null,
  role: initial?.role ?? null,

  setTokens: (access, refresh) => {
    const payload = parseJwtPayload(access)
    const username = payload.sub as string
    const role = payload.role as 'ADMIN' | 'STAFF'
    sessionStorage.setItem('auth', JSON.stringify({ accessToken: access, refreshToken: refresh, username, role }))
    set({ accessToken: access, refreshToken: refresh, username, role })
  },

  clear: () => {
    sessionStorage.removeItem('auth')
    set({ accessToken: null, refreshToken: null, username: null, role: null })
  },
}))
