import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULT_SOURCE, snapshotDirectory } from "./sources.mjs";
import { digest, listSnapshots, pullFile } from "./pull.mjs";
import { comparePixels } from "./pixel.mjs";
import {
  auditAliasAgreement,
  auditComponents,
  auditGeometry,
  auditTokens,
  loadLocalComponents,
  readDesignDocument,
  readAliasScope,
  readLocalRects,
  readLocalScopes,
  snapshotComponents,
  summarize,
} from "./diff.mjs";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

function usage() {
  return [
    "Usage:",
    "  node scripts/figma-audit/cli.mjs pull [--source <name>] [--label <label>]",
    "  node scripts/figma-audit/cli.mjs diff [--source <name>] [--snapshot <file>] [--out <file>]",
    "  node scripts/figma-audit/cli.mjs list [--source <name>]",
    "",
    "Environment:",
    "  FIGMA_TOKEN  Figma personal access token (read-only for audit purposes)",
  ].join("\n");
}

function parseArguments(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    if (!key?.startsWith("--")) throw new Error(`Invalid option ${key}`);
    options[key.slice(2)] = rest[index + 1];
  }
  return { command, options };
}

function resolveSnapshotFile(options) {
  if (options.snapshot) return path.resolve(options.snapshot);
  const snapshots = listSnapshots(repository, options.source ?? DEFAULT_SOURCE);
  const latest = snapshots.at(-1);
  if (!latest)
    throw new Error(
      "No snapshot found. Run `pull` first with FIGMA_TOKEN set, or pass --snapshot.",
    );
  return latest.file;
}

const LAYER_TITLES = {
  L1: "L1 · 结构一致",
  L2: "L2 · 令牌一致",
  L3: "L3 · 几何一致",
  L4: "L4 · 像素一致",
};

function renderHeader(snapshot, findings, extra) {
  const { counts, layers } = summarize(findings);
  const distribution =
    Object.entries(layers)
      .map(([layer, count]) => `${layer} ${count}`)
      .join("，") || "无";
  return [
    "# Figma ↔ 本地差异审计报告",
    "",
    `- 生成时间：${new Date().toISOString()}`,
    `- Figma 文件：\`${snapshot.fileKey}\`（${snapshot.fileName ?? "-"}）`,
    `- 快照时间：${snapshot.pulledAt ?? "-"}`,
    `- Figma 版本：${snapshot.version ?? "-"} / 最后修改：${snapshot.lastModified ?? "-"}`,
    `- 快照摘要：\`${extra.digest ?? "-"}\``,
    `- 结论：${counts.error} 项 error，${counts.warning} 项 warning（共 ${findings.length} 项）`,
    `- 分层分布：${distribution}`,
    "",
    "> 分层口径：L1 结构 / L2 令牌 / L3 几何 / L4 像素。",
    "> L1–L3 为确定性比对；L4 位图逐点相等受渲染管线差异限制，以容差门禁为准。",
    "",
  ];
}

function renderPixelLayer(pixel) {
  if (!pixel.length)
    return [
      "未提供像素对照（Figma 原稿 ↔ 本地渲染），本层未参与本次审计。",
      "",
    ];
  const lines = [
    "| 状态 | 参考尺寸 | 实际尺寸 | 差异像素 | 差异占比 | 判定 |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of pixel) {
    lines.push(
      `| ${item.name} | ${item.reference.width}×${item.reference.height} | ${item.actual.width}×${item.actual.height} | ${item.diffPixels} | ${(item.diffRatio * 100).toFixed(3)}% | ${item.verdict} |`,
    );
  }
  lines.push(
    "",
    "判定依据为差异占比是否超过该状态登记的 `maxDiffPixelRatio`。差异形态以差异图为准：",
    "点阵背景相位差与字形抗锯齿属渲染管线固有差异；结构性错位会表现为成片实心色块。",
    "",
  );
  return lines;
}

function renderFindingTable(items) {
  if (!items.length) return ["无差异项。", ""];
  const lines = [
    "| 严重度 | 对象 | 期望 | 实际 | 差值 | 依据 |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of items) {
    const subject = item.role ?? item.selector ?? item.component ?? "-";
    const evidence = item.nodeId ?? item.cssVariable ?? item.note ?? "-";
    lines.push(
      `| ${item.severity} | ${subject} | ${item.expected ?? "-"} | ${item.actual ?? "-"} | ${item.delta ?? "-"} | ${evidence} |`,
    );
  }
  lines.push("");
  return lines;
}

function renderNotes(findings) {
  const notes = findings.filter((item) => item.note);
  if (!notes.length) return [];
  const lines = ["## 逐项说明", ""];
  for (const item of notes) {
    const subject = item.role ?? item.selector ?? item.component ?? "-";
    lines.push(`- **${subject}** — ${item.note}`);
  }
  lines.push("");
  return lines;
}

function renderReport(snapshot, findings, extra) {
  const lines = renderHeader(snapshot, findings, extra);
  const byLayer = new Map();
  for (const finding of findings) {
    if (!byLayer.has(finding.layer)) byLayer.set(finding.layer, []);
    byLayer.get(finding.layer).push(finding);
  }

  for (const layer of ["L1", "L2", "L3", "L4"]) {
    lines.push(`## ${LAYER_TITLES[layer]}`, "");
    if (layer === "L4" && extra.pixel) {
      lines.push(...renderPixelLayer(extra.pixel));
      continue;
    }
    lines.push(...renderFindingTable(byLayer.get(layer) ?? []));
  }

  lines.push(...renderNotes(findings));
  return `${lines.join("\n")}\n`;
}

// Compares Figma reference images against locally rendered screenshots for
// every state registered in design/preview/baselines. The local render must be
// supplied through --actual <dir> because the audit itself does not start a
// browser; the browser gate lives in tests/design-md/pixel-parity.spec.ts.
function runPixelAudit(options) {
  if (!options.actual) return null;
  const baselineRoot = path.join(repository, "design", "preview", "baselines");
  if (!fs.existsSync(baselineRoot)) return null;

  const results = [];
  for (const name of fs.readdirSync(baselineRoot)) {
    if (!name.endsWith(".json")) continue;
    const entry = JSON.parse(
      fs.readFileSync(path.join(baselineRoot, name), "utf8"),
    );
    for (const state of entry.states ?? []) {
      const referenceFile = path.join(baselineRoot, state.reference);
      const actualFile = path.join(options.actual, `${state.name}.png`);
      if (!fs.existsSync(referenceFile) || !fs.existsSync(actualFile)) continue;
      const result = comparePixels(
        fs.readFileSync(referenceFile),
        fs.readFileSync(actualFile),
        {
          channelTolerance: state.channelTolerance ?? 8,
          allowCrop: state.allowCrop ?? true,
        },
      );
      if (!result.comparable) {
        results.push({
          name: state.name,
          reference: result.reference,
          actual: result.actual,
          diffPixels: result.diffPixels,
          diffRatio: result.diffRatio,
          verdict: `不可比（${result.reason}）`,
        });
        continue;
      }
      const tolerance = state.maxDiffPixelRatio ?? 0.01;
      results.push({
        name: state.name,
        reference: result.reference,
        actual: result.actual,
        diffPixels: result.diffPixels,
        diffRatio: result.diffRatio,
        verdict:
          result.diffRatio <= tolerance
            ? `通过（≤ ${(tolerance * 100).toFixed(3)}%）`
            : `超差（> ${(tolerance * 100).toFixed(3)}%）`,
      });
    }
  }
  return results;
}

async function runPull(options) {
  const source = options.source ?? DEFAULT_SOURCE;
  const result = await pullFile(source, {
    repository,
    label: options.label,
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        snapshot: result.path,
        fileKey: result.snapshot.fileKey,
        pages: result.snapshot.pages.length,
        nodes: result.snapshot.pages.reduce(
          (total, page) => total + page.nodeCount,
          0,
        ),
        variables: Object.keys(result.snapshot.variables?.variables ?? {})
          .length,
        digest: digest(result.snapshot),
      },
      null,
      2,
    ),
  );
  return 0;
}

function runDiff(options) {
  const snapshotFile = resolveSnapshotFile(options);
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
  const designFile = path.join(repository, "DESIGN.md");
  const cssFile = path.join(repository, "src", "styles", "tokens.css");

  const design = readDesignDocument(designFile);
  const scopes = readLocalScopes(cssFile);

  const findings = [];
  findings.push(...auditTokens(design, scopes));

  const aliasFile = path.join(repository, "src", "styles", "global.css");
  if (fs.existsSync(aliasFile)) {
    findings.push(...auditAliasAgreement(scopes, readAliasScope(aliasFile)));
  }

  const rectFile = options.rects
    ? path.resolve(options.rects)
    : path.join(repository, "docs", "reference", "figma-rects.json");
  const rects = readLocalRects(rectFile);
  if (Object.keys(rects).length) {
    const nodes = (snapshot.pages ?? []).flatMap((page) => page.nodes ?? []);
    findings.push(...auditGeometry(nodes, rects));
  }

  const components = snapshotComponents(snapshot);
  if (components.length) {
    findings.push(
      ...auditComponents(components, loadLocalComponents(repository)),
    );
  }

  const pixel = runPixelAudit(options);

  const report = renderReport(snapshot, findings, {
    digest: digest(snapshot),
    pixel,
  });

  const outFile = options.out
    ? path.resolve(options.out)
    : path.join(
        snapshotDirectory(repository),
        `${snapshot.source ?? DEFAULT_SOURCE}--audit.md`,
      );
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, report, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        report: outFile,
        snapshot: snapshotFile,
        ...summarize(findings),
        pixel: pixel
          ? {
              states: pixel.length,
              worstRatio: pixel.reduce(
                (worst, item) => Math.max(worst, item.diffRatio),
                0,
              ),
            }
          : null,
      },
      null,
      2,
    ),
  );
  return 0;
}

function runList(options) {
  const snapshots = listSnapshots(repository, options.source ?? DEFAULT_SOURCE);
  console.log(JSON.stringify({ snapshots }, null, 2));
  return 0;
}

export async function runFigmaAudit(argv) {
  const { command, options } = parseArguments(argv);
  try {
    if (command === "pull") return await runPull(options);
    if (command === "diff") return runDiff(options);
    if (command === "list") return runList(options);
    console.error(usage());
    return 1;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  process.exitCode = await runFigmaAudit(process.argv.slice(2));
