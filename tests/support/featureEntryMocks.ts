/** Keep the same injected implementations when production imports a feature entry. */
export function featureEntryMocks(modules: Record<string, unknown>) {
  const entries: Record<string, unknown> = { ...modules };
  for (const [id, value] of Object.entries(modules)) {
    const prefix = /^(.*\/(?:creation|agent|local-service))\/[^/]+$/.exec(
      id,
    )?.[1];
    if (prefix) {
      const entry = `${prefix}/index.ts`;
      entries[entry] = { ...(entries[entry] as object), ...(value as object) };
    }
  }
  return entries;
}
