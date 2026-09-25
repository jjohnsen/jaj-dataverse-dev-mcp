import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const dataverseEnvironmentSchema = z.object({
  url: z.string().url(),
  tenantId: z.string().optional(),
  allowWrite: z.boolean().default(false),
});

export type DataverseEnvironment = z.infer<typeof dataverseEnvironmentSchema>;

const environmentsFileSchema = z.object({
  environments: z.record(z.string(), dataverseEnvironmentSchema),
});

const defaultEnvironmentsPath = resolve(process.cwd(), "environments.json");
const EXAMPLE_CONFIG = `{
  "environments": {
    "dev": {
      "url": "https://your-org.crm.dynamics.com/",
      "allowWrite": true
    }
  }
}`;

export function loadEnvironments(
  configPath = process.env.DATAVERSE_ENVIRONMENTS_PATH ??
    defaultEnvironmentsPath,
): Record<string, DataverseEnvironment> {
  const source = configPath
    ? "explicit argument"
    : process.env.DATAVERSE_ENVIRONMENTS_PATH
      ? "DATAVERSE_ENVIRONMENTS_PATH environment variable"
      : "default path (no DATAVERSE_ENVIRONMENTS_PATH set)";

  const effectivePath =
    configPath ??
    process.env.DATAVERSE_ENVIRONMENTS_PATH ??
    defaultEnvironmentsPath;
  const resolvedPath = resolve(effectivePath);

  let rawText: string;
  try {
    rawText = readFileSync(resolvedPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Environment config file not found at '${resolvedPath}' (source: ${source}).\n` +
        `To fix: set DATAVERSE_ENVIRONMENTS_PATH in your MCP client config to point ` +
        `at your environments.json, e.g.:\n` +
        `  "env": { "DATAVERSE_ENVIRONMENTS_PATH": "C:/path/to/environments.json" }\n` +
        `Expected file contents:\n${EXAMPLE_CONFIG}`,
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid JSON in environment config file '${resolvedPath}' (source: ${source}): ${message}\n` +
        `Expected file contents:\n${EXAMPLE_CONFIG}`,
    );
  }

  const parsed = environmentsFileSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Invalid environment config '${resolvedPath}' (source: ${source}): ${issues}\n` +
        `Expected file contents:\n${EXAMPLE_CONFIG}`,
    );
  }

  return parsed.data.environments;
}

export function getEnvironments(
  configPath = process.env.DATAVERSE_ENVIRONMENTS_PATH ??
    defaultEnvironmentsPath,
): Record<string, DataverseEnvironment> {
  return loadEnvironments(configPath);
}

export function getEnvironment(name: string): DataverseEnvironment {
  const environments = getEnvironments();
  const environment = environments[name as keyof typeof environments];

  if (!environment) {
    throw new Error(
      `Unknown environment '${name}'. Available: ${Object.keys(
        environments,
      ).join(", ")}`,
    );
  }

  return environment;
}
