import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.ts'
import { AuthStatus } from './AuthStatus.tsx'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthStatus message="Checking your session..." />
  if (!session) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from }} />
  }
  return <Outlet />
}
