import client from './client'
import type { ScanLog, ScanPage } from '../types'

export async function getScans(params: {
  username?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}): Promise<ScanPage> {
  const resp = await client.get<ScanPage>('/api/scans', { params })
  return resp.data
}

export async function submitScan(data: {
  qr_code_id: string
  latitude: number
  longitude: number
}): Promise<ScanLog> {
  const resp = await client.post<ScanLog>('/api/scan', data)
  return resp.data
}
