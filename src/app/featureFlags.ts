/**
 * Feature flags for unfinished / cloud-only surfaces.
 * Hide by default; keep code. Override with KK_FF_<FLAG>=1.
 */

export const FEATURE_FLAG_IDS = [
  "accountLocal",
  "creditsLocal",
  "accountCloud",
  "creditsCloud",
  "cloudSyncCopy",
  "skillsOnlineCatalog",
  "connectorRemote",
  "taskWorkbenchPlanner",
  "taskWorkbenchExport",
  "taskWorkbenchShare",
  "platformQuotaMode",
] as const;

export type FeatureFlagId = (typeof FEATURE_FLAG_IDS)[number];

const DEFAULT_FLAGS: Record<FeatureFlagId, boolean> = {
  accountLocal: true,
  creditsLocal: true,
  accountCloud: false,
  creditsCloud: false,
  cloudSyncCopy: false,
  skillsOnlineCatalog: false,
  connectorRemote: false,
  taskWorkbenchPlanner: false,
  taskWorkbenchExport: false,
  taskWorkbenchShare: false,
  platformQuotaMode: false,
};

function envSource(): Record<string, string | undefined> {
  if (typeof process !== "undefined" && process.env) return process.env;
  return {};
}

/** accountCloud → KK_FF_ACCOUNT_CLOUD */
export function featureFlagEnvKey(id: FeatureFlagId): string {
  return `KK_FF_${id.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
}

function parseEnvToggle(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined;
  const value = raw.trim().toLowerCase();
  if (value === "1" || value === "true" || value === "on" || value === "yes")
    return true;
  if (value === "0" || value === "false" || value === "off" || value === "no")
    return false;
  return undefined;
}

export function readFeatureFlagDefaults(): Record<FeatureFlagId, boolean> {
  return { ...DEFAULT_FLAGS };
}

export function isEnabled(
  id: FeatureFlagId,
  env: Record<string, string | undefined> = envSource(),
): boolean {
  const override = parseEnvToggle(env[featureFlagEnvKey(id)]);
  if (override !== undefined) return override;
  return DEFAULT_FLAGS[id];
}

export function listFeatureFlags(
  env: Record<string, string | undefined> = envSource(),
): Record<FeatureFlagId, boolean> {
  const result = { ...DEFAULT_FLAGS };
  for (const id of FEATURE_FLAG_IDS) result[id] = isEnabled(id, env);
  return result;
}
