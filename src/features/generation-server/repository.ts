import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { WebhookEvent } from "./webhook.ts";
import { createHash, randomUUID } from "node:crypto";
import {
  providerConnectionSchema,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";
import {
  inputSchema,
  PlatformError,
  rejectSecrets,
  terminal,
  type ArchivedAsset,
  type Claim,
  type ConnectionRow,
  type JobInput,
  type JobRow,
  type OutputRow,
  type OutputStatus,
  type PublicJob,
} from "./types.ts";

const live = "('submitting','waiting_provider','downloading','manual_review')";
const held = "('held','manual_review')";
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export class GenerationRepository {
  readonly db: DatabaseSync;
  readonly deployment: "local" | "managed";
  constructor(path: string, deployment: "local" | "managed" = "local") {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.deployment = deployment;
    this.db.exec(
      readFileSync(new URL("./schema.sql", import.meta.url), "utf8"),
    );
  }
  close() {
    this.db.close();
  }
  transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = work();
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  account(ownerId: string, balance: number, limit = 4) {
    if (
      !ownerId ||
      !Number.isSafeInteger(balance) ||
      balance < 0 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 256
    )
      throw new PlatformError("INVALID_ACCOUNT");
    // Provision once. A process restart must never restore previously spent credit.
    this.db
      .prepare(
        "INSERT OR IGNORE INTO credit_accounts(owner_id,balance,concurrency_limit) VALUES(?,?,?)",
      )
      .run(ownerId, balance, limit);
  }
  register(
    connection: ProviderConnection,
    options: {
      ownerId?: string;
      allowedOwners?: string[];
      unitPrice: number;
      costLimit: number;
    },
  ) {
    const parsed = providerConnectionSchema.parse(connection);
    if (parsed.kind === "user_oauth_local")
      throw new PlatformError("OAUTH_NOT_SUPPORTED");
    if (parsed.kind !== "managed_api" && !options.ownerId)
      throw new PlatformError("CONNECTION_OWNER_REQUIRED");
    for (const n of [options.unitPrice, options.costLimit])
      if (!Number.isSafeInteger(n) || n < 0)
        throw new PlatformError("INVALID_COST_POLICY");
    const metadata = {
      ...parsed,
      credentialRef: undefined,
      activeJobs: undefined,
    };
    const owners = [
      ...new Set(
        options.allowedOwners ?? (options.ownerId ? [options.ownerId] : []),
      ),
    ];
    this.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO gateway_connections(id,owner_id,metadata_json,state,cooldown_until,unit_price,cost_limit,credential_ref)
           VALUES(?,?,?,?,?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET
             owner_id=excluded.owner_id,
             metadata_json=excluded.metadata_json,
             state=excluded.state,
             cooldown_until=excluded.cooldown_until,
             unit_price=excluded.unit_price,
             cost_limit=excluded.cost_limit,
             credential_ref=excluded.credential_ref,
             revision=gateway_connections.revision+1`,
        )
        .run(
          parsed.id,
          options.ownerId ?? null,
          JSON.stringify(metadata),
          parsed.state,
          parsed.state === "cooldown" ? (parsed.cooldownUntil ?? 0) : 0,
          options.unitPrice,
          options.costLimit,
          parsed.credentialRef ?? null,
        );
      // The config is authoritative at process startup. Reconcile ACL entries
      // so removing an owner actually revokes access after a restart.
      this.db
        .prepare("DELETE FROM connection_acl WHERE connection_id=?")
        .run(parsed.id);
      for (const owner of owners)
        this.db
          .prepare(
            "INSERT INTO connection_acl(connection_id,owner_id) VALUES(?,?)",
          )
          .run(parsed.id, owner);
    });
  }
  controls(input: {
    platformEnabled?: boolean;
    circuitOpen?: boolean;
    connectionId?: string;
    state?: "active" | "disabled";
    credentialRef?: string;
    costLimit?: number;
    ownerId?: string;
    accountDisabled?: boolean;
  }) {
    this.transaction(() => {
      if (input.platformEnabled !== undefined)
        this.db
          .prepare("UPDATE gateway_settings SET platform_enabled=?")
          .run(+input.platformEnabled);
      if (input.circuitOpen !== undefined)
        this.db
          .prepare("UPDATE gateway_settings SET circuit_open=?")
          .run(+input.circuitOpen);
      if (input.ownerId && input.accountDisabled !== undefined)
        this.db
          .prepare("UPDATE credit_accounts SET disabled=? WHERE owner_id=?")
          .run(+input.accountDisabled, input.ownerId);
      if (input.connectionId) {
        if (!this.connection(input.connectionId))
          throw new PlatformError("CONNECTION_NOT_FOUND", 404);
        if (input.state)
          this.db
            .prepare(
              "UPDATE gateway_connections SET state=?, cooldown_until=0, revision=revision+1 WHERE id=?",
            )
            .run(input.state, input.connectionId);
        if (input.credentialRef !== undefined) {
          if (!/^[A-Za-z0-9_-]{1,160}$/.test(input.credentialRef))
            throw new PlatformError("INVALID_CREDENTIAL_REF");
          this.db
            .prepare(
              "UPDATE gateway_connections SET credential_ref=?,revision=revision+1 WHERE id=?",
            )
            .run(input.credentialRef, input.connectionId);
        }
        if (input.costLimit !== undefined) {
          if (!Number.isSafeInteger(input.costLimit) || input.costLimit < 0)
            throw new PlatformError("INVALID_COST_POLICY");
          this.db
            .prepare("UPDATE gateway_connections SET cost_limit=? WHERE id=?")
            .run(input.costLimit, input.connectionId);
        }
      }
    });
  }
  connection(id: string): ConnectionRow | undefined {
    return this.db
      .prepare("SELECT * FROM gateway_connections WHERE id=?")
      .get(id) as unknown as ConnectionRow | undefined;
  }
  job(id: string): JobRow | undefined {
    return this.db
      .prepare("SELECT * FROM generation_jobs WHERE id=?")
      .get(id) as unknown as JobRow | undefined;
  }
  outputs(id: string): OutputRow[] {
    return this.db
      .prepare(
        "SELECT * FROM generation_outputs WHERE job_id=? ORDER BY output_index",
      )
      .all(id) as unknown as OutputRow[];
  }
  output(id: string, index: number): OutputRow | undefined {
    return this.outputs(id).find((o) => o.output_index === index);
  }
  publicJob(ownerId: string, id: string): PublicJob {
    const job = this.job(id);
    if (!job || job.owner_id !== ownerId)
      throw new PlatformError("NOT_FOUND", 404);
    const outputs = this.outputs(id);
    return {
      id,
      status: job.status,
      requestedOutputs: outputs.length,
      completedOutputs: outputs.filter((o) => o.status === "succeeded").length,
      outputs: outputs.map((o) => ({
        index: o.output_index,
        status: o.status,
        assetId: o.asset_id ?? undefined,
        assetRoute: o.asset_id ? `/v1/assets/${o.asset_id}` : undefined,
        errorClass: o.error_class ?? undefined,
      })),
    };
  }
  list(ownerId: string): PublicJob[] {
    return (
      this.db
        .prepare(
          "SELECT id FROM generation_jobs WHERE owner_id=? ORDER BY created_at DESC LIMIT 100",
        )
        .all(ownerId) as { id: string }[]
    ).map((j) => this.publicJob(ownerId, j.id));
  }
  private available(
    ownerId: string,
    conn: ConnectionRow,
    units: number,
    now: number,
  ) {
    const settings = this.db.prepare("SELECT * FROM gateway_settings").get()!;
    if (settings.circuit_open)
      throw new PlatformError("GLOBAL_CIRCUIT_OPEN", 503);
    if (conn.state === "quarantined" || conn.state === "disabled")
      throw new PlatformError("CONNECTION_" + conn.state.toUpperCase(), 409);
    if (conn.cooldown_until > now)
      throw new PlatformError("ALL_CONNECTIONS_COOLDOWN", 429);
    const account = this.db
      .prepare("SELECT * FROM credit_accounts WHERE owner_id=?")
      .get(ownerId);
    if (!account || account.disabled)
      throw new PlatformError("ACCOUNT_DISABLED", 403);
    const reserved = this.db
      .prepare(
        `SELECT COALESCE(SUM(units),0) AS n FROM credit_reservations WHERE owner_id=? AND status IN ${held}`,
      )
      .get(ownerId)!;
    if (Number(account.balance) - Number(reserved.n) < units)
      throw new PlatformError("INSUFFICIENT_CREDITS", 402);
    const budget = this.db
      .prepare(
        `SELECT COALESCE(SUM(units),0) AS n FROM credit_reservations WHERE connection_id=? AND status IN ${held}`,
      )
      .get(conn.id)!;
    if (conn.spent + Number(budget.n) + units > conn.cost_limit)
      throw new PlatformError("CONNECTION_COST_CAP", 409);
  }
  private authorize(ownerId: string, input: JobInput, conn: ConnectionRow) {
    if (
      !this.db
        .prepare(
          "SELECT 1 FROM connection_acl WHERE connection_id=? AND owner_id=?",
        )
        .get(conn.id, ownerId)
    )
      throw new PlatformError("CONNECTION_FORBIDDEN", 403);
    const metadata = providerConnectionSchema.parse(
      JSON.parse(conn.metadata_json),
    );
    if (metadata.kind !== "managed_api" && conn.owner_id !== ownerId)
      throw new PlatformError("CONNECTION_FORBIDDEN", 403);
    if (input.privacyMode === "platform_backed") {
      if (
        !this.db.prepare("SELECT platform_enabled FROM gateway_settings").get()
          ?.platform_enabled
      )
        throw new PlatformError("PLATFORM_BACKED_DISABLED", 403);
      if (metadata.kind !== "managed_api")
        throw new PlatformError("PRIVACY_MODE_MISMATCH", 403);
    } else {
      if (this.deployment !== "local")
        throw new PlatformError("LOCAL_PRIVACY_REQUIRES_LOCAL_GATEWAY", 403);
      if (
        input.privacyMode === "local_only" &&
        metadata.kind !== "local_comfyui"
      )
        throw new PlatformError("PRIVACY_MODE_MISMATCH", 403);
      if (!["user_byok", "local_comfyui"].includes(metadata.kind))
        throw new PlatformError("PRIVACY_MODE_MISMATCH", 403);
    }
    if (
      !metadata.capabilities.modalities.includes("image") ||
      !metadata.capabilities.operations.includes("generate")
    )
      throw new PlatformError("CAPABILITY_DENIED", 403);
    if (metadata.model && input.model !== metadata.model)
      throw new PlatformError("MODEL_NOT_ALLOWED", 403);
    if (input.attachments.length > (metadata.capabilities.maxReferences ?? 0))
      throw new PlatformError("REFERENCE_LIMIT");
    if (metadata.kind === "local_comfyui" && !input.workflow)
      throw new PlatformError("COMFY_WORKFLOW_REQUIRED");
    return metadata;
  }
  submit(ownerId: string, raw: unknown, now = Date.now()): PublicJob {
    rejectSecrets(raw);
    const input = inputSchema.parse(raw);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(canonical(input)))
      .digest("hex");
    return this.transaction(() => {
      const duplicate = this.db
        .prepare(
          "SELECT id,fingerprint FROM generation_jobs WHERE owner_id=? AND idempotency_key=?",
        )
        .get(ownerId, input.idempotencyKey);
      if (duplicate) {
        if (duplicate.fingerprint !== fingerprint)
          throw new PlatformError("IDEMPOTENCY_CONFLICT", 409);
        return this.publicJob(ownerId, String(duplicate.id));
      }
      const conn = this.connection(input.connectionId);
      if (!conn) throw new PlatformError("CONNECTION_NOT_FOUND", 404);
      const metadata = this.authorize(ownerId, input, conn);
      this.available(
        ownerId,
        conn,
        conn.unit_price * input.requestedOutputs,
        now,
      );
      const active = Number(
        this.db
          .prepare(
            `SELECT COUNT(*) n FROM generation_outputs o JOIN generation_jobs j ON j.id=o.job_id WHERE j.connection_id=? AND o.status IN ${live}`,
          )
          .get(conn.id)!.n,
      );
      if (active >= metadata.concurrencyLimit)
        throw new PlatformError("CONCURRENCY_LIMIT", 429);
      const userActive = Number(
        this.db
          .prepare(
            `SELECT COUNT(*) n FROM generation_outputs o JOIN generation_jobs j ON j.id=o.job_id WHERE j.owner_id=? AND o.status IN ${live}`,
          )
          .get(ownerId)!.n,
      );
      const userLimit = Number(
        this.db
          .prepare(
            "SELECT concurrency_limit FROM credit_accounts WHERE owner_id=?",
          )
          .get(ownerId)!.concurrency_limit,
      );
      if (userActive >= userLimit)
        throw new PlatformError("CONCURRENCY_LIMIT", 429);
      const id = "job-" + randomUUID();
      this.db
        .prepare(
          "INSERT INTO generation_jobs(id,owner_id,idempotency_key,fingerprint,connection_id,input_json,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          ownerId,
          input.idempotencyKey,
          fingerprint,
          conn.id,
          JSON.stringify(input),
          "queued",
          now,
          now,
        );
      for (let index = 0; index < input.requestedOutputs; index++) {
        const reservation = `${id}:${index}:1`;
        this.db
          .prepare(
            "INSERT INTO credit_reservations(id,job_id,owner_id,connection_id,units,status,created_at) VALUES(?,?,?,?,?,?,?)",
          )
          .run(reservation, id, ownerId, conn.id, conn.unit_price, "held", now);
        this.db
          .prepare(
            "INSERT INTO generation_outputs(job_id,output_index,status,reservation_id) VALUES(?,?,?,?)",
          )
          .run(id, index, "queued", reservation);
      }
      return this.publicJob(ownerId, id);
    });
  }
  claim(workerId: string, now = Date.now(), leaseMs = 120000): Claim | null {
    return this.transaction(() => {
      const settings = this.db.prepare("SELECT * FROM gateway_settings").get()!;
      const candidates = this.db
        .prepare(
          "SELECT o.* FROM generation_outputs o JOIN generation_jobs j ON j.id=o.job_id WHERE j.cancel_requested=0 AND o.status IN ('queued','waiting_provider') AND o.next_run<=? AND (o.lease_until IS NULL OR o.lease_until<=?) ORDER BY CASE o.status WHEN 'waiting_provider' THEN 0 ELSE 1 END, j.created_at,o.output_index LIMIT 500",
        )
        .all(now, now) as unknown as OutputRow[];
      for (const output of candidates) {
        const job = this.job(output.job_id)!;
        const conn = this.connection(job.connection_id)!;
        const input = inputSchema.parse(JSON.parse(job.input_json));
        const meta = providerConnectionSchema.parse(
          JSON.parse(conn.metadata_json),
        );
        const account = this.db
          .prepare("SELECT * FROM credit_accounts WHERE owner_id=?")
          .get(job.owner_id)!;
        if (conn.state === "quarantined" || conn.cooldown_until > now) continue;
        if (!output.provider_job_id) {
          if (
            settings.circuit_open ||
            account.disabled ||
            conn.state === "disabled"
          )
            continue;
          if (
            input.privacyMode === "platform_backed" &&
            !settings.platform_enabled
          )
            continue;
          const reserved = Number(
            this.db
              .prepare(
                `SELECT COALESCE(SUM(units),0) n FROM credit_reservations WHERE connection_id=? AND status IN ${held}`,
              )
              .get(conn.id)!.n,
          );
          if (conn.spent + reserved > conn.cost_limit) continue;
          if (
            !this.db
              .prepare(
                "SELECT 1 FROM connection_acl WHERE connection_id=? AND owner_id=?",
              )
              .get(conn.id, job.owner_id)
          )
            continue;
        }
        if (output.status === "queued") {
          const busy = Number(
            this.db
              .prepare(
                `SELECT COUNT(*) n FROM generation_outputs o JOIN generation_jobs j ON o.job_id=j.id WHERE j.connection_id=? AND o.status IN ${live}`,
              )
              .get(conn.id)!.n,
          );
          const userBusy = Number(
            this.db
              .prepare(
                `SELECT COUNT(*) n FROM generation_outputs o JOIN generation_jobs j ON o.job_id=j.id WHERE j.owner_id=? AND o.status IN ${live}`,
              )
              .get(job.owner_id)!.n,
          );
          if (
            busy >= meta.concurrencyLimit ||
            userBusy >= Number(account.concurrency_limit)
          )
            continue;
        }
        const operation = output.provider_job_id ? "poll" : "submit";
        this.db
          .prepare(
            "UPDATE generation_outputs SET status=?,lease_owner=?,lease_token=lease_token+1,lease_until=?,attempt=attempt+? WHERE job_id=? AND output_index=?",
          )
          .run(
            operation === "submit" ? "submitting" : "waiting_provider",
            workerId,
            now + leaseMs,
            operation === "submit" ? 1 : 0,
            job.id,
            output.output_index,
          );
        const claimed = this.output(job.id, output.output_index)!;
        if (operation === "submit")
          this.db
            .prepare(
              "INSERT INTO job_attempts(id,job_id,output_index,generation,number,idempotency_key,status,started_at) VALUES(?,?,?,?,?,?,?,?)",
            )
            .run(
              this.attemptId(claimed),
              job.id,
              claimed.output_index,
              claimed.generation,
              claimed.attempt,
              `${job.id}:${claimed.output_index}:${claimed.generation}`,
              "running",
              now,
            );
        this.db
          .prepare(
            "UPDATE generation_jobs SET status='running',updated_at=? WHERE id=?",
          )
          .run(now, job.id);
        return {
          job,
          output: claimed,
          connection: {
            ...meta,
            state: "active",
            credentialRef: conn.credential_ref ?? undefined,
          },
          credentialRef: conn.credential_ref ?? undefined,
          token: claimed.lease_token,
          input,
          operation,
        };
      }
      return null;
    });
  }
  attemptId(o: OutputRow) {
    return `${o.job_id}:${o.output_index}:${o.generation}:${o.attempt}`;
  }
  isCurrent(c: Claim) {
    const o = this.output(c.job.id, c.output.output_index);
    return (
      !!o &&
      o.lease_token === c.token &&
      o.generation === c.output.generation &&
      !terminal.has(o.status) &&
      !this.job(c.job.id)?.cancel_requested
    );
  }
  heartbeat(c: Claim, now = Date.now(), leaseMs = 120000) {
    if (this.isCurrent(c))
      this.db
        .prepare(
          "UPDATE generation_outputs SET lease_until=? WHERE job_id=? AND output_index=? AND lease_token=?",
        )
        .run(now + leaseMs, c.job.id, c.output.output_index, c.token);
  }
  waiting(c: Claim, providerJobId: string, now = Date.now(), delay = 1000) {
    this.transaction(() => {
      if (!this.isCurrent(c)) return;
      this.db
        .prepare(
          "UPDATE generation_outputs SET status='waiting_provider',provider_job_id=?,lease_until=NULL,lease_owner=NULL,next_run=? WHERE job_id=? AND output_index=?",
        )
        .run(providerJobId, now + delay, c.job.id, c.output.output_index);
      this.db
        .prepare(
          "UPDATE job_attempts SET provider_job_id=?,status='waiting_provider' WHERE id=?",
        )
        .run(providerJobId, this.attemptId(c.output));
    });
  }
  downloading(c: Claim, providerJobId: string) {
    if (!this.isCurrent(c)) return false;
    this.db
      .prepare(
        "UPDATE generation_outputs SET status='downloading',provider_job_id=? WHERE job_id=? AND output_index=?",
      )
      .run(providerJobId, c.job.id, c.output.output_index);
    return true;
  }
  private settle(reservationId: string, actual: number | null, now: number) {
    const r = this.db
      .prepare("SELECT * FROM credit_reservations WHERE id=?")
      .get(reservationId)!;
    const existing = this.db
      .prepare("SELECT * FROM credit_settlements WHERE reservation_id=?")
      .get(reservationId);
    if (existing && existing.status !== "manual_review") return;
    if (
      actual !== null &&
      (!Number.isSafeInteger(actual) || actual < 0 || actual > Number(r.units))
    )
      throw new PlatformError("USAGE_EXCEEDS_RESERVATION", 409);
    const status =
      actual === null ? "manual_review" : actual === 0 ? "refunded" : "settled";
    this.db
      .prepare(
        "INSERT INTO credit_settlements(reservation_id,actual_units,refunded_units,status,created_at) VALUES(?,?,?,?,?) ON CONFLICT(reservation_id) DO UPDATE SET actual_units=excluded.actual_units,refunded_units=excluded.refunded_units,status=excluded.status,created_at=excluded.created_at",
      )
      .run(
        reservationId,
        actual,
        actual === null ? null : Number(r.units) - actual,
        status,
        now,
      );
    this.db
      .prepare("UPDATE credit_reservations SET status=? WHERE id=?")
      .run(
        actual === null
          ? "manual_review"
          : actual === 0
            ? "released"
            : "settled",
        reservationId,
      );
    if (actual !== null) {
      this.db
        .prepare(
          "UPDATE credit_accounts SET balance=balance-? WHERE owner_id=?",
        )
        .run(actual, String(r.owner_id));
      this.db
        .prepare("UPDATE gateway_connections SET spent=spent+? WHERE id=?")
        .run(actual, String(r.connection_id));
    }
  }
  complete(c: Claim, asset: ArchivedAsset, now = Date.now()): boolean {
    return this.transaction(() => {
      if (!this.isCurrent(c)) {
        this.log(c, "archive", "discarded", now);
        return false;
      }
      this.db
        .prepare(
          "INSERT OR IGNORE INTO stored_assets(asset_id,sha256,mime,size) VALUES(?,?,?,?)",
        )
        .run(asset.assetId, asset.sha256, asset.mime, asset.size);
      this.db
        .prepare(
          "INSERT OR IGNORE INTO asset_owners(asset_id,owner_id) VALUES(?,?)",
        )
        .run(asset.assetId, c.job.owner_id);
      this.db
        .prepare(
          "UPDATE generation_outputs SET status='succeeded',asset_id=?,lease_until=NULL,lease_owner=NULL,error_class=NULL WHERE job_id=? AND output_index=?",
        )
        .run(asset.assetId, c.job.id, c.output.output_index);
      this.db
        .prepare(
          "UPDATE job_attempts SET status='succeeded',finished_at=? WHERE id=?",
        )
        .run(now, this.attemptId(c.output));
      const units = Number(
        this.db
          .prepare("SELECT units FROM credit_reservations WHERE id=?")
          .get(c.output.reservation_id)!.units,
      );
      this.settle(c.output.reservation_id, units, now);
      this.refresh(c.job.id, now);
      return true;
    });
  }
  fail(
    c: Claim,
    code: string,
    options: {
      status?: number;
      retryAfterMs?: number;
      retryable?: boolean;
      uncertain?: boolean;
      maxAttempts?: number;
    } = {},
    now = Date.now(),
  ) {
    this.transaction(() => {
      if (!this.isCurrent(c)) {
        this.log(c, c.operation, "discarded", now);
        return;
      }
      const quarantine = [
        "unauthorized",
        "forbidden",
        "invalid_scope",
        "project_disabled",
      ].includes(code);
      let status: OutputStatus = quarantine
        ? "quarantined"
        : options.uncertain
          ? "manual_review"
          : "failed";
      if (quarantine)
        this.db
          .prepare(
            "UPDATE gateway_connections SET state='quarantined' WHERE id=?",
          )
          .run(c.job.connection_id);
      const delay =
        code === "rate_limited"
          ? Math.max(1000, options.retryAfterMs ?? 30000)
          : Math.min(
              60000,
              500 *
                2 **
                  Math.min(
                    10,
                    c.operation === "poll"
                      ? c.output.poll_failures
                      : c.output.attempt - 1,
                  ),
            );
      if (code === "rate_limited")
        this.db
          .prepare(
            "UPDATE gateway_connections SET state='cooldown',cooldown_until=? WHERE id=?",
          )
          .run(now + delay, c.job.connection_id);
      if (options.retryable && !options.uncertain && !quarantine)
        status =
          c.output.attempt < (options.maxAttempts ?? 5)
            ? "queued"
            : "dead_letter";
      // Poll errors keep the known provider id. They never submit a replacement job.
      const polls = c.output.poll_failures + (c.operation === "poll" ? 1 : 0);
      if (c.operation === "poll" && options.retryable)
        status =
          polls >= (options.maxAttempts ?? 5)
            ? "manual_review"
            : "waiting_provider";
      this.db
        .prepare(
          "UPDATE generation_outputs SET status=?,poll_failures=?,lease_until=NULL,lease_owner=NULL,next_run=?,error_class=? WHERE job_id=? AND output_index=?",
        )
        .run(status, polls, now + delay, code, c.job.id, c.output.output_index);
      this.db
        .prepare(
          "UPDATE job_attempts SET status='failed',error_class=?,finished_at=? WHERE id=?",
        )
        .run(code, now, this.attemptId(c.output));
      if (terminal.has(status))
        this.settle(
          c.output.reservation_id,
          c.operation === "poll" || options.uncertain || quarantine
            ? null
            : status === "manual_review"
              ? null
              : 0,
          now,
        );
      if (quarantine) {
        for (const queued of this.db
          .prepare(
            "SELECT o.* FROM generation_outputs o JOIN generation_jobs j ON j.id=o.job_id WHERE j.connection_id=? AND o.status IN ('queued','submitting','waiting_provider','downloading')",
          )
          .all(c.job.connection_id) as unknown as OutputRow[]) {
          this.db
            .prepare(
              "UPDATE generation_outputs SET status='quarantined',lease_token=lease_token+1,lease_until=NULL,lease_owner=NULL,error_class=? WHERE job_id=? AND output_index=?",
            )
            .run(code, queued.job_id, queued.output_index);
          this.settle(
            queued.reservation_id,
            queued.provider_job_id ? null : 0,
            now,
          );
          this.refresh(queued.job_id, now);
        }
      }
      this.log(c, c.operation, "failed", now, options.status, code);
      this.refresh(c.job.id, now);
    });
  }
  recover(now = Date.now()): number {
    return this.transaction(() => {
      const rows = this.db
        .prepare(
          "SELECT * FROM generation_outputs WHERE status IN ('submitting','downloading','waiting_provider') AND lease_until IS NOT NULL AND lease_until<=?",
        )
        .all(now) as unknown as OutputRow[];
      for (const o of rows) {
        const resumable =
          o.status === "waiting_provider" && !!o.provider_job_id;
        this.db
          .prepare(
            "UPDATE generation_outputs SET status=?,lease_token=lease_token+1,lease_until=NULL,lease_owner=NULL,error_class=? WHERE job_id=? AND output_index=?",
          )
          .run(
            resumable ? "waiting_provider" : "manual_review",
            resumable ? null : "worker_interrupted",
            o.job_id,
            o.output_index,
          );
        if (!resumable) this.settle(o.reservation_id, null, now);
        this.db
          .prepare("UPDATE job_attempts SET status='interrupted' WHERE id=?")
          .run(this.attemptId(o));
        this.refresh(o.job_id, now);
      }
      return rows.length;
    });
  }
  cancel(ownerId: string, id: string, now = Date.now()): PublicJob {
    return this.transaction(() => {
      this.publicJob(ownerId, id);
      this.db
        .prepare("UPDATE generation_jobs SET cancel_requested=1 WHERE id=?")
        .run(id);
      for (const o of this.outputs(id)) {
        if (terminal.has(o.status)) continue;
        this.settle(o.reservation_id, o.status === "queued" ? 0 : null, now);
        this.db
          .prepare(
            "UPDATE generation_outputs SET status='cancelled',lease_token=lease_token+1,lease_until=NULL,lease_owner=NULL WHERE job_id=? AND output_index=?",
          )
          .run(id, o.output_index);
        this.db
          .prepare(
            "UPDATE job_attempts SET status='cancelled',finished_at=? WHERE id=?",
          )
          .run(now, this.attemptId(o));
      }
      this.refresh(id, now);
      return this.publicJob(ownerId, id);
    });
  }
  retry(
    ownerId: string,
    id: string,
    indices: number[],
    now = Date.now(),
  ): PublicJob {
    return this.transaction(() => {
      this.publicJob(ownerId, id);
      const job = this.job(id)!;
      if (job.cancel_requested) throw new PlatformError("CANCELLED_JOB", 409);
      const input = inputSchema.parse(JSON.parse(job.input_json));
      const conn = this.connection(job.connection_id)!;
      this.authorize(ownerId, input, conn);
      const chosen = [...new Set(indices)];
      if (!chosen.length) throw new PlatformError("OUTPUT_INDICES_REQUIRED");
      const outputs = chosen.map((i) => this.output(id, i));
      if (
        outputs.some(
          (o) =>
            !o || !["failed", "dead_letter", "quarantined"].includes(o.status),
        )
      )
        throw new PlatformError("OUTPUT_REQUIRES_REVIEW_OR_IS_ACTIVE", 409);
      if (
        (outputs as OutputRow[]).some(
          (o) =>
            this.db
              .prepare("SELECT status FROM credit_reservations WHERE id=?")
              .get(o.reservation_id)?.status === "manual_review",
        )
      )
        throw new PlatformError("OUTPUT_REQUIRES_REVIEW_OR_IS_ACTIVE", 409);
      this.available(ownerId, conn, conn.unit_price * chosen.length, now);
      for (const o of outputs as OutputRow[]) {
        const generation = o.generation + 1;
        const reservation = `${id}:${o.output_index}:${generation}`;
        this.db
          .prepare(
            "INSERT INTO credit_reservations(id,job_id,owner_id,connection_id,units,status,created_at) VALUES(?,?,?,?,?,?,?)",
          )
          .run(reservation, id, ownerId, conn.id, conn.unit_price, "held", now);
        this.db
          .prepare(
            "UPDATE generation_outputs SET status='queued',generation=?,attempt=0,poll_failures=0,provider_job_id=NULL,reservation_id=?,lease_token=lease_token+1,lease_until=NULL,next_run=0,error_class=NULL,webhook_sequence=-1 WHERE job_id=? AND output_index=?",
          )
          .run(generation, reservation, id, o.output_index);
      }
      this.refresh(id, now);
      return this.publicJob(ownerId, id);
    });
  }
  review(reservationId: string, actualUnits: number, now = Date.now()) {
    this.transaction(() => {
      const r = this.db
        .prepare("SELECT * FROM credit_reservations WHERE id=?")
        .get(reservationId);
      if (!r || r.status !== "manual_review")
        throw new PlatformError("NOT_IN_REVIEW", 409);
      this.settle(reservationId, actualUnits, now);
      this.db
        .prepare(
          "UPDATE generation_outputs SET status='failed',error_class='review_resolved' WHERE reservation_id=? AND status='manual_review'",
        )
        .run(reservationId);
      this.refresh(String(r.job_id), now);
    });
  }
  receiveEvent(
    connectionId: string,
    delivery: string,
    event: WebhookEvent,
    hash: string,
    now: number,
  ): string {
    return this.transaction(() => {
      const duplicate = this.db
        .prepare(
          "SELECT body_sha256 FROM webhook_deliveries WHERE connection_id=? AND (delivery_key=? OR event_id=?)",
        )
        .get(connectionId, delivery, event.eventId);
      if (duplicate) {
        if (duplicate.body_sha256 !== hash)
          throw new PlatformError("WEBHOOK_CONFLICT", 409);
        return "duplicate";
      }
      const job = this.job(event.jobId);
      if (!job || job.connection_id !== connectionId)
        throw new PlatformError("WEBHOOK_JOB_MISMATCH", 409);
      this.db
        .prepare(
          "INSERT INTO webhook_deliveries(connection_id,delivery_key,event_id,body_sha256,job_id,output_index,generation,provider_job_id,sequence,payload_json,received_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          connectionId,
          delivery,
          event.eventId,
          hash,
          event.jobId,
          event.outputIndex,
          event.generation,
          event.providerJobId,
          event.sequence,
          JSON.stringify(event),
          now,
        );
      return this.applyEvent(connectionId, delivery, event, now);
    });
  }
  private applyEvent(
    connectionId: string,
    delivery: string,
    event: WebhookEvent,
    now: number,
  ): string {
    const o = this.output(event.jobId, event.outputIndex);
    let state = "pending";
    if (
      !o ||
      o.generation !== event.generation ||
      terminal.has(o.status) ||
      this.job(event.jobId)?.cancel_requested ||
      o.webhook_sequence >= event.sequence
    )
      state = "stale";
    else if (o.provider_job_id) {
      state = o.provider_job_id === event.providerJobId ? "processed" : "stale";
      if (state === "processed")
        this.db
          .prepare(
            "UPDATE generation_outputs SET webhook_sequence=?,next_run=? WHERE job_id=? AND output_index=?",
          )
          .run(event.sequence, now, event.jobId, event.outputIndex);
    }
    // Receipt and poll wake-up commit together. Webhook payloads cannot grant an asset or settle a bill.
    this.db
      .prepare(
        "UPDATE webhook_deliveries SET state=? WHERE connection_id=? AND delivery_key=?",
      )
      .run(state, connectionId, delivery);
    return state;
  }
  applyWebhooks(now = Date.now()) {
    this.transaction(() => {
      for (const row of this.db
        .prepare(
          "SELECT * FROM webhook_deliveries WHERE state='pending' ORDER BY sequence DESC LIMIT 500",
        )
        .all())
        this.applyEvent(
          String(row.connection_id),
          String(row.delivery_key),
          JSON.parse(String(row.payload_json)),
          now,
        );
    });
  }
  refresh(id: string, now: number) {
    const rows = this.outputs(id);
    let status = "running";
    if (rows.every((o) => o.status === "succeeded")) status = "succeeded";
    else if (rows.every((o) => terminal.has(o.status))) {
      status = this.job(id)?.cancel_requested
        ? "cancelled"
        : rows.some((o) => o.status === "succeeded")
          ? "partial"
          : rows.some((o) => o.status === "manual_review")
            ? "manual_review"
            : rows.some((o) => o.status === "quarantined")
              ? "quarantined"
              : rows.some((o) => o.status === "dead_letter")
                ? "dead_letter"
                : "failed";
    } else if (rows.every((o) => o.status === "queued")) status = "queued";
    this.db
      .prepare("UPDATE generation_jobs SET status=?,updated_at=? WHERE id=?")
      .run(status, now, id);
  }
  log(
    c: Claim,
    operation: string,
    status: string,
    now = Date.now(),
    httpStatus?: number,
    code?: string,
    latency = 0,
  ) {
    this.db
      .prepare(
        "INSERT INTO provider_request_logs(id,job_id,output_index,attempt_id,connection_id,operation,status,http_status,failure_class,latency_ms,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        randomUUID(),
        c.job.id,
        c.output.output_index,
        this.attemptId(c.output),
        c.job.connection_id,
        operation,
        status,
        httpStatus ?? null,
        code ?? null,
        latency,
        now,
      );
  }
}
