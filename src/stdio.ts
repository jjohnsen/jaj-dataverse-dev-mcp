import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import { createServer } from "./server.js";

export async function startStdioServer() {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startStdioServer();
}
