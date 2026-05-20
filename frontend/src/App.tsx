import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth-context'
import { queryClient } from './lib/query-client'
import { AuthGuard } from './components/layout/AuthGuard'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DiaryPage } from './pages/DiaryPage'
import { StatsPage } from './pages/StatsPage'
import { FoodLibraryPage } from './pages/FoodLibraryPage'
import { PhotoPage } from './pages/PhotoPage'
import { ProfilePage } from './pages/ProfilePage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/diary', element: <DiaryPage /> },
          { path: '/stats', element: <StatsPage /> },
          { path: '/food', element: <FoodLibraryPage /> },
          { path: '/photo', element: <PhotoPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/', element: <Navigate to="/diary" replace /> },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
