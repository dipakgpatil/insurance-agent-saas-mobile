import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'
import { fetchMe, login as loginApi, loginWithGoogle as loginWithGoogleApi, logout as logoutApi } from '@/api/auth'
import { ApiError, setSessionExpiredHandler } from '@/api/client'
import { completeAgencyOnboarding as completeAgencyOnboardingApi } from '@/api/onboarding'
import type { AgencyOnboardingRequest } from '@/api/types'
import { AuthContext, type AuthContextValue, type StoredSession } from './auth-context'

const STORAGE_KEY = 'policyoffice.session.v1'

async function readStored(): Promise<StoredSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

async function writeStored(session: StoredSession | null) {
  if (!session) {
    await SecureStore.deleteItemAsync(STORAGE_KEY)
  } else {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session))
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      const stored = await readStored()
      if (cancelled) return
      if (!stored) {
        setInitializing(false)
        return
      }
      // Optimistically use the stored session, then verify it
      setSession(stored)
      try {
        const me = await fetchMe(stored.accessToken)
        if (cancelled) return
        const refreshed: StoredSession = { ...stored, user: me }
        setSession(refreshed)
        await writeStored(refreshed)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await writeStored(null)
          if (!cancelled) setSession(null)
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  // Any apiRequest that hits 401 will fire this — clear the session so the
  // (tabs)/_layout Redirect sends the user back to /login instead of a
  // half-empty screen with silent fetch errors.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setSession(null)
      void writeStored(null)
    })
    return () => setSessionExpiredHandler(null)
  }, [])

  const login = useCallback(async (emailOrMobile: string, password: string) => {
    const response = await loginApi(emailOrMobile, password)
    const stored: StoredSession = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      user: response.user,
    }
    setSession(stored)
    await writeStored(stored)
    return response.user
  }, [])

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const response = await loginWithGoogleApi(idToken)
    const stored: StoredSession = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      user: response.user,
    }
    setSession(stored)
    await writeStored(stored)
    return response
  }, [])

  const completeAgencyOnboarding = useCallback(
    async (payload: AgencyOnboardingRequest) => {
      if (!session) {
        throw new Error('Sign in again to complete onboarding')
      }
      const response = await completeAgencyOnboardingApi(session.accessToken, payload)
      const next: StoredSession = { ...session, user: response.user }
      setSession(next)
      await writeStored(next)
      return response.user
    },
    [session],
  )

  const logout = useCallback(async () => {
    if (session) {
      try {
        await logoutApi(session.accessToken, session.refreshToken)
      } catch {
        // ignore network errors — clear local state anyway
      }
    }
    setSession(null)
    await writeStored(null)
  }, [session])

  const refreshUser = useCallback(async () => {
    if (!session) return
    try {
      const me = await fetchMe(session.accessToken)
      const next: StoredSession = { ...session, user: me }
      setSession(next)
      await writeStored(next)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSession(null)
        await writeStored(null)
      }
    }
  }, [session])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      initializing,
      login,
      loginWithGoogle,
      completeAgencyOnboarding,
      logout,
      refreshUser,
    }),
    [session, initializing, login, loginWithGoogle, completeAgencyOnboarding, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
