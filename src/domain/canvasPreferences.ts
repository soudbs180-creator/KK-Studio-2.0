export interface CanvasPreferences {
  version: 1;
  snapEnabled: boolean;
  showConnections: boolean;
  backgroundPattern: "dots" | "grid";
  backgroundColor: string;
}

export const DEFAULT_CANVAS_PREFERENCES: CanvasPreferences = {
  version: 1,
  snapEnabled: false,
  showConnections: true,
  backgroundPattern: "dots",
  backgroundColor: "#0a0a0a",
};

function isColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function parseCanvasPreferences(raw: string | null): CanvasPreferences {
  if (!raw) return { ...DEFAULT_CANVAS_PREFERENCES };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object")
      return { ...DEFAULT_CANVAS_PREFERENCES };
    const candidate = value as Record<string, unknown>;
    if (candidate.version !== 1) return { ...DEFAULT_CANVAS_PREFERENCES };
    return {
      version: 1,
      snapEnabled:
        typeof candidate.snapEnabled === "boolean"
          ? candidate.snapEnabled
          : DEFAULT_CANVAS_PREFERENCES.snapEnabled,
      showConnections:
        typeof candidate.showConnections === "boolean"
          ? candidate.showConnections
          : DEFAULT_CANVAS_PREFERENCES.showConnections,
      backgroundPattern:
        candidate.backgroundPattern === "grid" ? "grid" : "dots",
      backgroundColor: isColor(candidate.backgroundColor)
        ? candidate.backgroundColor
        : DEFAULT_CANVAS_PREFERENCES.backgroundColor,
    };
  } catch {
    return { ...DEFAULT_CANVAS_PREFERENCES };
  }
}

export function serializeCanvasPreferences(
  preferences: CanvasPreferences,
): string {
  return JSON.stringify({
    version: 1,
    snapEnabled: Boolean(preferences.snapEnabled),
    showConnections: Boolean(preferences.showConnections),
    backgroundPattern:
      preferences.backgroundPattern === "grid" ? "grid" : "dots",
    backgroundColor: isColor(preferences.backgroundColor)
      ? preferences.backgroundColor
      : DEFAULT_CANVAS_PREFERENCES.backgroundColor,
  });
}
