export type AuthUser = {
  id: string
  tenant_id: string | null
  user_type: string
  name: string
  email: string | null
  mobile: string | null
  roles: string[]
  access_codes: string[]
}

export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  user: AuthUser
}

export type GoogleAuthResponse = TokenResponse & {
  is_new_user: boolean
  onboarding_required: boolean
  email_verified: boolean
  picture_url: string | null
}

export type TenantRead = {
  id: string
  agent_code: string
  name: string
  business_name: string | null
  email: string | null
  mobile: string | null
  plan_code: string | null
  status: string
}

export type AgencyOnboardingRequest = {
  user_name: string
  mobile: string
  agency_name?: string | null
  business_name?: string | null
  agent_code?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  country?: string | null
}

export type AgencyOnboardingResponse = {
  tenant: TenantRead
  user: AuthUser
  plan_code: string
  subscription_status: string
  onboarding_completed: boolean
}

export type CustomerRead = {
  id: string
  tenant_id: string
  customer_code: string | null
  full_name: string
  mobile: string | null
  email: string | null
  date_of_birth: string | null
  gender: string | null
  city: string | null
  state: string | null
  pincode: string | null
  country: string
  pan_masked?: string | null
  aadhaar_masked?: string | null
  status: string
  extra_data: Record<string, unknown>
}

export type PolicyRead = {
  id: string
  tenant_id: string
  customer_id: string
  insurer_id: string | null
  insurance_segment_id: string
  policy_type_id: string
  policy_number: string | null
  policy_name: string | null
  start_date: string | null
  expiry_date: string | null
  renewal_date: string | null
  premium_amount: string | null
  sum_insured: string | null
  idv_amount: string | null
  status: string
  policy_extra_data: Record<string, unknown>
}

export type DocumentRead = {
  id: string
  tenant_id: string
  upload_batch_id: string | null
  customer_id: string | null
  policy_id: string | null
  document_category: string
  document_type: string | null
  original_file_name: string
  mime_type: string | null
  file_size_bytes: number
  storage_provider: string
  file_hash: string
  status: string
  uploaded_by: string
  created_at: string
  updated_at: string
}
