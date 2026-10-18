import type { ConfigContext, ExpoConfig } from "expo/config";
import app from "./app.json";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? app.expo.name,
  slug: config.slug ?? app.expo.slug,
  // SDK 57 strips base URLs without segment boundaries; avoid prefixes of app routes.
  experiments: { ...config.experiments, baseUrl: "/mobile" },
});
