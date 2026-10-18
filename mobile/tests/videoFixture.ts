export const videoBytes = new Uint8Array([
  0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0, 109, 112, 52,
  50, 0, 0, 0, 16, 109, 111, 111, 118, 0, 0, 0, 8, 116, 114, 97, 107, 0, 0, 0,
  12, 109, 100, 97, 116, 1, 2, 3, 4,
]);
export const videoConnection = {
  id: "video-connection",
  baseUrl: "https://cdn.12ai.org/v1",
  credentialRef: "video-key",
  protocol: "openai-compatible" as const,
  capabilities: { text: true, image: true },
};
export const videoInput = {
  submissionId: "video-submission",
  projectId: "video-project",
  connection: videoConnection,
  model: "seedance-2.0-fast",
  prompt: "一只纸船缓慢漂过平静湖面",
};
export function videoJson(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}
