import * as Crypto from "expo-crypto";
import { fetch } from "expo/fetch";
import { Platform } from "react-native";
import {
  createMobileRepository,
  createCredentialVault,
} from "../storage/platform";
import { createIdentityClient } from "../services/identityClient.ts";
import { createProviderClient } from "../services/providerClient.ts";
import { createTwelveAiVideoClient } from "../services/twelveAiVideoClient.ts";
import { createGatewayImageClient } from "../services/gatewayImageClient.ts";
import { createComfyUiClient } from "../services/comfyClient.ts";
import { createMobileApplication } from "./application.ts";

export const mobileApplication = createMobileApplication({
  initialMode: Platform.OS === "web" ? "local" : undefined,
  identityDigest: (value) =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
  allowLoopbackHttp: __DEV__,
  id: Crypto.randomUUID,
  now: Date.now,
  repository: createMobileRepository,
  vault: createCredentialVault,
  identity: (baseUrl) =>
    createIdentityClient({
      baseUrl,
      fetch: fetch as typeof globalThis.fetch,
      allowLoopbackHttp: __DEV__,
    }),
  provider: (vault) =>
    createProviderClient({
      allowLoopbackHttp: __DEV__,
      credentials: { read: (ref) => vault.get(ref) },
      fetch: fetch as typeof globalThis.fetch,
    }),
  gateway: (vault) =>
    createGatewayImageClient({
      allowLoopbackHttp: __DEV__,
      credentials: { read: (ref) => vault.get(ref) },
      fetch: fetch as typeof globalThis.fetch,
    }),
  video: (vault) =>
    createTwelveAiVideoClient({
      credentials: { read: (ref) => vault.get(ref) },
      fetch: fetch as typeof globalThis.fetch,
    }),
  comfy: (vault) =>
    createComfyUiClient({
      allowLoopbackHttp: __DEV__,
      credentials: { read: (ref) => vault.get(ref) },
      fetch: fetch as typeof globalThis.fetch,
    }),
});
