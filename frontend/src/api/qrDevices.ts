import client from './client'
import type { QrDevice, DeviceFieldConfig } from '../types'

export async function getQrDevices(): Promise<QrDevice[]> {
  const resp = await client.get<QrDevice[]>('/api/qr-devices')
  return resp.data
}

export async function createQrDevice(data: Omit<QrDevice, 'id' | 'created_at'>): Promise<QrDevice> {
  const resp = await client.post<QrDevice>('/api/qr-devices', data)
  return resp.data
}

export async function updateQrDevice(id: string, data: Partial<Omit<QrDevice, 'id' | 'device_id' | 'created_at'>>): Promise<QrDevice> {
  const resp = await client.put<QrDevice>(`/api/qr-devices/${id}`, data)
  return resp.data
}

export async function deleteQrDevice(id: string): Promise<void> {
  await client.delete(`/api/qr-devices/${id}`)
}

export async function importQrDevicesCsv(file: File): Promise<{ created: number; skipped: number }> {
  const form = new FormData()
  form.append('file', file)
  const resp = await client.post<{ created: number; skipped: number }>('/api/qr-devices/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return resp.data
}

export async function downloadCsvTemplate(): Promise<void> {
  const resp = await client.get('/api/qr-devices/import/template', { responseType: 'blob' })
  const url = URL.createObjectURL(resp.data)
  const a = document.createElement('a')
  a.href = url
  a.download = 'qr-devices-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export async function getPatrolToday(date?: string) {
  const params = date ? { date } : {}
  const resp = await client.get('/api/patrol/today', { params })
  return resp.data
}

// Device field config API
export async function getDeviceFieldConfigs(): Promise<DeviceFieldConfig[]> {
  const resp = await client.get<DeviceFieldConfig[]>('/api/device-fields')
  return resp.data
}

export async function createDeviceFieldConfig(
  data: Omit<DeviceFieldConfig, 'id'>
): Promise<DeviceFieldConfig> {
  const resp = await client.post<DeviceFieldConfig>('/api/device-fields', data)
  return resp.data
}

export async function deleteDeviceFieldConfig(id: string): Promise<void> {
  await client.delete(`/api/device-fields/${id}`)
}
