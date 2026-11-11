import { Textarea } from "../ui/Input.tsx";
import { Button } from "../ui/Button.tsx";
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
  extract,
  repair,
  apply,
  onClose,
  disabledReason,
}: {
  run: (
    script: string,
    constraints: ContinuityConstraint[],
    signal: AbortSignal,
  ) => ReturnType<typeof runStoryboardPipeline>;
  extract: (
    script: string,
    signal: AbortSignal,
  ) => Promise<ContinuityConstraint[]>;
  repair: (
    storyboard: Storyboard,
    shotId: string,
    script: string,
    constraints: ContinuityConstraint[],
    signal: AbortSignal,
  ) => ReturnType<typeof runStoryboardPipeline>;
  apply: (
    storyboard: Storyboard,
    script: string,
    constraints: ContinuityConstraint[],
  ) => Promise<void>;
  onClose: () => void;
  disabledReason?: string;
}) {
  const [script, setScript] = useState("");
  const [constraints, setConstraints] = useState<ContinuityDraft[]>([]);
  const [result, setResult] =
    useState<Awaited<ReturnType<typeof runStoryboardPipeline>>>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);
  const parsedConstraints = () =>
    z
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
  async function perform(action: (signal: AbortSignal) => Promise<void>) {
    if (request.current || disabledReason) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      await action(controller.signal);
    } catch (cause) {
      setError(
        controller.signal.aborted
          ? "操作已取消，原文和已有结果保留"
          : cause instanceof Error
            ? cause.message
            : "分镜操作失败",
      );
    } finally {
      if (request.current === controller) request.current = undefined;
      setBusy(false);
    }
  }
  async function generate() {
    await perform(async (signal) => {
      const output = await run(script, parsedConstraints(), signal);
      signal.throwIfAborted();
      setResult(output);
      setApplied(false);
      setStep(2);
      if (!output.compliant)
        setError("两轮自动重修后仍不合规：" + output.violations.join("；"));
    });
  }
  async function extractBible() {
    await perform(async (signal) => {
      const bible = await extract(script, signal);
      signal.throwIfAborted();
      setConstraints(
        bible.map((c) => ({
          characterName: c.characterName,
          kind: c.kind ?? "character",
          attributes: c.requiredAttributes.join("、"),
        })),
      );
    });
  }
  async function repairShot(id: string) {
    if (!result) return;
    await perform(async (signal) => {
      const output = await repair(
        result.storyboard,
        id,
        script,
        parsedConstraints(),
        signal,
      );
      signal.throwIfAborted();
      setResult(output);
      if (!output.compliant) setError(output.violations.join("；"));
    });
  }
  return (
    <ModalDialog
      isOpen
      className="storyboard-workflow"
      onClose={onClose}
      title="小说 / 剧本转分镜"
      footer={
        <>
          <Button
            disabled={busy || !script.trim() || Boolean(disabledReason)}
            onClick={() => void extractBible()}
          >
            从剧本提炼设定表
          </Button>
          <Button
            variant="primary"
            disabled={busy || !script.trim() || Boolean(disabledReason)}
            onClick={() => void generate()}
          >
            生成分镜
          </Button>
          {busy && (
            <Button onClick={() => request.current?.abort()}>取消生成</Button>
          )}
          {result && (
            <Button
              variant="primary"
              disabled={
                busy || applied || !result.compliant || Boolean(disabledReason)
              }
              onClick={async () => {
                setBusy(true);
                try {
                  await apply(result.storyboard, script, parsedConstraints());
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
            </Button>
          )}
        </>
      }
    >
      <nav className="storyboard-steps" aria-label="分镜步骤">
        {(
          [
            [1, "剧本与设定表"],
            [2, "分镜表审阅"],
            [3, "排布到画布"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            isPill
            aria-current={step === id ? "step" : undefined}
            aria-pressed={step === id}
            onClick={() => setStep(id)}
          >
            {label}
          </Button>
        ))}
      </nav>
      {step === 1 && (
        <>
          <label>
            小说 / 剧本
            <Textarea
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
        </>
      )}
      {(error || disabledReason) && (
        <p role="alert">{error || disabledReason}</p>
      )}
      {applied && <p role="status">分镜已保存，可在画布和资产面板查看。</p>}
      {result && step !== 1 && (
        <>
          <p role="status">
            {result.storyboard.shots.length} 镜 ·{" "}
            {result.compliant
              ? "一致性检查通过，请审阅原文覆盖"
              : "存在一致性问题，请修订后重新生成"}
          </p>
          {step === 2 && (
            <div className="storyboard-shots">
              {result.violations.map((violation) => (
                <p key={violation} className="storyboard-violation">
                  {violation}
                </p>
              ))}
              {result.storyboard.shots.map((shot) => (
                <article key={shot.id} className="storyboard-shot">
                  <h3>
                    {shot.scene} · {shot.durationSeconds}s · {shot.shotSize}
                  </h3>
                  <p>{shot.description}</p>
                  {shot.dialogue && <p>{shot.dialogue}</p>}
                  <Button
                    aria-label={`重修本镜 ${shot.id}`}
                    disabled={busy || Boolean(disabledReason)}
                    onClick={() => void repairShot(shot.id)}
                  >
                    重修本镜
                  </Button>
                </article>
              ))}
            </div>
          )}
          {step === 3 && (
            <p>审阅通过后，用底部按钮把分镜排布到无限画布并串联生图节点。</p>
          )}
        </>
      )}
    </ModalDialog>
  );
}
