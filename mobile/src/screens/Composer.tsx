import { useEffect, useRef, useState } from "react";
import { Keyboard, TextInput, View } from "react-native";
import type { CreationDraft } from "@kk-studio/creation-contracts";
import type { MobileAsset, MobileProject } from "../core/mobileModel.ts";
import { useApplication } from "../application/AppProvider.tsx";
import { Action, Label } from "../ui/primitives.tsx";
import { Icon } from "../ui/Icon.tsx";
import { useTheme } from "../ui/theme.tsx";
import { composerUnavailable } from "../ui/policies.ts";
import { isTwelveAiConnection } from "../services/twelveAiProtocol.ts";
import { videoModelProfile } from "../services/twelveAiVideoModels.ts";
import { useAction } from "../ui/useAction.ts";
import { ModelPicker } from "./ModelPicker.tsx";
import { DraftRecovery } from "./DraftRecovery.tsx";
import { ComposerPanels } from "./ComposerPanels.tsx";
import { ComposerIcon, ComposerToolbar } from "./ComposerToolbar.tsx";
function signature(draft: CreationDraft) {
  return JSON.stringify({ ...draft, updatedAt: 0 });
}

export function Composer({ project }: { project: MobileProject }) {
  const { app, state } = useApplication(),
    t = useTheme(),
    { busy, run } = useAction();
  const [draft, setDraft] = useState(() => app.getDraft(project.id)),
    [interacting, setInteracting] = useState(false),
    [expanded, setExpanded] = useState(false),
    [picker, setPicker] = useState(false),
    [panel, setPanel] = useState<"add" | "parameters" | "materials" | null>(
      null,
    );
  const latest = useRef(draft),
    previous = useRef(signature(project.composerDraft)),
    saving = useRef<Promise<void>>(Promise.resolve());
  const input = useRef<TextInput>(null),
    accountId = state.accountId!;
  useEffect(() => {
    const incoming = signature(project.composerDraft);
    if (signature(latest.current) === previous.current) {
      latest.current = project.composerDraft;
      setDraft(project.composerDraft);
    }
    previous.current = incoming;
  }, [project.composerDraft]);
  function change(
    update: CreationDraft | ((current: CreationDraft) => CreationDraft),
  ) {
    const next = typeof update === "function" ? update(latest.current) : update;
    latest.current = next;
    setDraft(next);
    saving.current = app
      .saveDraft(project.id, next, false, accountId, true)
      .catch((error) => {
        app.report(error);
        throw error;
      });
    void saving.current.catch(() => undefined);
  }
  const connection = state.snapshot?.connections.find(
      (c) => c.id === draft.providerConnectionId,
    ),
    running = project.tasks.find((task) => state.busyTaskIds.includes(task.id));
  const unavailable = project.tasks.some(
    (task) =>
      ["submitted", "unknown"].includes(task.submissionState ?? "") &&
      task.prompt === draft.prompt &&
      task.model === draft.model &&
      task.providerConnectionId === draft.providerConnectionId &&
      task.kind === draft.kind,
  )
    ? "同一输入已有未完成或受理不明任务，请先到任务页核对。"
    : state.unsavedDraftProjectIds.includes(project.id)
      ? "保留草稿尚未保存，请先核对并恢复保存。"
      : composerUnavailable(draft, connection);
  const assets =
      state.snapshot?.assets.filter(
        (asset) => !asset.hidden && !asset.deleting,
      ) ?? [],
    active =
      interacting ||
      Boolean(draft.prompt) ||
      draft.attachments.length > 0 ||
      draft.kind === "image" ||
      draft.kind === "video",
    blocked = Boolean(unavailable) || Boolean(state.storageError) || busy;
  function openPicker() {
    input.current?.blur();
    Keyboard.dismiss();
    setPicker(true);
  }
  function addAsset(asset: MobileAsset) {
    if (state.accountId !== accountId) return;
    change({
      ...latest.current,
      attachments: [
        ...latest.current.attachments.filter(
          (item) => item.assetId !== asset.id,
        ),
        {
          id: app.deps.id(),
          assetId: asset.id,
          name: asset.name,
          mime: asset.mime,
          size: asset.size,
        },
      ],
    });
  }
  return (
    <View
      style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 }}
    >
      <View
        style={{
          backgroundColor: t.input,
          borderRadius: 32,
          paddingHorizontal: active ? 12 : 4,
          paddingVertical: active ? 12 : 4,
          borderWidth: 1,
          borderColor: t.subtleBorder,
          boxShadow: "0px 2px 4px rgba(0,0,0,0.06)",
          gap: 8,
        }}
      >
        {draft.attachments.length > 0 && (
          <View style={{ gap: 6 }}>
            {draft.attachments.map((attachment) => (
              <View
                key={attachment.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: t.selected,
                  borderRadius: 12,
                  paddingLeft: 10,
                }}
              >
                <Icon name="image" size={18} color={t.muted} />
                <Label small numberOfLines={1} style={{ flex: 1 }}>
                  {attachment.name}
                </Label>
                <Action
                  compact
                  iconOnly
                  icon="close"
                  label={`移除参考：${attachment.name}`}
                  onPress={() =>
                    change({
                      ...latest.current,
                      attachments: latest.current.attachments.filter(
                        (item) => item.id !== attachment.id,
                      ),
                    })
                  }
                />
              </View>
            ))}
          </View>
        )}
        <View
          style={{
            flexDirection: "row",
            alignItems: active ? "flex-start" : "center",
            gap: 4,
          }}
        >
          {!active && (
            <ComposerIcon
              name="plus"
              label="添加到创作"
              onPress={() => setPanel("add")}
            />
          )}
          <TextInput
            ref={input}
            multiline
            accessibilityLabel={
              draft.kind === "image" ? "描述想生成的图片" : "创作输入"
            }
            placeholder={
              draft.kind === "image"
                ? "描述想生成或修改的图片…"
                : "与 KK Studio 对话"
            }
            value={draft.prompt}
            onChangeText={(prompt) => change({ ...latest.current, prompt })}
            // Keep toolbar controls mounted as focus moves from the input.
            onFocus={() => setInteracting(true)}
            placeholderTextColor={t.tertiary}
            selectionColor={t.accent}
            cursorColor={t.accent}
            underlineColorAndroid="transparent"
            textAlignVertical="top"
            style={{
              flex: 1,
              minWidth: 0,
              color: t.text,
              fontSize: 16,
              lineHeight: 24,
              minHeight: 32,
              paddingVertical: active ? 4 : 8,
              paddingHorizontal: active ? 0 : 4,
              maxHeight: expanded ? 240 : 132,
            }}
          />
          {!active && (
            <ComposerIcon
              name={running ? "pause" : "send"}
              label={running ? "停止生成" : "发送"}
              solid
              busy={busy && !running}
              disabled={!running && blocked}
              onPress={() => (running ? stop() : submit())}
            />
          )}
        </View>
        {active && (
          <ComposerToolbar
            kind={draft.kind}
            model={draft.model}
            onModel={openPicker}
            onAdd={() => setPanel("add")}
            onParameters={() => setPanel("parameters")}
            onExpand={() => setExpanded(!expanded)}
            expanded={expanded}
            running={Boolean(running)}
            blocked={blocked}
            busy={busy}
            onSend={() => (running ? stop() : submit())}
          />
        )}
      </View>
      {Boolean(unavailable && draft.prompt.trim()) && (
        <Label muted small style={{ paddingHorizontal: 12 }}>
          {unavailable}
        </Label>
      )}
      {draft.kind === "video" && (
        <Label muted small style={{ paddingHorizontal: 12 }}>
          {videoModelProfile(draft.model)?.description ??
            "请选择已接入的文本生视频模型。"}
          {"\n"}
          完成后自动保存原件；停止连接不代表取消或退款。原件下载失败可到任务页只查询恢复。
        </Label>
      )}
      <DraftRecovery project={project} draft={draft} />
      <ModelPicker
        open={picker}
        onClose={() => setPicker(false)}
        draft={draft}
        onSelect={(id, model) =>
          change({ ...latest.current, providerConnectionId: id, model })
        }
      />
      <ComposerPanels
        panel={panel}
        onClose={() => setPanel(null)}
        onOpen={setPanel}
        draft={draft}
        onChange={change}
        assets={assets}
        onAsset={addAsset}
        maxOutputs={Math.min(4, connection?.capabilities?.maxOutputs ?? 1)}
        videoAvailable={Boolean(connection && isTwelveAiConnection(connection))}
      />
    </View>
  );
  function stop() {
    try {
      app.cancelTask(running!.id);
    } catch (error) {
      app.report(error);
    }
  }
  function submit() {
    void run(async () => {
      await saving.current;
      input.current?.blur();
      Keyboard.dismiss();
      await app.submit();
    });
  }
}
