import client from './client'
import type { User, UserCreate } from '../types'

export async function getUsers(): Promise<User[]> {
  const resp = await client.get<User[]>('/api/users')
  return resp.data
}

export async function createUser(data: UserCreate): Promise<User> {
  const resp = await client.post<User>('/api/users', data)
  return resp.data
}

export async function toggleUser(id: string, is_active: boolean): Promise<User> {
  const resp = await client.patch<User>(`/api/users/${id}`, { is_active })
  return resp.data
}

export async function resetPassword(id: string): Promise<{ temp_password: string; message: string }> {
  const resp = await client.post<{ temp_password: string; message: string }>(`/api/users/${id}/reset-password`)
  return resp.data
}

export async function setUploadPhotoPermission(id: string, can_upload_photo: boolean): Promise<User> {
  const resp = await client.patch<User>(`/api/users/${id}`, { can_upload_photo })
  return resp.data
}

export async function setQrDevicesPermission(id: string, can_access_qr_devices: boolean): Promise<User> {
  const resp = await client.patch<User>(`/api/users/${id}`, { can_access_qr_devices })
  return resp.data
}

export async function setPatrolPermission(id: string, can_access_patrol: boolean): Promise<User> {
  const resp = await client.patch<User>(`/api/users/${id}`, { can_access_patrol })
  return resp.data
}

export async function setDashboardPermission(id: string, can_access_dashboard: boolean): Promise<User> {
  const resp = await client.patch<User>(`/api/users/${id}`, { can_access_dashboard })
  return resp.data
}
