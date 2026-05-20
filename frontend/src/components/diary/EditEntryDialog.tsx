import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { diaryApi } from '@/lib/api/diary'
import type { DiaryEntry } from '@/types/api'

const MEAL_TYPES = ['Завтрак', 'Обед', 'Ужин', 'Перекус']
const MEAL_KEYS: Record<string, string> = {
  Завтрак: 'breakfast',
  Обед: 'lunch',
  Ужин: 'dinner',
  Перекус: 'snack',
}
const MEAL_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(MEAL_KEYS).map(([k, v]) => [v, k]),
)

interface Props {
  entry: DiaryEntry | null
  onClose: () => void
}

export function EditEntryDialog({ entry, onClose }: Props) {
  const qc = useQueryClient()
  const [mealType, setMealType] = useState('breakfast')
  const [quantity, setQuantity] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
  const [carbs, setCarbs] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (entry) {
      setMealType(entry.meal_type)
      setQuantity(String(entry.quantity_grams))
      setCalories(String(entry.calories))
      setProtein(entry.protein_g != null ? String(entry.protein_g) : '')
      setFat(entry.fat_g != null ? String(entry.fat_g) : '')
      setCarbs(entry.carbs_g != null ? String(entry.carbs_g) : '')
      setNotes(entry.notes ?? '')
    }
  }, [entry])

  const mutation = useMutation({
    mutationFn: () =>
      diaryApi.update(entry!.id, {
        meal_type: mealType,
        quantity_grams: parseFloat(quantity),
        calories: parseFloat(calories),
        protein_g: protein ? parseFloat(protein) : undefined,
        fat_g: fat ? parseFloat(fat) : undefined,
        carbs_g: carbs ? parseFloat(carbs) : undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diary', entry!.entry_date] })
      qc.invalidateQueries({ queryKey: ['stats-daily', entry!.entry_date] })
      onClose()
    },
  })

  if (!entry) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Редактировать запись</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Приём пищи</label>
            <div className="flex gap-1.5">
              {MEAL_TYPES.map(m => (
                <button
                  key={m}
                  onClick={() => setMealType(MEAL_KEYS[m])}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    mealType === MEAL_KEYS[m]
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {MEAL_LABELS[MEAL_KEYS[m]] ?? m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Количество (г)</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Калории (ккал)</label>
              <input
                type="number"
                value={calories}
                onChange={e => setCalories(e.target.value)}
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Белки (г)', val: protein, set: setProtein },
              { label: 'Жиры (г)', val: fat, set: setFat },
              { label: 'Углеводы (г)', val: carbs, set: setCarbs },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
                <input
                  type="number"
                  value={val}
                  onChange={e => set(e.target.value)}
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Заметка</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>

          {mutation.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {(mutation.error as Error).message}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex-1 rounded-lg bg-green-500 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              {mutation.isPending ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
