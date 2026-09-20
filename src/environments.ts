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

export function loadEnvironments(
  configPath = process.env.DATAVERSE_ENVIRONMENTS_PATH ??
    defaultEnvironmentsPath,
): Record<string, DataverseEnvironment> {
  const resolvedPath = resolve(configPath);

  let rawText: string;
  try {
    rawText = readFileSync(resolvedPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Environment config file not found: ${resolvedPath}. ${message}`,
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid JSON in environment config file '${resolvedPath}': ${message}`,
    );
  }

  const parsed = environmentsFileSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment config '${resolvedPath}': ${issues}`);
  }

  return parsed.data.environments;
}

export const environments = loadEnvironments();

export function getEnvironment(name: string): DataverseEnvironment {
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
