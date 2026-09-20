import { createServer as createHttpServer } from "node:http";
import { realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";

import { createMcpHandler } from "@modelcontextprotocol/server";

import { createServer } from "./server.js";

export function startHttpServer(portOverride?: number) {
  const host = "127.0.0.1";
  const port = portOverride ?? Number(process.env.PORT ?? 3000);

  const mcpHandler = createMcpHandler(createServer);
  const nodeHandler = toNodeHandler(mcpHandler);

  const validateHost = localhostHostValidation();
  const validateOrigin = localhostOriginValidation();

  const httpServer = createHttpServer((req, res) => {
    if (!validateHost(req, res) || !validateOrigin(req, res)) {
      return;
    }

    const path = req.url?.split("?")[0] ?? "/";

    if (path === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", name: "jaj-dataverse-dev-mcp" }));
      return;
    }

    if (path !== "/mcp") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    void nodeHandler(req, res);
  });

  httpServer.listen(port, host, () => {
    console.log(`jaj-dataverse-dev-mcp: http://${host}:${port}/mcp`);
  });

  return httpServer;
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
  startHttpServer();
}
