// Public contract entry for feature: skills
export {
  skillIdSchema,
  skillPermissionSchema,
  skillManifestSchema,
  skillRecordSchema,
  SKILL_REGISTRY_STORAGE_KEY,
  SKILL_RECORDS_STORAGE_KEY,
  SKILLS_CHANGED_EVENT,
  MAX_SKILL_PROMPT_LENGTH,
  parseSkillManifest,
  validateSkillManifest,
  parseSkillImport,
  serializeSkill,
  applySkillInstructions,
  searchSkillRecords,
  SkillRegistry,
  createSkillRegistry,
} from "./skillRegistry.ts";
export type {
  SkillManifest,
  SkillManifestValidation,
  SkillRecord,
  SkillRegistryStorage,
  SkillImportInput,
} from "./skillRegistry.ts";
export { ensureTemplates } from "./templateSkills.ts";
