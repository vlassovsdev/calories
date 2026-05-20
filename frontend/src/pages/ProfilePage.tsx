import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Plus, X } from 'lucide-react'
import { usersApi } from '@/lib/api/users'
import { progressPhotosApi } from '@/lib/api/progress_photos'
import { useAuth } from '@/lib/auth-context'
import type { ActivityLevel, GoalType } from '@/types/api'
import { roundNum, today } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Сидячий образ жизни' },
  { value: 'lightly_active', label: 'Лёгкая активность (1-3 дня/нед)' },
  { value: 'moderately_active', label: 'Умеренная активность (3-5 дней/нед)' },
  { value: 'very_active', label: 'Высокая активность (6-7 дней/нед)' },
  { value: 'extra_active', label: 'Очень высокая активность' },
]

const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'lose_weight', label: 'Похудеть' },
  { value: 'maintain_weight', label: 'Поддерживать вес' },
  { value: 'gain_weight', label: 'Набрать массу' },
]

function AddProgressPhotoDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [takenAt, setTakenAt] = useState(today())
  const inputRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: () =>
      progressPhotosApi.create(file!, {
        weight_kg: weight ? parseFloat(weight) : undefined,
        notes: notes || undefined,
        taken_at: takenAt,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress-photos'] })
      onClose()
    },
  })

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Добавить контрольное фото</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3">
          {!preview ? (
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 hover:border-green-400 hover:bg-green-50"
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Нажмите чтобы выбрать фото</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
          ) : (
            <div className="relative">
              <img src={preview} className="max-h-48 w-full rounded-xl object-cover" />
              <button
                onClick={() => { setFile(null); setPreview(null) }}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Вес (кг)</label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                step="0.1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Дата</label>
              <input
                type="date"
                value={takenAt}
                onChange={e => setTakenAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Заметка</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Например: после первой недели"
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
              disabled={!file || mutation.isPending}
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

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [addPhotoOpen, setAddPhotoOpen] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [age, setAge] = useState(user?.age ? String(user.age) : '')
  const [weight, setWeight] = useState(user?.weight_kg ? String(user.weight_kg) : '')
  const [height, setHeight] = useState(user?.height_cm ? String(user.height_cm) : '')
  const [sex, setSex] = useState<'M' | 'F' | ''>(user?.sex ?? '')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(user?.activity_level ?? 'sedentary')
  const [goal, setGoal] = useState<GoalType>(user?.goal ?? 'maintain_weight')

  useEffect(() => {
    if (user) {
      setAge(user.age ? String(user.age) : '')
      setWeight(user.weight_kg ? String(user.weight_kg) : '')
      setHeight(user.height_cm ? String(user.height_cm) : '')
      setSex(user.sex ?? '')
      setActivityLevel(user.activity_level)
      setGoal(user.goal)
    }
  }, [user])

  const { data: tdee, error: tdeeError } = useQuery({
    queryKey: ['tdee'],
    queryFn: usersApi.getTDEE,
    retry: false,
  })

  const { data: progressPhotosData } = useQuery({
    queryKey: ['progress-photos'],
    queryFn: progressPhotosApi.list,
    staleTime: 60000,
  })
  const progressPhotos = progressPhotosData ?? []

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        age: age ? parseInt(age) : undefined,
        weight_kg: weight ? parseFloat(weight) : undefined,
        height_cm: height ? parseFloat(height) : undefined,
        sex: sex || undefined,
        activity_level: activityLevel,
        goal,
      }),
    onSuccess: updatedUser => {
      setUser(updatedUser)
      qc.invalidateQueries({ queryKey: ['tdee'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
    onSuccess: updatedUser => setUser(updatedUser),
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) avatarMutation.mutate(file)
  }

  const initials = user?.display_name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  const tdeeUnavailable =
    tdeeError instanceof ApiError && tdeeError.status === 422

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Профиль</h1>

      {/* Avatar + name */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="group relative h-16 w-16 overflow-hidden rounded-full bg-green-100 focus:outline-none"
              title="Изменить аватар"
            >
              {user?.avatar_data ? (
                <img src={user.avatar_data} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold text-green-700">
                  {initials}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{user?.display_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {avatarMutation.isPending && (
              <p className="text-xs text-green-600">Загружаем аватар...</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Возраст</label>
            <input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              min="10"
              max="120"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Пол</label>
            <div className="flex gap-2">
              {[{ v: 'M', l: 'Мужской' }, { v: 'F', l: 'Женский' }].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setSex(v as 'M' | 'F')}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    sex === v
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Вес (кг)</label>
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              min="30"
              max="300"
              step="0.1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Рост (см)</label>
            <input
              type="number"
              value={height}
              onChange={e => setHeight(e.target.value)}
              min="100"
              max="250"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">Уровень активности</label>
          <select
            value={activityLevel}
            onChange={e => setActivityLevel(e.target.value as ActivityLevel)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          >
            {ACTIVITY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">Цель</label>
          <div className="flex gap-2">
            {GOAL_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setGoal(o.value)}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  goal === o.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {mutation.error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {(mutation.error as Error).message}
          </p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="mt-4 w-full rounded-lg bg-green-500 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
        >
          {mutation.isPending ? 'Сохраняем...' : saved ? 'Сохранено!' : 'Сохранить'}
        </button>
      </div>

      {/* TDEE */}
      {tdeeUnavailable ? (
        <div className="mb-6 rounded-xl border border-dashed border-gray-300 p-5 text-center">
          <p className="text-sm text-gray-500">
            Заполните возраст, вес, рост и пол, чтобы рассчитать норму калорий
          </p>
        </div>
      ) : tdee ? (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-base font-semibold text-gray-900">Норма калорий (TDEE)</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xl font-bold text-gray-900">{roundNum(tdee.bmr)}</p>
              <p className="text-xs text-gray-500">ккал/день (BMR)</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xl font-bold text-gray-900">{roundNum(tdee.tdee)}</p>
              <p className="text-xs text-gray-500">ккал/день (TDEE)</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xl font-bold text-green-700">{roundNum(tdee.recommended_calories)}</p>
              <p className="text-xs text-green-600">рекомендовано</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="font-semibold text-gray-900">{roundNum(tdee.protein_g)}г</p>
              <p className="text-xs text-gray-500">Белки</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{roundNum(tdee.fat_g)}г</p>
              <p className="text-xs text-gray-500">Жиры</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{roundNum(tdee.carbs_g)}г</p>
              <p className="text-xs text-gray-500">Углеводы</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Progress photos */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-semibold text-gray-900">Контрольные фото</p>
          <button
            onClick={() => setAddPhotoOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить фото
          </button>
        </div>

        {progressPhotos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm text-gray-400">Нет контрольных фото</p>
            <p className="mt-1 text-xs text-gray-400">Добавляйте еженедельно для отслеживания прогресса</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {progressPhotos.map(photo => (
              <div key={photo.id} className="group relative">
                <img
                  src={photo.image_data}
                  alt={photo.taken_at}
                  className="aspect-square w-full rounded-xl object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs font-medium text-white">
                    {new Date(photo.taken_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </p>
                  {photo.weight_kg != null && (
                    <p className="text-xs text-white/80">{photo.weight_kg} кг</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addPhotoOpen && (
        <AddProgressPhotoDialog onClose={() => setAddPhotoOpen(false)} />
      )}
    </div>
  )
}
