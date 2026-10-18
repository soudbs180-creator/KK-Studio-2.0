import { useRef, useState } from "react";
import { useApplication } from "../application/AppProvider.tsx";
import { shareVerifiedOriginal } from "../application/originalShare";
import { Action, Label, Row } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { useAction } from "../ui/useAction.ts";
export function MaterialBatchSheet({
  ids,
  onClose,
  onRemoved,
}: {
  ids: string[];
  onClose: () => void;
  onRemoved: () => void;
}) {
  const { app, state } = useApplication(),
    scope = state.accountId!,
    { busy, run } = useAction();
  const [mode, setMode] = useState<"hide" | "original">("hide"),
    [progress, setProgress] = useState(0);
  const controller = useRef<AbortController | undefined>(undefined);
  const reason = app.materials.deletionReason(ids, scope);
  const assets = state.snapshot?.assets.filter((a) => ids.includes(a.id)) ?? [];
  async function batch(favorite?: boolean) {
    const ctx = app.context();
    const abort = new AbortController();
    controller.current = abort;
    setProgress(0);
    const options = {
      signal: abort.signal,
      onProgress: (done: number) => {
        if (app.getState().accountId === scope) setProgress(done);
      },
    };
    try {
      if (favorite === undefined)
        await app.materials.share(
          ids,
          async (_repo, id) =>
            shareVerifiedOriginal(
              await app.materials.originalForShare(id, scope),
              () => app.valid(ctx),
            ),
          scope,
          options,
        );
      else await app.materials.favorite(ids, favorite, scope, options);
    } finally {
      controller.current = undefined;
    }
  }
  return (
    <Sheet
      title={`管理所选 ${ids.length} 件素材`}
      open
      onClose={() => {
        controller.current?.abort();
        onClose();
      }}
    >
      <Label>{assets.map((a) => a.name).join("、")}</Label>
      <Label muted small>
        收藏和分享逐件执行。停止只取消后续项，已完成项保留。物理删除先检查整批引用。
      </Label>
      <Row>
        <Action
          label="全部收藏"
          busy={busy}
          onPress={() => void run(() => batch(true))}
        />
        <Action
          label="取消收藏"
          busy={busy}
          onPress={() => void run(() => batch(false))}
        />
        <Action
          label="逐件保存 / 分享原件"
          busy={busy}
          onPress={() => void run(() => batch())}
        />
      </Row>
      <Label muted>
        最近执行完成：{progress}/{ids.length}
      </Label>
      <Action
        label="停止后续操作"
        disabled={!busy}
        onPress={() => controller.current?.abort()}
      />
      <Row>
        <Action
          selected={mode === "hide"}
          label="仅从列表移除"
          onPress={() => setMode("hide")}
        />
        <Action
          selected={mode === "original"}
          label="永久删除原件"
          onPress={() => setMode("original")}
        />
      </Row>
      {mode === "original" && (
        <Label danger>
          {reason ??
            "没有当前已保存的引用；确认后永久删除设备字节，此操作不可撤销。"}
        </Label>
      )}
      <Action
        danger
        label={
          mode === "hide" ? "确认移除所选列表条目" : "确认永久删除所选原件"
        }
        busy={busy}
        disabled={mode === "original" && Boolean(reason)}
        reason={mode === "original" ? reason : undefined}
        onPress={() =>
          void run(async () => {
            await app.materials.remove(ids, mode, scope);
            onRemoved();
          })
        }
      />
    </Sheet>
  );
}
