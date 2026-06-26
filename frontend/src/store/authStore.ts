import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  username: string | null
  role: 'ADMIN' | 'GIAM_SAT' | 'STAFF' | null
  canUploadPhoto: boolean
  canAccessQrDevices: boolean
  canAccessPatrol: boolean
  canAccessDashboard: boolean
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
  canUploadPhoto: initial?.canUploadPhoto ?? false,
  canAccessQrDevices: initial?.canAccessQrDevices ?? false,
  canAccessPatrol: initial?.canAccessPatrol ?? false,
  canAccessDashboard: initial?.canAccessDashboard ?? false,

  setTokens: (access, refresh) => {
    const payload = parseJwtPayload(access)
    const username = payload.sub as string
    const role = payload.role as 'ADMIN' | 'GIAM_SAT' | 'STAFF'
    const canUploadPhoto = (payload.can_upload_photo as boolean) ?? false
    const canAccessQrDevices = (payload.can_access_qr_devices as boolean) ?? false
    const canAccessPatrol = (payload.can_access_patrol as boolean) ?? false
    const canAccessDashboard = (payload.can_access_dashboard as boolean) ?? false
    sessionStorage.setItem('auth', JSON.stringify({ accessToken: access, refreshToken: refresh, username, role, canUploadPhoto, canAccessQrDevices, canAccessPatrol, canAccessDashboard }))
    set({ accessToken: access, refreshToken: refresh, username, role, canUploadPhoto, canAccessQrDevices, canAccessPatrol, canAccessDashboard })
  },

  clear: () => {
    sessionStorage.removeItem('auth')
    set({ accessToken: null, refreshToken: null, username: null, role: null, canUploadPhoto: false, canAccessQrDevices: false, canAccessPatrol: false, canAccessDashboard: false })
  },
}))
