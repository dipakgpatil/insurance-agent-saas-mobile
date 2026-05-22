import { apiRequest } from './client'
import type { ConfirmImportMappingResponse, ExcelImportUploadResponse } from './types'

export type PickedImportFile = {
  uri: string
  name: string
  mimeType?: string | null
}

export function uploadExcelImport(
  token: string,
  file: PickedImportFile,
): Promise<ExcelImportUploadResponse> {
  const form = new FormData()
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? excelMimeType(file.name),
  } as unknown as Blob)

  return apiRequest<ExcelImportUploadResponse>('/imports/excel', {
    method: 'POST',
    token,
    body: form,
  })
}

export function uploadRenewalImport(
  token: string,
  file: PickedImportFile,
): Promise<ExcelImportUploadResponse> {
  const form = new FormData()
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? excelMimeType(file.name),
  } as unknown as Blob)
  return apiRequest<ExcelImportUploadResponse>('/imports/renewals/upload', {
    method: 'POST',
    token,
    body: form,
  })
}

export function confirmImportMapping(
  token: string,
  importId: string,
  columnMapping: Record<string, string>,
  templateName?: string,
): Promise<ConfirmImportMappingResponse> {
  return apiRequest<ConfirmImportMappingResponse>(`/imports/${importId}/confirm-mapping`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      column_mapping: columnMapping,
      save_template: true,
      template_name: templateName ?? 'Mobile onboarding auto-map',
    }),
  })
}

export function confirmRenewalImport(
  token: string,
  importId: string,
  columnMapping: Record<string, string>,
  templateName?: string,
): Promise<ConfirmImportMappingResponse> {
  return apiRequest<ConfirmImportMappingResponse>(`/imports/${importId}/confirm-renewal`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      column_mapping: columnMapping,
      save_template: true,
      template_name: templateName ?? 'Mobile renewal auto-map',
    }),
  })
}

export function highConfidenceMapping(
  upload: ExcelImportUploadResponse,
  threshold = 0.8,
): { mapping: Record<string, string>; skippedHeaders: string[] } {
  const mapping: Record<string, string> = {}
  const skippedHeaders: string[] = []

  for (const header of upload.headers) {
    const field = upload.suggested_mapping[header]
    const confidence = upload.mapping_confidence[header] ?? 0
    if (field && confidence >= threshold) {
      mapping[header] = field
    } else {
      skippedHeaders.push(header)
    }
  }

  return { mapping, skippedHeaders }
}

function excelMimeType(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.csv')) return 'text/csv'
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel'
  return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}
