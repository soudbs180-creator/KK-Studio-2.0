import { useEffect, useState } from "react";
import {
  createSkillRegistry,
  ensureTemplates,
  SKILLS_CHANGED_EVENT,
} from "../features/skills/index.ts";

export function useAppSkills() {
  const [skillRegistry] = useState(() => {
    const registry = createSkillRegistry();
    if (!registry.persistenceWarning) ensureTemplates(registry, false);
    return registry;
  });
  const [, refreshSkills] = useState(0);
  useEffect(() => {
    try {
      if (!skillRegistry.persistenceWarning) ensureTemplates(skillRegistry);
      skillRegistry.persistPending();
    } catch (error) {
      console.warn("[App] Failed to persist pending skills:", error);
    }
  }, [skillRegistry]);
  useEffect(() => {
    const syncSkills = () => refreshSkills((value) => value + 1);
    window.addEventListener(SKILLS_CHANGED_EVENT, syncSkills);
    return () => window.removeEventListener(SKILLS_CHANGED_EVENT, syncSkills);
  }, []);
  return skillRegistry;
}
