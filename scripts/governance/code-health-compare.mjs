/**
 * Base 对 head 的棘轮裁决：每个单元有自己的上限，已超标单元只许变小，新单元必须达标。
 *
 * 移植自 hermes-agent 的 scripts/code_health/compare.py（MIT License），语义保持一致：
 * 单元一对一匹配（同一 base 单元最多被一个 head 单元认领），优先级为
 *   1. 同文件同名同体（未改动；先占，副本因此算新代码）
 *   2. 同文件同体（改名或匿名序号漂移）
 *   3. 跨文件同体且原名在源文件已消失（真实移动）
 *   4. 同文件同名（原地编辑；重名按函数体配对，不按序号）
 *   5. 跨文件同名且体相似（移动并编辑；仅当源文件该名消失、且来去各恰有一个）
 * 模式规则按指纹多重集比较：修掉一个又新增一个仍然失败。
 *
 * 与 hermes 的已知差异（v1 有意简化，均在本文件注释与交付包 spec 中记录）：
 *   - 相似度用归一化代码行的集合重叠近似 difflib SequenceMatcher；
 *   - 模式命中不做跨文件迁移抵扣与行级存活匹配，只与同文件 base 指纹多重集比较；
 *   - 以上差异只会让判定更严（多报），不会放行，advisory 模式下不影响门禁结论。
 */
import { MODULE_SCOPE, TARGETS } from "./code-health.config.mjs";

const SIMILAR = 0.6;

function baseName(qualname) {
  return qualname.replace(/#\d+$/, "");
}

/** 单元 span 内的归一化代码行（注释与空白剔除）。 */
function unitCodeLines(fileMeasure, unit) {
  const out = [];
  for (let n = unit.line; n <= unit.endLine; n += 1) {
    const code = fileMeasure.codeLine(n);
    if (code) out.push(code);
  }
  return out;
}

function similarity(oldLines, newLines) {
  if (!oldLines.length || !newLines.length) return null;
  const oldSet = new Map();
  for (const line of oldLines) oldSet.set(line, (oldSet.get(line) ?? 0) + 1);
  let common = 0;
  for (const line of newLines) {
    const left = oldSet.get(line) ?? 0;
    if (left > 0) {
      common += 1;
      oldSet.set(line, left - 1);
    }
  }
  return common / Math.max(oldLines.length, newLines.length);
}

class Matcher {
  constructor(base, head, baseOf) {
    this.base = base;
    this.head = head;
    this.baseOf = baseOf;
    this.taken = new Set();
    this.match = new Map();
    this.byHash = new Map();
    for (const [bpath, bf] of [...base.entries()].sort()) {
      for (const unit of bf.units.values()) {
        const list = this.byHash.get(unit.hash) ?? [];
        list.push([bpath, unit]);
        this.byHash.set(unit.hash, list);
      }
    }
  }

  baseFileOf(hpath) {
    return this.baseOf.get(hpath) ?? hpath;
  }

  nameGone(bpath, qualname) {
    if (qualname.includes("<anon>")) return true;
    const hpath = this.baseFileOf(bpath);
    const hf = this.head.get(hpath);
    return !hf || !hf.units.has(qualname);
  }

  claim(hpath, qualname, originPath, origin) {
    this.match.set(`${hpath}\u0000${qualname}`, [originPath, origin]);
    this.taken.add(`${originPath}\u0000${origin.qualname}`);
  }

  free(bpath, qualname) {
    return !this.taken.has(`${bpath}\u0000${qualname}`);
  }

  run() {
    const pending = [];
    for (const [hpath, hf] of [...this.head.entries()].sort()) {
      for (const [qualname, unit] of hf.units)
        pending.push([hpath, qualname, unit]);
    }
    let rest = pending.filter(([h, q, u]) => !this.passUnchanged(h, q, u));
    rest = rest.filter(([h, q, u]) => !this.passSameFileBody(h, q, u));
    rest = rest.filter(([h, q, u]) => !this.passMovedBody(h, q, u));
    this.passSameName(rest);
    this.passMovedEdited(
      rest.filter(([h, q]) => !this.match.has(`${h}\u0000${q}`)),
    );
    return this.match;
  }

  passUnchanged(hpath, qualname, unit) {
    const bpath = this.baseFileOf(hpath);
    const prior = this.base.get(bpath)?.units.get(qualname);
    if (!prior || prior.hash !== unit.hash || !this.free(bpath, qualname))
      return false;
    this.claim(hpath, qualname, bpath, prior);
    return true;
  }

  passSameFileBody(hpath, qualname, unit) {
    const bpath = this.baseFileOf(hpath);
    for (const [opath, origin] of this.byHash.get(unit.hash) ?? []) {
      if (opath === bpath && this.free(opath, origin.qualname)) {
        this.claim(hpath, qualname, opath, origin);
        return true;
      }
    }
    return false;
  }

  passMovedBody(hpath, qualname, unit) {
    for (const [opath, origin] of this.byHash.get(unit.hash) ?? []) {
      if (
        this.free(opath, origin.qualname) &&
        this.nameGone(opath, origin.qualname)
      ) {
        this.claim(hpath, qualname, opath, origin);
        return true;
      }
    }
    return false;
  }

  /** 原地编辑：同文件同名。重名按 base 名分组、按函数体配对，插入新单元不会冒领别人的上限。 */
  passSameName(pending) {
    const groups = new Map();
    for (const [hpath, qualname, unit] of pending) {
      const key = `${hpath}\u0000${baseName(qualname)}`;
      groups.set(key, [...(groups.get(key) ?? []), [qualname, unit]]);
    }
    for (const [key, heads] of [...groups.entries()].sort()) {
      const [hpath] = key.split("\u0000");
      const bpath = this.baseFileOf(hpath);
      const bf = this.base.get(bpath);
      if (!bf) continue;
      const name = baseName(heads[0][0]);
      const olds = [...bf.units.values()]
        .filter(
          (unit) =>
            baseName(unit.qualname) === name && this.free(bpath, unit.qualname),
        )
        .map((unit) => [unit.qualname, unit]);
      if (heads.length === 1 && olds.length === 1) {
        this.claim(hpath, heads[0][0], bpath, olds[0][1]);
        continue;
      }
      const scored = [];
      heads.forEach(([qualname, unit], hi) => {
        const newCode = unitCodeLines(this.head.get(hpath), unit);
        olds.forEach((oldUnit, oi) => {
          const oldCode = unitCodeLines(bf, oldUnit);
          scored.push([
            similarity(oldCode, newCode) ?? 0,
            hi,
            oi,
            qualname,
            oldUnit,
          ]);
        });
      });
      scored.sort((a, b) => b[0] - a[0] || a[1] - b[1] || a[2] - b[2]);
      const usedH = new Set();
      const usedO = new Set();
      for (const [score, hi, oi, qualname, oldUnit] of scored) {
        if (score >= SIMILAR && !usedH.has(hi) && !usedO.has(oi)) {
          usedH.add(hi);
          usedO.add(oi);
          this.claim(hpath, qualname, bpath, oldUnit);
        }
      }
    }
  }

  /** 移动并编辑：原名离开源文件、来去各恰有一个、体相似。复制（原名仍在）不算移动。 */
  passMovedEdited(pending) {
    const gone = new Map();
    for (const [bpath, bf] of [...this.base.entries()].sort()) {
      const hf = this.head.get(this.baseFileOf(bpath));
      const left = hf ? new Set([...hf.units.keys()].map(baseName)) : new Set();
      for (const unit of bf.units.values()) {
        if (
          !this.free(bpath, unit.qualname) ||
          left.has(baseName(unit.qualname))
        )
          continue;
        const name = baseName(unit.qualname);
        gone.set(name, [...(gone.get(name) ?? []), [bpath, unit]]);
      }
    }
    const arrived = new Map();
    for (const [hpath, qualname, unit] of pending) {
      const name = baseName(qualname);
      arrived.set(name, [
        ...(arrived.get(name) ?? []),
        [hpath, qualname, unit],
      ]);
    }
    for (const [name, heads] of [...arrived.entries()].sort()) {
      const olds = gone.get(name) ?? [];
      if (heads.length !== 1 || olds.length !== 1) continue;
      const [hpath, qualname, unit] = heads[0];
      const [bpath, origin] = olds[0];
      const score = similarity(
        unitCodeLines(this.base.get(bpath), origin),
        unitCodeLines(this.head.get(hpath), unit),
      );
      if (score !== null && score >= SIMILAR)
        this.claim(hpath, qualname, bpath, origin);
    }
  }

  originOf(hpath, qualname) {
    return this.match.get(`${hpath}\u0000${qualname}`)?.[1] ?? null;
  }
}

function detail(value, target, was, what) {
  if (was === null || was === undefined)
    return `${what} ${value} > target ${target}（新代码必须达标）`;
  if (was <= target)
    return `${what} ${value} > target ${target}（原为 ${was}）`;
  return `${what} ${value} > ${was}（其为 base 上的值，已超标只许变小；target ${target}）`;
}

function unitFindings(path, hf, matcher) {
  const findings = [];
  for (const [qualname, unit] of hf.units) {
    const prior = matcher.originOf(path, qualname);
    const pairs = [
      ["CC", unit.cc],
      ["FUNC_LINES", unit.funcLines],
      ["NESTING", unit.nesting],
    ];
    for (const [metric, value] of pairs) {
      const target = TARGETS[metric];
      if (value <= target) continue;
      const was = prior
        ? prior[
            metric === "CC"
              ? "cc"
              : metric === "FUNC_LINES"
                ? "funcLines"
                : "nesting"
          ]
        : null;
      if (value > Math.max(target, was ?? 0)) {
        findings.push({
          path,
          rule: metric,
          scope: qualname,
          line: unit.line,
          detail: detail(value, target, was, metric),
        });
      }
    }
  }
  return findings;
}

function fileFindings(path, hf, bf) {
  if (hf.error) {
    return [
      {
        path,
        rule: "MEASURE",
        scope: MODULE_SCOPE,
        line: 1,
        detail: `无法度量：${hf.error}`,
      },
    ];
  }
  const lines = hf.lines.length;
  const target = TARGETS.FILE_LINES;
  if (lines <= target) return [];
  const baseLines = bf && !bf.error ? bf.lines.length : 0;
  if (lines <= Math.max(target, baseLines)) return [];
  return [
    {
      path,
      rule: "FILE_LINES",
      scope: MODULE_SCOPE,
      line: 1,
      detail: detail(lines, target, baseLines || null, "lines"),
    },
  ];
}

/** 模式命中：head 中超出同文件 base 指纹多重集的部分是新违规。 */
function hitFindings(path, hf, bf, rulesById) {
  if (hf.error || !hf.hits.length) return [];
  const baseCounts = new Map();
  if (bf && !bf.error) {
    for (const hit of bf.hits) {
      const key = `${hit.rule}\u0000${hit.scope}\u0000${hit.text}`;
      baseCounts.set(key, (baseCounts.get(key) ?? 0) + 1);
    }
  }
  const headCounts = new Map();
  for (const hit of hf.hits) {
    const key = `${hit.rule}\u0000${hit.scope}\u0000${hit.text}`;
    headCounts.set(key, (headCounts.get(key) ?? 0) + 1);
  }
  const findings = [];
  for (const [key, count] of headCounts) {
    const [rule, scope] = key.split("\u0000");
    const extra = count - (baseCounts.get(key) ?? 0);
    const occurrences = hf.hits.filter(
      (hit) => `${hit.rule}\u0000${hit.scope}\u0000${hit.text}` === key,
    );
    for (let i = 0; i < extra; i += 1) {
      const hit = occurrences[Math.min(i, occurrences.length - 1)];
      findings.push({
        path,
        rule,
        scope,
        line: hit?.line ?? 1,
        detail: `${rulesById.get(rule)?.title ?? rule}：${(hit?.text ?? "").slice(0, 80)}`,
      });
    }
  }
  return findings;
}

/** 组装两侧度量结果为 FileMeasure 映射。 */
export function toFileMeasures(measured) {
  const out = new Map();
  for (const [path, m] of measured) {
    const units = new Map();
    for (const unit of m.units) units.set(unit.qualname, unit);
    out.set(path, {
      path,
      units,
      hits: m.hits,
      lines: m.lines,
      comments: m.comments,
      error: m.error,
      codeLine: (n) => {
        const raw = m.lines[n - 1] ?? "";
        const comment = m.comments.get(n);
        const stripped =
          comment && raw.includes(comment)
            ? raw.slice(0, raw.lastIndexOf(comment))
            : raw;
        return stripped.split(/\s+/).join(" ").trim();
      },
    });
  }
  return out;
}

/**
 * 裁决：返回 findings 数组。allowMap 为 Map<规则ID, 行号[]> 时命中行被豁免并记理由。
 */
export function compare(baseMeasures, headMeasures, baseOf, rulesById) {
  const matcher = new Matcher(baseMeasures, headMeasures, baseOf);
  matcher.run();
  const findings = [];
  for (const [path, hf] of [...headMeasures.entries()].sort()) {
    const bpath = baseOf.get(path) ?? path;
    const bf = baseMeasures.get(bpath) ?? null;
    findings.push(...fileFindings(path, hf, bf));
    findings.push(...unitFindings(path, hf, matcher));
    findings.push(...hitFindings(path, hf, bf, rulesById));
  }
  return findings;
}
