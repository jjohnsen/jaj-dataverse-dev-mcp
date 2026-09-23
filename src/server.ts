import { createRequire } from "node:module";

import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { dataverseRequest } from "./dataverse.js";
import { getEnvironments } from "./environments.js";

import { registerPrompts } from "./prompts/index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function getEnvironmentSchema() {
  const names = Object.keys(getEnvironments());

  if (names.length === 0) {
    throw new Error("No Dataverse environments configured.");
  }

  return z
    .enum(names as [string, ...string[]])
    .describe(
      "Configured Dataverse environment. Values in this enum are already valid and do not need to be verified with list_environments.",
    );
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "jaj-dataverse-dev-mcp", version });
  const environmentSchema = getEnvironmentSchema();

  server.registerTool(
    "ping",
    { description: "Check that the MCP server is running." },
    async () => textResult("pong"),
  );

  server.registerTool(
    "list_environments",
    {
      description: [
        "Discover the configured Dataverse environments.",
        "Use this when the user asks which environments are available"
      ].join(" "),
    },
    async () => {
      const result = Object.entries(getEnvironments()).map(
        ([name, environment]) => ({
          name,
          url: environment.url,
          allowWrite: environment.allowWrite,
        }),
      );

      return textResult(result);
    },
  );

  server.registerTool(
    "whoami",
    {
      description: [
        "Get the Dataverse user, business unit and organization",
        "for the Azure CLI authenticated identity.",
      ].join(" "),
      inputSchema: z.object({ environment: environmentSchema }),
    },
    async ({ environment }) => {
      const result = await dataverseRequest({
        environment,
        method: "GET",
        path: "WhoAmI",
      });

      return textResult(result.body);
    },
  );

  server.registerTool(
    "dataverse_request",
    {
      description: [
        "Execute a Dataverse Web API request.",
        "The path is relative to /api/data/v9.2/.",
        "Supports OData queries, CRUD, functions and actions.",
        "Use $select and $top where appropriate to avoid unnecessarily large responses.",
        "Do not pass a complete URL.",
      ].join(" "),
      inputSchema: z.object({
        environment: environmentSchema,

        method: z.enum(["GET", "POST", "PATCH", "DELETE"]),

        path: z
          .string()
          .min(1)
          .describe(
            [
              "Path relative to /api/data/v9.2/.",
              "Example: accounts?$select=name,accountid&$top=10",
              "Actions such as AddSolutionComponent are also supported.",
            ].join(" "),
          ),

        body: z
          .record(z.string(), z.json())
          .optional()
          .describe("Optional JSON body for POST or PATCH requests."),

        // TODO:
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/compose-http-requests-handle-errors#request-annotations
        prefer: z
          .string()
          .optional()
          .describe(
            'Optional Dataverse Prefer header, e.g. return=representation or odata.include-annotations="*".',
          ),

        ifMatch: z
          .string()
          .optional()
          .describe('Optional If-Match value, e.g. "*" or an ETag.'),

        ifNoneMatch: z
          .string()
          .optional()
          .describe("Optional If-None-Match value."),

        accept: z
          .string()
          .optional()
          .describe("Optional Accept header. Defaults to application/json."),
      }),
    },
    async (input) => {
      const response = await dataverseRequest(input);

      return textResult(response);
    },
  );

  registerPrompts(server);

  return server;
}
