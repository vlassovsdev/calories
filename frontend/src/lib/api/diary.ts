import { client } from './client'
import type { DiaryEntry, CreateDiaryEntryInput, UpdateDiaryEntryInput } from '@/types/api'

export const diaryApi = {
  getByDate: (date: string) =>
    client.get<DiaryEntry[]>(`/api/v1/diary/entries?date=${date}`),

  getByRange: (start: string, end: string) =>
    client.get<DiaryEntry[]>(`/api/v1/diary/entries?start=${start}&end=${end}`),

  create: (body: CreateDiaryEntryInput) =>
    client.post<DiaryEntry>('/api/v1/diary/entries', body),

  update: (id: string, body: UpdateDiaryEntryInput) =>
    client.put<DiaryEntry>(`/api/v1/diary/entries/${id}`, body),

  delete: (id: string) =>
    client.delete<void>(`/api/v1/diary/entries/${id}`),
}
