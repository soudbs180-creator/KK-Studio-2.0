import { createHash } from "node:crypto";
import { parse } from "yaml";
import { z } from "zod";

const pathKey = z
  .string()
  .refine(
    (path) =>
      !path.includes(":") &&
      !path.includes("\\") &&
      !Array.from(path).some((character) => character.charCodeAt(0) < 32) &&
      !path.split("/").some((part) => !part || part === "." || part === ".."),
  );
const sha256 = z.string().regex(/^[\da-f]{64}$/);
const receipt = z.object({
  version: z.literal(1),
  pen: z.object({ documentId: z.uuid(), readbackSha256: sha256 }),
  inputs: z.record(
    pathKey,
    z.string().regex(/^(?:[\da-f]{40}|[\da-f]{64}|deleted)$/),
  ),
  mappings: z.array(
    z.object({
      id: z.string().regex(/^[a-z][a-z0-9.-]*$/),
      route: z.string().trim().min(1),
      locator: z.string().trim().min(1),
      nodes: z.array(z.string().regex(/^[A-Za-z0-9]{4,12}$/)).min(1),
      files: z.array(pathKey).min(1),
      dependencies: z.array(pathKey).min(1),
      evidence: z.record(
        z.string(),
        z.object({
          status: z.string(),
          sha256: sha256.optional(),
        }),
      ),
    }),
  ),
});

const runtimeReceipt = z.object({
  mappingId: z.string(),
  platform: z.enum(["desktop", "web", "mobile"]),
  versionBindingSha256: sha256,
  rawEvidenceSha256: sha256,
  entrySha256: sha256,
  launch: z.string().trim().min(1),
  url: z.string().trim().min(1),
  passed: z.int().min(1),
  failed: z.literal(0),
});

function platformTargets(file) {
  if (
    /^mobile\/(?:src\/(?:app|screens|ui)\/.*\.(?:[jt]sx?|css|json)|assets\/.+)$/.test(
      file,
    )
  )
    return ["mobile"];
  if (
    /^(?:src\/.*\.(?:[jt]sx|css)|public\/design\/.+|index\.html)$/.test(file) ||
    /^src\/(?:components|app|styles|features\/commands)\/.*\.(?:[jt]s|json)$/.test(
      file,
    )
  )
    return ["desktop", "web"];
  return [];
}

function checkInputs(inputs, required, blob) {
  return Object.entries(inputs).flatMap(([path, expected]) =>
    expected === (blob(path) ?? "deleted") &&
    (expected !== "deleted" || required.has(path))
      ? []
      : ["stale or invalid input " + path],
  );
}

const sharedInputs = {
  desktop: "src/styles/tokens.css",
  web: "src/styles/tokens.css",
  mobile: "mobile/src/ui/theme.tsx",
};

export function uiEvidenceFingerprint(pen, mapping, inputs) {
  const paths = [
    ...new Set([...mapping.files, ...mapping.dependencies]),
  ].sort();
  const versions = paths.map((path) => [path, inputs[path]]);
  return createHash("sha256")
    .update(
      JSON.stringify([
        pen.documentId,
        pen.readbackSha256,
        mapping.id,
        mapping.route,
        mapping.locator,
        mapping.nodes,
        versions,
      ]),
      "utf8",
    )
    .digest("hex");
}

function verifiedEvidence(mapping, platform, proof, fingerprint) {
  const evidence = mapping.evidence[platform];
  if (evidence?.status !== "verified" || !evidence.sha256) return false;
  const section = platform + "-" + mapping.id.replaceAll(".", "-");
  const relative = "evidence/" + section + ".json";
  const lines = proof.sections.get(section)?.split("\n") ?? [];
  const artifact = proof.readArtifact(relative);
  if (!artifact || !lines.includes("证据文件 " + relative)) return false;
  if (
    createHash("sha256").update(artifact, "utf8").digest("hex") !==
    evidence.sha256
  )
    return false;
  const parsed = runtimeReceipt.safeParse(JSON.parse(artifact));
  return (
    parsed.success &&
    parsed.data.mappingId === mapping.id &&
    parsed.data.platform === platform &&
    parsed.data.versionBindingSha256 === fingerprint
  );
}

function verificationSections(path, read, changed) {
  const filename = path.replace(/ui-map\.yaml$/, "verification.md");
  if (!changed.includes(filename)) return new Map();
  const parts = read(filename)
    .replaceAll("\r\n", "\n")
    .split(/^## ([a-z0-9-]+)[ \t]*$/m);
  const sections = new Map();
  for (let index = 1; index < parts.length; index += 2) {
    const key = parts[index];
    if (sections.has(key))
      throw new Error("duplicate verification heading " + key);
    sections.set(key, parts[index + 1]);
  }
  return sections;
}

function checkMappings(map, required, covered, proof) {
  const ids = new Set();
  const issues = [];
  for (const mapping of map.mappings) {
    const { id, files, dependencies } = mapping;
    const key = id.replaceAll(".", "-");
    if (
      ids.has(key) ||
      ![...files, ...dependencies].every((path) =>
        Object.hasOwn(map.inputs, path),
      )
    ) {
      issues.push("invalid or duplicate UI mapping " + id);
      continue;
    }
    ids.add(key);
    const fingerprint = uiEvidenceFingerprint(map.pen, mapping, map.inputs);
    for (const path of files.filter((input) => required.has(input))) {
      const unverified = platformTargets(path).filter(
        (platform) =>
          !dependencies.includes(sharedInputs[platform]) ||
          !verifiedEvidence(mapping, platform, proof, fingerprint),
      );
      if (unverified.length)
        issues.push(
          "runtime evidence missing for " +
            path +
            " (" +
            unverified.join(", ") +
            ")",
        );
      covered.add(path);
    }
  }
  return issues;
}

export function checkUiDelivery(changed, read, blob, baseExists = () => false) {
  const required = new Set(
    changed.filter((file) => platformTargets(file).length),
  );
  if (!required.size) return [];
  const covered = new Set();
  const issues = [];
  for (const file of changed.filter((name) =>
    /^docs\/changes\/\d{4}-\d{2}-\d{2}-[^/]+\/ui-map\.yaml$/.test(name),
  )) {
    try {
      if (baseExists(file.slice(0, file.lastIndexOf("/")))) {
        issues.push(
          file + ": UI evidence must come from a new change package.",
        );
        continue;
      }
      const packagePath = file.slice(0, file.lastIndexOf("/") + 1);
      const proof = {
        sections: verificationSections(file, read, changed),
        readArtifact: (relative) => {
          const filename = packagePath + relative;
          return changed.includes(filename) ? read(filename) : "";
        },
      };
      const map = receipt.safeParse(parse(read(file)));
      if (!map.success) {
        issues.push(
          file +
            ": invalid UI receipt at " +
            map.error.issues.map((issue) => issue.path.join(".")).join(", "),
        );
        continue;
      }
      const problems = [
        ...checkInputs(map.data.inputs, required, blob),
        ...checkMappings(map.data, required, covered, proof),
      ];
      issues.push(...problems.map((problem) => file + ": " + problem));
    } catch (error) {
      issues.push(file + ": " + error.message);
    }
  }
  return [
    ...issues,
    ...[...required]
      .filter((file) => !covered.has(file))
      .map(
        (file) =>
          "UI change lacks a current Pen mapping in ui-map.yaml: " + file,
      ),
  ];
}
