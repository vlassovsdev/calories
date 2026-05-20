import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi } from './api/auth'
import { usersApi } from './api/users'
import { tokenStorage } from './api/client'
import type { User } from '@/types/api'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (u: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = tokenStorage.getAccess()
    if (!token) {
      setIsLoading(false)
      return
    }
    usersApi.getMe()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    tokenStorage.set(res.tokens.access_token, res.tokens.refresh_token)
    setUser(res.user)
  }

  const register = async (email: string, password: string, displayName: string) => {
    const res = await authApi.register(email, password, displayName)
    tokenStorage.set(res.tokens.access_token, res.tokens.refresh_token)
    setUser(res.user)
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    tokenStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
