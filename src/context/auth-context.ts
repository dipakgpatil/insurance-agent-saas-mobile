import { createContext } from 'react'
import type { AuthUser } from '@/api/types'

export type StoredSession = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export type AuthContextValue = {
  session: StoredSession | null
  user: AuthUser | null
  accessToken: string | null
  initializing: boolean
  login: (emailOrMobile: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
