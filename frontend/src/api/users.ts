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
