import { useCallback, useEffect, useState } from 'react'
import { listCustomers } from '@/api/customers'
import type { CustomerRead } from '@/api/types'
import { useAuth } from '@/context/useAuth'

type State = {
  customers: CustomerRead[]
  loading: boolean
  error: string | null
}

export function useCustomers() {
  const { accessToken } = useAuth()
  const [state, setState] = useState<State>({ customers: [], loading: true, error: null })

  const refresh = useCallback(async () => {
    if (!accessToken) return
    setState((prev) => ({ ...prev, error: null }))
    try {
      const customers = await listCustomers(accessToken)
      setState({ customers, loading: false, error: null })
    } catch (error) {
      setState({
        customers: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load customers',
      })
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    listCustomers(accessToken)
      .then((customers) => {
        if (!cancelled) setState({ customers, loading: false, error: null })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            customers: [],
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load customers',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

  return { ...state, refresh }
}
