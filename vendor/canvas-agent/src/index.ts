#!/usr/bin/env node
import { runProvidersCommand } from "./agent/provider-cli.js";
import { startHttpServer } from "./server/http.js";
import { startMcpServer } from "./server/mcp.js";

if (process.argv[2] === "mcp") await startMcpServer();
else if (process.argv[2] === "providers") process.exitCode = await runProvidersCommand(process.argv.slice(3));
else startHttpServer();
