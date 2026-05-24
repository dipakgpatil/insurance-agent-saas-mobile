import { apiRequest } from './client'
import type { MessageTemplateRead, RenderRenewalMessageResponse } from './types'

export function listRenewalMessageTemplates(token: string) {
  return apiRequest<MessageTemplateRead[]>('/message-templates?template_type=renewal&channel=whatsapp', {
    token,
  })
}

export function renderRenewalMessage(token: string, templateId: string, policyId: string) {
  return apiRequest<RenderRenewalMessageResponse>(
    `/message-templates/${templateId}/render-renewal`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({ policy_id: policyId }),
    },
  )
}
