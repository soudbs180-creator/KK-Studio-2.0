import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { AppProvider, useApplication } from "../application/AppProvider.tsx";
import { ThemeProvider, useTheme, dark } from "../ui/theme.tsx";
function Navigation() {
  const { state } = useApplication(),
    theme = useTheme(),
    workspaceAvailable = state.auth === "ready" || state.auth === "local";
  if (state.auth === "starting")
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator
          color={theme.text}
          accessibilityLabel="正在读取本机资料"
        />
      </View>
    );
  return (
    <>
      <StatusBar style={theme === dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Protected guard={!workspaceAvailable}>
          <Stack.Screen name="login" />
        </Stack.Protected>
        <Stack.Protected guard={workspaceAvailable}>
          <Stack.Screen name="(workspace)" />
        </Stack.Protected>
        <Stack.Screen name="link-error" />
      </Stack>
    </>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppProvider>
        <ThemeProvider>
          <Navigation />
        </ThemeProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
