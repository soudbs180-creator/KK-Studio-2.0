import { z } from "zod";

export const skillIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/, "Skill ID 格式无效");
const skillVersionSchema = z
  .string()
  .trim()
  .regex(
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
    "Skill 版本必须使用 semver 格式",
  );
export const skillPermissionSchema = z
  .string()
  .trim()
  .regex(
    /^(canvas|project|asset|conversation|network|filesystem):(read|list|inspect)$/,
    "Skill 只能声明只读权限",
  );
const SECRET_PATTERNS = [
  /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]/i,
  /sk-[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/,
  /(?:Bearer|Basic)\s+[A-Za-z0-9+/._-]{16,}/i,
];
function containsSecret(value: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}
const instructionsSchema = z
  .string()
  .trim()
  .min(1, "Skill 指令不能为空")
  .max(12_000, "Skill 指令不能超过 12000 字符")
  .refine((value) => !containsSecret(value), "Skill 指令疑似包含密钥或凭据");

export const skillManifestSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    id: skillIdSchema,
    name: z.string().trim().min(1).max(120),
    version: skillVersionSchema,
    description: z.string().trim().min(1).max(2_000),
    author: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(80),
    permissions: z.array(skillPermissionSchema).max(16).default([]),
    dependencies: z.array(skillIdSchema).max(16).default([]),
    source: z.enum(["bundled", "local", "catalog"]).default("local"),
    readOnly: z.literal(true).default(true),
  })
  .strict()
  .superRefine((manifest, context) => {
    if (new Set(manifest.permissions).size !== manifest.permissions.length)
      context.addIssue({
        code: "custom",
        path: ["permissions"],
        message: "Skill 权限不能重复",
      });
    if (new Set(manifest.dependencies).size !== manifest.dependencies.length)
      context.addIssue({
        code: "custom",
        path: ["dependencies"],
        message: "Skill 依赖不能重复",
      });
    if (manifest.dependencies.includes(manifest.id))
      context.addIssue({
        code: "custom",
        path: ["dependencies"],
        message: "Skill 不能依赖自身",
      });
  });
export type SkillManifest = z.infer<typeof skillManifestSchema>;
export type SkillManifestValidation = ReturnType<
  typeof skillManifestSchema.safeParse
>;

const importsSchema = z
  .array(skillIdSchema)
  .max(16)
  .default([])
  .superRefine((ids, context) => {
    if (new Set(ids).size !== ids.length)
      context.addIssue({ code: "custom", message: "Skill 导入不能重复" });
  });
export const skillRecordSchema = z
  .object({
    manifest: skillManifestSchema,
    instructions: instructionsSchema,
    imports: importsSchema,
    installed: z.boolean(),
    enabled: z.boolean(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();
export type SkillRecord = z.infer<typeof skillRecordSchema>;

export const SKILL_REGISTRY_STORAGE_KEY = "kk-studio-next:skills:v1";
export const SKILL_RECORDS_STORAGE_KEY = "kk-studio-next:skills:records:v2";
const persistedRegistrySchema = z
  .object({
    version: z.literal(2),
    records: z.array(skillRecordSchema).max(500),
  })
  .strict();
const legacyRegistrySchema = z
  .object({
    version: z.literal(1),
    installedIds: z.array(skillIdSchema).max(500),
  })
  .strict();
export interface SkillRegistryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
function browserStorage(): SkillRegistryStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "local-skill"
  );
}

function readPersisted(storage: SkillRegistryStorage | null): SkillRecord[] {
  if (!storage) return [];
  try {
    const recordsRaw = storage.getItem(SKILL_RECORDS_STORAGE_KEY);
    if (recordsRaw) {
      const recordsParsed = persistedRegistrySchema.safeParse(
        JSON.parse(recordsRaw) as unknown,
      );
      if (recordsParsed.success) return recordsParsed.data.records;
    }
    const raw = storage.getItem(SKILL_REGISTRY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const current = persistedRegistrySchema.safeParse(parsed);
    if (current.success) return current.data.records;
    const legacy = legacyRegistrySchema.safeParse(parsed);
    if (!legacy.success) return [];
    return legacy.data.installedIds.map((id) => ({
      manifest: {
        schemaVersion: 1,
        id,
        name: id,
        version: "0.0.0",
        description: "旧版本 Skill 记录，等待重新发现。",
        author: "本地",
        category: "本地",
        permissions: [],
        dependencies: [],
        source: "local" as const,
        readOnly: true as const,
      },
      instructions: "请重新导入该 Skill 的指令文本。",
      imports: [],
      installed: true,
      enabled: false,
      createdAt: 0,
      updatedAt: 0,
    }));
  } catch {
    return [];
  }
}
function writePersisted(
  storage: SkillRegistryStorage | null,
  records: readonly SkillRecord[],
): boolean {
  if (!storage) return false;
  const parsed = persistedRegistrySchema.safeParse({ version: 2, records });
  if (!parsed.success) return false;
  const installed = {
    version: 1,
    installedIds: records
      .filter((record) => record.installed)
      .map((record) => record.manifest.id),
  };
  let previousRecords: string | null = null;
  let previousInstalled: string | null = null;
  try {
    previousRecords = storage.getItem(SKILL_RECORDS_STORAGE_KEY);
    previousInstalled = storage.getItem(SKILL_REGISTRY_STORAGE_KEY);
    storage.setItem(SKILL_RECORDS_STORAGE_KEY, JSON.stringify(parsed.data));
    storage.setItem(SKILL_REGISTRY_STORAGE_KEY, JSON.stringify(installed));
    return true;
  } catch {
    try {
      if (previousRecords === null)
        storage.removeItem?.(SKILL_RECORDS_STORAGE_KEY);
      else storage.setItem(SKILL_RECORDS_STORAGE_KEY, previousRecords);
      if (previousInstalled === null)
        storage.removeItem?.(SKILL_REGISTRY_STORAGE_KEY);
      else storage.setItem(SKILL_REGISTRY_STORAGE_KEY, previousInstalled);
    } catch {
      // A storage backend may reject rollback as well; the in-memory registry
      // still remains unchanged because callers only commit after true.
    }
    return false;
  }
}
export function parseSkillManifest(value: unknown): SkillManifest {
  return skillManifestSchema.parse(value);
}
export function validateSkillManifest(value: unknown): SkillManifestValidation {
  return skillManifestSchema.safeParse(value);
}

export interface SkillImportInput {
  manifest: Omit<
    SkillManifest,
    "schemaVersion" | "source" | "readOnly" | "permissions" | "dependencies"
  > &
    Partial<
      Pick<
        SkillManifest,
        "schemaVersion" | "source" | "readOnly" | "permissions" | "dependencies"
      >
    >;
  instructions: string;
  imports?: string[];
}
function createRecord(input: SkillImportInput): SkillRecord {
  const manifest = skillManifestSchema.parse({
    ...input.manifest,
    schemaVersion: input.manifest.schemaVersion ?? 1,
    source: input.manifest.source ?? "local",
    readOnly: true,
    permissions: input.manifest.permissions ?? [],
    dependencies: input.manifest.dependencies ?? [],
  });
  const now = Date.now();
  return {
    manifest,
    instructions: instructionsSchema.parse(input.instructions),
    imports: importsSchema.parse(input.imports ?? []),
    installed: true,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}
function parseFrontmatter(text: string): {
  fields: Record<string, string>;
  body: string;
} {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error("SKILL.md 缺少合法 frontmatter");
  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator <= 0) throw new Error("SKILL.md frontmatter 格式无效");
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!/^(name|id|version|description|author|category|imports)$/.test(key))
      throw new Error("SKILL.md 包含不支持的字段：" + key);
    if (key in fields) throw new Error("SKILL.md frontmatter 字段重复：" + key);
    if (containsSecret(value)) throw new Error("SKILL.md 疑似包含密钥或凭据");
    fields[key] = value;
  }
  return { fields, body: match[2].trim() };
}
export function parseSkillImport(value: unknown): SkillRecord {
  if (typeof value === "string") {
    const parsed = parseFrontmatter(value);
    const name = parsed.fields.name?.trim();
    if (!name) throw new Error("SKILL.md 缺少 name");
    return createRecord({
      manifest: {
        id: parsed.fields.id || slugify(name),
        name,
        version: parsed.fields.version || "0.1.0",
        description: parsed.fields.description || "本地 Skill 指令模板",
        author: parsed.fields.author || "本地",
        category: parsed.fields.category || "本地",
      },
      instructions: parsed.body,
      imports: parsed.fields.imports
        ? parsed.fields.imports
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    });
  }
  if (!value || typeof value !== "object")
    throw new Error("Skill 导入格式无效");
  const candidate = value as Record<string, unknown>;
  const manifest = (
    "manifest" in candidate ? candidate.manifest : candidate
  ) as SkillImportInput["manifest"];
  if (typeof candidate.instructions !== "string")
    throw new Error("Skill 指令必须是文本");
  if ("imports" in candidate && !Array.isArray(candidate.imports))
    throw new Error("Skill imports 必须是数组");
  if (
    Array.isArray(candidate.imports) &&
    candidate.imports.some((item) => typeof item !== "string")
  )
    throw new Error("Skill imports 必须只包含 Skill ID");
  return createRecord({
    manifest: manifest,
    instructions: candidate.instructions,
    imports: Array.isArray(candidate.imports)
      ? candidate.imports.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  });
}
export function serializeSkill(
  record: SkillRecord,
  format: "json" | "markdown" = "json",
): string {
  if (format === "json") return JSON.stringify(record, null, 2);
  const manifest = record.manifest;
  return [
    "---",
    "id: " + manifest.id,
    "name: " + manifest.name,
    "version: " + manifest.version,
    "description: " + manifest.description,
    "author: " + manifest.author,
    "category: " + manifest.category,
    ...(record.imports.length ? ["imports: " + record.imports.join(", ")] : []),
    "---",
    "",
    record.instructions,
  ].join("\n");
}
export function applySkillInstructions(
  prompt: string,
  record: SkillRecord,
): string {
  const base = prompt.trim();
  const block = "[Skill: " + record.manifest.name + "]\n" + record.instructions;
  return base ? base + "\n\n" + block : block;
}
export function searchSkillRecords(
  records: readonly SkillRecord[],
  query: string,
  category = "全部",
): SkillRecord[] {
  const normalized = query.trim().toLowerCase();
  return records.filter((record) => {
    const categoryMatch =
      category === "全部" || record.manifest.category === category;
    const haystack = (
      record.manifest.name +
      " " +
      record.manifest.description +
      " " +
      record.instructions
    ).toLowerCase();
    return categoryMatch && (!normalized || haystack.includes(normalized));
  });
}

export class SkillRegistry {
  private readonly records = new Map<string, SkillRecord>();
  private readonly storage: SkillRegistryStorage | null;
  constructor(storage: SkillRegistryStorage | null = browserStorage()) {
    this.storage = storage;
    for (const record of readPersisted(storage))
      this.records.set(record.manifest.id, record);
  }
  private persist(next: Map<string, SkillRecord>): boolean {
    if (!writePersisted(this.storage, [...next.values()])) return false;
    this.records.clear();
    next.forEach((record, id) => this.records.set(id, record));
    return true;
  }
  registerManifest(value: unknown): SkillManifest {
    const manifest = parseSkillManifest(value);
    const current = this.records.get(manifest.id);
    if (current)
      this.records.set(manifest.id, {
        ...current,
        manifest,
        updatedAt: Date.now(),
      });
    else {
      const now = Date.now();
      this.records.set(manifest.id, {
        manifest,
        instructions: manifest.description,
        imports: [],
        installed: false,
        enabled: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    return manifest;
  }
  registerManifests(values: readonly unknown[]): SkillManifest[] {
    return values.map((value) => this.registerManifest(value));
  }
  unregisterManifest(id: string): boolean {
    const next = new Map(this.records);
    if (!next.delete(id)) return false;
    return this.persist(next);
  }
  getManifest(id: string): SkillManifest | undefined {
    return this.records.get(id)?.manifest;
  }
  listManifests(): SkillManifest[] {
    return [...this.records.values()].map((record) => record.manifest);
  }
  listRecords(): SkillRecord[] {
    return [...this.records.values()];
  }
  getInstalledIds(): string[] {
    return this.listRecords()
      .filter((record) => record.installed)
      .map((record) => record.manifest.id);
  }
  getInstalledManifests(): SkillManifest[] {
    return this.listRecords()
      .filter((record) => record.installed)
      .map((record) => record.manifest);
  }
  getRecord(id: string): SkillRecord | undefined {
    return this.records.get(id);
  }
  isInstalled(id: string): boolean {
    return this.records.get(id)?.installed === true;
  }
  isEnabled(id: string): boolean {
    return this.records.get(id)?.enabled === true;
  }
  importSkill(value: unknown): SkillRecord {
    const incoming = parseSkillImport(value);
    const current = this.records.get(incoming.manifest.id);
    const record = current
      ? { ...incoming, createdAt: current.createdAt, updatedAt: Date.now() }
      : incoming;
    const next = new Map(this.records);
    next.set(record.manifest.id, record);
    if (!this.persist(next)) throw new Error("Skill 保存失败，未覆盖原记录。");
    return record;
  }
  createSkill(input: SkillImportInput): SkillRecord {
    return this.importSkill(input);
  }
  updateSkill(
    id: string,
    patch: Partial<
      Pick<SkillRecord, "instructions" | "imports" | "enabled">
    > & { manifest?: Partial<SkillManifest> },
  ): SkillRecord {
    const current = this.records.get(id);
    if (!current) throw new Error("Skill 不存在。");
    const manifest = patch.manifest
      ? parseSkillManifest({ ...current.manifest, ...patch.manifest })
      : current.manifest;
    const record = skillRecordSchema.parse({
      ...current,
      manifest,
      instructions: patch.instructions ?? current.instructions,
      imports: patch.imports ?? current.imports,
      enabled: patch.enabled ?? current.enabled,
      updatedAt: Date.now(),
    });
    const next = new Map(this.records);
    next.set(id, record);
    if (!this.persist(next)) throw new Error("Skill 保存失败，未覆盖原记录。");
    return record;
  }
  install(id: string): boolean {
    const current = this.records.get(id);
    if (!current || current.installed) return Boolean(current);
    const next = new Map(this.records);
    next.set(id, {
      ...current,
      installed: true,
      enabled: true,
      updatedAt: Date.now(),
    });
    return this.persist(next);
  }
  uninstall(id: string): boolean {
    const current = this.records.get(id);
    if (!current?.installed) return false;
    const next = new Map(this.records);
    next.set(id, {
      ...current,
      installed: false,
      enabled: false,
      updatedAt: Date.now(),
    });
    return this.persist(next);
  }
  setEnabled(id: string, enabled: boolean): boolean {
    const current = this.records.get(id);
    if (!current?.installed) return false;
    const next = new Map(this.records);
    next.set(id, { ...current, enabled, updatedAt: Date.now() });
    return this.persist(next);
  }
}
export function createSkillRegistry(
  storage?: SkillRegistryStorage | null,
): SkillRegistry {
  return new SkillRegistry(storage);
}
