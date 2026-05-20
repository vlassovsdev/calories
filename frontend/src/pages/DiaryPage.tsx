import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { addDays, subDays } from 'date-fns'
import { diaryApi } from '@/lib/api/diary'
import { statsApi } from '@/lib/api/stats'
import type { DiaryEntry } from '@/types/api'
import { MealSection } from '@/components/diary/MealSection'
import { AddEntryDialog } from '@/components/diary/AddEntryDialog'
import { formatDate, formatDisplayDate, parseDate, roundNum, today } from '@/lib/utils'

const MEALS = [
  { key: 'breakfast', label: 'Завтрак' },
  { key: 'lunch', label: 'Обед' },
  { key: 'dinner', label: 'Ужин' },
  { key: 'snack', label: 'Перекус' },
]

export function DiaryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const date = searchParams.get('date') ?? today()
  const [addOpen, setAddOpen] = useState(false)

  const setDate = (d: string) => setSearchParams({ date: d })

  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['diary', date],
    queryFn: () => diaryApi.getByDate(date),
  })

  const entries = entriesData ?? []

  const { data: summary } = useQuery({
    queryKey: ['stats-daily', date],
    queryFn: () => statsApi.getDaily(date),
  })

  const grouped = MEALS.reduce<Record<string, DiaryEntry[]>>((acc, m) => {
    acc[m.key] = entries.filter(e => e.meal_type === m.key)
    return acc
  }, {})

  const totalCalories = summary?.total_calories ?? entries.reduce((s, e) => s + e.calories, 0)
  const recommended = summary?.recommended_calories

  const openAdd = (_mealKey: string) => {
    setAddOpen(true)
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Дневник питания</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(formatDate(subDays(parseDate(date), 1)))}
            className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => setDate(today())}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Calendar className="h-3.5 w-3.5" />
            {formatDisplayDate(date)}
          </button>
          <button
            onClick={() => setDate(formatDate(addDays(parseDate(date), 1)))}
            className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">{roundNum(totalCalories)}</p>
            <p className="text-xs text-gray-500">
              ккал{recommended ? ` / ${roundNum(recommended)} рекомендовано` : ''}
            </p>
          </div>
          {summary && (
            <div className="text-right text-xs text-gray-500">
              <p>Б: {roundNum(summary.protein_g)}г</p>
              <p>Ж: {roundNum(summary.fat_g)}г</p>
              <p>У: {roundNum(summary.carbs_g)}г</p>
            </div>
          )}
        </div>
        {recommended && (
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.min((totalCalories / recommended) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {entriesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {MEALS.map(m => (
            <MealSection
              key={m.key}
              title={m.label}
              entries={grouped[m.key] ?? []}
              date={date}
              mealKey={m.key}
              onAdd={() => openAdd(m.key)}
            />
          ))}
        </div>
      )}

      <AddEntryDialog
        date={date}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  )
}
