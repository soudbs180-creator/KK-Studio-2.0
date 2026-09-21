/**
 * Browser provider URLs may use plain HTTP only for a service on this
 * machine. Remote provider traffic carries a credential and must be protected
 * by TLS.
 */
export function isLoopbackHostname(hostname: string): boolean {
  const value = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  return (
    value === "localhost" ||
    value === "::1" ||
    /^127\.(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){2}$/.test(
      value,
    )
  );
}

export function isAllowedProviderUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" && isLoopbackHostname(url.hostname))
    );
  } catch {
    return false;
  }
}
