import type {
  MobileProposalInput,
  MobileCanvasProposal,
  MobileCanvasOperation,
  MobileProject,
  MobileSnapshot,
} from "../core/mobileModel.ts";
import type { LocalRepositoryBridge } from "./localBridge.ts";
import { validateProposalInput } from "./localSchema.ts";
import {
  applyCanvasOperations,
  validateCanvasOperations,
} from "./canvasOperations.ts";
import { invariant } from "./schemaPrimitives.ts";
import { referencedAssetIds } from "./validation.ts";

export function localProject(
  s: MobileSnapshot,
  projectId: string,
  revision?: number,
): MobileProject {
  const p = s.projects.find((p) => p.id === projectId);
  invariant(p, "Project missing");
  if (revision !== undefined)
    invariant(p.revision === revision, "Project revision conflict");
  return p;
}
export class MobileProposalRepository {
  private readonly bridge: LocalRepositoryBridge;
  constructor(bridge: LocalRepositoryBridge) {
    this.bridge = bridge;
  }
  private touch(p: MobileProject): void {
    p.revision++;
    p.updatedAt = this.bridge.now();
  }
  private pending(
    p: MobileProject,
    proposalId: string,
    revision?: number,
  ): MobileCanvasProposal {
    const proposal = p.canvasProposals?.find((q) => q.id === proposalId);
    invariant(proposal, "Proposal missing");
    invariant(proposal.status === "pending", "Proposal must be pending");
    if (revision !== undefined)
      invariant(proposal.revision === revision, "Proposal revision conflict");
    return proposal;
  }
  async stage(
    projectId: string,
    input: MobileProposalInput,
    projectRevision: number,
  ): Promise<MobileSnapshot> {
    validateProposalInput(input);
    const captured: MobileProposalInput = JSON.parse(JSON.stringify(input));
    return this.bridge.mutate((s) => {
      const p = localProject(s, projectId, projectRevision),
        now = this.bridge.now();
      (p.canvasProposals ??= []).push({
        ...captured,
        id: this.bridge.id(),
        revision: 0,
        baseProjectRevision: p.revision + 1,
        createdAt: now,
        updatedAt: now,
        status: "pending",
      });
      this.touch(p);
    });
  }
  async update(
    projectId: string,
    proposalId: string,
    input: MobileProposalInput,
    proposalRevision: number,
    projectRevision: number,
  ): Promise<MobileSnapshot> {
    validateProposalInput(input);
    const captured: MobileProposalInput = JSON.parse(JSON.stringify(input));
    return this.bridge.mutate((s) => {
      const p = localProject(s, projectId, projectRevision),
        previous = this.pending(p, proposalId, proposalRevision);
      const next: MobileCanvasProposal = {
        ...captured,
        id: previous.id,
        createdAt: previous.createdAt,
        revision: previous.revision + 1,
        updatedAt: this.bridge.now(),
        baseProjectRevision: p.revision + 1,
        status: "pending",
      };
      p.canvasProposals = p.canvasProposals!.map((q) =>
        q.id === proposalId ? next : q,
      );
      this.touch(p);
    });
  }
  preview(
    projectId: string,
    proposalId: string,
  ): {
    proposal: MobileCanvasProposal;
    canvas: MobileProject["canvas"];
    draft?: MobileProject["composerDraft"];
    stale: boolean;
  } {
    const s = this.bridge.snapshot(),
      p = localProject(s, projectId),
      q = p.canvasProposals?.find((q) => q.id === proposalId);
    invariant(q, "Proposal missing");
    const stale =
      q.status !== "pending" ||
      q.requiresRefresh === true ||
      q.baseProjectRevision !== p.revision;
    if (!stale) {
      if (q.kind === "canvas")
        p.canvas = applyCanvasOperations(p.canvas, q.operations);
      else p.composerDraft = q.draft;
      // Validate the simulated next revision, so a pending operation is not applied twice.
      p.revision++;
      this.bridge.check(s);
    }
    return {
      proposal: q,
      canvas: p.canvas,
      ...(q.kind === "generation" ? { draft: q.draft } : {}),
      stale,
    };
  }
  private async verify(p: MobileProject): Promise<void> {
    for (const assetId of referencedAssetIds(p))
      await this.bridge.readOriginal(assetId);
  }
  approve(
    projectId: string,
    proposalId: string,
    proposalRevision: number,
    projectRevision: number,
  ): Promise<MobileSnapshot> {
    return this.bridge.mutate(async (s) => {
      const p = localProject(s, projectId, projectRevision),
        q = this.pending(p, proposalId, proposalRevision);
      invariant(
        q.requiresRefresh !== true && q.baseProjectRevision === p.revision,
        "Proposal is stale; explicit refresh required",
      );
      if (q.kind === "canvas")
        p.canvas = applyCanvasOperations(p.canvas, q.operations);
      else
        p.composerDraft = {
          ...q.draft,
          updatedAt: Math.max(
            this.bridge.now(),
            p.composerDraft.updatedAt + 1,
            q.draft.updatedAt,
          ),
        };
      await this.verify(p);
      q.status = "approved";
      q.revision++;
      q.updatedAt = this.bridge.now();
      this.touch(p);
    });
  }
  finish(
    projectId: string,
    proposalId: string,
    status: "rejected" | "withdrawn",
    proposalRevision: number,
    projectRevision: number,
  ): Promise<MobileSnapshot> {
    return this.bridge.mutate((s) => {
      const p = localProject(s, projectId, projectRevision),
        q = this.pending(p, proposalId, proposalRevision);
      q.status = status;
      q.revision++;
      q.updatedAt = this.bridge.now();
      this.touch(p);
    });
  }
  async apply(
    projectId: string,
    operations: MobileCanvasOperation[],
    projectRevision: number,
  ): Promise<MobileSnapshot> {
    validateCanvasOperations(operations);
    const captured: MobileCanvasOperation[] = JSON.parse(
      JSON.stringify(operations),
    );
    return this.bridge.mutate(async (s) => {
      const p = localProject(s, projectId, projectRevision);
      p.canvas = applyCanvasOperations(p.canvas, captured);
      await this.verify(p);
      this.touch(p);
    });
  }
}
