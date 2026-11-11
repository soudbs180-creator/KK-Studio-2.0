import type { Page } from "@playwright/test";
import { createHash } from "node:crypto";

/** Record multipart fields without credentials or the random transport boundary. */
export async function editRequestEvidence(body: Buffer, contentType: string) {
  const form = await new Response(new Uint8Array(body), {
    headers: { "content-type": contentType },
  }).formData();
  const fields = [];
  for (const [name, value] of form) {
    fields.push([
      name,
      typeof value === "string"
        ? value
        : {
            name: value.name,
            type: value.type,
            size: value.size,
            sha256: createHash("sha256")
              .update(new Uint8Array(await value.arrayBuffer()))
              .digest("hex"),
          },
    ]);
  }
  return fields;
}

export async function editArchiveEvidence(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kk-studio-assets", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<{ blob: Blob; metadata: unknown }[]>(
      (resolve, reject) => {
        const request = db.transaction("blobs").objectStore("blobs").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    db.close();
    return Promise.all(
      rows.map(async ({ blob, metadata }) => ({
        metadata,
        size: blob.size,
        type: blob.type,
        sha256: Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
          ),
        )
          .map((v) => v.toString(16).padStart(2, "0"))
          .join(""),
      })),
    );
  });
}
