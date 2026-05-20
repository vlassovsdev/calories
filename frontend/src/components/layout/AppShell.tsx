import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  BarChart2,
  Utensils,
  Camera,
  User,
  LogOut,
  Leaf,
} from 'lucide-react'

const navItems = [
  { to: '/diary', icon: BookOpen, label: 'Дневник' },
  { to: '/stats', icon: BarChart2, label: 'Статистика' },
  { to: '/food', icon: Utensils, label: 'Продукты' },
  { to: '/photo', icon: Camera, label: 'Фото' },
  { to: '/profile', icon: User, label: 'Профиль' },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
          <Leaf className="h-6 w-6 text-green-500" />
          <span className="text-lg font-semibold text-gray-900">Calories</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <div className="mb-2 px-3 py-1">
            <p className="truncate text-xs font-medium text-gray-900">{user?.display_name}</p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
