import { client } from './client'
import type { User, TDEEResult } from '@/types/api'

export interface UpdateProfileInput {
  age?: number
  weight_kg?: number
  height_cm?: number
  sex?: 'M' | 'F'
  activity_level?: string
  goal?: string
}

export const usersApi = {
  getMe: () => client.get<User>('/api/v1/users/me'),
  updateMe: (body: UpdateProfileInput) => client.put<User>('/api/v1/users/me', body),
  getTDEE: () => client.get<TDEEResult>('/api/v1/users/me/tdee'),
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('avatar', file)
    return client.postForm<User>('/api/v1/users/me/avatar', form)
  },
}
