import { GenerationProviderError } from "./imageGeneration.ts";
import type { CreationTask, CreationTaskOutput } from "./model.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import { loadApiKey } from "../../integrations/providers/credentialVault.ts";
import {
  TwelveAiTaskAdapter,
  TwelveAiTaskError,
  type TwelveAiSubmissionReceipt,
} from "../../integrations/generation/twelveAiTaskAdapter.ts";
import { parseTwelveAiSubmissionReceipt } from "../../integrations/generation/twelveAiTaskProtocol.ts";
import { validateMediaTaskInput } from "./mediaTaskInput.ts";
import { loadStoredAsset } from "./assetRepository.ts";
import { requestAudioGeneration } from "./audioGeneration.ts";
import { assertMediaDownloadUrl, readMediaResponse } from "./mediaResponse.ts";

export interface MediaExecutionOptions {
  task: CreationTask;
  connection: ProviderConnection;
  outputs: CreationTaskOutput[];
  signal: AbortSignal;
  queryOnly?: boolean;
  assertCurrent: () => void;
  persist: () => Promise<void>;
  archive: (
    blob: Blob,
    output: CreationTaskOutput,
    providerJobId?: string,
  ) => Promise<void>;
  onStart?: () => void;
  fetch?: typeof fetch;
  resolveCredential?: typeof loadApiKey;
  pollDelayMs?: number;
}

/** Existing durable task/output slots own acceptance; recovery never invokes submit. */
export async function executeMediaOutputs(
  options: MediaExecutionOptions,
): Promise<void> {
  const { task, outputs, signal, assertCurrent, persist, connection } = options;
  validateMediaTaskInput({ ...task, outputCount: task.requestedOutputs });
  const credential = options.resolveCredential ?? loadApiKey;
  const fetcher = options.fetch ?? fetch;
  const check = () => {
    signal.throwIfAborted();
    assertCurrent();
  };
  for (const output of outputs) {
    if (output.status === "succeeded") continue;
    if (options.queryOnly && output.mediaReceipt?.acceptance === "rejected")
      continue;
    let requestStarted = false;
    try {
      check();
      output.status = "running";
      const guardedFetch: typeof fetch = async (url, init) => {
        check();
        if (init?.method === "POST") {
          requestStarted = true;
          options.onStart?.();
        }
        return fetcher(url, init);
      };
      if (task.kind === "audio" && task.media?.kind === "audio") {
        if (options.queryOnly)
          throw new Error("语音接口没有可查询的任务 ID，不能重复提交。");
        const key = await credential(
          task.providerBaseUrl!,
          task.providerCredentialRef,
        );
        check();
        if (!key) throw new Error("原绑定连接缺少密钥，请前往模型设置。");
        const blob = await requestAudioGeneration(
          {
            baseUrl: task.providerBaseUrl!,
            apiKey: key,
            model: task.model,
            voice: task.media.voice,
            format: task.media.format,
            speed: String(task.media.speed),
          },
          task.prompt,
          { signal, strictMedia: true, fetch: guardedFetch },
        );
        check();
        await options.archive(blob, output);
        check();
        output.status = "succeeded";
      } else if (task.kind === "video" && task.media?.kind === "video") {
        const key = `${task.idempotencyKey}-output-${output.index}`;
        const saveReceipt = async (receipt: TwelveAiSubmissionReceipt) => {
          // Acceptance must survive source deletion/cancel so it can never be resubmitted blindly.
          output.mediaReceipt = parseTwelveAiSubmissionReceipt(
            receipt,
            connection.id,
            key,
          );
          await persist();
        };
        const adapter = new TwelveAiTaskAdapter(connection, {
          fetch: guardedFetch,
          resolveCredential: async (base, ref) => {
            const key = await credential(base, ref);
            check();
            return key;
          },
          submissionReceipts: output.mediaReceipt
            ? [
                parseTwelveAiSubmissionReceipt(
                  output.mediaReceipt,
                  connection.id,
                  key,
                ),
              ]
            : [],
          submissionPersistence: {
            connectionId: connection.id,
            claimSubmission: async (receipt) => {
              check();
              if (output.mediaReceipt)
                return {
                  created: false as const,
                  receipt: output.mediaReceipt,
                };
              await saveReceipt(receipt);
              check();
              return { created: true as const };
            },
            persistSubmissionReceipt: saveReceipt,
          },
        });
        let jobId =
          output.mediaReceipt?.acceptance === "accepted"
            ? output.mediaReceipt.providerJobId
            : undefined;
        if (!jobId) {
          if (output.mediaReceipt || options.queryOnly)
            throw new TwelveAiTaskError("submission_unknown", {
              uncertain: true,
            });
          const attachments = [];
          for (const attachment of task.attachments) {
            const asset = attachment.assetId
              ? await loadStoredAsset(attachment.assetId)
              : null;
            check();
            if (!asset || asset.mime !== attachment.mime)
              throw new Error("参考原件缺失或 MIME 已变化，未提交视频。");
            attachments.push({ ...attachment, dataUrl: asset.preview });
          }
          const ordinary = attachments
            .filter((a) => !a.referenceFrame)
            .map((a) => a.dataUrl);
          const submitted = await adapter.submit({
            prompt: task.prompt,
            model: task.model,
            attachments: [],
            requestedOutputs: 1,
            idempotencyKey: key,
            signal,
            media: {
              ...task.media,
              ...(ordinary.length ? { imageReferences: ordinary } : {}),
              ...(attachments.some((a) => a.referenceFrame)
                ? {
                    startFrame: attachments.find(
                      (a) => a.referenceFrame === "first",
                    )!.dataUrl,
                    endFrame: attachments.find(
                      (a) => a.referenceFrame === "last",
                    )!.dataUrl,
                  }
                : {}),
            },
          });
          jobId = submitted.providerJobId;
        }
        check();
        let state = await adapter.getTask(jobId!, signal);
        const deadline = Date.now() + 20 * 60 * 1000;
        while (!state.terminal) {
          if (Date.now() > deadline)
            throw new Error("视频查询超时，已保存原回执，可稍后继续查询。");
          await waitForMediaPoll(signal, options.pollDelayMs ?? 1500);
          check();
          state = await adapter.getTask(jobId!, signal);
        }
        check();
        if (!state.outputs.length) {
          output.status = "failed";
          output.error = "视频供应商返回任务失败，未产生可归档结果。";
        } else {
          if (state.outputs.length !== 1)
            throw new Error("视频输出数量与单份受理回执不符，请核对供应商。");
          const url = state.outputs[0].url!;
          assertMediaDownloadUrl(url);
          const response = await fetcher(url, {
            credentials: "omit",
            redirect: "error",
            signal,
          });
          const blob = await readMediaResponse(response, "video", signal);
          check();
          await options.archive(blob, output, jobId);
          check();
          output.status = state.partial ? "unknown" : "succeeded";
          output.error = state.partial
            ? "供应商返回部分结果，原件已归档，请核对原任务；不会自动重发。"
            : undefined;
        }
      } else throw new Error("任务媒体类型与参数不匹配。");
    } catch (error) {
      const uncertain =
        output.mediaReceipt?.acceptance === "accepted" ||
        output.mediaReceipt?.acceptance === "unknown" ||
        (error instanceof TwelveAiTaskError
          ? error.uncertain
          : error instanceof GenerationProviderError
            ? error.status === 408 ||
              error.status >= 500 ||
              error.failureClass === "network"
            : requestStarted);
      output.status = uncertain
        ? "unknown"
        : signal.aborted
          ? "cancelled"
          : "failed";
      output.error = uncertain
        ? "供应商受理状态不明，已保存回执；请核对原任务，当前不会重复提交。"
        : error instanceof TwelveAiTaskError
          ? "媒体连接或请求失败，请检查模型设置。"
          : error instanceof Error
            ? error.message
            : "媒体任务失败。";
    }
    await persist();
  }
}

function waitForMediaPoll(
  signal: AbortSignal,
  milliseconds: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("已停止等待视频结果", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", abort, { once: true });
  });
}
