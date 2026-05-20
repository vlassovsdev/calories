import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { diaryApi } from '@/lib/api/diary'
import { foodApi } from '@/lib/api/food'
import type { FoodItem } from '@/types/api'
import { roundNum } from '@/lib/utils'

const MEAL_TYPES = ['Завтрак', 'Обед', 'Ужин', 'Перекус']
const MEAL_KEYS: Record<string, string> = {
  Завтрак: 'breakfast',
  Обед: 'lunch',
  Ужин: 'dinner',
  Перекус: 'snack',
}

interface Props {
  date: string
  open: boolean
  onClose: () => void
  prefill?: { calories?: number; notes?: string }
}

export function AddEntryDialog({ date, open, onClose, prefill }: Props) {
  const qc = useQueryClient()
  const [mealType, setMealType] = useState('breakfast')
  const [quantity, setQuantity] = useState('100')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
  const [carbs, setCarbs] = useState('')
  const [notes, setNotes] = useState('')
  const [foodSearch, setFoodSearch] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const { data: foodResults } = useQuery({
    queryKey: ['food-search', foodSearch],
    queryFn: () => foodApi.search(foodSearch),
    enabled: foodSearch.length >= 2,
    staleTime: 30000,
  })

  useEffect(() => {
    if (open) {
      setMealType('breakfast')
      setQuantity('100')
      setFoodSearch('')
      setSelectedFood(null)
      setShowDropdown(false)
      if (prefill) {
        setCalories(prefill.calories ? String(prefill.calories) : '')
        setNotes(prefill.notes ?? '')
        setProtein('')
        setFat('')
        setCarbs('')
      } else {
        setCalories('')
        setNotes('')
        setProtein('')
        setFat('')
        setCarbs('')
      }
    }
  }, [open, prefill])

  useEffect(() => {
    if (selectedFood) {
      const qty = parseFloat(quantity) || 0
      const factor = qty / 100
      setCalories(String(roundNum(selectedFood.calories_per_100g * factor)))
      if (selectedFood.protein_per_100g != null)
        setProtein(String(roundNum(selectedFood.protein_per_100g * factor)))
      if (selectedFood.fat_per_100g != null)
        setFat(String(roundNum(selectedFood.fat_per_100g * factor)))
      if (selectedFood.carbs_per_100g != null)
        setCarbs(String(roundNum(selectedFood.carbs_per_100g * factor)))
    }
  }, [quantity, selectedFood])

  const mutation = useMutation({
    mutationFn: () =>
      diaryApi.create({
        food_item_id: selectedFood?.id,
        entry_date: date,
        meal_type: mealType,
        quantity_grams: parseFloat(quantity),
        calories: parseFloat(calories),
        protein_g: protein ? parseFloat(protein) : undefined,
        fat_g: fat ? parseFloat(fat) : undefined,
        carbs_g: carbs ? parseFloat(carbs) : undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diary', date] })
      qc.invalidateQueries({ queryKey: ['stats-daily', date] })
      onClose()
    },
  })

  const selectFood = (food: FoodItem) => {
    setSelectedFood(food)
    setFoodSearch(food.name)
    setShowDropdown(false)
  }

  const clearFood = () => {
    setSelectedFood(null)
    setFoodSearch('')
    setCalories('')
    setProtein('')
    setFat('')
    setCarbs('')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={searchRef}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Добавить приём пищи</h2>
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
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Продукт (необязательно)
            </label>
            <div className="flex items-center gap-2">
              <input
                value={foodSearch}
                onChange={e => {
                  setFoodSearch(e.target.value)
                  setShowDropdown(true)
                  if (!e.target.value) clearFood()
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Поиск продукта..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              {selectedFood && (
                <button onClick={clearFood} className="shrink-0 text-xs text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {showDropdown && foodResults && foodResults.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {foodResults.map(food => (
                  <button
                    key={food.id}
                    onClick={() => selectFood(food)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{food.name}</span>
                      {food.brand && <span className="ml-1 text-gray-400">{food.brand}</span>}
                    </div>
                    <span className="ml-2 shrink-0 text-xs text-gray-500">
                      {roundNum(food.calories_per_100g)} ккал/100г
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Количество (г)</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Калории (ккал)</label>
              <input
                type="number"
                value={calories}
                onChange={e => setCalories(e.target.value)}
                min="0"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Заметка</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Название блюда или примечание"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
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
              disabled={mutation.isPending || !calories}
              className="flex-1 rounded-lg bg-green-500 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              {mutation.isPending ? 'Сохраняем...' : 'Добавить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
