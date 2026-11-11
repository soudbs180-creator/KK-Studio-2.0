import {
  capabilityManifestSchema,
  capabilityVersionMatches,
  compareCapabilityVersions,
  CREATION_CONTRACTS_VERSION,
  type BusinessCapabilityManifest,
  type CapabilityPermission,
  type CreationTask,
  type TaskPort,
} from "../../../packages/creation-contracts/index.ts";

type Adapter = BusinessCapabilityManifest["adapters"][number];
export interface CapabilityConstraints {
  platform: "desktop" | "web" | "mobile";
  modelTraits: readonly string[];
  resources: readonly string[];
  availableAdapters?: readonly string[];
  versionRange?: string;
}
export interface CapabilityFallbackEvent {
  from: string;
  to: string;
  reason: string;
}
export interface CapabilityExecutionContext extends CapabilityConstraints {
  permissions: readonly CapabilityPermission[];
  tasks: Pick<TaskPort, "submit">;
  preparedTask?: CreationTask;
  projectId?: string;
  onFallback?: (event: CapabilityFallbackEvent) => void;
  onDispatch?: (event: {
    id: string;
    version: string;
    adapterId: string;
  }) => void;
}
export interface CapabilityParser {
  parse(value: unknown): unknown;
}
export type CapabilityExecutor = (
  input: unknown,
  context: CapabilityExecutionContext,
  adapter: Adapter,
) => Promise<unknown>;
interface Registration {
  manifest: BusinessCapabilityManifest;
  execute: CapabilityExecutor;
}
export interface CapabilityResolution {
  manifest: BusinessCapabilityManifest;
  adapter: Adapter;
  permissions: CapabilityPermission[];
  fallbacks: CapabilityFallbackEvent[];
}
export class CapabilityRegistryError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "CapabilityRegistryError";
    this.code = code;
  }
}
const key = (manifest: BusinessCapabilityManifest) =>
  `${manifest.id}@${manifest.version}`;
function fail(code: string, message: string): never {
  throw new CapabilityRegistryError(code, message);
}

/** Declarations and executors only: the host retains every task, asset and provider state. */
export class CapabilityRegistry {
  private readonly entries = new Map<string, Registration>();
  private readonly schemas: ReadonlyMap<string, CapabilityParser>;
  constructor(schemas: ReadonlyMap<string, CapabilityParser>) {
    this.schemas = new Map(schemas);
  }

  register(input: unknown, execute: CapabilityExecutor): void {
    const parsed = capabilityManifestSchema.safeParse(input);
    if (!parsed.success) fail("invalid_manifest", "能力声明无效，未注册。");
    const manifest = parsed.data;
    if (!this.schemas.has(manifest.input) || !this.schemas.has(manifest.output))
      fail("missing_schema", "能力输入或输出schema引用不可用。");
    if (this.entries.has(key(manifest)))
      fail("duplicate_capability", "能力身份重复，未覆盖原注册。");
    const candidate = [...this.entries.values(), { manifest, execute }];
    this.assertAcyclic(candidate);
    this.entries.set(key(manifest), { manifest, execute });
  }
  unregister(id: string, version?: string): boolean {
    const removing = [...this.entries].filter(
      ([, entry]) =>
        entry.manifest.id === id &&
        (version === undefined || entry.manifest.version === version),
    );
    if (!removing.length) return false;
    const retained = [...this.entries.values()].filter(
      (entry) =>
        entry.manifest.id !== id ||
        (version !== undefined && entry.manifest.version !== version),
    );
    if (
      !retained.some((entry) => entry.manifest.id === id) &&
      retained.some((entry) => entry.manifest.uses.includes(id))
    )
      fail("dependency_in_use", "能力仍被依赖，未移除。");
    for (const [entryKey] of removing) this.entries.delete(entryKey);
    return true;
  }
  list(): BusinessCapabilityManifest[] {
    return structuredClone(
      [...this.entries.values()].map((entry) => entry.manifest),
    );
  }
  resolve(
    id: string,
    constraints: CapabilityConstraints,
  ): CapabilityResolution {
    return this.resolveEntry(id, constraints, new Set(), new Map());
  }
  async run(
    id: string,
    input: unknown,
    context: CapabilityExecutionContext,
  ): Promise<string> {
    const resolution = this.resolve(id, context);
    if (
      resolution.permissions.some(
        (permission) => !context.permissions.includes(permission),
      )
    )
      fail("permission_denied", "能力权限不足，未提交任务。");
    if (resolution.fallbacks.length && !context.onFallback)
      fail("fallback_event_required", "能力回退必须记录事件，未提交任务。");
    const registration = this.entries.get(key(resolution.manifest))!;
    const decoded = this.parse(resolution.manifest.input, input, "输入");
    for (const event of resolution.fallbacks) context.onFallback!(event);
    context.onDispatch?.({
      id: resolution.manifest.id,
      version: resolution.manifest.version,
      adapterId: resolution.adapter.id,
    });
    // Do not retry here: an executor failure can follow a paid provider acceptance.
    const output = await registration.execute(
      decoded,
      context,
      resolution.adapter,
    );
    const taskId = this.parse(resolution.manifest.output, output, "输出");
    if (typeof taskId !== "string" || !taskId)
      fail("invalid_output", "能力输出不是任务ID。");
    return taskId;
  }
  private parse(schema: string, value: unknown, label: string): unknown {
    try {
      return this.schemas.get(schema)!.parse(value);
    } catch {
      return fail("invalid_payload", `能力${label}无效。`);
    }
  }
  private resolveEntry(
    id: string,
    constraints: CapabilityConstraints,
    visiting: Set<string>,
    memo: Map<string, CapabilityResolution>,
  ): CapabilityResolution {
    const manifest = [...this.entries.values()]
      .map((entry) => entry.manifest)
      .filter(
        (entry) =>
          entry.id === id &&
          capabilityVersionMatches(
            entry.version,
            constraints.versionRange ?? "*",
          ),
      )
      .sort((a, b) => compareCapabilityVersions(b.version, a.version))[0];
    if (!manifest)
      return fail("capability_unavailable", "能力不可用或版本不兼容。");
    const identity = key(manifest);
    if (visiting.has(identity))
      return fail("dependency_cycle", "能力依赖或回退存在环。");
    if (memo.has(identity)) return structuredClone(memo.get(identity)!);
    if (!manifest.enabled)
      return fail("capability_disabled", "能力已禁用，不可用。");
    visiting.add(identity);
    try {
      const adapter = [...manifest.adapters]
        .filter(
          (item) =>
            capabilityVersionMatches(CREATION_CONTRACTS_VERSION, item.compat) &&
            (!constraints.availableAdapters ||
              constraints.availableAdapters.includes(item.id)),
        )
        .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0];
      const available =
        manifest.platforms.includes(constraints.platform) &&
        manifest.requires.modelTraits.every((trait) =>
          constraints.modelTraits.includes(trait),
        ) &&
        manifest.requires.resources.every((resource) =>
          constraints.resources.includes(resource),
        );
      if (!available || !adapter)
        return this.resolveFallback(manifest, constraints, visiting, memo);
      const dependencies = manifest.uses.map((dependency) => {
        try {
          return this.resolveEntry(
            dependency,
            { ...constraints, versionRange: undefined },
            visiting,
            memo,
          );
        } catch {
          return fail("missing_dependency", "能力依赖不可用，未提交任务。");
        }
      });
      const result = {
        manifest: structuredClone(manifest),
        adapter: structuredClone(adapter),
        permissions: [
          ...new Set([
            ...manifest.requires.permissions,
            ...dependencies.flatMap((item) => item.permissions),
          ]),
        ],
        fallbacks: dependencies.flatMap((item) => item.fallbacks),
      };
      memo.set(identity, result);
      return structuredClone(result);
    } finally {
      visiting.delete(identity);
    }
  }
  private resolveFallback(
    manifest: BusinessCapabilityManifest,
    constraints: CapabilityConstraints,
    visiting: Set<string>,
    memo: Map<string, CapabilityResolution>,
  ): CapabilityResolution {
    if (!manifest.fallback)
      return fail("capability_unavailable", `能力不可用：${manifest.degrade}`);
    const [id, versionRange] = manifest.fallback.split("@");
    const resolved = this.resolveEntry(
      id,
      { ...constraints, versionRange },
      visiting,
      memo,
    );
    return {
      ...resolved,
      permissions: [
        ...new Set([...manifest.requires.permissions, ...resolved.permissions]),
      ],
      fallbacks: [
        {
          from: key(manifest),
          to: key(resolved.manifest),
          reason: "平台、资源或适配器不可用",
        },
        ...resolved.fallbacks,
      ],
    };
  }
  private assertAcyclic(entries: Registration[]): void {
    const edges = new Map<string, Set<string>>();
    for (const { manifest } of entries) {
      if (!edges.has(manifest.id)) edges.set(manifest.id, new Set());
      for (const dependency of manifest.uses)
        edges.get(manifest.id)!.add(dependency);
    }
    const active = new Set<string>(),
      done = new Set<string>();
    const visit = (id: string): void => {
      if (active.has(id)) fail("dependency_cycle", "能力依赖存在环，未注册。");
      if (done.has(id)) return;
      active.add(id);
      for (const dependency of edges.get(id) ?? [])
        if (edges.has(dependency)) visit(dependency);
      active.delete(id);
      done.add(id);
    };
    for (const id of edges.keys()) visit(id);
  }
}
