// Historical Mobile protocol integration fixture; never deployed or imported by app runtime.
import {
  randomBytes,
  randomUUID,
  scrypt,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  open,
  unlink,
} from "node:fs/promises";
import {
  dirname,
  basename,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { realpathSync, lstatSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const userSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    displayName: z.string(),
    salt: z.string(),
    passwordHash: z.string(),
    algorithm: z.literal("scrypt"),
  })
  .strict();
const sessionSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    deviceId: z.string(),
    accessHash: z.string(),
    refreshHash: z.string(),
    accessExpiresAt: z.number(),
    refreshExpiresAt: z.number(),
  })
  .strict();
const stateSchema = z
  .object({
    version: z.literal(1),
    users: z.array(userSchema),
    sessions: z.array(sessionSchema),
  })
  .strict();
type State = z.infer<typeof stateSchema>;
type User = z.infer<typeof userSchema>;
type Session = z.infer<typeof sessionSchema>;
const provisionSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(12).max(1024),
    displayName: z.string().min(1).max(120),
  })
  .strict();
const loginSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(1024),
    deviceId: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[\w-]+$/),
  })
  .strict();
const refreshSchema = z
  .object({
    refreshToken: z.string().min(32).max(128),
    deviceId: loginSchema.shape.deviceId,
  })
  .strict();
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
});
function passwordHash(password: string, salt: string): Promise<Buffer> {
  return new Promise((accept, reject) =>
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) =>
      error ? reject(error) : accept(key),
    ),
  );
}
export class IdentityError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 401) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
function isMissing(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
function isOutside(root: string, target: string) {
  const within = relative(root, target);
  return within === ".." || within.startsWith(`..${sep}`) || isAbsolute(within);
}
/** Resolve existing ancestors before creating a missing datastore; fail closed on dangling links. */
function physicalPath(file: string): string {
  try {
    return realpathSync(file);
  } catch (error) {
    if (!isMissing(error))
      throw new IdentityError("IDENTITY_DATA_PATH_UNAVAILABLE", 503);
    let absent = false;
    try {
      lstatSync(file);
    } catch (lookupError) {
      if (!isMissing(lookupError))
        throw new IdentityError("IDENTITY_DATA_PATH_UNAVAILABLE", 503);
      absent = true;
    }
    if (!absent) throw new IdentityError("IDENTITY_DATA_PATH_UNAVAILABLE", 503);
    const parent = dirname(file);
    if (parent === file)
      throw new IdentityError("IDENTITY_DATA_PATH_UNAVAILABLE", 503);
    return resolve(physicalPath(parent), basename(file));
  }
}
export function identityExternalPath(file: string) {
  if (!isAbsolute(file))
    throw new IdentityError("ABSOLUTE_IDENTITY_PATH_REQUIRED", 500);
  const resolved = resolve(file);
  if (!isOutside(repositoryRoot, resolved))
    throw new IdentityError("REPOSITORY_DATA_PATH_FORBIDDEN", 500);
  const physical = physicalPath(resolved);
  if (!isOutside(realpathSync(repositoryRoot), physical))
    throw new IdentityError("REPOSITORY_DATA_PATH_FORBIDDEN", 500);
  return physical;
}
const externalDataPath = identityExternalPath;

/** A single-node local identity store. Production requires reviewed storage/TLS operations. */
export class IdentityRepository {
  private file: string;
  private now: () => number;
  private accessTtlMs: number;
  private refreshTtlMs: number;
  constructor(
    file: string,
    options: {
      now?: () => number;
      accessTtlMs?: number;
      refreshTtlMs?: number;
    } = {},
  ) {
    if (!isAbsolute(file))
      throw new IdentityError("ABSOLUTE_EXTERNAL_DATA_PATH_REQUIRED", 500);
    this.file = externalDataPath(file);
    this.now = options.now ?? Date.now;
    this.accessTtlMs = options.accessTtlMs ?? 15 * 60_000;
    this.refreshTtlMs = options.refreshTtlMs ?? 30 * 24 * 60 * 60_000;
    if (
      !Number.isFinite(this.accessTtlMs) ||
      !Number.isFinite(this.refreshTtlMs) ||
      this.accessTtlMs <= 0 ||
      this.refreshTtlMs <= this.accessTtlMs
    )
      throw new IdentityError("INVALID_SESSION_TTL", 500);
  }
  private async transaction<T>(
    operation: (state: State) => Promise<T> | T,
  ): Promise<T> {
    this.file = externalDataPath(this.file);
    await mkdir(dirname(this.file), { recursive: true, mode: 0o700 });
    this.file = externalDataPath(this.file);
    const lock = await open(`${this.file}.lock`, "wx", 0o600).catch(() => {
      throw new IdentityError("IDENTITY_STORE_BUSY", 503);
    });
    let temporary: string | undefined;
    try {
      let state: State;
      try {
        state = stateSchema.parse(
          JSON.parse(await readFile(this.file, "utf8")),
        );
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        )
          state = { version: 1, users: [], sessions: [] };
        else throw new IdentityError("IDENTITY_STORE_CORRUPT", 503);
      }
      state.sessions = state.sessions.filter(
        (session) => session.refreshExpiresAt > this.now(),
      );
      const result = await operation(state);
      temporary = `${this.file}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(state), {
        flag: "wx",
        mode: 0o600,
      });
      await rename(temporary, this.file);
      temporary = undefined;
      return result;
    } finally {
      if (temporary) await unlink(temporary).catch(() => undefined);
      await lock.close();
      await unlink(`${this.file}.lock`);
    }
  }
  async provision(input: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<void> {
    const parsed = provisionSchema.parse(input);
    const email = parsed.email.toLowerCase();
    const salt = randomBytes(32).toString("hex");
    const digest = await passwordHash(parsed.password, salt);
    await this.transaction((state) => {
      if (state.users.some((user) => user.email === email))
        throw new IdentityError("ACCOUNT_EXISTS", 409);
      state.users.push({
        id: randomUUID(),
        email,
        displayName: parsed.displayName,
        salt,
        passwordHash: digest.toString("hex"),
        algorithm: "scrypt",
      });
    });
  }
  private issue(
    state: State,
    user: User,
    deviceId: string,
    existing?: Session,
  ) {
    const issuedAt = this.now();
    const refreshExpiresAt =
      existing?.refreshExpiresAt ?? issuedAt + this.refreshTtlMs;
    if (refreshExpiresAt <= issuedAt)
      throw new IdentityError("SESSION_EXPIRED");
    const accessToken = randomBytes(32).toString("base64url");
    const refreshToken = randomBytes(48).toString("base64url");
    const session = {
      id: existing?.id ?? randomUUID(),
      ownerId: user.id,
      deviceId,
      accessHash: hash(accessToken),
      refreshHash: hash(refreshToken),
      accessExpiresAt: Math.min(issuedAt + this.accessTtlMs, refreshExpiresAt),
      refreshExpiresAt,
    };
    state.sessions = state.sessions.filter((item) => item.id !== session.id);
    if (state.sessions.filter((item) => item.ownerId === user.id).length >= 32)
      throw new IdentityError("SESSION_LIMIT", 429);
    state.sessions.push(session);
    return {
      user: publicUser(user),
      deviceId,
      accessToken,
      refreshToken,
      accessExpiresAt: session.accessExpiresAt,
      refreshExpiresAt: session.refreshExpiresAt,
    };
  }
  async login(input: unknown) {
    const parsed = loginSchema.parse(input);
    return this.transaction(async (state) => {
      const user = state.users.find(
        (item) => item.email === parsed.email.toLowerCase(),
      );
      const digest = await passwordHash(
        parsed.password,
        user?.salt ?? "invalid-user-salt",
      );
      if (
        !user ||
        !timingSafeEqual(digest, Buffer.from(user.passwordHash, "hex"))
      )
        throw new IdentityError("INVALID_CREDENTIALS");
      return this.issue(state, user, parsed.deviceId);
    });
  }
  async refresh(input: unknown) {
    const parsed = refreshSchema.parse(input);
    return this.transaction((state) => {
      const session = state.sessions.find(
        (item) =>
          item.refreshHash === hash(parsed.refreshToken) &&
          item.deviceId === parsed.deviceId,
      );
      const user =
        session && state.users.find((item) => item.id === session.ownerId);
      if (!session || !user || session.refreshExpiresAt <= this.now())
        throw new IdentityError("SESSION_EXPIRED");
      return this.issue(state, user, parsed.deviceId, session);
    });
  }
  async authenticate(accessToken: string, deviceId: string) {
    return this.transaction((state) => {
      const session = state.sessions.find(
        (item) =>
          item.accessHash === hash(accessToken) &&
          item.deviceId === deviceId &&
          item.accessExpiresAt > this.now(),
      );
      const user =
        session && state.users.find((item) => item.id === session.ownerId);
      if (!user || !session) throw new IdentityError("SESSION_EXPIRED");
      return { user: publicUser(user), deviceId: session.deviceId };
    });
  }
  async logout(accessToken: string, deviceId: string) {
    return this.transaction((state) => {
      const session = state.sessions.find(
        (item) =>
          item.accessHash === hash(accessToken) && item.deviceId === deviceId,
      );
      if (!session) throw new IdentityError("SESSION_EXPIRED");
      state.sessions = state.sessions.filter((item) => item.id !== session.id);
      return { revoked: true as const };
    });
  }
}
