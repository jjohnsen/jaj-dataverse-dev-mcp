import { realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import { createServer } from "./server.js";

export async function startStdioServer() {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  return server;
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return import.meta.url === pathToFileURL(entry).href;
  }
}

if (isDirectExecution()) {
  await startStdioServer();
}
