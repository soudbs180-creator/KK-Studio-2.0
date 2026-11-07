import { useSyncExternalStore } from "react";
import {
  agentConnection,
  desktopAgentLifecycle,
  readPermissionMode,
  subscribeAgentPreferences,
} from "../features/agent/index.ts";

export function useAppAgentState() {
  const agentPermission = useSyncExternalStore(
    subscribeAgentPreferences,
    readPermissionMode,
  );
  const agentState = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
  const desktopAgentState = useSyncExternalStore(
    desktopAgentLifecycle.subscribe,
    desktopAgentLifecycle.getState,
  );
  return { agentPermission, agentState, desktopAgentState };
}
