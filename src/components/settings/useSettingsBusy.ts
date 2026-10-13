import { useEffect } from "react";

/** Keep the access selector in sync with the panel's pending operation. */
export default function useSettingsBusy(
  busy: boolean,
  onBusyChange?: (busy: boolean) => void,
) {
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
}
