export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  id: string
  username: string
  role: 'ADMIN' | 'STAFF'
  is_active: boolean
  created_at: string
}

export interface ScanLog {
  id: string
  username: string
  qr_code_id: string
  ip_address: string
  latitude: number
  longitude: number
  scanned_at: string
}

export interface ScanPage {
  items: ScanLog[]
  total: number
  page: number
  page_size: number
}

export interface UserCreate {
  username: string
  password: string
  role: 'ADMIN' | 'STAFF'
}
