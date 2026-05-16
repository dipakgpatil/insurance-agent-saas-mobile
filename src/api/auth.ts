import { apiRequest } from './client'
import type { AuthUser, GoogleAuthResponse, TokenResponse } from './types'

export function login(emailOrMobile: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email_or_mobile: emailOrMobile, password }),
  })
}

export function refreshToken(refreshTokenValue: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  })
}

export function loginWithGoogle(idToken: string): Promise<GoogleAuthResponse> {
  return apiRequest<GoogleAuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  })
}

export function logout(token: string, refreshTokenValue: string | null): Promise<void> {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    token,
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  })
}

export function fetchMe(token: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me', { token })
}
