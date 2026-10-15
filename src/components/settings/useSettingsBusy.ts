import { useCallback, useContext, useEffect, useRef } from "react";
import { SettingsNavigationContext } from "./SettingsNavigationContext";

/** Keep the access selector in sync with the panel's pending operation. */
export default function useSettingsBusy(
  busy: boolean,
  onBusyChange?: (busy: boolean) => void,
) {
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
}

/** Each mounted operation can release only its own navigation lock. */
export function useSettingsNavigationBusy() {
  const { setBusy } = useContext(SettingsNavigationContext);
  const owner = useRef(Symbol("settings-operation")).current;
  const report = useCallback(
    (busy: boolean) => setBusy(busy, owner),
    [owner, setBusy],
  );
  useEffect(() => () => report(false), [report]);
  return report;
}
