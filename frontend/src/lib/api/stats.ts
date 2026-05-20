import { client } from './client'
import type { DailySummary, WeeklyStats } from '@/types/api'

export const statsApi = {
  getDaily: (date: string) =>
    client.get<DailySummary>(`/api/v1/stats/daily?date=${date}`),

  getWeekly: (weekStart: string) =>
    client.get<WeeklyStats>(`/api/v1/stats/weekly?week_start=${weekStart}`),
}
