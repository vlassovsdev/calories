import { client } from './client'
import type { AnalyzePhotoResponse, PhotoJob } from '@/types/api'

export const photosApi = {
  analyze: (file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return client.postForm<AnalyzePhotoResponse>('/api/v1/photos/analyze', form)
  },

  getJob: (id: string) =>
    client.get<PhotoJob>(`/api/v1/photos/jobs/${id}`),

  listJobs: () =>
    client.get<PhotoJob[]>('/api/v1/photos/jobs'),
}
