import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { API_BASE_URL, ApiError } from './client'

export type ExcelFormatProfileRead = {
  id: string
  name: string
  source_type: string
  source_sheet_name: string | null
  column_schema: Record<string, unknown>[]
  supplemental_columns: Record<string, unknown>[]
  is_default: boolean
  updated_at: string
}

export async function listExcelProfiles(token: string): Promise<ExcelFormatProfileRead[]> {
  const response = await fetch(`${API_BASE_URL}/excel-format-profiles`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new ApiError(text || 'Failed to load profiles', response.status)
  }
  return response.json() as Promise<ExcelFormatProfileRead[]>
}

export async function downloadProfileExport(
  token: string,
  profileId: string,
  profileName: string,
  scope: 'active' | 'all' = 'active',
): Promise<void> {
  const url = `${API_BASE_URL}/excel-format-profiles/${profileId}/export?scope=${scope}`
  const safeName = profileName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
  const fileUri = `${FileSystem.cacheDirectory}${safeName}_${scope}.xlsx`

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (result.status !== 200) {
    throw new Error(`Export failed (HTTP ${result.status})`)
  }

  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) {
    throw new Error('Sharing is not available on this device')
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: `Save ${profileName} (${scope})`,
    UTI: 'com.microsoft.excel.xlsx',
  })
}
