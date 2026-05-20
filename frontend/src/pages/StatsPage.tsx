import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { statsApi } from '@/lib/api/stats'
import { formatDate, formatDisplayDate, parseDate } from '@/lib/utils'
import { startOfWeek, addWeeks, subWeeks, addDays, format } from 'date-fns'
import type { DailySummary } from '@/types/api'

function getWeekStart(d: Date): string {
  return formatDate(startOfWeek(d, { weekStartsOn: 1 }))
}

const MACRO_COLORS = ['#22c55e', '#f59e0b', '#3b82f6']

export function StatsPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [selectedDay, setSelectedDay] = useState<DailySummary | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['stats-weekly', weekStart],
    queryFn: () => statsApi.getWeekly(weekStart),
  })

  const prevWeek = () =>
    setWeekStart(getWeekStart(subWeeks(parseDate(weekStart), 1)))
  const nextWeek = () =>
    setWeekStart(getWeekStart(addWeeks(parseDate(weekStart), 1)))

  const days = data?.days ?? []
  const chartData = days.map((d, i) => ({
    ...d,
    dayLabel: format(addDays(parseDate(weekStart), i), 'EEE'),
  }))

  const recommended = days.find(d => d.recommended_calories)?.recommended_calories

  const macroData = selectedDay
    ? [
        { name: 'Белки', value: Math.round(selectedDay.protein_g) },
        { name: 'Жиры', value: Math.round(selectedDay.fat_g) },
        { name: 'Углеводы', value: Math.round(selectedDay.carbs_g) },
      ]
    : []

  const weekLabel = `${formatDisplayDate(weekStart)} — ${formatDisplayDate(
    formatDate(addDays(parseDate(weekStart), 6)),
  )}`

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Статистика</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50">
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <span className="min-w-48 text-center text-sm font-medium text-gray-700">{weekLabel}</span>
          <button onClick={nextWeek} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50">
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-gray-700">Калории по дням</p>
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData}
              onClick={d => {
                const payload = (d as { activePayload?: { payload: DailySummary }[] })?.activePayload
                if (payload?.[0]) setSelectedDay(payload[0].payload)
              }}
            >
              <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                formatter={(v) => [`${Math.round(Number(v))} ккал`, 'Калории']}
                labelFormatter={l => `День: ${l}`}
              />
              {recommended && (
                <ReferenceLine
                  y={recommended}
                  stroke="#22c55e"
                  strokeDasharray="4 4"
                  label={{ value: `${Math.round(recommended)}`, position: 'right', fontSize: 10, fill: '#22c55e' }}
                />
              )}
              <Bar
                dataKey="total_calories"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        {!isLoading && days.length === 0 && (
          <p className="text-center text-sm text-gray-400">Нет данных за эту неделю</p>
        )}
      </div>

      {selectedDay && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-1 text-sm font-medium text-gray-700">
              {formatDisplayDate(selectedDay.date)}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(selectedDay.total_calories)} ккал
            </p>
            {selectedDay.recommended_calories && (
              <p className="mt-1 text-xs text-gray-500">
                Рекомендовано: {Math.round(selectedDay.recommended_calories)} ккал
              </p>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Макронутриенты</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={macroData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45}>
                  {macroData.map((_entry, i) => (
                    <Cell key={i} fill={MACRO_COLORS[i]} />
                  ))}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${Number(v)}г`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!isLoading && days.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2 text-left font-medium text-gray-500">День</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Калории</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Белки</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Жиры</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Углеводы</th>
              </tr>
            </thead>
            <tbody>
              {days.map(d => (
                <tr
                  key={d.date}
                  onClick={() => setSelectedDay(d)}
                  className="cursor-pointer border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-2 text-gray-700">{formatDisplayDate(d.date)}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {Math.round(d.total_calories)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">{Math.round(d.protein_g)}г</td>
                  <td className="px-4 py-2 text-right text-gray-500">{Math.round(d.fat_g)}г</td>
                  <td className="px-4 py-2 text-right text-gray-500">{Math.round(d.carbs_g)}г</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
