export const GEMINI_BRIDGE_DEVELOPMENT_COMMAND =
  "node scripts/gemini-bridge.mjs";
export function packagedGeminiBridgePowerShellCommand(
  resourcePath: string,
): string {
  if (!resourcePath.trim() || /[\0\r\n]/.test(resourcePath))
    throw new Error("Invalid Gemini bridge resource path");
  return "node '" + resourcePath.replaceAll("'", "''") + "'";
}
