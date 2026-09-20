import { createServer as createHttpServer } from "node:http";

import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";

import { createMcpHandler } from "@modelcontextprotocol/server";

import { createServer } from "./server.js";

export function startHttpServer() {
  const host = "127.0.0.1";
  const port = Number(process.env.PORT ?? 3000);

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

if (import.meta.url === `file://${process.argv[1]}`) {
  startHttpServer();
}
