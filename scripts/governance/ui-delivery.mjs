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
const receipt = z.object({
  version: z.literal(1),
  pen: z.object({
    documentId: z.uuid(),
    readbackSha256: z.string().regex(/^[\da-f]{64}$/),
  }),
  inputs: z.record(
    pathKey,
    z.string().regex(/^(?:[\da-f]{40}|[\da-f]{64}|deleted)$/),
  ),
  evidence: z.record(
    z.string(),
    z.object({
      status: z.string(),
      locator: z.string().trim(),
    }),
  ),
  mappings: z.array(
    z.object({
      id: z.string().trim().min(1),
      route: z.string().trim().min(1),
      nodes: z.array(z.string().regex(/^[A-Za-z0-9]{4,12}$/)).min(1),
      files: z.array(pathKey).min(1),
    }),
  ),
});

function platformTargets(file) {
  if (/^mobile\/(?:src\/.*\.(?:[jt]sx|css)|assets\/.+)$/.test(file))
    return ["mobile"];
  if (/^(?:src\/.*\.(?:[jt]sx|css)|public\/design\/.+|index\.html)$/.test(file))
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

function checkMappings(map, required, covered) {
  const ids = new Set();
  const issues = [];
  for (const { id, files } of map.mappings) {
    if (
      ids.has(id) ||
      !files.every((path) => Object.hasOwn(map.inputs, path))
    ) {
      issues.push("invalid or duplicate UI mapping " + id);
      continue;
    }
    ids.add(id);
    for (const path of files.filter((input) => required.has(input))) {
      const unverified = platformTargets(path).filter((key) => {
        const evidence = map.evidence[key];
        return evidence?.status !== "verified" || !evidence.locator;
      });
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

export function checkUiDelivery(changed, read, blob) {
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
        ...checkMappings(map.data, required, covered),
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
