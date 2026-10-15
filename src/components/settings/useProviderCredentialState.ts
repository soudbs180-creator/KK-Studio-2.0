import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { loadApiKey } from "../../features/creation/providerCredentials";
import { ProviderSaveError } from "../../features/creation/providerSaveRecovery";

export type CredentialReadState = "loading" | "saved" | "missing" | "error";

export function useProviderCredentialState(
  baseUrl: string,
  credentialRef: string,
  requestRef: MutableRefObject<AbortController | null>,
  enabled = true,
) {
  const identity = `${baseUrl}|${credentialRef}`;
  const [readState, setReadState] = useState<{
    identity: string;
    status: CredentialReadState;
  }>({ identity, status: "loading" });
  const [loadVersion, setLoadVersion] = useState(0);
  const generation = useRef(0);
  const live = useRef({ identity, enabled, mounted: false });
  live.current.identity = identity;
  live.current.enabled = enabled;
  const canUpdate = () =>
    live.current.mounted &&
    live.current.enabled &&
    live.current.identity === identity;
  const credentialStatus = !enabled
    ? "missing"
    : readState.identity === identity
      ? readState.status
      : "loading";
  const setHasStoredKey = (saved: boolean) => {
    if (!canUpdate()) return false;
    generation.current++;
    setReadState({ identity, status: saved ? "saved" : "missing" });
    return true;
  };
  const retryCredentialLoad = () => {
    if (!canUpdate()) return;
    generation.current++;
    setReadState({ identity, status: "loading" });
    setLoadVersion((value) => value + 1);
  };
  const reflectCommittedCredential = (
    error: unknown,
    clearDraft: () => void,
  ) => {
    if (
      error instanceof ProviderSaveError &&
      error.credentialState &&
      setHasStoredKey(error.credentialState === "saved")
    )
      clearDraft();
  };

  useEffect(() => {
    live.current.mounted = true;
    return () => {
      live.current.mounted = false;
      generation.current++;
      requestRef.current?.abort("closed");
      requestRef.current = null;
    };
  }, [requestRef]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const current = ++generation.current;
    setReadState({ identity, status: "loading" });
    let timeout: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(
        () => reject(new Error("Credential read timed out")),
        10_000,
      );
    });
    void Promise.race([loadApiKey(baseUrl, credentialRef), deadline])
      .then((value) => {
        if (active && generation.current === current)
          setReadState({ identity, status: value ? "saved" : "missing" });
      })
      .catch(() => {
        if (active && generation.current === current)
          setReadState({ identity, status: "error" });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [baseUrl, credentialRef, enabled, loadVersion]);

  return {
    hasStoredKey: credentialStatus === "saved",
    setHasStoredKey,
    credentialStatus,
    retryCredentialLoad,
    reflectCommittedCredential,
  };
}
