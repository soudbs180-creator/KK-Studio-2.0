// Public contract entry for feature: plugins
export {
  registerPluginNodes,
  unregisterPluginNodes,
  getPluginNodeDefinition,
  listPluginNodeDefinitions,
  hasPluginNodeType,
} from "./nodeRegistry.ts";
export { createPluginLoader, pluginLoader } from "./pluginLoader.ts";
export type {
  PluginEventBus,
  PluginLoaderOptions,
  PluginLoader,
} from "./pluginLoader.ts";
export {
  setPluginRuntime,
  getPluginRuntime,
  injectPluginCss,
  readPluginTheme,
} from "./pluginRuntime.ts";
export {
  pluginSafeStorage,
  createPluginStore,
  pluginStore,
} from "./pluginStore.ts";
export type {
  PluginStoreState,
  PluginStorage,
  PluginStore,
} from "./pluginStore.ts";
export type {
  PluginPosition,
  PluginNodeMetadata,
  PluginNodeData,
  PluginConnection,
  PluginTheme,
  PluginAgentOp,
  PluginNodeContext,
  PluginAi,
  PluginNodeToolbarItem,
  PluginNodeContentProps,
  PluginNodeDefinition,
  PluginApp,
  PluginRuntime,
  CanvasPlugin,
  CanvasPluginFactory,
  InstalledPlugin,
} from "./pluginTypes.ts";
