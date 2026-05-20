import { useCallback, useEffect, useRef, useState } from 'react'
import Constants from 'expo-constants'
import {
  dismissFeedback,
  getFeedbackPromptStatus,
  submitFeedback,
} from '@/api/feedback'
import { useAuth } from '@/context/useAuth'

const SESSION_SHOWN_KEY = '__policypulse_feedback_shown__'

/**
 * Decides whether to show the in-app feedback modal, and exposes submit/skip
 * actions. The eligibility check is owned by the server (see
 * services/feedback.py); the client just asks once per session and obeys.
 *
 * `delayMs` lets the caller wait until the dashboard has loaded so the modal
 * doesn't fight for attention with the rest of the first paint.
 */
export function useFeedbackPrompt(delayMs = 6000) {
  const { accessToken } = useAuth()
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const requested = useRef(false)
  // session-scoped guard so we don't re-show after dismissal within one launch
  const alreadyShown = useRef(globalThis[SESSION_SHOWN_KEY as keyof typeof globalThis] === true)

  useEffect(() => {
    if (!accessToken || requested.current || alreadyShown.current) return
    requested.current = true

    const timer = setTimeout(() => {
      getFeedbackPromptStatus(accessToken)
        .then((status) => {
          if (status.should_prompt) {
            setVisible(true)
            ;(globalThis as Record<string, unknown>)[SESSION_SHOWN_KEY] = true
            alreadyShown.current = true
          }
        })
        .catch(() => {
          // never block the UI on this
        })
    }, delayMs)

    return () => clearTimeout(timer)
  }, [accessToken, delayMs])

  const submit = useCallback(
    async (rating: number, note: string) => {
      if (!accessToken) return
      setSubmitting(true)
      try {
        await submitFeedback(accessToken, {
          rating,
          note: note.trim() || null,
          source: 'mobile',
          app_version: Constants.expoConfig?.version ?? null,
        })
        setVisible(false)
      } finally {
        setSubmitting(false)
      }
    },
    [accessToken],
  )

  const skip = useCallback(async () => {
    setVisible(false)
    if (accessToken) {
      try {
        await dismissFeedback(accessToken)
      } catch {
        // ignore — local hide is enough for this session
      }
    }
  }, [accessToken])

  return { visible, submitting, submit, skip }
}
