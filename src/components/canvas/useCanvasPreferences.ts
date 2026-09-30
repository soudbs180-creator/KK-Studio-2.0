import { useEffect, useState } from "react";
import {
  DEFAULT_CANVAS_PREFERENCES,
  parseCanvasPreferences,
  serializeCanvasPreferences,
  type CanvasPreferences,
} from "../../domain/canvasPreferences";

export const CANVAS_PREFERENCES_KEY = "kk-canvas-ui-preferences-v1";

function read(): CanvasPreferences {
  try {
    return parseCanvasPreferences(localStorage.getItem(CANVAS_PREFERENCES_KEY));
  } catch {
    return { ...DEFAULT_CANVAS_PREFERENCES };
  }
}

export function useCanvasPreferences() {
  const [preferences, setPreferences] = useState<CanvasPreferences>(read);
  useEffect(() => {
    try {
      localStorage.setItem(
        CANVAS_PREFERENCES_KEY,
        serializeCanvasPreferences(preferences),
      );
    } catch {
      // A restricted storage context must not disable canvas interaction.
    }
  }, [preferences]);
  return {
    preferences,
    setPreferences,
    setSnapEnabled: (snapEnabled: boolean) =>
      setPreferences((current) => ({ ...current, snapEnabled })),
    setShowConnections: (showConnections: boolean) =>
      setPreferences((current) => ({ ...current, showConnections })),
    setBackgroundPattern: (backgroundPattern: "dots" | "grid") =>
      setPreferences((current) => ({ ...current, backgroundPattern })),
    setBackgroundColor: (backgroundColor: string) =>
      setPreferences((current) => ({ ...current, backgroundColor })),
  };
}
