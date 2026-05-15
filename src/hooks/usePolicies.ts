import { useCallback, useEffect, useState } from 'react'
import { listPolicies } from '@/api/policies'
import type { PolicyRead } from '@/api/types'
import { useAuth } from '@/context/useAuth'

type State = {
  policies: PolicyRead[]
  loading: boolean
  error: string | null
}

export function usePolicies() {
  const { accessToken } = useAuth()
  const [state, setState] = useState<State>({ policies: [], loading: true, error: null })

  const refresh = useCallback(async () => {
    if (!accessToken) return
    setState((prev) => ({ ...prev, error: null }))
    try {
      const policies = await listPolicies(accessToken)
      setState({ policies, loading: false, error: null })
    } catch (error) {
      setState({
        policies: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load policies',
      })
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    listPolicies(accessToken)
      .then((policies) => {
        if (!cancelled) setState({ policies, loading: false, error: null })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            policies: [],
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load policies',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

  return { ...state, refresh }
}
