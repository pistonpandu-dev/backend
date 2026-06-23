import { Role } from '../constants/roles';

export interface TokenPayload {
  id: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  admin: {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar?: string;
    twoFactorEnabled: boolean;
  };
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  email: string;
  token: string;
}
