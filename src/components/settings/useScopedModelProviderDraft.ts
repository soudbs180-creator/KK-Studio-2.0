import {
  useEffect,
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { credentialId } from "../../features/creation/providerCredentials";
import type { ModelProviderProfile } from "../../domain/modelProvider";
import {
  findModelProfileConnection,
  readProviderConnections,
} from "../../features/creation/providerRegistry";
import {
  readModelProviderProfile,
  requiresModelProviderSelection,
  type ConnectionState,
} from "./modelProviderSettingsState";
import { isLocalProviderUrl } from "../../domain/providerUrl";

type ProviderDraft = {
  profile: ModelProviderProfile;
  apiKey: string;
  credentialRef: string;
};

export function readModelProviderDraft(
  scope?: "official" | "relay" | "local",
): ProviderDraft {
  let profile = readModelProviderProfile();
  const connections = readProviderConnections();
  const current = findModelProfileConnection(profile, connections);
  if (
    scope === "local" &&
    (!isLocalProviderUrl(profile.baseUrl) || current?.kind === "local_comfyui")
  ) {
    const local = connections.find(
      (item) =>
        item.kind === "user_byok" &&
        item.baseUrl &&
        isLocalProviderUrl(item.baseUrl),
    );
    profile = local?.baseUrl
      ? {
          version: 1,
          connectionId: local.id,
          name: local.provider,
          baseUrl: local.baseUrl,
          model: local.model ?? "",
          protocol: local.protocol,
          authMode: local.authMode,
        }
      : {
          version: 1,
          name: "本地对话服务",
          baseUrl: "http://127.0.0.1:8080/v1",
          model: "",
          protocol: "openai-chat",
          authMode: "none",
        };
  }
  const existing = findModelProfileConnection(profile, connections);
  return {
    profile,
    apiKey: "",
    credentialRef:
      existing?.credentialRef ??
      (requiresModelProviderSelection(profile, connections)
        ? "unselected_provider_account"
        : credentialId(profile.baseUrl, profile.name)),
  };
}

export default function useScopedModelProviderDraft({
  scope,
  profile,
  apiKey,
  credentialRef,
  active,
  saving,
  testing = false,
  onBusyChange,
  cancelRequest,
  setProfile,
  setApiKey,
  setCredentialRef,
  setConnection,
}: {
  scope: "official" | "relay" | "local";
  profile: ModelProviderProfile;
  apiKey: string;
  credentialRef: string;
  active: boolean;
  saving: boolean;
  testing?: boolean;
  onBusyChange?: (busy: boolean) => void;
  cancelRequest: () => void;
  setProfile: (profile: ModelProviderProfile) => void;
  setApiKey: (apiKey: string) => void;
  setCredentialRef: (credentialRef: string) => void;
  setConnection: Dispatch<SetStateAction<ConnectionState>>;
}) {
  const previousScopeRef = useRef(scope);
  const draftsRef = useRef<
    Partial<Record<"official" | "relay" | "local", ProviderDraft>>
  >({});

  useEffect(() => {
    onBusyChange?.(saving || testing);
  }, [saving, testing, onBusyChange]);
  useEffect(() => {
    if (active) return;
    cancelRequest();
    setConnection((current) =>
      current.kind === "loading"
        ? { kind: "cancelled", message: "已取消连接测试。" }
        : current,
    );
  }, [active]);

  useLayoutEffect(() => {
    if (previousScopeRef.current === scope) return;
    draftsRef.current[previousScopeRef.current] = {
      profile,
      apiKey,
      credentialRef,
    };
    cancelRequest();
    const next = draftsRef.current[scope] ?? readModelProviderDraft(scope);
    setProfile(next.profile);
    setApiKey(next.apiKey);
    setCredentialRef(next.credentialRef);
    setConnection({ kind: "idle", message: "有尚未测试的更改。" });
    previousScopeRef.current = scope;
  }, [scope]);
  return (patch: Partial<ModelProviderProfile>): void => {
    if (saving) return;
    cancelRequest();
    const nextProfile = { ...profile, ...patch };
    if ("baseUrl" in patch || "name" in patch) {
      nextProfile.connectionId = undefined;
      setApiKey("");
      setCredentialRef(credentialId(nextProfile.baseUrl, nextProfile.name));
    }
    setProfile(nextProfile);
    setConnection({ kind: "idle", message: "有尚未测试的更改。" });
  };
}
