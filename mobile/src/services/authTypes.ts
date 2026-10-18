export const AUTH_ROUTES = {
  login: "/api/mobile/auth/login",
  refresh: "/api/mobile/auth/refresh",
  me: "/api/mobile/auth/me",
  logout: "/api/mobile/auth/logout",
} as const;

export interface MobileUser {
  id: string;
  email: string;
  displayName: string;
}
export interface LoginInput {
  email: string;
  password: string;
  deviceId: string;
}
export interface RefreshInput {
  refreshToken: string;
  deviceId: string;
}
export interface AuthSession {
  user: MobileUser;
  deviceId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
}
export interface MeResponse {
  user: MobileUser;
  deviceId: string;
}
export interface LogoutResponse {
  revoked: true;
}
