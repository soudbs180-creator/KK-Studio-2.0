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

/** The documented edits route is not inferred for other models or compatible hosts. */
export function supportsImageReferences(
  connection: {
    baseUrl: string;
    protocol?: string;
    capabilities?: { image: boolean };
  },
  model: string,
): boolean {
  return (
    !!connection.capabilities?.image &&
    isTwelveAiConnection(connection) &&
    ["gpt-image-2", "gpt-image-2.5-sunburst", "gpt-image-2.5-flare"].includes(
      model,
    )
  );
}
