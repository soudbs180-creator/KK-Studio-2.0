import { imageCapabilitiesForSelection } from "../features/models/index.ts";
import { readProviderConnections } from "../integrations/providers/providerStore.ts";
import type { ModelSelection } from "../../packages/creation-contracts/index.ts";
import type React from "react";
import type { SetStateAction } from "react";
import type {
  CreationProject,
  CreationSnapshot,
} from "../domain/creationTypes.ts";
import type { Asset } from "../domain/assets.ts";
import type { SaveState } from "../features/creation/index.ts";
import type { CanvasCollectionItem } from "../domain/canvasItems.ts";
import { agentConnection } from "../features/agent/index.ts";
import { loadStoredAsset } from "../features/creation/index.ts";

/** App composition owns the concrete services; feature code only receives these ports. */
export function canvasPorts(
  items: CanvasCollectionItem[] | undefined,
  flush?: () => Promise<void>,
) {
  return {
    items,
    flush,
    assets: { read: loadStoredAsset },
    agent: agentConnection,
    modelCapabilities: (selection: ModelSelection) =>
      imageCapabilitiesForSelection(selection, readProviderConnections()),
  };
}

export function submitPorts(homeModelConfig: {
  model: string;
  configured: boolean;
}) {
  return {
    homeModelConfig,
    generateFromCanvas: agentConnection.generateFromCanvas,
  };
}

export interface AppTaskCoordinationParams {
  creationRef: React.MutableRefObject<CreationSnapshot>;
  updateProject: (
    id: string,
    update: (project: CreationProject) => CreationProject,
  ) => void;
  commitCreation: (snapshot: CreationSnapshot) => void;
  persistence: {
    state: SaveState;
    flush: () => Promise<void>;
    loadEpoch?: number;
  };
  activeProjectIdRef: React.MutableRefObject<string | null | undefined>;
  replaceCanvasItems: (
    action: SetStateAction<CanvasCollectionItem[]>,
  ) => CanvasCollectionItem[];
  setAssets: React.Dispatch<SetStateAction<Asset[]>>;
  homeModelConfig: {
    model: string;
    configured: boolean;
  };
  saveState: string;
  onOpenSettingsProviders: () => void;
  onNavigateToWorkspace: () => void;
}
