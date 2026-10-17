import { createContext, useContext, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";
import colorTokens from "./colorTokens.generated.json";
import { useApplication } from "../application/AppProvider.tsx";

// Generated from the pinned phone semantic source. Desktop tokens are independent.
export const light = colorTokens.colors.light;
export const dark: typeof light = colorTokens.colors.dark;
const ThemeContext = createContext(light);
export const touchTarget = Platform.OS === "ios" ? 44 : 48;
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { state } = useApplication(),
    system = useColorScheme(),
    selected = state.snapshot?.preferences.theme ?? "system";
  const mode = selected === "system" ? system : selected;
  return (
    <ThemeContext.Provider value={mode === "dark" ? dark : light}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  return useContext(ThemeContext);
}
