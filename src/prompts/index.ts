import type { McpServer } from "@modelcontextprotocol/server";

import { loadPrompt } from "./prompt-loader.js";

export function registerPrompts(server: McpServer): void {
  const prompt = loadPrompt(
    new URL("./review-mcp-session.md", import.meta.url),
  );

  server.registerPrompt(
    prompt.name,
    { title: prompt.title, description: prompt.description },
    () => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: prompt.content },
        },
      ],
    }),
  );
}
