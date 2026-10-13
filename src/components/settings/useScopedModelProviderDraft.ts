import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
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

type ProviderDraft = {
  profile: ModelProviderProfile;
  apiKey: string;
  credentialRef: string;
};

export function readModelProviderDraft(): ProviderDraft {
  const profile = readModelProviderProfile();
  const existing = findModelProfileConnection(
    profile,
    readProviderConnections(),
  );
  return {
    profile,
    apiKey: "",
    credentialRef:
      existing?.credentialRef ??
      (requiresModelProviderSelection(profile, readProviderConnections())
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
  onBusyChange,
  cancelRequest,
  setProfile,
  setApiKey,
  setCredentialRef,
  setConnection,
}: {
  scope: "official" | "relay";
  profile: ModelProviderProfile;
  apiKey: string;
  credentialRef: string;
  active: boolean;
  saving: boolean;
  onBusyChange?: (busy: boolean) => void;
  cancelRequest: () => void;
  setProfile: (profile: ModelProviderProfile) => void;
  setApiKey: (apiKey: string) => void;
  setCredentialRef: (credentialRef: string) => void;
  setConnection: Dispatch<SetStateAction<ConnectionState>>;
}) {
  const previousScopeRef = useRef(scope);
  const draftsRef = useRef<
    Partial<Record<"official" | "relay", ProviderDraft>>
  >({});

  useEffect(() => {
    onBusyChange?.(saving);
  }, [saving, onBusyChange]);
  useEffect(() => {
    if (active) return;
    cancelRequest();
    setConnection((current) =>
      current.kind === "loading"
        ? { kind: "cancelled", message: "已取消连接测试。" }
        : current,
    );
  }, [active]);

  useEffect(() => {
    if (previousScopeRef.current === scope) return;
    draftsRef.current[previousScopeRef.current] = {
      profile,
      apiKey,
      credentialRef,
    };
    cancelRequest();
    const next = draftsRef.current[scope] ?? readModelProviderDraft();
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
