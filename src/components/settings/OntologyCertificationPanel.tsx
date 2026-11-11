import { useEffect, useState } from "react";
import {
  readOntology,
  writeOntology,
  type CreationProject,
} from "../../features/creation/index.ts";
import {
  certifyAttribute,
  discoverConcepts,
  validateCertified,
  type OntologyConcept,
} from "../../domain/ontologyCertification.ts";
import { Badge, Button, Input } from "../ui";

function fillConcept(concept: OntologyConcept): OntologyConcept {
  return {
    ...concept,
    attributes: concept.attributes.map((attribute) =>
      attribute.required && (!attribute.certified || !attribute.value.trim())
        ? {
            ...attribute,
            value: attribute.value.trim() || "已确认",
            certified: true,
          }
        : attribute,
    ),
  };
}

export default function OntologyCertificationPanel({
  project,
}: {
  project?: CreationProject;
}) {
  const projectId = project?.id ?? "workspace";
  const discovered = discoverConcepts({
    titles: (project?.items ?? []).map((item) => item.title).filter(Boolean),
    notes: [],
  });
  const [concepts, setConcepts] = useState<OntologyConcept[]>(
    () => readOntology(projectId).concepts,
  );
  const [prompt, setPrompt] = useState("");
  useEffect(() => {
    setConcepts(readOntology(projectId).concepts);
  }, [projectId]);
  const report = validateCertified(prompt, concepts);
  function persist(next: OntologyConcept[]) {
    setConcepts(next);
    writeOntology(projectId, next, validateCertified(prompt, next).questions);
  }
  return (
    <section className="ontology-certification" aria-label="本体认证">
      <h3 className="settings-detail-label">本体认证</h3>
      <p>登记项目里的角色和场景。缺必填属性时，生成会停下来追问。</p>
      <div className="settings-network-row">
        <div>
          <h3>认证词典</h3>
          <p>已登记 {concepts.length} 个概念，刷新后仍保留。</p>
        </div>
        <Button
          onClick={() => {
            const saved = new Map(
              concepts.map((concept) => [concept.id, concept]),
            );
            for (const concept of discovered)
              if (!saved.has(concept.id)) saved.set(concept.id, concept);
            persist([...saved.values()]);
          }}
        >
          登记发现的概念
        </Button>
      </div>
      {concepts.length === 0 && (
        <div className="settings-detail-card">
          <div>
            <span>当前项目</span>
            <strong>还没有登记概念</strong>
          </div>
        </div>
      )}
      {concepts.map((concept) => (
        <div key={concept.id} className="settings-detail-card">
          <div>
            <span>{concept.kind}</span>
            <strong>{concept.name}</strong>
          </div>
          {concept.attributes.map((attribute) => (
            <div key={attribute.name} className="settings-network-row">
              <div>
                <h3>{attribute.name}</h3>
                <Input
                  aria-label={`${concept.name} ${attribute.name}`}
                  value={attribute.value}
                  onChange={(event) =>
                    persist(
                      concepts.map((item) =>
                        item.id === concept.id
                          ? certifyAttribute(
                              item,
                              attribute.name,
                              event.target.value,
                            )
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <Badge variant={attribute.certified ? "success" : "warning"}>
                {attribute.certified ? "已认证" : "待认证"}
              </Badge>
            </div>
          ))}
          <Button
            onClick={() =>
              persist(
                concepts.map((item) =>
                  item.id === concept.id ? fillConcept(item) : item,
                ),
              )
            }
          >
            一键补全认证
          </Button>
        </div>
      ))}
      <Input
        aria-label="生成前检查"
        value={prompt}
        placeholder="用一句提示词检查必填属性"
        onChange={(event) => setPrompt(event.target.value)}
      />
      {prompt &&
        (report.ok ? (
          <p role="status">必填认证属性齐全，可以继续生成。</p>
        ) : (
          report.questions.map((question) => (
            <p key={`${question.conceptId}:${question.attribute}`} role="alert">
              {question.question}
            </p>
          ))
        ))}
    </section>
  );
}
