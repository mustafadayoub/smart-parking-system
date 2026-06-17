import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { getMe, login as apiLogin, register as apiRegister } from '../services/parkingApi'
import type { User, UserRole } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (email: string, password: string, role?: UserRole, fullName?: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? (JSON.parse(stored) as User) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const profile = await getMe()
        setUser(profile)
        localStorage.setItem('user', JSON.stringify(profile))
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    void bootstrap()
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin(email, password)
    localStorage.setItem('access_token', response.access_token)
    localStorage.setItem('user', JSON.stringify(response.user))
    setToken(response.access_token)
    setUser(response.user)
    return response.user
  }, [])

  const register = useCallback(
    async (email: string, password: string, role: UserRole = 'DRIVER', fullName?: string) => {
      await apiRegister(email, password, role, fullName)
      return login(email, password)
    },
    [login],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
