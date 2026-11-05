/**
 * KK Studio 2.0 · 确定性语义本体知识图谱领域模型 (Deterministic Semantic Ontology Knowledge Graph)
 *
 * 遵循 Clean Architecture 纯领域核心隔离规范：
 * - 纯 TypeScript，零外部 NPM 依赖；
 * - 零 UI / DOM / Tauri IPC / Node.js 基础构件依赖；
 * - 纯内存双向邻接索引，操作时间复杂度 O(V + E)；
 * - 确定性（Deterministic）拓扑排序、环路检测（Tarjan SCC + DFS 回溯）与最短路径规划；
 * - 兼容 W3C JSON-LD 1.1 与 100% 兼容现有 E2E 测试集 (tests/e2e/harness.ts)。
 */

/* =========================================================================
 * 1. 领域模型与类型契约 (Domain Schemas)
 * ========================================================================= */

export type AttributeDataType =
  "string" | "number" | "boolean" | "date" | "json" | "reference";

export interface OntologyAttribute {
  id: string;
  entityId: string;
  name: string;
  dataType: AttributeDataType;
  description?: string;
  required?: boolean;
  isPrimaryKey?: boolean;
  defaultValue?: unknown;
  format?: string;
  metadata?: Record<string, unknown>;
}

export interface OntologyEntity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
  description?: string;
  attributes?: OntologyAttribute[];
  synonyms?: string[];
  metadata?: Record<string, unknown>;
}

export type SemanticPredicate =
  | "HAS_ATTRIBUTE"
  | "IS_A"
  | "PART_OF"
  | "PROPERTY_OF"
  | "ROLE"
  | "REPRESENTS"
  | "SEMANTIC_FK"
  | "DEPENDS_ON"
  | "REFERENCES"
  | string;

export type RelationCardinality =
  "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";

export interface OntologyRelation {
  id: string;
  sourceId: string;
  targetId: string;
  predicate: SemanticPredicate;
  cardinality?: RelationCardinality;
  weight?: number;
  bidirectional?: boolean;
  inversePredicate?: string;
  metadata?: Record<string, unknown>;
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  cycles: string[][];
  stronglyConnectedComponents: string[][];
}

export interface TopologicalSortResult {
  success: boolean;
  order: string[];
  cycleDetected: boolean;
}

export interface PathHop {
  sourceId: string;
  targetId: string;
  predicate: SemanticPredicate;
  relationId: string;
  weight: number;
}

export interface PathResult {
  path: string[];
  hops: PathHop[];
  totalHops: number;
  totalWeight: number;
}

export interface PathOptions {
  maxHops?: number;
  allowedPredicates?: SemanticPredicate[];
  direction?: "out" | "in" | "both";
}

export interface AllPathsOptions extends PathOptions {
  maxPaths?: number;
}

export interface SerializedOntologyGraph {
  version: 1;
  entities: OntologyEntity[];
  relations: OntologyRelation[];
  metadata?: Record<string, unknown>;
}

export interface JsonLdDocument {
  "@context": Record<string, unknown>;
  "@graph": Array<Record<string, unknown>>;
}

/* =========================================================================
 * 2. 辅助工具函数 (Deterministic Helpers)
 * ========================================================================= */

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/* =========================================================================
 * 3. 确定性本体知识图谱实现 (OntologyGraph Core)
 * ========================================================================= */

export class OntologyGraph {
  #entities = new Map<string, OntologyEntity>();
  #relations = new Map<string, OntologyRelation>();

  // sourceId -> Map<targetId, Map<relationId, OntologyRelation>>
  #outgoing = new Map<string, Map<string, Map<string, OntologyRelation>>>();
  // targetId -> Map<sourceId, Map<relationId, OntologyRelation>>
  #incoming = new Map<string, Map<string, Map<string, OntologyRelation>>>();

  // 元数据容器
  #metadata: Record<string, unknown> = {};

  constructor(initialData?: SerializedOntologyGraph) {
    if (initialData) {
      this.fromJSON(initialData);
    }
  }

  /* -------------------------------------------------------------------------
   * 实体管理 API
   * ------------------------------------------------------------------------- */

  addEntity(entity: OntologyEntity): this {
    if (!entity || !entity.id) {
      throw new Error("Entity id is required");
    }

    entity = structuredClone(entity);
    const clonedProps = { ...(entity.properties ?? {}) };
    const registeredEntity: OntologyEntity = {
      ...entity,
      properties: clonedProps,
      attributes: entity.attributes ? [...entity.attributes] : [],
      synonyms: entity.synonyms ? [...entity.synonyms] : [],
      metadata: entity.metadata ? { ...entity.metadata } : {},
    };

    this.#entities.set(entity.id, registeredEntity);

    if (!this.#outgoing.has(entity.id)) {
      this.#outgoing.set(entity.id, new Map());
    }
    if (!this.#incoming.has(entity.id)) {
      this.#incoming.set(entity.id, new Map());
    }

    return this;
  }

  hasEntity(id: string): boolean {
    return this.#entities.has(id);
  }

  getEntity(id: string): OntologyEntity | undefined {
    const entity = this.#entities.get(id);
    return entity ? structuredClone(entity) : undefined;
  }

  removeEntity(id: string): boolean {
    if (!this.#entities.has(id)) return false;

    // 清理所有相关出边
    const outTargets = this.#outgoing.get(id);
    if (outTargets) {
      for (const [targetId, relMap] of outTargets) {
        for (const relId of relMap.keys()) {
          this.#relations.delete(relId);
        }
        this.#incoming.get(targetId)?.delete(id);
      }
    }
    this.#outgoing.delete(id);

    // 清理所有相关入边
    const inSources = this.#incoming.get(id);
    if (inSources) {
      for (const [sourceId, relMap] of inSources) {
        for (const relId of relMap.keys()) {
          this.#relations.delete(relId);
        }
        this.#outgoing.get(sourceId)?.delete(id);
      }
    }
    this.#incoming.delete(id);

    return this.#entities.delete(id);
  }

  getAllEntities(): OntologyEntity[] {
    return structuredClone(Array.from(this.#entities.values())).sort((a, b) =>
      compareStrings(a.id, b.id),
    );
  }

  get entityCount(): number {
    return this.#entities.size;
  }

  /* -------------------------------------------------------------------------
   * 关系连线 API
   * ------------------------------------------------------------------------- */

  /**
   * 兼容现有 E2E 测试 harness: g.connect(sourceId, targetId, predicate?)
   */
  connect(
    sourceId: string,
    targetId: string,
    predicate: SemanticPredicate = "DEPENDS_ON",
    metadata?: Record<string, unknown>,
  ): this {
    if (!this.#entities.has(sourceId) || !this.#entities.has(targetId)) {
      throw new Error("Cannot connect non-existent entities");
    }

    const relationId = `rel_${sourceId}_${predicate}_${targetId}`;
    return this.addRelation({
      id: relationId,
      sourceId,
      targetId,
      predicate,
      weight: 1.0,
      metadata,
    });
  }

  addRelation(relation: OntologyRelation): this {
    if (
      !this.#entities.has(relation.sourceId) ||
      !this.#entities.has(relation.targetId)
    ) {
      throw new Error("Cannot connect non-existent entities");
    }

    relation = structuredClone(relation);
    this.removeRelation(relation.id);
    const rel: OntologyRelation = {
      ...relation,
      weight: relation.weight ?? 1.0,
      metadata: relation.metadata ? { ...relation.metadata } : {},
    };

    this.#relations.set(rel.id, rel);

    // 建立正向索引
    let outTargetMap = this.#outgoing.get(rel.sourceId);
    if (!outTargetMap) {
      outTargetMap = new Map();
      this.#outgoing.set(rel.sourceId, outTargetMap);
    }
    let outRelMap = outTargetMap.get(rel.targetId);
    if (!outRelMap) {
      outRelMap = new Map();
      outTargetMap.set(rel.targetId, outRelMap);
    }
    outRelMap.set(rel.id, rel);

    // 建立反向索引
    let inSourceMap = this.#incoming.get(rel.targetId);
    if (!inSourceMap) {
      inSourceMap = new Map();
      this.#incoming.set(rel.targetId, inSourceMap);
    }
    let inRelMap = inSourceMap.get(rel.sourceId);
    if (!inRelMap) {
      inRelMap = new Map();
      inSourceMap.set(rel.sourceId, inRelMap);
    }
    inRelMap.set(rel.id, rel);

    return this;
  }

  hasRelation(id: string): boolean {
    return this.#relations.has(id);
  }

  getRelation(id: string): OntologyRelation | undefined {
    const relation = this.#relations.get(id);
    return relation ? structuredClone(relation) : undefined;
  }

  removeRelation(id: string): boolean {
    const rel = this.#relations.get(id);
    if (!rel) return false;

    this.#outgoing.get(rel.sourceId)?.get(rel.targetId)?.delete(id);
    if (this.#outgoing.get(rel.sourceId)?.get(rel.targetId)?.size === 0) {
      this.#outgoing.get(rel.sourceId)?.delete(rel.targetId);
    }

    this.#incoming.get(rel.targetId)?.get(rel.sourceId)?.delete(id);
    if (this.#incoming.get(rel.targetId)?.get(rel.sourceId)?.size === 0) {
      this.#incoming.get(rel.targetId)?.delete(rel.sourceId);
    }

    return this.#relations.delete(id);
  }

  getAllRelations(): OntologyRelation[] {
    return structuredClone(Array.from(this.#relations.values())).sort((a, b) =>
      compareStrings(a.id, b.id),
    );
  }

  get relationCount(): number {
    return this.#relations.size;
  }

  getOutgoingRelations(
    sourceId: string,
    predicate?: SemanticPredicate,
  ): OntologyRelation[] {
    const targetMap = this.#outgoing.get(sourceId);
    if (!targetMap) return [];

    const list: OntologyRelation[] = [];
    for (const relMap of targetMap.values()) {
      for (const rel of relMap.values()) {
        if (!predicate || rel.predicate === predicate) {
          list.push(rel);
        }
      }
    }
    return list.sort((a, b) => compareStrings(a.id, b.id));
  }

  getIncomingRelations(
    targetId: string,
    predicate?: SemanticPredicate,
  ): OntologyRelation[] {
    const sourceMap = this.#incoming.get(targetId);
    if (!sourceMap) return [];

    const list: OntologyRelation[] = [];
    for (const relMap of sourceMap.values()) {
      for (const rel of relMap.values()) {
        if (!predicate || rel.predicate === predicate) {
          list.push(rel);
        }
      }
    }
    return list.sort((a, b) => compareStrings(a.id, b.id));
  }

  /* -------------------------------------------------------------------------
   * 路径连通性与存在性判断 (100% 兼容 E2E harness hasPath)
   * ------------------------------------------------------------------------- */

  hasPath(
    startId: string,
    targetId: string,
    visited = new Set<string>(),
  ): boolean {
    if (!this.#entities.has(startId) || !this.#entities.has(targetId)) {
      return false;
    }
    if (startId === targetId) {
      return true;
    }

    visited.add(startId);

    const outMap = this.#outgoing.get(startId);
    if (!outMap) return false;

    // 采用字典序升序遍历，消除随机时序影响
    const sortedNeighbors = Array.from(outMap.keys()).sort(compareStrings);

    for (const next of sortedNeighbors) {
      if (!visited.has(next)) {
        if (this.hasPath(next, targetId, visited)) {
          return true;
        }
      }
    }

    return false;
  }

  /* -------------------------------------------------------------------------
   * 环路检测 (Tarjan SCC + DFS 颜色标记回路提取)
   * ------------------------------------------------------------------------- */

  detectCycles(): CycleDetectionResult {
    const sccs: string[][] = [];
    let dfnCounter = 0;
    const dfn = new Map<string, number>();
    const low = new Map<string, number>();
    const inStack = new Map<string, boolean>();
    const stack: string[] = [];

    // 字典序排序起始节点，确保算法完全确定
    const sortedEntityIds = Array.from(this.#entities.keys()).sort(
      compareStrings,
    );

    const tarjan = (u: string) => {
      dfn.set(u, ++dfnCounter);
      low.set(u, dfnCounter);
      stack.push(u);
      inStack.set(u, true);

      const outMap = this.#outgoing.get(u);
      if (outMap) {
        const sortedTargets = Array.from(outMap.keys()).sort(compareStrings);
        for (const v of sortedTargets) {
          if (!dfn.has(v)) {
            tarjan(v);
            low.set(u, Math.min(low.get(u)!, low.get(v)!));
          } else if (inStack.get(v)) {
            low.set(u, Math.min(low.get(u)!, dfn.get(v)!));
          }
        }
      }

      if (low.get(u) === dfn.get(u)) {
        const scc: string[] = [];
        let curr: string;
        do {
          curr = stack.pop()!;
          inStack.set(curr, false);
          scc.push(curr);
        } while (curr !== u);

        scc.sort(compareStrings);
        // 若大小 > 1，或者存在自环 (u -> u)，则为一个真实环路
        const hasSelfLoop = this.#outgoing.get(u)?.has(u) ?? false;
        if (scc.length > 1 || hasSelfLoop) {
          sccs.push(scc);
        }
      }
    };

    for (const id of sortedEntityIds) {
      if (!dfn.has(id)) {
        tarjan(id);
      }
    }

    // 结合三色标记法提取具体环路闭环路径
    const cycles: string[][] = [];
    const color = new Map<string, number>(); // 0=White, 1=Gray, 2=Black

    const dfsCycle = (curr: string, path: string[]) => {
      color.set(curr, 1); // Gray
      path.push(curr);

      const outMap = this.#outgoing.get(curr);
      if (outMap) {
        const sortedTargets = Array.from(outMap.keys()).sort(compareStrings);
        for (const next of sortedTargets) {
          const nextColor = color.get(next) ?? 0;
          if (nextColor === 1) {
            // 发现返祖边 (Back Edge) -> 形成环路
            const cycleStartIndex = path.indexOf(next);
            if (cycleStartIndex !== -1) {
              const detectedCycle = path.slice(cycleStartIndex).concat(next);
              cycles.push(detectedCycle);
            }
          } else if (nextColor === 0) {
            dfsCycle(next, path);
          }
        }
      }

      path.pop();
      color.set(curr, 2); // Black
    };

    for (const id of sortedEntityIds) {
      if ((color.get(id) ?? 0) === 0) {
        dfsCycle(id, []);
      }
    }

    return {
      hasCycle: sccs.length > 0 || cycles.length > 0,
      cycles,
      stronglyConnectedComponents: sccs.sort((a, b) =>
        compareStrings(a[0], b[0]),
      ),
    };
  }

  /* -------------------------------------------------------------------------
   * 确定性拓扑排序 (Deterministic Topological Sort via Kahn's Algorithm)
   * ------------------------------------------------------------------------- */

  topologicalSort(): TopologicalSortResult {
    const inDegree = new Map<string, number>();
    for (const id of this.#entities.keys()) {
      inDegree.set(id, 0);
    }

    for (const [, targetMap] of this.#outgoing) {
      for (const targetId of targetMap.keys()) {
        inDegree.set(targetId, (inDegree.get(targetId) ?? 0) + 1);
      }
    }

    // 维护一个有序列表作为确定性优先队列 (每次出队 ID 字典序最小者)
    const frontier: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) {
        frontier.push(id);
      }
    }
    frontier.sort(compareStrings);

    const order: string[] = [];

    while (frontier.length > 0) {
      const u = frontier.shift()!;
      order.push(u);

      const outMap = this.#outgoing.get(u);
      if (outMap) {
        const sortedTargets = Array.from(outMap.keys()).sort(compareStrings);
        for (const v of sortedTargets) {
          const currentDeg = inDegree.get(v)! - 1;
          inDegree.set(v, currentDeg);
          if (currentDeg === 0) {
            // 维持 frontier 字典序
            frontier.push(v);
            frontier.sort(compareStrings);
          }
        }
      }
    }

    if (order.length < this.#entities.size) {
      return {
        success: false,
        order: [],
        cycleDetected: true,
      };
    }

    return {
      success: true,
      order,
      cycleDetected: false,
    };
  }

  /* -------------------------------------------------------------------------
   * 最短路径算法 (Deterministic BFS Shortest Path)
   * ------------------------------------------------------------------------- */

  findShortestPath(
    startId: string,
    targetId: string,
    options?: PathOptions,
  ): PathResult | null {
    if (!this.#entities.has(startId) || !this.#entities.has(targetId)) {
      return null;
    }
    if (startId === targetId) {
      return {
        path: [startId],
        hops: [],
        totalHops: 0,
        totalWeight: 0,
      };
    }

    const maxHops = options?.maxHops ?? 10;
    const allowed = options?.allowedPredicates
      ? new Set(options.allowedPredicates)
      : null;
    const direction = options?.direction ?? "out";

    // 记录到达各节点时的父跳步信息: node -> { prevNode, hop }
    const parents = new Map<string, { prev: string; hop: PathHop }>();
    const queue: Array<{ id: string; depth: number }> = [
      { id: startId, depth: 0 },
    ];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const { id: curr, depth } = queue.shift()!;
      if (depth >= maxHops) continue;

      // 收集候选邻接边
      const candidates: Array<{ neighbor: string; rel: OntologyRelation }> = [];

      if (direction === "out" || direction === "both") {
        const outMap = this.#outgoing.get(curr);
        if (outMap) {
          for (const [target, relMap] of outMap) {
            for (const rel of relMap.values()) {
              if (!allowed || allowed.has(rel.predicate)) {
                candidates.push({ neighbor: target, rel });
              }
            }
          }
        }
      }

      if (direction === "in" || direction === "both") {
        const inMap = this.#incoming.get(curr);
        if (inMap) {
          for (const [source, relMap] of inMap) {
            for (const rel of relMap.values()) {
              if (!allowed || allowed.has(rel.predicate)) {
                candidates.push({ neighbor: source, rel });
              }
            }
          }
        }
      }

      // 保证候选邻居确定性字典序
      candidates.sort((a, b) => {
        const diff = compareStrings(a.neighbor, b.neighbor);
        if (diff !== 0) return diff;
        return compareStrings(a.rel.id, b.rel.id);
      });

      for (const { neighbor, rel } of candidates) {
        if (visited.has(neighbor)) continue;

        visited.add(neighbor);
        parents.set(neighbor, {
          prev: curr,
          hop: {
            sourceId: curr,
            targetId: neighbor,
            predicate: rel.predicate,
            relationId: rel.id,
            weight: rel.weight ?? 1.0,
          },
        });

        if (neighbor === targetId) {
          // 重建完整路径
          const hops: PathHop[] = [];
          const path: string[] = [targetId];
          let tracer = targetId;
          let totalWeight = 0;

          while (tracer !== startId) {
            const step = parents.get(tracer)!;
            hops.push(step.hop);
            totalWeight += step.hop.weight;
            tracer = step.prev;
            path.push(tracer);
          }

          hops.reverse();
          path.reverse();

          return {
            path,
            hops,
            totalHops: hops.length,
            totalWeight,
          };
        }

        queue.push({ id: neighbor, depth: depth + 1 });
      }
    }

    return null;
  }

  /* -------------------------------------------------------------------------
   * 全路径搜索 (Deterministic Bounded DFS)
   * ------------------------------------------------------------------------- */

  findAllPaths(
    startId: string,
    targetId: string,
    options?: AllPathsOptions,
  ): PathResult[] {
    if (!this.#entities.has(startId) || !this.#entities.has(targetId)) {
      return [];
    }

    const maxHops = options?.maxHops ?? 6;
    const maxPaths = options?.maxPaths ?? 20;
    const allowed = options?.allowedPredicates
      ? new Set(options.allowedPredicates)
      : null;
    const results: PathResult[] = [];

    const dfs = (
      curr: string,
      visited: Set<string>,
      hops: PathHop[],
      path: string[],
    ) => {
      if (results.length >= maxPaths) return;
      if (curr === targetId) {
        const totalWeight = hops.reduce((acc, h) => acc + h.weight, 0);
        results.push({
          path: [...path],
          hops: [...hops],
          totalHops: hops.length,
          totalWeight,
        });
        return;
      }
      if (hops.length >= maxHops) return;

      const outMap = this.#outgoing.get(curr);
      if (!outMap) return;

      const sortedNeighbors = Array.from(outMap.keys()).sort(compareStrings);
      for (const next of sortedNeighbors) {
        if (visited.has(next)) continue;

        const relMap = outMap.get(next)!;
        const sortedRels = Array.from(relMap.values()).sort((a, b) =>
          compareStrings(a.id, b.id),
        );

        for (const rel of sortedRels) {
          if (allowed && !allowed.has(rel.predicate)) continue;

          visited.add(next);
          hops.push({
            sourceId: curr,
            targetId: next,
            predicate: rel.predicate,
            relationId: rel.id,
            weight: rel.weight ?? 1.0,
          });
          path.push(next);

          dfs(next, visited, hops, path);

          path.pop();
          hops.pop();
          visited.delete(next);

          if (results.length >= maxPaths) break;
        }
      }
    };

    const initialVisited = new Set<string>([startId]);
    dfs(startId, initialVisited, [], [startId]);

    return results;
  }

  /* -------------------------------------------------------------------------
   * 语义联结路径 (Join Path Resolution with PK Hub Discipline)
   * ------------------------------------------------------------------------- */

  findJoinPath(
    anchorEntityId: string,
    destEntityId: string,
    options?: { maxHops?: number },
  ): PathHop[] {
    if (anchorEntityId === destEntityId) return [];
    if (
      !this.#entities.has(anchorEntityId) ||
      !this.#entities.has(destEntityId)
    )
      return [];

    const maxHops = options?.maxHops ?? 6;
    const queue: Array<{ id: string; hops: PathHop[] }> = [
      { id: anchorEntityId, hops: [] },
    ];
    const visited = new Set<string>([anchorEntityId]);

    while (queue.length > 0) {
      const { id: currId, hops } = queue.shift()!;
      if (hops.length >= maxHops) continue;

      const outMap = this.#outgoing.get(currId);
      if (outMap) {
        const sortedTargets = Array.from(outMap.keys()).sort(compareStrings);
        for (const targetId of sortedTargets) {
          if (visited.has(targetId)) continue;

          const relMap = outMap.get(targetId)!;
          for (const rel of relMap.values()) {
            if (
              rel.predicate === "SEMANTIC_FK" ||
              rel.predicate === "REFERENCES"
            ) {
              const currentHop: PathHop = {
                sourceId: currId,
                targetId,
                predicate: rel.predicate,
                relationId: rel.id,
                weight: rel.weight ?? 1.0,
              };
              const nextHops = [...hops, currentHop];

              if (targetId === destEntityId) {
                return nextHops;
              }

              visited.add(targetId);
              queue.push({ id: targetId, hops: nextHops });
            }
          }
        }
      }
    }

    return [];
  }

  /* -------------------------------------------------------------------------
   * 序列化与反序列化 (JSON & W3C JSON-LD 1.1)
   * ------------------------------------------------------------------------- */

  toJSON(): SerializedOntologyGraph {
    return {
      version: 1,
      entities: this.getAllEntities(),
      relations: this.getAllRelations(),
      metadata: { ...this.#metadata },
    };
  }

  fromJSON(data: SerializedOntologyGraph): this {
    if (!data || data.version !== 1) {
      throw new Error("Invalid serialized ontology graph format");
    }

    const candidate = new OntologyGraph();
    for (const entity of data.entities ?? []) candidate.addEntity(entity);
    for (const relation of data.relations ?? [])
      candidate.addRelation(relation);
    this.#entities = candidate.#entities;
    this.#relations = candidate.#relations;
    this.#outgoing = candidate.#outgoing;
    this.#incoming = candidate.#incoming;
    this.#metadata = structuredClone(data.metadata ?? {});

    return this;
  }

  toJSONLD(contextBase = "https://kk-studio.ai/ontology#"): JsonLdDocument {
    const context: Record<string, unknown> = {
      "@vocab": contextBase,
      kk: contextBase,
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      xsd: "http://www.w3.org/2001/XMLSchema#",
      name: "rdfs:label",
      description: "rdfs:comment",
      connectsTo: {
        "@id": "kk:connectsTo",
        "@type": "@id",
      },
    };

    const graph: Array<Record<string, unknown>> = [];

    for (const ent of this.getAllEntities()) {
      const outRels = this.getOutgoingRelations(ent.id);
      const connections = outRels.map((r) => ({
        "@id": `kk:entity/${r.targetId}`,
        predicate: r.predicate,
        relationId: r.id,
        weight: r.weight,
      }));

      const nodeRecord: Record<string, unknown> = {
        "@id": `kk:entity/${ent.id}`,
        "@type": ["kk:Entity", `kk:${ent.type}`],
        name: ent.name,
        type: ent.type,
        description: ent.description ?? "",
        properties: ent.properties,
        attributes: ent.attributes ?? [],
        synonyms: ent.synonyms ?? [],
        connectsTo: connections,
      };

      graph.push(nodeRecord);
    }

    return {
      "@context": context,
      "@graph": graph,
    };
  }

  static fromJSONLD(doc: JsonLdDocument): OntologyGraph {
    const graph = new OntologyGraph();
    if (!doc || !Array.isArray(doc["@graph"])) {
      throw new Error("Invalid JSON-LD graph document");
    }

    const nodes = doc["@graph"];

    // 第一遍：载入实体
    for (const node of nodes) {
      const fullId = (node["@id"] as string) || "";
      const rawId = fullId.replace(/^kk:entity\//, "");
      if (!rawId) continue;

      graph.addEntity({
        id: rawId,
        name: (node.name as string) || rawId,
        type: (node.type as string) || "concept",
        description: (node.description as string) || undefined,
        properties: (node.properties as Record<string, unknown>) || {},
        attributes: (node.attributes as OntologyAttribute[]) || [],
        synonyms: (node.synonyms as string[]) || [],
      });
    }

    // 第二遍：恢复连线
    for (const node of nodes) {
      const fullId = (node["@id"] as string) || "";
      const sourceId = fullId.replace(/^kk:entity\//, "");
      const connectsTo = node.connectsTo as
        Array<Record<string, unknown>> | undefined;

      if (Array.isArray(connectsTo)) {
        for (const conn of connectsTo) {
          const targetFullId = (conn["@id"] as string) || "";
          const targetId = targetFullId.replace(/^kk:entity\//, "");
          const predicate = (conn.predicate as string) || "DEPENDS_ON";
          const relationId =
            (conn.relationId as string) ||
            `rel_${sourceId}_${predicate}_${targetId}`;
          const weight = typeof conn.weight === "number" ? conn.weight : 1.0;

          if (graph.hasEntity(sourceId) && graph.hasEntity(targetId)) {
            graph.addRelation({
              id: relationId,
              sourceId,
              targetId,
              predicate,
              weight,
            });
          }
        }
      }
    }

    return graph;
  }
}
