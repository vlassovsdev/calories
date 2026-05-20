import { client } from './client'
import type { ProgressPhoto } from '@/types/api'

export const progressPhotosApi = {
  list: () =>
    client.get<ProgressPhoto[]>('/api/v1/users/me/progress-photos'),

  create: (file: File, opts?: { weight_kg?: number; notes?: string; taken_at?: string }) => {
    const form = new FormData()
    form.append('photo', file)
    if (opts?.weight_kg != null) form.append('weight_kg', String(opts.weight_kg))
    if (opts?.notes) form.append('notes', opts.notes)
    if (opts?.taken_at) form.append('taken_at', opts.taken_at)
    return client.postForm<ProgressPhoto>('/api/v1/users/me/progress-photos', form)
  },
}
