#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import { startHttpServer } from "./http.js";
import { startStdioServer } from "./stdio.js";

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

export function printHelp() {
  console.log(`Usage: jaj-dataverse-dev-mcp [options]

Starts the Dataverse MCP server.

Options:
  --stdio              Start the stdio transport (default)
  --http               Start the Streamable HTTP transport
  --port <number>      Port for the HTTP server (default: 3000)
  --help, -h           Show this help message
`);
}

export function parseArgs(argv: string[] = process.argv.slice(2)) {
  let transport: "stdio" | "http" = "stdio";
  let port = Number(process.env.PORT ?? 3000);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      return { help: true, transport, port };
    }

    if (arg === "--stdio") {
      transport = "stdio";
      continue;
    }

    if (arg === "--http") {
      transport = "http";
      continue;
    }

    if (arg === "--port") {
      const portValue = argv[i + 1];
      if (!portValue) {
        throw new Error("Missing value for --port.");
      }

      const nextPort = Number(portValue);
      if (!Number.isInteger(nextPort) || nextPort <= 0) {
        throw new Error(`Invalid port: ${portValue}`);
      }

      port = nextPort;
      i += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      const portValue = arg.slice("--port=".length);
      const nextPort = Number(portValue);
      if (!Number.isInteger(nextPort) || nextPort <= 0) {
        throw new Error(`Invalid port: ${portValue}`);
      }
      port = nextPort;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  return { help: false, transport, port };
}

export async function main(argv: string[] = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);

    if (options.help) {
      printHelp();
      return 0;
    }

    if (options.transport === "http") {
      startHttpServer(options.port);
      return 0;
    }

    await startStdioServer();
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    printHelp();
    return 1;
  }
}

if (isDirectExecution()) {
  process.exitCode = await main();
}
