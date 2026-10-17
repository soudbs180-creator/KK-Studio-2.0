import type { MobileSnapshot } from "../core/mobileModel.ts";
export interface SearchResult {
  kind: "project" | "message" | "task" | "asset" | "library";
  id: string;
  title: string;
  snippet: string;
  projectId?: string;
}
export function searchSnapshot(
  snapshot: MobileSnapshot,
  query: string,
): SearchResult[] {
  const term = query.trim().slice(0, 256).toLocaleLowerCase();
  if (!term) return [];
  const results: SearchResult[] = [];
  const add = (result: SearchResult, source: string) => {
    if (results.length < 100 && source.toLocaleLowerCase().includes(term))
      results.push({
        ...result,
        snippet: result.snippet.replace(/\s+/g, " ").slice(0, 160),
      });
  };
  for (const project of snapshot.projects) {
    add(
      {
        kind: "project",
        id: project.id,
        title: project.name,
        snippet: project.group ?? "项目",
        projectId: project.id,
      },
      `${project.name}\n${project.group ?? ""}`,
    );
    for (const message of project.messages)
      if (message.deletedAt === undefined)
        add(
          {
            kind: "message",
            id: message.id,
            title: `${project.name} · ${message.role}`,
            snippet: message.text,
            projectId: project.id,
          },
          message.text,
        );
    for (const task of project.tasks)
      add(
        {
          kind: "task",
          id: task.id,
          title: `${project.name} · ${task.model}`,
          snippet: task.prompt,
          projectId: project.id,
        },
        `${task.prompt}\n${task.model}\n${task.outputs?.map((o) => o.text ?? "").join("\n") ?? ""}`,
      );
  }
  for (const asset of snapshot.assets)
    if (!asset.hidden && !asset.deleting)
      add(
        { kind: "asset", id: asset.id, title: asset.name, snippet: asset.mime },
        `${asset.name}\n${asset.mime}\n${asset.provenance.model ?? ""}`,
      );
  for (const entry of snapshot.library ?? [])
    add(
      {
        kind: "library",
        id: entry.id,
        title: entry.name,
        snippet: entry.content,
      },
      `${entry.name}\n${entry.content}`,
    );
  return results;
}
