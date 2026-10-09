import { useEffect, useState, type MutableRefObject } from "react";
import { loadApiKey } from "../../features/creation/providerCredentials";

export function useProviderCredentialState(
  baseUrl: string,
  credentialRef: string,
  requestRef: MutableRefObject<AbortController | null>,
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
  }, [baseUrl, credentialRef]);

  return { hasStoredKey, setHasStoredKey };
}
