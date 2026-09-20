# VPS static release preparation

This directory is a reviewable deployment preparation package for the KK Studio
browser static **Prototype**. It does not deploy or start a provider, ComfyUI,
generation gateway, database, or API. Desktop remains local-first; this package
is only the Web static entrypoint.

Build the release outside the VPS and inspect the generated hash manifest:

```powershell
npm run build
node deploy/release.mjs package --dist dist --release 2026.09.19-local
```

`package` creates a tar archive plus `manifest.json` and `manifest.sha256` in
`.tmp/deploy`. Sensitive-looking files (`.env`, private keys, credentials,
secrets, and `id_rsa`) are rejected before packaging. The archive contains the
static `dist` tree and the two verification files; no source checkout, npm
cache, or runtime data is included.

The default deployment action is a dry-run. It prints the exact `ssh`/`scp`
sequence and performs no network operation:

```powershell
node deploy/release.mjs deploy --dist dist --release 2026.09.19-local `
  --host staging.example.invalid --user deploy `
  --path /srv/kk-studio-next
```

Only after the real host, user, path, SSH authentication, and release approval
are known should `--apply` be used. The remote activation script creates an
immutable release directory, verifies every file with SHA-256, and atomically
swaps `current` to the new release. It retains the prior `current` target as
`previous`, refuses to overwrite an existing release, and never removes an
external directory. The current link is only changed after extraction and
verification succeed.

The health check is intentionally static:

```powershell
node deploy/health-check.mjs https://staging.example.invalid/
```

It checks that the URL returns a successful HTML response. It does not claim
provider readiness, API health, authentication, DNS ownership, TLS issuance,
backup restoration, or production readiness. Those require a separately
authorized staging runbook and real credentials.
