import { useEffect, useState, type MutableRefObject } from "react";
import { loadApiKey } from "../../features/creation/providerCredentials";

export function useProviderCredentialState(
  baseUrl: string,
  credentialRef: string,
  requestRef: MutableRefObject<AbortController | null>,
  enabled = true,
) {
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(
    () => () => {
      requestRef.current?.abort("closed");
      requestRef.current = null;
    },
    [requestRef],
  );
  useEffect(() => {
    if (!enabled) {
      setHasStoredKey(false);
      return;
    }
    let active = true;
    void loadApiKey(baseUrl, credentialRef)
      .then((value) => {
        if (active) setHasStoredKey(Boolean(value));
      })
      .catch(() => {
        if (active) setHasStoredKey(false);
      });
    return () => {
      active = false;
    };
  }, [baseUrl, credentialRef, enabled]);

  return { hasStoredKey, setHasStoredKey };
}
