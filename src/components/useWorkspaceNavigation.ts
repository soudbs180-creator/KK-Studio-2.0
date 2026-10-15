import { useEffect, useState } from "react";

/** The existing shell navigation state, shared by its page and sidebar views. */
export function useWorkspaceNavigation() {
  const [active, setActive] = useState("landing");
  const [extensionView, setExtensionView] = useState<
    "skills" | "connectors" | "partners"
  >("skills");
  const [partnerProjectId, setPartnerProjectId] = useState<string | null>(null);
  const [workspaceVisited, setWorkspaceVisited] = useState(false);
  useEffect(() => {
    if (active === "workspace") setWorkspaceVisited(true);
  }, [active]);
  return {
    active,
    setActive,
    extensionView,
    setExtensionView,
    partnerProjectId,
    setPartnerProjectId,
    workspaceVisited,
  };
}
