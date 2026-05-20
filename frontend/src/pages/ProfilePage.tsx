import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api/users'
import { useAuth } from '@/lib/auth-context'
import type { ActivityLevel, GoalType } from '@/types/api'
import { roundNum } from '@/lib/utils'
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

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

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

  const tdeeUnavailable =
    tdeeError instanceof ApiError && tdeeError.status === 422

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Профиль</h1>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4">
          <p className="text-base font-semibold text-gray-900">{user?.display_name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
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

      {tdeeUnavailable ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center">
          <p className="text-sm text-gray-500">
            Заполните возраст, вес, рост и пол, чтобы рассчитать норму калорий
          </p>
        </div>
      ) : tdee ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
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
    </div>
  )
}
