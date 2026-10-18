/** Apply 12ai-specific contracts only to its documented, explicitly configured routes. */
export function isTwelveAiConnection(connection: {
  baseUrl: string;
  protocol?: string;
}): boolean {
  if ((connection.protocol ?? "openai-compatible") !== "openai-compatible")
    return false;
  let url: URL;
  try {
    url = new URL(connection.baseUrl);
  } catch {
    return false;
  }
  return (
    [
      "https://new.12ai.org",
      "https://cdn.12ai.org",
      "https://api.12ai.org",
    ].includes(url.origin) &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    /^\/(?:v1\/?)?$/.test(url.pathname)
  );
}
