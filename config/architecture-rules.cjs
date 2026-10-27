module.exports = {
  forbidden: [
    {
      name: "R2",
      severity: "error",
      from: { path: "^src/features/" },
      to: { path: "^src/components/" },
    },
    {
      name: "R3",
      severity: "error",
      from: { path: "^src/integrations/" },
      to: { path: "^src/(features|components)/" },
    },
    {
      name: "R5",
      severity: "error",
      from: { path: "^src/features/capabilities/" },
      to: {
        pathNot: "^(src/features/capabilities/|packages/creation-contracts/)",
      },
    },
    {
      name: "R6/domain",
      severity: "error",
      from: { path: "^src/domain/" },
      to: { path: "^src/(?!domain/)" },
    },
    {
      name: "R6/contracts",
      severity: "error",
      from: { path: "^packages/creation-contracts/" },
      to: { path: "^src/" },
    },
    {
      name: "R6/frameworks",
      severity: "error",
      from: { path: "^(src/domain|packages/creation-contracts)/" },
      to: {
        path: "(^|/)node_modules/(react|react-dom|@tauri-apps)(/|$)|^(react|react-dom|@tauri-apps)(/|$)",
      },
    },
    {
      name: "R6/node",
      severity: "error",
      from: { path: "^(src/domain|packages/creation-contracts)/" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "R7",
      severity: "error",
      from: { path: "^vendor/canvas-plugins/(?!sdk/|host/)[^/]+/src/" },
      to: { path: "^src/" },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: { path: "(^|/)node_modules/" },
  },
  resolveOptions: {
    extensionAlias: {
      ".ts": [".ts", ".tsx"],
      ".js": [".js", ".ts", ".tsx"],
      ".jsx": [".jsx", ".tsx"],
      ".mjs": [".mjs", ".mts"],
      ".cjs": [".cjs", ".cts"],
    },
  },
};
