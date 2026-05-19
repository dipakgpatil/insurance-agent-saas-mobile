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
  referral_code?: string | null
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
  referral_benefit: ReferralBenefitRead | null
}

export type ReferralBenefitRead = {
  referral_event_id: string
  referrer_display_name: string
  referrer_type: string
  reward_for_referrer_points: number
  reward_for_new_user_points: number
  free_period_days: number
  message: string
}

export type ReferralValidationResponse = {
  is_valid: boolean
  code: string | null
  referrer_display_name: string | null
  referrer_type: string | null
  benefit_message: string | null
  free_period_days: number
}

export type ReferralCodeRead = {
  id: string
  referrer_id: string
  code: string
  link_url: string | null
  source: string | null
  status: string
  expires_at: string | null
  max_uses: number | null
  total_uses: number
  successful_onboardings: number
  created_at: string
  updated_at: string
}

export type ReferralReferrerRead = {
  id: string
  referrer_type: string
  user_id: string | null
  display_name: string
  phone: string | null
  email: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type RewardBalanceRead = {
  owner_type: string
  owner_referrer_id: string | null
  owner_user_id: string | null
  total_earned_points: number
  total_redeemed_points: number
  available_points: number
}

export type RewardLedgerRead = {
  id: string
  owner_type: string
  owner_referrer_id: string | null
  owner_user_id: string | null
  referral_event_id: string | null
  points: number
  rupee_value: string
  transaction_type: string
  description: string | null
  status: string
  created_at: string
}

export type ReferralEventRead = {
  id: string
  referral_code_id: string
  referrer_id: string
  referred_user_id: string | null
  referred_name: string | null
  referred_phone: string | null
  referred_email: string | null
  status: string
  onboarded_at: string | null
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
}

export type MyReferralResponse = {
  referrer: ReferralReferrerRead
  code: ReferralCodeRead
  reward_balance: RewardBalanceRead
  referral_link: string
}

export type MyReferralEventsResponse = {
  items: ReferralEventRead[]
}

export type MyRewardsResponse = {
  balance: RewardBalanceRead
  ledger: RewardLedgerRead[]
}

export type ImportMappingSuggestion = {
  header: string
  field: string | null
  confidence: number
  source: string
  reason?: string | null
}

export type ExcelImportUploadResponse = {
  import_id: string
  document_id: string
  status: string
  source_file_name: string | null
  source_sheet_name: string | null
  total_rows: number
  headers: string[]
  sample_rows: Record<string, unknown>[]
  suggested_mapping: Record<string, string>
  mapping_confidence: Record<string, number>
  mapping_suggestions: ImportMappingSuggestion[]
  template_match: boolean
  warnings: string[]
}

export type ConfirmImportMappingResponse = {
  import_id: string
  status: string
  total_rows: number
  processed_rows: number
  failed_rows: number
  created_customers: number
  updated_customers: number
  created_policies: number
  updated_policies: number
  created_vehicles: number
  errors: Record<string, unknown>[]
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
