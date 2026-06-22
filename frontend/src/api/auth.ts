import axios from 'axios'
import type { TokenResponse } from '../types'

export async function login(username: string, password: string): Promise<TokenResponse> {
  const resp = await axios.post<TokenResponse>('/auth/login', { username, password })
  return resp.data
}
