PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS gateway_settings (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  platform_enabled INTEGER NOT NULL DEFAULT 0,
  circuit_open INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO gateway_settings(singleton) VALUES(1);
CREATE TABLE IF NOT EXISTS credit_accounts (
  owner_id TEXT PRIMARY KEY, balance INTEGER NOT NULL CHECK(balance>=0),
  disabled INTEGER NOT NULL DEFAULT 0, concurrency_limit INTEGER NOT NULL DEFAULT 4 CHECK(concurrency_limit>0)
);
CREATE TABLE IF NOT EXISTS credit_account_provisioning (
  owner_id TEXT PRIMARY KEY REFERENCES credit_accounts(owner_id),
  initial_credits INTEGER NOT NULL CHECK(initial_credits>=0)
);
CREATE TABLE IF NOT EXISTS gateway_connections (
  id TEXT PRIMARY KEY, owner_id TEXT, metadata_json TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active', cooldown_until INTEGER NOT NULL DEFAULT 0,
  unit_price INTEGER NOT NULL CHECK(unit_price>=0), cost_limit INTEGER NOT NULL CHECK(cost_limit>=0),
  spent INTEGER NOT NULL DEFAULT 0 CHECK(spent>=0), credential_ref TEXT,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS connection_acl (
  connection_id TEXT NOT NULL REFERENCES gateway_connections(id), owner_id TEXT NOT NULL,
  PRIMARY KEY(connection_id, owner_id)
);
CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES credit_accounts(owner_id),
  idempotency_key TEXT NOT NULL, fingerprint TEXT NOT NULL,
  connection_id TEXT NOT NULL REFERENCES gateway_connections(id), input_json TEXT NOT NULL,
  status TEXT NOT NULL, cancel_requested INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  UNIQUE(owner_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS credit_reservations (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES generation_jobs(id),
  owner_id TEXT NOT NULL REFERENCES credit_accounts(owner_id), connection_id TEXT NOT NULL,
  units INTEGER NOT NULL CHECK(units>=0), status TEXT NOT NULL CHECK(status IN ('held','settled','released','manual_review')),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS credit_settlements (
  reservation_id TEXT PRIMARY KEY REFERENCES credit_reservations(id),
  actual_units INTEGER CHECK(actual_units>=0), refunded_units INTEGER CHECK(refunded_units>=0),
  status TEXT NOT NULL CHECK(status IN ('settled','refunded','manual_review')), created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS generation_outputs (
  job_id TEXT NOT NULL REFERENCES generation_jobs(id), output_index INTEGER NOT NULL CHECK(output_index BETWEEN 0 AND 99),
  generation INTEGER NOT NULL DEFAULT 1, attempt INTEGER NOT NULL DEFAULT 0, poll_failures INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL, provider_job_id TEXT,
  reservation_id TEXT NOT NULL REFERENCES credit_reservations(id),
  lease_token INTEGER NOT NULL DEFAULT 0, lease_owner TEXT, lease_until INTEGER,
  next_run INTEGER NOT NULL DEFAULT 0, asset_id TEXT, error_class TEXT, webhook_sequence INTEGER NOT NULL DEFAULT -1,
  PRIMARY KEY(job_id, output_index)
);
CREATE INDEX IF NOT EXISTS output_queue_idx ON generation_outputs(status, next_run, lease_until);
CREATE TABLE IF NOT EXISTS job_attempts (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES generation_jobs(id), output_index INTEGER NOT NULL,
  generation INTEGER NOT NULL, number INTEGER NOT NULL, idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL, provider_job_id TEXT, error_class TEXT, started_at INTEGER NOT NULL, finished_at INTEGER,
  UNIQUE(job_id, output_index, generation, number)
);
CREATE TABLE IF NOT EXISTS provider_request_logs (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL, output_index INTEGER NOT NULL, attempt_id TEXT,
  connection_id TEXT NOT NULL, operation TEXT NOT NULL, status TEXT NOT NULL,
  http_status INTEGER, failure_class TEXT, latency_ms INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  connection_id TEXT NOT NULL, delivery_key TEXT NOT NULL, event_id TEXT NOT NULL,
  body_sha256 TEXT NOT NULL, job_id TEXT NOT NULL, output_index INTEGER NOT NULL, generation INTEGER NOT NULL,
  provider_job_id TEXT NOT NULL, sequence INTEGER NOT NULL,
  payload_json TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', received_at INTEGER NOT NULL,
  PRIMARY KEY(connection_id, delivery_key), UNIQUE(connection_id,event_id)
);
CREATE TABLE IF NOT EXISTS stored_assets (
  asset_id TEXT PRIMARY KEY, sha256 TEXT NOT NULL UNIQUE, mime TEXT NOT NULL, size INTEGER NOT NULL CHECK(size>0)
);
CREATE TABLE IF NOT EXISTS asset_owners (
  asset_id TEXT NOT NULL REFERENCES stored_assets(asset_id), owner_id TEXT NOT NULL,
  PRIMARY KEY(asset_id, owner_id)
);

-- Provider credentials, refresh tokens, proxy credentials, raw requests,
-- signed provider URLs and webhook secrets are deliberately absent.
