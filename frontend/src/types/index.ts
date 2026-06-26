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

export interface QrDevice {
  id: string
  device_id: string
  name: string
  location: string
  notes: string | null
  qr_text: string
  created_at: string
}

export interface DeviceStatus {
  id: string
  device_id: string
  name: string
  location: string
  qr_text: string
  scanned: boolean
  scan_count: number
  last_scanned_at: string | null
}

export interface PatrolStats {
  total_devices: number
  scanned_today: number
  scan_count_today: number
  devices: DeviceStatus[]
}
