import axios from 'axios'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { DeveloperCredits } from '../components/DeveloperCredits'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types'

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') {
      return detail
    }
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((item) => item.msg ?? JSON.stringify(item)).join(', ')
    }
  }
  return fallback
}

export function LoginPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('driver@example.com')
  const [password, setPassword] = useState('Driver123!')
  const [role, setRole] = useState<UserRole>('DRIVER')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!authLoading && user) {
    return <Navigate to={user.role === 'MANAGEMENT' ? '/management' : '/driver'} replace />
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const profile =
        mode === 'login'
          ? await login(email, password)
          : await register(email, password, role, fullName || undefined)
      navigate(profile.role === 'MANAGEMENT' ? '/management' : '/driver', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, mode === 'login' ? 'Invalid credentials.' : 'Registration failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-scene relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="login-orb login-orb-cyan" aria-hidden />
      <div className="login-orb login-orb-violet" aria-hidden />

      <div className="relative z-10 grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
        <div className="hidden lg:block">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-400">
              Smart Parking System
            </p>
            <h1 className="mt-3 max-w-sm text-4xl font-bold leading-tight text-white">
              Intelligent parking,
              <span className="block bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">
                built for the future.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              Real-time IoT integration, live WebSocket updates, and seamless driver & management
              experiences.
            </p>
          </div>
          <DeveloperCredits variant="hero" />
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="w-full rounded-3xl border border-slate-700/60 bg-slate-900/70 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl"
        >
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Smart Parking System</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Demo driver: driver@example.com / Driver123!
            <br />
            Demo admin: admin@example.com / Admin123!
          </p>

          <label className="mt-6 block text-sm text-slate-300">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 transition focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              required
            />
          </label>

          <label className="mt-4 block text-sm text-slate-300">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 transition focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              required
            />
          </label>

          {mode === 'register' ? (
            <>
              <label className="mt-4 block text-sm text-slate-300">
                Full Name
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3"
                  placeholder="Mustafa Al Dayoub"
                />
              </label>
              <label className="mt-4 block text-sm text-slate-300">
                Role
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3"
                >
                  <option value="DRIVER">Driver</option>
                  <option value="MANAGEMENT">Management</option>
                </select>
              </label>
            </>
          ) : null}

          {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-3 font-medium text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-sky-400 disabled:opacity-60"
          >
            {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="mt-4 w-full text-sm text-slate-400 transition hover:text-white"
          >
            {mode === 'login' ? 'Need an account? Register' : 'Already registered? Login'}
          </button>

          <div className="mt-8 border-t border-slate-800 pt-6 lg:hidden">
            <DeveloperCredits variant="hero" />
          </div>
        </form>
      </div>
    </div>
  )
}
