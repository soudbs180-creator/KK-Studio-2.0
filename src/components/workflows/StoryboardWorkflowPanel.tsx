import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  ContinuityConstraintSchema,
  type ContinuityConstraint,
  type Storyboard,
} from "../../domain/storyboardPipeline.ts";
import { ModalDialog } from "../ui/ModalDialog.tsx";
import type { runStoryboardPipeline } from "../../features/workflows/index.ts";
import StoryboardConstraints, {
  type ContinuityDraft,
} from "./StoryboardConstraints.tsx";

export default function StoryboardWorkflowPanel({
  run,
  apply,
  onClose,
  disabledReason,
}: {
  run: (
    script: string,
    constraints: ContinuityConstraint[],
    signal: AbortSignal,
  ) => ReturnType<typeof runStoryboardPipeline>;
  apply: (storyboard: Storyboard) => Promise<void>;
  onClose: () => void;
  disabledReason?: string;
}) {
  const [script, setScript] = useState("");
  const [constraints, setConstraints] = useState<ContinuityDraft[]>([]);
  const [result, setResult] =
    useState<Awaited<ReturnType<typeof runStoryboardPipeline>>>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [applied, setApplied] = useState(false);
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);
  async function generate() {
    if (request.current || disabledReason) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setApplied(false);
    setResult(undefined);
    try {
      const parsed = z
        .array(ContinuityConstraintSchema)
        .max(128)
        .parse(
          constraints.map(({ attributes, ...row }) => ({
            ...row,
            requiredAttributes: attributes
              .split(/[、,，\n]/u)
              .map((s) => s.trim())
              .filter(Boolean),
          })),
        );
      const output = await run(script, parsed, controller.signal);
      controller.signal.throwIfAborted();
      setResult(output);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "分镜生成失败");
      else setError("分镜生成已取消，原文和已有结果保留");
    } finally {
      if (request.current === controller) request.current = undefined;
      setBusy(false);
    }
  }
  return (
    <ModalDialog
      isOpen
      className="storyboard-workflow"
      onClose={onClose}
      title="小说 / 剧本转分镜"
      footer={
        <>
          <button
            className="primary-button"
            disabled={busy || !script.trim() || Boolean(disabledReason)}
            onClick={() => void generate()}
          >
            生成分镜
          </button>
          {busy && (
            <button
              className="ui-button"
              onClick={() => request.current?.abort()}
            >
              取消生成
            </button>
          )}
          {result && (
            <button
              className="primary-button"
              disabled={
                busy || applied || !result.compliant || Boolean(disabledReason)
              }
              onClick={async () => {
                setBusy(true);
                try {
                  await apply(result.storyboard);
                  setApplied(true);
                } catch (cause) {
                  setError(
                    cause instanceof Error ? cause.message : "分镜保存失败",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              添加到画布 / 资产
            </button>
          )}
        </>
      }
    >
      <label>
        小说 / 剧本
        <textarea
          aria-label="小说 / 剧本"
          value={script}
          maxLength={24000}
          disabled={busy}
          onChange={(e) => setScript(e.target.value)}
        />
      </label>
      <StoryboardConstraints
        value={constraints}
        onChange={setConstraints}
        disabled={busy}
      />
      {(error || disabledReason) && (
        <p role="alert">{error || disabledReason}</p>
      )}
      {applied && <p role="status">分镜已保存，可在画布和资产面板查看。</p>}
      {result && (
        <>
          <p role="status">
            {result.storyboard.shots.length} 镜 ·{" "}
            {result.compliant
              ? "一致性检查通过，请审阅原文覆盖"
              : "存在一致性问题，请修订后重新生成"}
          </p>
          <ul>
            {result.violations.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
          <ol>
            {result.storyboard.shots.map((s) => (
              <li key={s.id}>
                <strong>
                  {s.scene} · {s.durationSeconds}s · {s.shotSize}
                </strong>
                <p>{s.description}</p>
                <p>{s.dialogue}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </ModalDialog>
  );
}
