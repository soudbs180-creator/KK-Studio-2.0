const credentialPatterns = [
  /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]/i,
  /sk-[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/,
  /(?:Bearer|Basic)\s+[A-Za-z0-9+/._-]{16,}/i,
];

/** The existing Skill credential scan, shared by external manifests. */
export function containsCredentialText(value: string): boolean {
  return credentialPatterns.some((pattern) => pattern.test(value));
}
