import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'

export function AuthGuard() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
