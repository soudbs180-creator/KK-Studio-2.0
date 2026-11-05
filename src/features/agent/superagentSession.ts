import {
  SuperagentEngine,
  type EngineSnapshot,
  type Report,
  type Trigger,
} from "../../domain/superagent/engine.ts";
import { BROWSER_STORAGE_KEYS } from "../../runtime/storage-contract.ts";

const engines = new Map<string, SuperagentEngine>();
const listeners = new Set<() => void>();
let epoch = 0;

function browserStorage(): Storage | undefined {
  try {
    if (typeof localStorage === "undefined") return undefined;
    return localStorage;
  } catch {
    return undefined;
  }
}

function readStore(): Record<string, EngineSnapshot> {
  const storage = browserStorage();
  if (!storage) return {};
  try {
    const parsed = JSON.parse(
      storage.getItem(BROWSER_STORAGE_KEYS.superagent) ?? "{}",
    ) as Record<string, EngineSnapshot>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function projectEngine(projectId: string): SuperagentEngine {
  let engine = engines.get(projectId);
  if (!engine) {
    engine = new SuperagentEngine();
    const saved = readStore()[projectId];
    if (saved?.policy && Array.isArray(saved.tickets)) engine.restore(saved);
    engines.set(projectId, engine);
  }
  return engine;
}

export function commitEngine(projectId: string): void {
  const engine = engines.get(projectId);
  const storage = browserStorage();
  if (!engine || !storage) {
    epoch += 1;
    for (const listener of listeners) listener();
    return;
  }
  const all = readStore();
  all[projectId] = engine.snapshot();
  try {
    storage.setItem(BROWSER_STORAGE_KEYS.superagent, JSON.stringify(all));
  } catch (error) {
    void error;
  }
  epoch += 1;
  for (const listener of listeners) listener();
}

export function subscribeEngine(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function engineEpoch(): number {
  return epoch;
}

export function openWorkTicket(
  projectId: string,
  trigger: Trigger,
): string | undefined {
  const engine = projectEngine(projectId);
  const disposition = engine.intake({
    ...trigger,
    explicit: trigger.explicit !== false,
  });
  if (disposition.decision === "stop") throw new Error("已按停止指令结束工单");
  if (disposition.decision === "unavailable") throw new Error("执行槽位已满");
  if (disposition.decision !== "accept" || !disposition.ticketId)
    throw new Error(
      disposition.observed
        ? "观察模式只记录 would accept，未派单"
        : "工单未准入",
    );
  const ticket = engine
    .tickets()
    .find((item) => item.id === disposition.ticketId);
  if (ticket && !ticket.assignment && !ticket.ended) {
    const assignment = engine.assign(ticket.id);
    if (!assignment) throw new Error("已保留 1 个人类追问槽位");
  }
  engine.drain();
  commitEngine(projectId);
  return disposition.ticketId;
}

export function closeWorkTicket(
  projectId: string,
  ticketId: string | undefined,
  status: Extract<Report["status"], "ready" | "failed">,
): void {
  if (!ticketId) return;
  const engine = projectEngine(projectId);
  const ticket = engine.tickets().find((item) => item.id === ticketId);
  if (!ticket || ticket.ended) return;
  engine.report(ticketId, status);
  engine.drain();
  commitEngine(projectId);
}
