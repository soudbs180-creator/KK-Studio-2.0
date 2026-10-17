import type { MobileSnapshot } from "../core/mobileModel.ts";
export interface LinkOwnership {
  tasks: Set<string>;
  assets: Set<string>;
  connections: Set<string>;
  library?: Set<string>;
  messages?: Set<string>;
  projects?: Set<string>;
}
let ownership: LinkOwnership = {
  tasks: new Set(),
  assets: new Set(),
  connections: new Set(),
};
export function getNativeLinkOwnership(): LinkOwnership {
  return ownership;
}
export function updateLinkOwnership(snapshot?: MobileSnapshot | null): void {
  ownership = {
    tasks: new Set(snapshot?.projects.flatMap((p) => p.tasks.map((t) => t.id))),
    assets: new Set(snapshot?.assets.map((a) => a.id)),
    connections: new Set(snapshot?.connections.map((c) => c.id)),
    library: new Set(snapshot?.library?.map((e) => e.id)),
    projects: new Set(snapshot?.projects.map((p) => p.id)),
    messages: new Set(
      snapshot?.projects.flatMap((p) => p.messages.map((m) => m.id)),
    ),
  };
}
const routes = new Set([
  "/",
  "/login",
  "/link-error",
  "/projects",
  "/history",
  "/tasks",
  "/materials",
  "/connections",
  "/connections/new",
  "/settings",
  "/search",
  "/library",
  "/library/new",
  "/messages",
  "/extensions",
  "/comfy",
  "/comfy/new",
]);
function devOrigin(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "10.0.2.2", "[::1]"].includes(url.hostname) &&
    url.port === "8081" &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash
  );
}
/** Native URI ingress: native decodeURIComponent once, never decode-uri-component's recovery decoder. */
export function safeNativePath(
  path: string,
  owned: LinkOwnership,
  development = false,
): string {
  try {
    if (
      typeof path !== "string" ||
      path.length > 2048 ||
      /[\u0000-\u0020\u007f\\]/.test(path) ||
      /%(?![0-9a-fA-F]{2})/.test(path)
    )
      return "/link-error";
    const launcher = path.match(
      /^(?:kkstudio-mobile|exp\+kk-studio-mobile):\/\/expo-development-client\/\?url=([^&]+)$/,
    );
    if (launcher) {
      if (!development) return "/link-error";
      const target = new URL(decodeURIComponent(launcher[1]));
      return devOrigin(target) &&
        (target.pathname === "/" || target.pathname === "")
        ? "/"
        : "/link-error";
    }
    const decoded = decodeURIComponent(path);
    if (/[?#%\\]/.test(decoded) || /(^|\/)\.\.?(\/|$)/.test(decoded))
      return "/link-error";
    let route = decoded;
    if (!decoded.startsWith("/")) {
      const url = new URL(decoded);
      if (url.username || url.password || url.search || url.hash)
        return "/link-error";
      if (url.protocol === "kkstudio-mobile:" && !url.port)
        route = `${url.hostname ? `/${url.hostname}` : ""}${url.pathname}`;
      else if (
        url.protocol === "https:" &&
        url.hostname === "kkai.plus" &&
        !url.port
      )
        route = url.pathname;
      else if (
        development &&
        (url.protocol === "exp:" || url.protocol === "exps:") &&
        ["localhost", "127.0.0.1", "10.0.2.2", "[::1]"].includes(
          url.hostname,
        ) &&
        url.port === "8081" &&
        url.pathname.startsWith("/--/")
      )
        route = url.pathname.slice(3);
      else return "/link-error";
    }
    if (route.startsWith("/(workspace)/"))
      route = route.slice("/(workspace)".length);
    route = route.replace(/\/$/, "") || "/";
    if (routes.has(route)) return route;
    const comfy = route.match(
      /^\/comfy\/(?:tasks\/)?([A-Za-z0-9._:-]{1,200})$/,
    );
    if (comfy)
      return (route.startsWith("/comfy/tasks/")
        ? owned.tasks
        : owned.connections
      ).has(comfy[1])
        ? route
        : "/link-error";
    const local = route.match(
      /^\/(library|messages|projects|canvas|proposals)\/([A-Za-z0-9._:-]{1,200})(\/edit)?$/,
    );
    if (local) {
      if (local[3] && local[1] !== "library") return "/link-error";
      const ownedIds =
        local[1] === "library"
          ? owned.library
          : local[1] === "messages"
            ? owned.messages
            : owned.projects;
      return ownedIds?.has(local[2]) ? route : "/link-error";
    }
    const match = route.match(
      /^\/(tasks|materials|connections)\/([A-Za-z0-9._:-]{1,200})(\/edit)?$/,
    );
    if (!match) return "/link-error";
    if (match[3] && match[1] !== "materials") return "/link-error";
    const ids =
      match[1] === "tasks"
        ? owned.tasks
        : match[1] === "materials"
          ? owned.assets
          : owned.connections;
    return ids.has(match[2]) ? route : "/link-error";
  } catch {
    return "/link-error";
  }
}
