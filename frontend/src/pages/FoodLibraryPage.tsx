import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, X, Globe, Lock } from 'lucide-react'
import { foodApi } from '@/lib/api/food'
import { useAuth } from '@/lib/auth-context'
import type { FoodItem, CreateFoodItemInput } from '@/types/api'
import { roundNum } from '@/lib/utils'

function FoodFormDialog({
  item,
  onClose,
}: {
  item: FoodItem | null | 'new'
  onClose: () => void
}) {
  const qc = useQueryClient()
  const isNew = item === 'new'
  const existing = isNew ? null : (item as FoodItem)

  const [name, setName] = useState(existing?.name ?? '')
  const [brand, setBrand] = useState(existing?.brand ?? '')
  const [cal, setCal] = useState(existing ? String(existing.calories_per_100g) : '')
  const [protein, setProtein] = useState(existing?.protein_per_100g != null ? String(existing.protein_per_100g) : '')
  const [fat, setFat] = useState(existing?.fat_per_100g != null ? String(existing.fat_per_100g) : '')
  const [carbs, setCarbs] = useState(existing?.carbs_per_100g != null ? String(existing.carbs_per_100g) : '')
  const [isPublic, setIsPublic] = useState(existing?.is_public ?? false)

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateFoodItemInput = {
        name,
        brand: brand || undefined,
        calories_per_100g: parseFloat(cal),
        protein_per_100g: protein ? parseFloat(protein) : undefined,
        fat_per_100g: fat ? parseFloat(fat) : undefined,
        carbs_per_100g: carbs ? parseFloat(carbs) : undefined,
        is_public: isPublic,
      }
      return isNew ? foodApi.create(body) : foodApi.update(existing!.id, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food-search'] })
      onClose()
    },
  })

  if (item === null) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {isNew ? 'Новый продукт' : 'Редактировать продукт'}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Название *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Бренд</label>
              <input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Калории / 100г *</label>
            <input
              type="number"
              value={cal}
              onChange={e => setCal(e.target.value)}
              min="0"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Белки / 100г', val: protein, set: setProtein },
              { label: 'Жиры / 100г', val: fat, set: setFat },
              { label: 'Углеводы / 100г', val: carbs, set: setCarbs },
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

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded accent-green-500"
            />
            <span className="text-sm text-gray-700">Публичный (виден всем пользователям)</span>
          </label>

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
              disabled={mutation.isPending || !name || !cal}
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

export function FoodLibraryPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [dialogItem, setDialogItem] = useState<FoodItem | null | 'new'>(null)

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['food-search', query],
    queryFn: () => foodApi.search(query),
    staleTime: 30000,
  })

  const items = itemsData ?? []

  const deleteMutation = useMutation({
    mutationFn: foodApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food-search'] }),
  })

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">База продуктов</h1>
        <button
          onClick={() => setDialogItem('new')}
          className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
        >
          <Plus className="h-4 w-4" />
          Добавить продукт
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск продуктов..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-400">
            {query ? 'Продукты не найдены' : 'Начните вводить для поиска'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  {item.brand && <span className="text-sm text-gray-400">{item.brand}</span>}
                  {item.is_public ? (
                    <Globe className="h-3 w-3 text-blue-400" />
                  ) : (
                    <Lock className="h-3 w-3 text-gray-300" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {roundNum(item.calories_per_100g)} ккал/100г
                  {item.protein_per_100g != null && ` · Б: ${roundNum(item.protein_per_100g)}г`}
                  {item.fat_per_100g != null && ` · Ж: ${roundNum(item.fat_per_100g)}г`}
                  {item.carbs_per_100g != null && ` · У: ${roundNum(item.carbs_per_100g)}г`}
                </p>
              </div>
              {item.created_by === user?.id && (
                <div className="ml-4 flex items-center gap-1">
                  <button
                    onClick={() => setDialogItem(item)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <FoodFormDialog item={dialogItem} onClose={() => setDialogItem(null)} />
    </div>
  )
}
