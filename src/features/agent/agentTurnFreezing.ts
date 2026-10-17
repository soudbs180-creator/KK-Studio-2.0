/**
 * src/features/agent/agentTurnFreezing.ts
 *
 * Turn Freezing & Step Completion Controller for KK Studio.
 * Manages 6-state action button lifecycle, atomic step completion, queue suspension,
 * and resumption without canceling background task polling or discarding drafts.
 */

export type AgentActionState =
  "idle" | "executing" | "pausing" | "paused" | "resuming" | "completed";

export interface TurnFreezingSnapshot {
  readonly state: AgentActionState;
  readonly isPaused: boolean;
  readonly isPausing: boolean;
  readonly isExecuting: boolean;
  readonly isResuming: boolean;
  readonly activeStepCount: number;
  readonly pauseRequestedAt: number | null;
  readonly pausedAt: number | null;
  readonly resumedAt: number | null;
}

export interface TurnFreezingOptions {
  /** Delay in milliseconds before auto-resetting from "completed" to "idle" (default: 800) */
  completedResetDelayMs?: number;
}

export interface TurnFreezingController {
  getState(): TurnFreezingSnapshot;
  subscribe(listener: () => void): () => void;

  /** Called when a new turn starts (e.g. sendMessage accepted) */
  onTurnStart(): void;

  /** Called when the active turn completes or fails */
  onTurnComplete(status: "completed" | "failed" | "interrupted"): void;

  /**
   * Registers entry into an atomic execution step.
   * Returns a completion callback that MUST be called when the step concludes.
   */
  beginStep(stepId?: string): () => void;

  /**
   * Blocks if the controller is currently pausing or paused until unfreeze/resumed.
   */
  awaitUnfrozen(): Promise<void>;

  /**
   * Requests turn pause:
   * - Transitions to "pausing"
   * - Allows active step to conclude naturally
   * - Transitions to "paused" and resolves when all in-flight steps settle
   */
  pause(): Promise<void>;

  /**
   * Resumes a paused turn:
   * - Transitions to "resuming"
   * - Unblocks all awaitUnfrozen waiters
   * - Transitions to "executing"
   */
  resume(): Promise<void>;

  /** Query helpers */
  isFrozen(): boolean;
  isPaused(): boolean;
  isPausing(): boolean;
  isExecuting(): boolean;
  isPauseRequested(): boolean;
  canPause(): boolean;
  canResume(): boolean;

  /** Aliases for convenience */
  pauseTurn(): Promise<void>;
  resumeTurn(): Promise<void>;

  /** Resets state to idle and unblocks any waiting promises (e.g. on disconnect) */
  reset(): void;
}

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function createDeferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export function createTurnFreezingController(
  options: TurnFreezingOptions = {},
): TurnFreezingController {
  const completedDelay = options.completedResetDelayMs ?? 800;

  let state: AgentActionState = "idle";
  const activeSteps = new Set<string>();
  let stepCounter = 0;

  let pauseDeferred: Deferred | null = null;
  let resumeDeferred: Deferred | null = null;

  let pauseRequestedAt: number | null = null;
  let pausedAt: number | null = null;
  let resumedAt: number | null = null;

  let completedTimer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  function notify() {
    listeners.forEach((fn) => fn());
  }

  function clearTimer() {
    if (completedTimer) {
      clearTimeout(completedTimer);
      completedTimer = null;
    }
  }

  function getState(): TurnFreezingSnapshot {
    return {
      state,
      isPaused: state === "paused",
      isPausing: state === "pausing",
      isExecuting: state === "executing",
      isResuming: state === "resuming",
      activeStepCount: activeSteps.size,
      pauseRequestedAt,
      pausedAt,
      resumedAt,
    };
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function onTurnStart() {
    clearTimer();
    pauseDeferred = null;
    if (resumeDeferred) {
      resumeDeferred.resolve();
      resumeDeferred = null;
    }
    state = "executing";
    pauseRequestedAt = null;
    pausedAt = null;
    resumedAt = null;
    notify();
  }

  function onTurnComplete(status: "completed" | "failed" | "interrupted") {
    clearTimer();
    activeSteps.clear();
    if (pauseDeferred) {
      pauseDeferred.resolve();
      pauseDeferred = null;
    }
    if (resumeDeferred) {
      resumeDeferred.resolve();
      resumeDeferred = null;
    }

    if (status === "completed") {
      state = "completed";
      notify();
      completedTimer = setTimeout(() => {
        state = "idle";
        notify();
      }, completedDelay);
    } else {
      state = "idle";
      notify();
    }
  }

  function beginStep(stepId?: string): () => void {
    const id = stepId ?? `step-${++stepCounter}`;
    activeSteps.add(id);

    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      activeSteps.delete(id);

      // If pause was requested and this was the last active step, transition to paused
      if (state === "pausing" && activeSteps.size === 0) {
        state = "paused";
        pausedAt = Date.now();
        if (pauseDeferred) {
          pauseDeferred.resolve();
          pauseDeferred = null;
        }
        notify();
      }
    };
  }

  function awaitUnfrozen(): Promise<void> {
    if (state === "paused" || state === "pausing") {
      if (!resumeDeferred) {
        resumeDeferred = createDeferred();
      }
      return resumeDeferred.promise;
    }
    return Promise.resolve();
  }

  async function pause(): Promise<void> {
    if (state === "paused") {
      return Promise.resolve();
    }
    if (state === "pausing") {
      return pauseDeferred ? pauseDeferred.promise : Promise.resolve();
    }
    if (state !== "executing" && state !== "resuming") {
      return Promise.resolve();
    }

    state = "pausing";
    pauseRequestedAt = Date.now();

    // If no step is in-flight, transition immediately to paused
    if (activeSteps.size === 0) {
      state = "paused";
      pausedAt = Date.now();
      notify();
      return Promise.resolve();
    }

    // Otherwise, wait for the in-flight steps to call their completion callback
    pauseDeferred = createDeferred();
    notify();
    return pauseDeferred.promise;
  }

  async function resume(): Promise<void> {
    if (state !== "paused") {
      return Promise.resolve();
    }

    state = "resuming";
    resumedAt = Date.now();
    notify();

    // Unblock any waiters in the tool queue
    if (resumeDeferred) {
      const deferred = resumeDeferred;
      resumeDeferred = null;
      deferred.resolve();
    }

    state = "executing";
    notify();
    return Promise.resolve();
  }

  function isFrozen(): boolean {
    return state === "paused" || state === "pausing";
  }

  function isPaused(): boolean {
    return state === "paused";
  }

  function isPausing(): boolean {
    return state === "pausing";
  }

  function isExecuting(): boolean {
    return state === "executing";
  }

  function isPauseRequested(): boolean {
    return state === "pausing" || state === "paused";
  }

  function canPause(): boolean {
    return state === "executing";
  }

  function canResume(): boolean {
    return state === "paused";
  }

  function reset(): void {
    clearTimer();
    activeSteps.clear();
    if (pauseDeferred) {
      pauseDeferred.resolve();
      pauseDeferred = null;
    }
    if (resumeDeferred) {
      resumeDeferred.resolve();
      resumeDeferred = null;
    }
    state = "idle";
    pauseRequestedAt = null;
    pausedAt = null;
    resumedAt = null;
    notify();
  }

  return {
    getState,
    subscribe,
    onTurnStart,
    onTurnComplete,
    beginStep,
    awaitUnfrozen,
    pause,
    resume,
    isFrozen,
    isPaused,
    isPausing,
    isExecuting,
    isPauseRequested,
    canPause,
    canResume,
    pauseTurn: pause,
    resumeTurn: resume,
    reset,
  };
}
