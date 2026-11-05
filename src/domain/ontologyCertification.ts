import {
  validateAnswerability,
  type OntologyGraphReader,
} from "./answerabilityCheck.ts";

export interface CertifiedAttribute {
  name: string;
  value: string;
  required: boolean;
  certified: boolean;
}

export interface OntologyConcept {
  id: string;
  name: string;
  kind: "character" | "scene" | "prop" | "memory";
  attributes: CertifiedAttribute[];
}

export interface CertificationQuestion {
  conceptId: string;
  attribute: string;
  question: string;
}

const KIND_WORD: Record<OntologyConcept["kind"], RegExp> = {
  character: /角色|人物|character/i,
  scene: /场景|地点|scene/i,
  prop: /道具|物件|prop/i,
  memory: /偏好|记忆|memory/i,
};

/** Discover concepts from asset titles and memory lines. No model call. */
export function discoverConcepts(input: {
  titles?: readonly string[];
  notes?: readonly string[];
}): OntologyConcept[] {
  const concepts: OntologyConcept[] = [];
  for (const title of input.titles ?? []) {
    const name = title.trim();
    if (!name) continue;
    concepts.push({
      id: `asset:${name}`,
      name,
      kind: "character",
      attributes: [
        { name: "外观", value: "", required: true, certified: false },
      ],
    });
  }
  for (const note of input.notes ?? []) {
    const name = note.trim().slice(0, 80);
    if (!name) continue;
    const kind =
      (Object.entries(KIND_WORD).find(([, pattern]) =>
        pattern.test(note),
      )?.[0] as OntologyConcept["kind"] | undefined) ?? "memory";
    concepts.push({
      id: `note:${concepts.length}:${name}`,
      name,
      kind,
      attributes: [
        { name: "陈述", value: note.trim(), required: true, certified: false },
      ],
    });
  }
  return concepts;
}

export function certifyAttribute(
  concept: OntologyConcept,
  attribute: string,
  value: string,
): OntologyConcept {
  return {
    ...concept,
    attributes: concept.attributes.map((item) =>
      item.name === attribute ? { ...item, value, certified: true } : item,
    ),
  };
}

class ConceptGraph implements OntologyGraphReader {
  readonly #concepts: readonly OntologyConcept[];
  constructor(concepts: readonly OntologyConcept[]) {
    this.#concepts = concepts;
  }
  hasEntity(id: string): boolean {
    return this.#concepts.some((concept) => concept.id === id);
  }
  getEntity(id: string) {
    const concept = this.#concepts.find((item) => item.id === id);
    if (!concept) return undefined;
    return {
      id: concept.id,
      name: concept.name,
      type: concept.kind,
      properties: Object.fromEntries(
        concept.attributes
          .filter((item) => item.certified && item.value)
          .map((item) => [item.name, item.value]),
      ),
    };
  }
}

/** Missing certified attributes become clarification questions, not a generation. */
export function validateCertified(
  prompt: string,
  concepts: readonly OntologyConcept[],
): { ok: boolean; questions: CertificationQuestion[] } {
  const mentioned = concepts.filter(
    (concept) => prompt.includes(concept.name) || prompt.includes(concept.id),
  );
  const questions: CertificationQuestion[] = [];
  for (const concept of mentioned) {
    for (const attribute of concept.attributes) {
      if (
        attribute.required &&
        (!attribute.certified || !attribute.value.trim())
      )
        questions.push({
          conceptId: concept.id,
          attribute: attribute.name,
          question: `生成前需要确认「${concept.name}」的${attribute.name}。`,
        });
    }
  }
  const report = validateAnswerability(
    prompt,
    mentioned.map((concept) => concept.id),
    new ConceptGraph(concepts),
    {
      requiredAttributes: Object.fromEntries(
        mentioned.map((concept) => [
          concept.id,
          concept.attributes
            .filter((item) => item.required)
            .map((item) => item.name),
        ]),
      ),
    },
  );
  if (!report.answerable && questions.length === 0 && mentioned.length > 0)
    questions.push({
      conceptId: mentioned[0]!.id,
      attribute: "认证",
      question: `「${mentioned[0]!.name}」尚未完成认证，不能直接生成。`,
    });
  return { ok: questions.length === 0, questions };
}
