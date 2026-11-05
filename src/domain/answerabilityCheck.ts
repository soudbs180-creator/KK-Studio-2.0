/**
 * KK Studio 2.0 - Pure Domain Core
 * Feature 14: Pre-Flight Answerability Pre-Validation Engine
 *
 * Implements deterministic feasibility scoring, missing entity & attribute diagnostics,
 * and pre-flight validation gates against OntologyGraph before triggering generative pipelines.
 *
 * Conforms to Clean Architecture: 100% pure TypeScript, zero external dependencies.
 * Governance Rule R8 compliant (unique filename basename).
 */

/* =========================================================================
 * 1. Interface & Model Definitions
 * ========================================================================= */

/**
 * Structural interface for an entity in an ontology graph.
 */
export interface OntologyEntityLike {
  id: string;
  name?: string;
  type?: string;
  properties?: Record<string, unknown>;
  attributes?: unknown;
}

/**
 * Structural reader interface for querying an ontology graph.
 * Fully compatible with tests/e2e/harness.ts and domain/ontologyGraph.ts.
 */
export interface OntologyGraphReader {
  hasEntity(id: string): boolean;
  getEntity?(id: string): OntologyEntityLike | undefined;
  hasPath?(startId: string, targetId: string): boolean;
  getNeighbors?(id: string): string[] | Iterable<string>;
}

/**
 * Severity rating for diagnostic findings.
 */
export type AnswerabilityDiagnosticSeverity = "error" | "warning" | "info";

/**
 * Canonical diagnostic error and warning codes.
 */
export type AnswerabilityDiagnosticCode =
  | "ENTITY_MISSING"
  | "ATTRIBUTE_MISSING"
  | "ATTRIBUTE_NULL"
  | "RELATION_UNREACHABLE"
  | "FEASIBILITY_BELOW_THRESHOLD"
  | "EMPTY_PROMPT";

/**
 * Detailed diagnostic item.
 */
export interface AnswerabilityDiagnostic {
  code: AnswerabilityDiagnosticCode;
  severity: AnswerabilityDiagnosticSeverity;
  targetId: string;
  attributeName?: string;
  message: string;
  suggestion?: string;
}

/**
 * Required relation specification for path validation.
 */
export interface RequiredRelationSpec {
  sourceId: string;
  targetId: string;
  description?: string;
}

/**
 * Configuration options for answerability validation.
 */
export interface AnswerabilityOptions {
  /**
   * Required attributes per entity ID.
   * Example: `{ char_alice: ['hair_color', 'costume_id'] }`
   */
  requiredAttributes?: Record<string, string[]>;

  /**
   * Required reachability relationships between entities.
   */
  requiredRelations?: RequiredRelationSpec[];

  /**
   * Minimum feasibility threshold (0.0 to 1.0).
   * Default: 1.0 (strict: all required items must exist).
   */
  confidenceThreshold?: number;

  /**
   * Relative weights for computing composite feasibility score.
   */
  weights?: {
    entity?: number;
    attribute?: number;
    relation?: number;
  };
}

/**
 * Comprehensive answerability report returned by validateAnswerability.
 * Contains both backwards-compatible fields and enriched diagnostics.
 */
export interface AnswerabilityReport {
  /**
   * Core backwards-compatible boolean flag.
   * True if all prerequisites are met and feasibility score meets the threshold.
   */
  answerable: boolean;

  /**
   * List of missing entity IDs in the exact sequence requested.
   */
  missingEntities: string[];

  /**
   * Composite feasibility score in range [0.0, 1.0].
   */
  feasibilityScore: number;

  /**
   * Ratio of covered entities to total requested entities [0.0, 1.0].
   * Evaluates to 1.0 when requiredEntities is empty.
   */
  coverage: number;

  /**
   * Ratio of covered attributes to total required attributes [0.0, 1.0].
   */
  attributeCoverage: number;

  /**
   * Ratio of reachable relationships to total required relationships [0.0, 1.0].
   */
  relationCoverage: number;

  /**
   * Map of entityId -> list of missing attribute names.
   */
  missingAttributes: Record<string, string[]>;

  /**
   * List of required relations that cannot be connected in the graph.
   */
  missingRelations: Array<{ sourceId: string; targetId: string }>;

  /**
   * The original prompt passed to the validation engine.
   */
  prompt: string;

  /**
   * Structured diagnostic events.
   */
  diagnostics: AnswerabilityDiagnostic[];

  /**
   * Actionable suggestions to remediate detected gaps.
   */
  suggestions: string[];
}

/* =========================================================================
 * 2. Pure Domain Helper Functions
 * ========================================================================= */

const DEFAULT_WEIGHTS = {
  entity: 0.6,
  attribute: 0.3,
  relation: 0.1,
} as const;

function isValuePresent(val: unknown): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === "string" && val.trim() === "") return false;
  return true;
}

function resolveEntityProperty(
  entity: OntologyEntityLike | undefined,
  attrName: string,
): { exists: boolean; hasValue: boolean } {
  if (!entity) return { exists: false, hasValue: false };

  // 1. Check in properties Record
  if (entity.properties && attrName in entity.properties) {
    return {
      exists: true,
      hasValue: isValuePresent(entity.properties[attrName]),
    };
  }

  // 2. Check in attributes (Array or Record)
  if (entity.attributes) {
    if (Array.isArray(entity.attributes)) {
      const found = entity.attributes.find((a: unknown) => {
        if (typeof a === "object" && a !== null) {
          const item = a as Record<string, unknown>;
          return item.name === attrName || item.id === attrName;
        }
        return a === attrName;
      });
      if (found) {
        if (typeof found === "object" && found !== null) {
          const item = found as Record<string, unknown>;
          const hasVal =
            item.defaultValue !== undefined
              ? isValuePresent(item.defaultValue)
              : true;
          return { exists: true, hasValue: hasVal };
        }
        return { exists: true, hasValue: true };
      }
    } else if (
      typeof entity.attributes === "object" &&
      attrName in (entity.attributes as Record<string, unknown>)
    ) {
      return {
        exists: true,
        hasValue: isValuePresent(
          (entity.attributes as Record<string, unknown>)[attrName],
        ),
      };
    }
  }

  return { exists: false, hasValue: false };
}

/* =========================================================================
 * 3. Main Validation Function
 * ========================================================================= */

/**
 * Validates whether a requested generation or reasoning prompt is answerable
 * based on prerequisite entities, attributes, and relationships in the OntologyGraph.
 *
 * @param prompt The generation prompt or query string.
 * @param requiredEntities List of entity identifiers that must exist in the ontology.
 * @param ontology The OntologyGraph reader instance.
 * @param options Optional attribute requirements, relation paths, and feasibility thresholds.
 * @returns Comprehensive AnswerabilityReport with answerable boolean and diagnostics.
 */
export function validateAnswerability(
  prompt: string,
  requiredEntities: string[],
  ontology: OntologyGraphReader,
  options: AnswerabilityOptions = {},
): AnswerabilityReport {
  const missingEntities: string[] = [];
  const diagnostics: AnswerabilityDiagnostic[] = [];
  const suggestions: string[] = [];
  const missingAttributes: Record<string, string[]> = {};
  const missingRelations: Array<{ sourceId: string; targetId: string }> = [];

  const threshold = options.confidenceThreshold ?? 1.0;
  const weights = {
    entity: options.weights?.entity ?? DEFAULT_WEIGHTS.entity,
    attribute: options.weights?.attribute ?? DEFAULT_WEIGHTS.attribute,
    relation: options.weights?.relation ?? DEFAULT_WEIGHTS.relation,
  };

  // 1. Check prompt emptiness (diagnostic warning only)
  if (prompt.trim().length === 0) {
    diagnostics.push({
      code: "EMPTY_PROMPT",
      severity: "warning",
      targetId: "prompt",
      message: "Generation prompt is empty or contains only whitespace.",
      suggestion: "Provide descriptive prompt text to guide generation.",
    });
  }

  // 2. Validate Required Entities (exact preservation of order and duplicates)
  for (const ent of requiredEntities) {
    if (!ontology.hasEntity(ent)) {
      missingEntities.push(ent);
      diagnostics.push({
        code: "ENTITY_MISSING",
        severity: "error",
        targetId: ent,
        message: `Required entity "${ent}" does not exist in the OntologyGraph.`,
        suggestion: `Register entity "${ent}" in the ontology or verify naming in prompt.`,
      });
      suggestions.push(`Add missing entity "${ent}" to the knowledge graph.`);
    }
  }

  // Compute Entity Coverage
  const totalEntities = requiredEntities.length;
  const coveredEntitiesCount = totalEntities - missingEntities.length;
  const coverage =
    totalEntities === 0 ? 1.0 : coveredEntitiesCount / totalEntities;

  // 3. Validate Required Attributes
  let totalRequiredAttributes = 0;
  let totalMissingAttributes = 0;

  if (options.requiredAttributes) {
    for (const [entityId, reqAttrs] of Object.entries(
      options.requiredAttributes,
    )) {
      totalRequiredAttributes += reqAttrs.length;
      const entityExists = ontology.hasEntity(entityId);
      const entityData = ontology.getEntity
        ? ontology.getEntity(entityId)
        : undefined;

      for (const attr of reqAttrs) {
        if (!entityExists) {
          totalMissingAttributes++;
          if (!missingAttributes[entityId]) missingAttributes[entityId] = [];
          missingAttributes[entityId].push(attr);
          continue;
        }

        if (!ontology.getEntity) {
          totalMissingAttributes++;
          (missingAttributes[entityId] ??= []).push(attr);
        } else {
          const { exists, hasValue } = resolveEntityProperty(entityData, attr);
          if (!exists) {
            totalMissingAttributes++;
            if (!missingAttributes[entityId]) missingAttributes[entityId] = [];
            missingAttributes[entityId].push(attr);
            diagnostics.push({
              code: "ATTRIBUTE_MISSING",
              severity: "error",
              targetId: entityId,
              attributeName: attr,
              message: `Entity "${entityId}" is missing required attribute "${attr}".`,
              suggestion: `Define attribute "${attr}" on entity "${entityId}".`,
            });
            suggestions.push(
              `Define attribute "${attr}" on entity "${entityId}".`,
            );
          } else if (!hasValue) {
            totalMissingAttributes++;
            if (!missingAttributes[entityId]) missingAttributes[entityId] = [];
            missingAttributes[entityId].push(attr);
            diagnostics.push({
              code: "ATTRIBUTE_NULL",
              severity: "error",
              targetId: entityId,
              attributeName: attr,
              message: `Attribute "${attr}" on entity "${entityId}" is null, empty, or undefined.`,
              suggestion: `Assign a non-empty value to "${attr}" on entity "${entityId}".`,
            });
            suggestions.push(
              `Assign valid value to attribute "${attr}" on entity "${entityId}".`,
            );
          }
        }
      }
    }
  }

  const attributeCoverage =
    totalRequiredAttributes === 0
      ? 1.0
      : (totalRequiredAttributes - totalMissingAttributes) /
        totalRequiredAttributes;

  // 4. Validate Required Relationships
  let totalRequiredRelations = 0;
  let totalMissingRelations = 0;

  if (options.requiredRelations && options.requiredRelations.length > 0) {
    totalRequiredRelations = options.requiredRelations.length;

    for (const rel of options.requiredRelations) {
      const hasSource = ontology.hasEntity(rel.sourceId);
      const hasTarget = ontology.hasEntity(rel.targetId);

      let connected = false;
      if (hasSource && hasTarget && ontology.hasPath) {
        connected = ontology.hasPath(rel.sourceId, rel.targetId);
      }

      if (!connected) {
        totalMissingRelations++;
        missingRelations.push({
          sourceId: rel.sourceId,
          targetId: rel.targetId,
        });
        diagnostics.push({
          code: "RELATION_UNREACHABLE",
          severity: "error",
          targetId: `${rel.sourceId}->${rel.targetId}`,
          message: `Required ontological connection from "${rel.sourceId}" to "${rel.targetId}" not found.`,
          suggestion: `Connect "${rel.sourceId}" to "${rel.targetId}" in the ontology graph.`,
        });
        suggestions.push(
          `Establish connection between "${rel.sourceId}" and "${rel.targetId}".`,
        );
      }
    }
  }

  const relationCoverage =
    totalRequiredRelations === 0
      ? 1.0
      : (totalRequiredRelations - totalMissingRelations) /
        totalRequiredRelations;

  // 5. Compute Normalized Feasibility Score
  let activeWeightSum = weights.entity;
  let weightedScore = weights.entity * coverage;

  if (totalRequiredAttributes > 0) {
    activeWeightSum += weights.attribute;
    weightedScore += weights.attribute * attributeCoverage;
  }
  if (totalRequiredRelations > 0) {
    activeWeightSum += weights.relation;
    weightedScore += weights.relation * relationCoverage;
  }

  const feasibilityScore =
    activeWeightSum > 0
      ? Number((weightedScore / activeWeightSum).toFixed(4))
      : 1.0;

  // 6. Feasibility Thresholding & Answerable Determination
  let isAnswerable = true;

  if (missingEntities.length > 0) {
    isAnswerable = false;
  }

  if (totalMissingAttributes > 0 || totalMissingRelations > 0) {
    isAnswerable = false;
  }

  if (feasibilityScore < threshold) {
    isAnswerable = false;
    diagnostics.push({
      code: "FEASIBILITY_BELOW_THRESHOLD",
      severity: "error",
      targetId: "feasibility",
      message: `Feasibility score ${feasibilityScore} is below required threshold ${threshold}.`,
      suggestion:
        "Ensure all prerequisite entities, attributes, and relationships are complete.",
    });
  }

  return {
    answerable: isAnswerable,
    missingEntities,
    feasibilityScore,
    coverage: Number(coverage.toFixed(4)),
    attributeCoverage: Number(attributeCoverage.toFixed(4)),
    relationCoverage: Number(relationCoverage.toFixed(4)),
    missingAttributes,
    missingRelations,
    prompt,
    diagnostics,
    suggestions: Array.from(new Set(suggestions)), // Deduplicate suggestions
  };
}

/* =========================================================================
 * 4. Integration Helpers for Agent PreInvocation & Storyboard Pipelines
 * ========================================================================= */

/**
 * Creates an agent PreInvocation security/validation hook that blocks tool calls
 * if prerequisites are not answerable in the OntologyGraph.
 */
export function createAnswerabilityPreInvocationGuard(
  ontology: OntologyGraphReader,
  options: AnswerabilityOptions & {
    /**
     * Determines whether a given tool call requires answerability checking.
     */
    shouldValidate?: (tool: string, args: Record<string, unknown>) => boolean;
    /**
     * Extracts required entity names from tool arguments.
     */
    extractEntities?: (tool: string, args: Record<string, unknown>) => string[];
  } = {},
): (
  tool: string,
  args: Record<string, unknown>,
) => { allow: boolean; reason?: string; report?: AnswerabilityReport } {
  const shouldValidate =
    options.shouldValidate ??
    ((tool: string) => {
      const t = tool.toLowerCase();
      return (
        t.startsWith("generate_") ||
        t.startsWith("render_") ||
        t.startsWith("storyboard_") ||
        t === "ask_question" ||
        t === "execute_workflow"
      );
    });

  const extractEntities =
    options.extractEntities ??
    ((_tool: string, args: Record<string, unknown>): string[] => {
      if (Array.isArray(args.requiredEntities)) {
        return args.requiredEntities.map(String);
      }
      if (Array.isArray(args.entities)) {
        return args.entities.map(String);
      }
      if (Array.isArray(args.characters)) {
        return args.characters.map(String);
      }
      return [];
    });

  return (tool: string, args: Record<string, unknown>) => {
    if (!shouldValidate(tool, args)) {
      return { allow: true };
    }

    const promptText =
      typeof args.prompt === "string"
        ? args.prompt
        : typeof args.query === "string"
          ? args.query
          : "";

    const required = extractEntities(tool, args);
    const report = validateAnswerability(
      promptText,
      required,
      ontology,
      options,
    );

    if (!report.answerable) {
      const missingStr = report.missingEntities.join(", ");
      return {
        allow: false,
        reason: `Pre-flight validation failed: missing required entities [${missingStr}] in ontology graph.`,
        report,
      };
    }

    return { allow: true, report };
  };
}
