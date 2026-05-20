import { client, tokenStorage } from './client'
import type { AuthResponse, Tokens } from '@/types/api'

export const authApi = {
  register: (email: string, password: string, display_name: string) =>
    client.post<AuthResponse>('/api/v1/auth/register', { email, password, display_name }),

  login: (email: string, password: string) =>
    client.post<AuthResponse>('/api/v1/auth/login', { email, password }),

  logout: () => {
    const refresh_token = tokenStorage.getRefresh()
    return client.post<void>('/api/v1/auth/logout', { refresh_token })
  },

  refresh: (refresh_token: string) =>
    client.post<Tokens>('/api/v1/auth/refresh', { refresh_token }),
}
