export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  id: string
  username: string
  role: 'ADMIN' | 'GIAM_SAT' | 'STAFF'
  is_active: boolean
  can_upload_photo: boolean
  can_access_qr_devices: boolean
  can_access_patrol: boolean
  can_access_dashboard: boolean
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
  device_name?: string | null
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
  role: 'ADMIN' | 'GIAM_SAT' | 'STAFF'
  can_upload_photo?: boolean
  can_access_qr_devices?: boolean
  can_access_patrol?: boolean
  can_access_dashboard?: boolean
}

export interface QrDevice {
  id: string
  device_id: string
  name: string
  location: string
  notes: string | null
  qr_text: string
  device_type: string | null
  extra_data: Record<string, string> | null
  created_at: string
}

export interface DeviceFieldConfig {
  id: string
  field_name: string
  label: string
  required: boolean
  sort_order: number
}

export interface DeviceStatus {
  id: string
  device_id: string
  name: string
  location: string
  device_type: string | null
  qr_text: string
  scanned: boolean
  scan_count: number
  last_scanned_at: string | null
}

export interface DeviceTypeStats {
  device_type: string
  total: number
  scanned: number
  not_scanned: number
}

export interface UserScanStats {
  username: string
  unique_devices: number
  total_scans: number
}

export interface PatrolStats {
  total_devices: number
  scanned_today: number
  scan_count_today: number
  devices: DeviceStatus[]
  device_type_stats: DeviceTypeStats[]
  user_stats: UserScanStats[]
  date: string
}
