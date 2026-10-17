import type {
  MobileLibraryInput,
  MobileProposalInput,
  MobileCanvasOperation,
  MobileSnapshot,
} from "../core/mobileModel.ts";
import type { LocalRepositoryBridge } from "./localBridge.ts";
import { MAX_MOBILE_TEXT_RESULT_CHARS } from "../core/resultLimits.ts";
import { MobileLibraryRepository } from "./libraryRepository.ts";
import {
  MobileProposalRepository,
  localProject,
} from "./proposalRepository.ts";
import {
  invariant,
  object,
  keys,
  text,
  integer,
  id,
} from "./schemaPrimitives.ts";

/** Account-scoped local features; its private bridge cannot publish arbitrary caller snapshots. */
export class MobileLocalRepository {
  private readonly library: MobileLibraryRepository;
  private readonly proposals: MobileProposalRepository;
  private readonly bridge: LocalRepositoryBridge;
  constructor(bridge: LocalRepositoryBridge) {
    this.bridge = bridge;
    this.library = new MobileLibraryRepository(bridge);
    this.proposals = new MobileProposalRepository(bridge);
  }
  createLibrary(input: MobileLibraryInput) {
    return this.library.create(input);
  }
  updateLibrary(id: string, input: MobileLibraryInput, revision: number) {
    return this.library.update(id, input, revision);
  }
  deleteLibrary(id: string, revision: number) {
    return this.library.delete(id, revision);
  }
  exportLibrary(ids?: string[]) {
    return this.library.export(ids);
  }
  preflightLibraryImport(payload: string) {
    return this.library.preflight(payload);
  }
  importLibrary(payload: string) {
    return this.library.import(payload);
  }
  async setProjectMetadata(
    projectId: string,
    input: { group?: string; pinned?: boolean },
    revision: number,
  ): Promise<MobileSnapshot> {
    object(input);
    keys(input, ["group", "pinned"]);
    if (input.group !== undefined) text(input.group, 80);
    invariant(
      input.pinned === undefined || typeof input.pinned === "boolean",
      "Invalid project pin",
    );
    const captured = { ...input };
    return this.bridge.mutate((s) => {
      const p = localProject(s, projectId, revision);
      if ("group" in captured) {
        if (captured.group?.trim()) p.group = captured.group.trim();
        else delete p.group;
      }
      if (captured.pinned !== undefined) p.pinned = captured.pinned;
      p.revision++;
      p.updatedAt = this.bridge.now();
    });
  }
  async setAssetFavorite(
    assetId: string,
    favorite: boolean,
  ): Promise<MobileSnapshot> {
    invariant(typeof favorite === "boolean", "Invalid material favorite");
    return this.bridge.mutate((s) => {
      const a = s.assets.find((a) => a.id === assetId);
      invariant(a && !a.deleting, "Material missing or deletion pending");
      a.favorite = favorite;
    });
  }
  async editMessage(
    projectId: string,
    messageId: string,
    content: string,
    revision: number,
  ): Promise<MobileSnapshot> {
    text(content, MAX_MOBILE_TEXT_RESULT_CHARS);
    invariant(content.trim().length > 0, "Edited message text required");
    return this.bridge.mutate((s) => {
      const p = localProject(s, projectId, revision),
        source = p.messages.find((m) => m.id === messageId);
      invariant(
        source && source.deletedAt === undefined,
        "Source message missing or deleted",
      );
      const createdAt = Math.max(this.bridge.now(), source.createdAt);
      p.messages.push({
        ...source,
        id: this.bridge.id(),
        text: content,
        createdAt,
        editedFromId: source.id,
      });
      p.revision++;
      p.updatedAt = Math.max(p.updatedAt, createdAt);
    });
  }
  async deleteMessage(
    projectId: string,
    messageId: string,
    revision: number,
  ): Promise<MobileSnapshot> {
    return this.bridge.mutate((s) => {
      const p = localProject(s, projectId, revision),
        source = p.messages.find((m) => m.id === messageId);
      invariant(source, "Message missing");
      source.deletedAt = this.bridge.now();
      p.revision++;
      p.updatedAt = this.bridge.now();
    });
  }
  async forkProject(projectId: string, revision: number) {
    id(projectId);
    integer(revision);
    return this.bridge.fork(projectId, revision);
  }
  stageProposal(
    projectId: string,
    input: MobileProposalInput,
    projectRevision: number,
  ) {
    return this.proposals.stage(projectId, input, projectRevision);
  }
  updateProposal(
    projectId: string,
    proposalId: string,
    input: MobileProposalInput,
    proposalRevision: number,
    projectRevision: number,
  ) {
    return this.proposals.update(
      projectId,
      proposalId,
      input,
      proposalRevision,
      projectRevision,
    );
  }
  previewProposal(projectId: string, proposalId: string) {
    return this.proposals.preview(projectId, proposalId);
  }
  approveProposal(
    projectId: string,
    proposalId: string,
    proposalRevision: number,
    projectRevision: number,
  ) {
    return this.proposals.approve(
      projectId,
      proposalId,
      proposalRevision,
      projectRevision,
    );
  }
  rejectProposal(
    projectId: string,
    proposalId: string,
    proposalRevision: number,
    projectRevision: number,
  ) {
    return this.proposals.finish(
      projectId,
      proposalId,
      "rejected",
      proposalRevision,
      projectRevision,
    );
  }
  withdrawProposal(
    projectId: string,
    proposalId: string,
    proposalRevision: number,
    projectRevision: number,
  ) {
    return this.proposals.finish(
      projectId,
      proposalId,
      "withdrawn",
      proposalRevision,
      projectRevision,
    );
  }
  applyCanvasOperations(
    projectId: string,
    operations: MobileCanvasOperation[],
    projectRevision: number,
  ) {
    return this.proposals.apply(projectId, operations, projectRevision);
  }
}
