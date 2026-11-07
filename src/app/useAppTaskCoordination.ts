import {
  useImageCommandSubmission,
  useNativeTaskRecovery,
  useTaskExecution,
} from "../features/creation/index.ts";
import { submitPorts, type AppTaskCoordinationParams } from "./taskPorts.ts";

export function useAppTaskCoordination(params: AppTaskCoordinationParams) {
  const {
    creationRef,
    updateProject,
    commitCreation,
    persistence,
    activeProjectIdRef,
    replaceCanvasItems,
    setAssets,
    homeModelConfig,
    saveState,
    onOpenSettingsProviders,
    onNavigateToWorkspace,
  } = params;

  const execution = useTaskExecution({
    creationRef,
    updateProject,
    commitCreation,
    persistence,
    activeProjectIdRef,
    replaceCanvasItems,
    setAssets,
    openSettingsProviders: onOpenSettingsProviders,
  });

  useNativeTaskRecovery(
    creationRef,
    execution.taskControllers,
    commitCreation,
    saveState === "saved" || saveState === "saving",
  );

  const submission = useImageCommandSubmission({
    creationRef,
    activeProjectIdRef,
    persistence,
    ...submitPorts(homeModelConfig),
    executeTask: execution.executeTask,
    cancelTask: execution.cancelTask,
    commitCreation,
    replaceCanvasItems,
    onNavigateToWorkspace,
    onOpenSettingsProviders,
  });

  return {
    ...execution,
    ...submission,
  };
}
