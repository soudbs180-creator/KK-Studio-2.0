import {
  AUTH_ROUTES,
  type AuthSession,
  type LoginInput,
  type RefreshInput,
  type MobileUser,
  type MeResponse,
} from "./authTypes.ts";
import {
  checkedUrl,
  nonempty,
  readJson,
  record,
  requireOk,
  ServiceError,
  withHttp,
  type HttpOptions,
} from "./httpClient.ts";
function user(value: unknown): MobileUser {
  if (
    !record(value) ||
    !nonempty(value.id) ||
    !nonempty(value.email) ||
    !nonempty(value.displayName)
  )
    throw new ServiceError("INVALID_IDENTITY_RESPONSE");
  return { id: value.id, email: value.email, displayName: value.displayName };
}
function session(value: unknown, deviceId: string): AuthSession {
  if (
    !record(value) ||
    value.deviceId !== deviceId ||
    typeof value.accessToken !== "string" ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(value.accessToken) ||
    typeof value.refreshToken !== "string" ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(value.refreshToken) ||
    typeof value.accessExpiresAt !== "number" ||
    !Number.isFinite(value.accessExpiresAt) ||
    typeof value.refreshExpiresAt !== "number" ||
    !Number.isFinite(value.refreshExpiresAt) ||
    value.accessExpiresAt <= Date.now() ||
    value.refreshExpiresAt < value.accessExpiresAt
  )
    throw new ServiceError("INVALID_IDENTITY_RESPONSE");
  return {
    user: user(value.user),
    deviceId,
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
    accessExpiresAt: value.accessExpiresAt,
    refreshExpiresAt: value.refreshExpiresAt,
  };
}
export function createIdentityClient(
  options: HttpOptions & { baseUrl: string },
) {
  const base = checkedUrl(options.baseUrl, options.allowLoopbackHttp);
  if (base.pathname !== "/" && base.pathname !== "")
    throw new ServiceError("IDENTITY_ORIGIN_REQUIRED");
  async function request(
    route: string,
    input: unknown,
    token: string | undefined,
    deviceId: string,
    signal?: AbortSignal,
  ) {
    if (!/^[\w-]{1,120}$/.test(deviceId))
      throw new ServiceError("INVALID_DEVICE_ID");
    if (token && !/^[A-Za-z0-9_-]{32,128}$/.test(token))
      throw new ServiceError("INVALID_ACCESS_TOKEN");
    const requestBody = input === undefined ? undefined : JSON.stringify(input);
    return withHttp(options, signal, async (fetcher, requestSignal) => {
      const response = await fetcher(new URL(route, base), {
        method: requestBody === undefined ? "GET" : "POST",
        headers: {
          "content-type": "application/json",
          "x-kk-device-id": deviceId,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: requestBody,
        signal: requestSignal,
        redirect: "error",
        credentials: "omit",
      });
      requireOk(response);
      return readJson(response, 16_384);
    });
  }
  return {
    async login(input: LoginInput, signal?: AbortSignal): Promise<AuthSession> {
      return session(
        await request(
          AUTH_ROUTES.login,
          input,
          undefined,
          input.deviceId,
          signal,
        ),
        input.deviceId,
      );
    },
    async refresh(
      input: RefreshInput,
      signal?: AbortSignal,
    ): Promise<AuthSession> {
      return session(
        await request(
          AUTH_ROUTES.refresh,
          input,
          undefined,
          input.deviceId,
          signal,
        ),
        input.deviceId,
      );
    },
    async me(
      accessToken: string,
      deviceId: string,
      signal?: AbortSignal,
    ): Promise<MeResponse> {
      const value = await request(
        AUTH_ROUTES.me,
        undefined,
        accessToken,
        deviceId,
        signal,
      );
      if (!record(value) || value.deviceId !== deviceId)
        throw new ServiceError("INVALID_IDENTITY_RESPONSE");
      return { user: user(value.user), deviceId };
    },
    async logout(
      accessToken: string,
      deviceId: string,
      signal?: AbortSignal,
    ): Promise<{ revoked: true }> {
      const value = await request(
        AUTH_ROUTES.logout,
        {},
        accessToken,
        deviceId,
        signal,
      );
      if (!record(value) || value.revoked !== true)
        throw new ServiceError("INVALID_IDENTITY_RESPONSE");
      return { revoked: true };
    },
  };
}
