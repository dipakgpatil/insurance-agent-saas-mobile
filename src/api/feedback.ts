import { apiRequest } from './client'
import type {
  FeedbackPromptStatus,
  FeedbackSubmitInput,
  FeedbackSubmitResponse,
} from './types'

export function getFeedbackPromptStatus(token: string): Promise<FeedbackPromptStatus> {
  return apiRequest<FeedbackPromptStatus>('/feedback/prompt-status', { token })
}

export function submitFeedback(
  token: string,
  input: FeedbackSubmitInput,
): Promise<FeedbackSubmitResponse> {
  return apiRequest<FeedbackSubmitResponse>('/feedback/submit', {
    method: 'POST',
    token,
    body: JSON.stringify({
      rating: input.rating,
      note: input.note ?? null,
      source: input.source,
      app_version: input.app_version ?? null,
    }),
  })
}

export function dismissFeedback(token: string): Promise<{ dismissed_until: string }> {
  return apiRequest<{ dismissed_until: string }>('/feedback/dismiss', {
    method: 'POST',
    token,
  })
}
