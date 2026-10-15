import { useEffect, useState } from "react";
import { createSkillRegistry, SKILLS_CHANGED_EVENT } from "./skillRegistry";
import { ensureTemplates } from "./templateSkills";

// Own the existing registry's lifecycle once; all pages receive this instance.
export function useSkillRegistry() {
  const [registry] = useState(() => {
    const value = createSkillRegistry();
    if (!value.persistenceWarning) ensureTemplates(value, false);
    return value;
  });
  const [, refresh] = useState(0);
  useEffect(() => {
    try {
      if (!registry.persistenceWarning) ensureTemplates(registry);
      registry.persistPending();
    } catch {
      // The existing persistenceWarning remains visible on the Skill page.
      console.warn(
        "Skill persistence was unavailable; existing records are retained.",
      );
    }
  }, [registry]);
  useEffect(() => {
    const sync = () => refresh((value) => value + 1);
    window.addEventListener(SKILLS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SKILLS_CHANGED_EVENT, sync);
  }, []);
  return { registry, refresh };
}
