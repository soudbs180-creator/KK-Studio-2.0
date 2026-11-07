import {
  DirectorMessageSchema,
  type CameraOptics,
} from "../../domain/cameraOptics.ts";

/** The node identity prevents another open control from consuming a director edit. */
export function bindDirectorBridge(options: {
  nodeId: string;
  read(): CameraOptics | undefined;
  apply(optics: CameraOptics): void;
  target?: Window;
}) {
  const target = options.target ?? window;
  const receive = (event: MessageEvent) => {
    if (event.origin !== target.location.origin || !event.source) return;
    const message = DirectorMessageSchema.safeParse(event.data);
    if (!message.success || message.data.nodeId !== options.nodeId) return;
    if (message.data.type === "storyai:director-apply")
      options.apply(message.data.optics);
    else
      (event.source as Window).postMessage(
        {
          type: "storyai:director-sync",
          nodeId: options.nodeId,
          optics: options.read() ?? null,
        },
        target.location.origin,
      );
  };
  target.addEventListener("message", receive);
  return () => target.removeEventListener("message", receive);
}
