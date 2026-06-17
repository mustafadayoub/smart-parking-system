import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { DriverDashboard } from './pages/DriverDashboard'
import { LoginPage } from './pages/LoginPage'
import { ManagementDashboard } from './pages/ManagementDashboard'

function HomeRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={user.role === 'MANAGEMENT' ? '/management' : '/driver'} replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/driver"
              element={
                <ProtectedRoute allowedRoles={['DRIVER']}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/management"
              element={
                <ProtectedRoute allowedRoles={['MANAGEMENT']}>
                  <ManagementDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
