import type { WorkflowHost, SignedInContext } from "./types.ts";
import type { AuthSession } from "../services/authTypes.ts";
export async function refreshIdentity(
  host: WorkflowHost,
  ctx: SignedInContext,
  write: (next: AuthSession) => Promise<void>,
): Promise<void> {
  const identity = host.deps.identity(ctx.identityOrigin);
  const next = await identity.refresh({
    refreshToken: ctx.session.refreshToken,
    deviceId: ctx.session.deviceId,
  });
  if (
    !host.valid(ctx) ||
    next.user.id !== ctx.session.user.id ||
    next.deviceId !== ctx.session.deviceId
  )
    throw new Error("会话身份改变，重新登录后再操作。");
  const me = await identity.me(next.accessToken, next.deviceId);
  if (
    !host.valid(ctx) ||
    me.user.id !== ctx.session.user.id ||
    me.deviceId !== ctx.session.deviceId
  )
    throw new Error("会话身份核对失败。");
  await write(next);
  if (!host.valid(ctx)) throw new Error("会话已变化。");
  ctx.session = next;
}
