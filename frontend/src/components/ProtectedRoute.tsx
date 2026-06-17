import { Navigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children: React.ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading session...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'MANAGEMENT' ? '/management' : '/driver'} replace />
  }

  return <>{children}</>
}
