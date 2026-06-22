import client from './client'
import type { ScanPage } from '../types'

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
