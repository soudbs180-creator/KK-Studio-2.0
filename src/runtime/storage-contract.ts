/** Only non-sensitive preferences may use these browser keys. */
export const BROWSER_STORAGE_KEYS = {
  settings: "kk-studio-next:settings:v1",
  modelProvider: "kk-studio-next:model-provider:v1",
  providerConnections: "kk-studio-next:provider-connections:v1",
  assetCollections: "kk-studio-next:asset-collections:v1",
} as const;

/** Relative to the desktop application data root; never relative to the repo. */
export const DESKTOP_DATA_DIRECTORIES = {
  app: "app",
  providers: "providers",
  profile: "profile",
  memory: "memory",
  projects: "projects",
  conversations: "conversations",
  assets: "assets",
  models: "models",
  comfyui: "comfyui",
  cache: "cache",
  backups: "backups",
  logs: "logs",
} as const;

export const CREDENTIAL_SERVICE = "com.kkstudio.provider";
