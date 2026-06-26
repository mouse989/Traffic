import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => useAuthStore.getState().clear())

  it('starts with no token', () => {
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('clear() resets state', () => {
    useAuthStore.getState().setTokens('fake-access', 'fake-refresh')
    useAuthStore.getState().clear()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().username).toBeNull()
  })
})
