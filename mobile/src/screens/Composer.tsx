import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, type TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { CreationDraft } from "@kk-studio/creation-contracts";
import type { MobileAsset, MobileProject } from "../core/mobileModel.ts";
import { useApplication } from "../application/AppProvider.tsx";
import { Label } from "../ui/primitives.tsx";
import { useTheme } from "../ui/theme.tsx";
import { composerUnavailable } from "../ui/policies.ts";
import {
  isTwelveAiConnection,
  supportsImageReferences,
} from "../services/twelveAiProtocol.ts";
import { videoModelProfile } from "../services/twelveAiVideoModels.ts";
import { useAction } from "../ui/useAction.ts";
import { useSpeechInput } from "../ui/useSpeechInput";
import { importImage, importDocument } from "../storage/media";
import { ModelPicker } from "./ModelPicker.tsx";
import { DraftRecovery } from "./DraftRecovery.tsx";
import { ComposerAttachments, ComposerPanels } from "./ComposerPanels.tsx";
import { ComposerToolbar } from "./ComposerToolbar.tsx";
import { ComposerInput } from "./ComposerInput.tsx";
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
    [panel, setPanel] = useState<
      "add" | "parameters" | "materials" | "extensions" | null
    >(null);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [imageSize, setImageSize] = useState<string>();
  const latest = useRef(draft),
    previous = useRef(signature(project.composerDraft)),
    saving = useRef<Promise<void>>(Promise.resolve());
  const input = useRef<TextInput>(null),
    uploadEpoch = useRef(0),
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
    if (
      next.kind !== latest.current.kind ||
      next.model !== latest.current.model ||
      next.providerConnectionId !== latest.current.providerConnectionId
    )
      setImageSize(undefined);
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
      : composerUnavailable(draft, connection, imageSize);
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
  const voice = useSpeechInput({
    value: draft.prompt,
    onChange: (prompt) => change({ ...latest.current, prompt }),
    onStatus: setVoiceStatus,
    enabled: !running && !busy && !state.storageError,
    sessionKey: `${accountId}:${project.id}`,
  });
  const cancelVoice = voice.cancel;
  useFocusEffect(
    useCallback(
      () => () => {
        cancelVoice();
        uploadEpoch.current++;
      },
      [cancelVoice],
    ),
  );
  function openPicker() {
    voice.cancel();
    input.current?.blur();
    Keyboard.dismiss();
    setPicker(true);
  }
  function openPanel(next: typeof panel) {
    voice.cancel();
    input.current?.blur();
    Keyboard.dismiss();
    setPanel(next);
  }
  async function upload(image: boolean) {
    const ctx = app.context(),
      epoch = uploadEpoch.current;
    await saving.current;
    if (
      !app.valid(ctx) ||
      ctx.accountId !== accountId ||
      epoch !== uploadEpoch.current
    )
      return;
    const asset = await (image
      ? importImage(ctx.repo)
      : importDocument(ctx.repo));
    if (!asset || !app.valid(ctx) || epoch !== uploadEpoch.current) return;
    await app.mutate(ctx, (repo) => repo.load());
    if (
      app.valid(ctx) &&
      epoch === uploadEpoch.current &&
      app.getState().snapshot?.activeProjectId === project.id
    ) {
      addAsset(asset);
      setPanel(null);
    }
  }
  function navigate(path: "/library" | "/extensions" | `/library/${string}`) {
    voice.cancel();
    void run(async () => {
      await saving.current;
      setPanel(null);
      router.push(path);
    });
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
          <ComposerAttachments
            attachments={draft.attachments}
            onRemove={(id) =>
              change((current) => ({
                ...current,
                attachments: current.attachments.filter(
                  (item) => item.id !== id,
                ),
              }))
            }
          />
        )}
        <ComposerInput
          draft={draft}
          input={input}
          active={active}
          expanded={expanded}
          onChange={(prompt) => change({ ...latest.current, prompt })}
          onFocus={() => setInteracting(true)}
          onModel={openPicker}
          onExpand={() => setExpanded(!expanded)}
        />
        <ComposerToolbar
          kind={draft.kind}
          model={draft.model}
          onModel={openPicker}
          onAdd={() => openPanel("add")}
          onParameters={() => openPanel("parameters")}
          onExtensions={() => openPanel("extensions")}
          onVoice={voice.toggle}
          voiceState={voice.state}
          voiceDisabled={Boolean(state.storageError)}
          running={Boolean(running)}
          blocked={blocked}
          busy={busy}
          onSend={() => (running ? stop() : submit())}
        />
      </View>
      {Boolean(voiceStatus) && (
        <View accessibilityLiveRegion="polite">
          <Label small muted>
            {voiceStatus}
          </Label>
        </View>
      )}
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
          change({
            ...latest.current,
            providerConnectionId: id,
            model,
          })
        }
      />
      <ComposerPanels
        panel={panel}
        onClose={() => setPanel(null)}
        onOpen={openPanel}
        draft={draft}
        onChange={change}
        assets={assets}
        onAsset={addAsset}
        maxOutputs={Math.min(4, connection?.capabilities?.maxOutputs ?? 1)}
        videoAvailable={Boolean(connection && isTwelveAiConnection(connection))}
        onImport={(image) => void run(() => upload(image))}
        importing={busy}
        library={state.snapshot?.library}
        onLibrary={(id) => navigate(`/library/${id}`)}
        onLibraryManager={() => navigate("/library")}
        onExtensionsManager={() => navigate("/extensions")}
        imageSizes={connection?.capabilities?.imageSizes}
        imageSize={imageSize}
        onImageSize={setImageSize}
        referenceSupported={Boolean(
          connection &&
          draft.kind === "image" &&
          supportsImageReferences(connection, draft.model),
        )}
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
    voice.cancel();
    const options = { imageSize };
    void run(async () => {
      await saving.current;
      input.current?.blur();
      Keyboard.dismiss();
      await app.submit(options);
    });
  }
}
