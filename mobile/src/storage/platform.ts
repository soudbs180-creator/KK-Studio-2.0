// TypeScript/default resolution; Metro selects .native.ts or .web.ts at runtime.
export {
  createMobileRepository,
  createCredentialVault,
} from "./platform.native";
