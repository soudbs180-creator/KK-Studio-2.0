import { useRef, useState } from "react";
import { useNavigation, usePreventRemove } from "expo-router/react-navigation";
import { useApplication } from "../application/AppProvider.tsx";
import { Action, Label } from "./primitives.tsx";
import { Sheet } from "./Sheet.tsx";
/** Covers stack back/gesture actions, without keeping a logged-out editor mounted. */
export function useUnsavedExit(
  dirty: boolean,
  accountId: string,
  onDiscard?: () => void,
) {
  const { state } = useApplication(),
    navigation = useNavigation(),
    bypass = useRef(false),
    pending = useRef<() => void>(undefined),
    [open, setOpen] = useState(false);
  usePreventRemove(
    dirty &&
      ["ready", "local"].includes(state.auth) &&
      state.accountId === accountId,
    ({ data }) => {
      const proceed = () => navigation.dispatch(data.action);
      if (bypass.current) proceed();
      else {
        pending.current = proceed;
        setOpen(true);
      }
    },
  );
  return {
    confirming: open,
    requestClose: (proceed: () => void) => {
      if (
        !dirty ||
        !["ready", "local"].includes(state.auth) ||
        state.accountId !== accountId
      )
        proceed();
      else {
        pending.current = proceed;
        setOpen(true);
      }
    },
    allow: () => {
      bypass.current = true;
    },
    dialog: (
      <Sheet title="离开编辑" open={open} onClose={() => setOpen(false)}>
        <Label>本次输入尚未保存，放弃后无法恢复。已保存的原记录保留。</Label>
        <Action label="继续编辑" primary onPress={() => setOpen(false)} />
        <Action
          label="放弃本次输入并返回"
          danger
          onPress={() => {
            onDiscard?.();
            bypass.current = true;
            setOpen(false);
            pending.current?.();
          }}
        />
      </Sheet>
    ),
  };
}
