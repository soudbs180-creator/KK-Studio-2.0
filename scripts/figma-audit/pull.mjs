import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  DEFAULT_SOURCE,
  collectNodes,
  resolveSource,
  snapshotPath,
} from "./sources.mjs";

const API = "https://api.figma.com/v1";

// The personal access token is read from the environment only. It is never
// written to disk, never logged, and never embedded in snapshot output.
export function readToken() {
  const token = process.env.FIGMA_TOKEN ?? process.env.FIGMA_PAT;
  if (!token)
    throw new Error(
      "Missing Figma credential. Set FIGMA_TOKEN (personal access token) in the environment.",
    );
  return token.trim();
}

async function request(pathname, token, attempt = 0) {
  const response = await fetch(`${API}${pathname}`, {
    headers: { "X-Figma-Token": token },
  });
  if (response.status === 429 || response.status >= 500) {
    if (attempt >= 4)
      throw new Error(`Figma API ${response.status} after retries`);
    const wait = Math.min(30_000, 2_000 * 2 ** attempt);
    await new Promise((resolve) => setTimeout(resolve, wait));
    return request(pathname, token, attempt + 1);
  }
  if (response.status === 403)
    throw new Error(
      "Figma API 403. The token lacks access to this file, or the seat has no Dev Mode access.",
    );
  if (response.status === 404)
    throw new Error("Figma API 404. Check the file key and node IDs.");
  if (!response.ok)
    throw new Error(`Figma API ${response.status} ${await response.text()}`);
  return response.json();
}

export async function pullFile(sourceName, options = {}) {
  const source = resolveSource(sourceName);
  const token = readToken();
  const file = await request(`/files/${source.fileKey}?depth=2`, token);
  const pages = file.document?.children ?? [];
  const pulled = [];

  for (const page of pages) {
    const pageId = page.id;
    const label = page.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const node = await request(
      `/files/${source.fileKey}/nodes?ids=${encodeURIComponent(pageId)}&geometry=paths`,
      token,
    );
    const document = node.nodes?.[pageId]?.document ?? page;
    const nodes = collectNodes(document);
    pulled.push({
      pageId,
      pageName: page.name,
      label,
      nodeCount: nodes.length,
      nodes,
    });
  }

  const variables = await pullVariables(source, token);
  const styles = await pullStyles(source, token);

  const snapshot = {
    schema: "kk-studio.figma-snapshot/1",
    source: sourceName,
    fileKey: source.fileKey,
    fileName: file.name ?? source.fileName,
    lastModified: file.lastModified ?? null,
    version: file.version ?? null,
    pulledAt: new Date().toISOString(),
    registeredNodes: source.registeredNodes,
    pages: pulled,
    variables,
    styles,
  };

  const target = snapshotPath(
    options.repository,
    sourceName,
    options.label ?? "latest",
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return { path: target, snapshot };
}

async function pullVariables(source, token) {
  try {
    const response = await request(
      `/files/${source.fileKey}/variables/local?` + "return_mode=variable",
      token,
    );
    const meta = response.meta?.variables ?? {};
    const collections = response.meta?.variableCollections ?? {};
    const variables = {};
    for (const [id, variable] of Object.entries(meta)) {
      const collection = collections[variable.variableCollectionId];
      variables[variable.name] = {
        id,
        type: variable.resolvedType,
        collection: collection?.name ?? null,
        valuesByMode: variable.valuesByMode ?? {},
      };
    }
    return { variables, collections };
  } catch (error) {
    // Variable access requires a seat with library permissions. A 403 here is
    // expected on Starter and must not abort the whole pull.
    return { unavailable: error.message, variables: {}, collections: {} };
  }
}

async function pullStyles(source, token) {
  try {
    const response = await request(`/files/${source.fileKey}/styles`, token);
    const styles = {};
    for (const style of response.meta?.styles ?? []) {
      styles[style.name] = {
        id: style.id,
        type: style.styleType,
        description: style.description ?? null,
      };
    }
    return styles;
  } catch (error) {
    return { unavailable: error.message };
  }
}

export function digest(snapshot) {
  const payload = JSON.stringify({
    pages: snapshot.pages.map((page) => ({
      pageId: page.pageId,
      nodeCount: page.nodeCount,
    })),
    variables: Object.keys(snapshot.variables?.variables ?? {}).sort(),
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function snapshotFile(repository, sourceName, label) {
  return snapshotPath(repository, sourceName, label);
}

export function listSnapshots(repository, sourceName = DEFAULT_SOURCE) {
  const directory = path.join(
    repository,
    "docs",
    "reference",
    "figma-snapshots",
  );
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter(
      (name) => name.startsWith(`${sourceName}--`) && name.endsWith(".json"),
    )
    .map((name) => {
      const file = path.join(directory, name);
      const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
      return {
        file,
        label: name.replace(`${sourceName}--`, "").replace(/\.json$/, ""),
        pulledAt: snapshot.pulledAt,
        version: snapshot.version,
        lastModified: snapshot.lastModified,
      };
    })
    .sort((a, b) => String(a.pulledAt).localeCompare(String(b.pulledAt)));
}
