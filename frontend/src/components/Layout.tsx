import { Link } from 'react-router-dom'

import { DeveloperCredits } from './DeveloperCredits'
import { useAuth } from '../hooks/useAuth'

export function Layout({ title, children }: { title: string; children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Smart Parking</p>
            <h1 className="text-xl font-semibold text-white">{title}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <span>{user?.email}</span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase">{user?.role}</span>
            {user?.role === 'MANAGEMENT' ? (
              <Link className="text-cyan-400 hover:text-cyan-300" to="/management">
                Management
              </Link>
            ) : (
              <Link className="text-cyan-400 hover:text-cyan-300" to="/driver">
                Driver
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <footer className="mt-auto border-t border-slate-800/80 bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-8">
        <DeveloperCredits variant="footer" />
      </footer>
    </div>
  )
}
