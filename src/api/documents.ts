import { API_BASE_URL, ApiError, apiRequest } from './client'
import type { DocumentRead } from './types'

export function listDocuments(token: string, params: { customerId?: string; policyId?: string } = {}) {
  const query = new URLSearchParams()
  query.set('limit', '200')
  if (params.customerId) query.set('customer_id', params.customerId)
  if (params.policyId) query.set('policy_id', params.policyId)
  return apiRequest<DocumentRead[]>(`/documents?${query.toString()}`, { token })
}

export function fetchDocument(token: string, documentId: string): Promise<DocumentRead> {
  return apiRequest<DocumentRead>(`/documents/${documentId}`, { token })
}

export async function fetchDocumentFileUrl(
  token: string,
  documentId: string,
  mode: 'preview' | 'download',
): Promise<{ status: number; url: string }> {
  // The server returns a binary file when authorized. We only need the headers + URL here;
  // the actual download to disk is handled with expo-file-system.downloadAsync.
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/${mode}`, {
    method: 'HEAD',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new ApiError(`${response.status} ${response.statusText}`, response.status)
  }
  return { status: response.status, url: `${API_BASE_URL}/documents/${documentId}/${mode}` }
}
