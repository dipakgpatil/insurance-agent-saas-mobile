import { useCallback, useEffect, useState } from 'react'
import { listDocuments } from '@/api/documents'
import type { DocumentRead } from '@/api/types'
import { useAuth } from '@/context/useAuth'

type State = {
  documents: DocumentRead[]
  loading: boolean
  error: string | null
}

export function useDocuments() {
  const { accessToken } = useAuth()
  const [state, setState] = useState<State>({ documents: [], loading: true, error: null })

  const refresh = useCallback(async () => {
    if (!accessToken) return
    setState((prev) => ({ ...prev, error: null }))
    try {
      const documents = await listDocuments(accessToken)
      setState({ documents, loading: false, error: null })
    } catch (error) {
      setState({
        documents: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load documents',
      })
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    listDocuments(accessToken)
      .then((documents) => {
        if (!cancelled) setState({ documents, loading: false, error: null })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            documents: [],
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load documents',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

  return { ...state, refresh }
}
