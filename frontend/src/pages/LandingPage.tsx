import { Link } from 'react-router-dom'
import { BookOpen, Camera, BarChart2, Apple, Check, ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    icon: <BookOpen className="h-6 w-6 text-green-500" />,
    title: 'Дневник питания',
    desc: 'Записывайте завтрак, обед, ужин и перекусы. Добавляйте заметки к каждому приёму пищи.',
  },
  {
    icon: <Camera className="h-6 w-6 text-green-500" />,
    title: 'Анализ фото ИИ',
    desc: 'Сфотографируйте блюдо — ИИ автоматически определит калорийность и состав.',
  },
  {
    icon: <BarChart2 className="h-6 w-6 text-green-500" />,
    title: 'Статистика и графики',
    desc: 'Еженедельные графики калорий, макронутриентов и прогресса к вашей цели.',
  },
  {
    icon: <Apple className="h-6 w-6 text-green-500" />,
    title: 'База продуктов',
    desc: 'Готовая база популярных продуктов. Добавляйте свои с точными данными КБЖУ.',
  },
]

const START_FEATURES = [
  'Дневник питания',
  'База продуктов',
  'Недельная статистика',
  'Контрольные фото прогресса',
]

const PRO_FEATURES = [
  'Всё из тарифа Старт',
  'Анализ фото ИИ',
  'Неограниченная история фото',
  'Приоритетная поддержка',
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-green-600">Densa</span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Войти
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
            >
              Начать бесплатно
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm text-green-700">
          ИИ-анализ фотографий блюд
        </div>
        <h1 className="mb-5 text-5xl font-extrabold tracking-tight text-gray-900">
          Считайте калории
          <br />
          <span className="text-green-500">умно и быстро</span>
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-lg text-gray-500">
          Densa — трекер питания с ИИ-анализом фото. Сфотографируйте блюдо, получите КБЖУ, следите за прогрессом.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/register"
            className="flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-green-200 hover:bg-green-600"
          >
            Начать бесплатно
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-gray-200 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50"
          >
            Войти
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">
            Всё для контроля питания
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-3 w-fit rounded-xl bg-green-50 p-2.5">{f.icon}</div>
                <h3 className="mb-1 text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16" id="pricing">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">Простые тарифы</h2>
          <p className="mb-10 text-center text-sm text-gray-500">Без скрытых платежей. Отмена в любой момент.</p>
          <div className="grid grid-cols-2 gap-6">
            {/* Start */}
            <div className="rounded-2xl border border-gray-200 bg-white p-7">
              <p className="mb-1 text-sm font-medium text-gray-500">Старт</p>
              <div className="mb-5 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-gray-900">$1</span>
                <span className="mb-1 text-sm text-gray-400">/месяц</span>
              </div>
              <ul className="mb-6 space-y-2">
                {START_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block w-full rounded-xl border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Выбрать Старт
              </Link>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl bg-green-500 p-7 text-white shadow-xl shadow-green-200">
              <div className="absolute right-5 top-5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-green-600">
                Популярный
              </div>
              <p className="mb-1 text-sm font-medium text-green-100">Про</p>
              <div className="mb-5 flex items-end gap-1">
                <span className="text-4xl font-extrabold">$5</span>
                <span className="mb-1 text-sm text-green-200">/месяц</span>
              </div>
              <ul className="mb-6 space-y-2">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white">
                    <Check className="h-4 w-4 shrink-0 text-green-200" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block w-full rounded-xl bg-white py-2.5 text-center text-sm font-semibold text-green-600 hover:bg-green-50"
              >
                Выбрать Про
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <span className="text-sm font-semibold text-green-600">Densa</span>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link to="/login" className="hover:text-gray-600">Войти</Link>
            <Link to="/register" className="hover:text-gray-600">Регистрация</Link>
            <a href="#pricing" className="hover:text-gray-600">Цены</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
