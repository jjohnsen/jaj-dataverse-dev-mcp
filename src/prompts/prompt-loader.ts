import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import * as z from "zod/v4";

const PromptMetadataSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});

export function loadPrompt(url: URL) {
  const path = fileURLToPath(url);
  const raw = readFileSync(path, "utf8");

  const { data, content } = matter(raw);
  const metadata = PromptMetadataSchema.parse(data);

  return {
    ...metadata,
    content: content.trim(),
  };
}