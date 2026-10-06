import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { DataverseEnvironment } from "../environments.js";

const execFileAsync = promisify(execFile);

interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

// Serialize PAC profile selection + token acquisition inside this process.
// PAC CLI uses a globally selected auth profile, so concurrent profile
// switches in the same MCP process must not overlap.
let pacOperation = Promise.resolve();

function withPacLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = pacOperation.then(operation, operation);
  pacOperation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function cacheKey(environment: DataverseEnvironment): string {
  return [
    environment.url.replace(/\/$/, "").toLowerCase(),
    environment.pacProfile ?? "__active__",
  ].join("|");
}

function decodeJwtExpiry(token: string): number | undefined {
  const parts = token.split(".");

  if (parts.length < 2) {
    return undefined;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as { exp?: unknown };

    if (typeof payload.exp === "number") {
      return payload.exp * 1000;
    }
  } catch {
    // Token format is opaque to us. Fall back to a short cache lifetime.
  }

  return undefined;
}

function getCacheExpiry(token: string): number {
  const jwtExpiry = decodeJwtExpiry(token);

  if (jwtExpiry) {
    // Refresh five minutes before the token expires.
    return Math.max(Date.now(), jwtExpiry - 5 * 60_000);
  }

  // PAC normally returns a JWT, but keep the MVP resilient if that changes.
  return Date.now() + 5 * 60_000;
}

function extractAccessToken(stdout: string): string {
  const output = stdout.trim();

  if (!output) {
    throw new Error("PAC CLI returned an empty access token response.");
  }

  // Current PAC output is expected to contain the bearer token. Match a JWT
  // when possible while remaining tolerant of surrounding labels/output.
  const jwt = output.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);

  if (jwt?.[0]) {
    return jwt[0];
  }

  // If PAC returns only the raw token, use it as-is.
  if (!/\s/.test(output)) {
    return output;
  }

  throw new Error(
    "Unable to parse an access token from 'pac auth token' output.",
  );
}

async function runPac(args: string[]): Promise<string> {
  try {
    const result = await execFileAsync("pac", args, {
      timeout: 30_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });

    return result.stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `PAC CLI command failed: pac ${args.join(" ")}. ${message}`,
      { cause: error },
    );
  }
}

export async function getPacAccessToken(
  environment: DataverseEnvironment,
): Promise<string> {
  const key = cacheKey(environment);
  const cached = tokenCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  return withPacLock(async () => {
    // Another request may have populated the cache while waiting for the lock.
    const current = tokenCache.get(key);

    if (current && current.expiresAt > Date.now()) {
      return current.token;
    }

    if (environment.pacProfile) {
      await runPac([
        "auth",
        "select",
        "--name",
        environment.pacProfile,
      ]);
    }

    const token = extractAccessToken(
      await runPac(["auth", "token"]),
    );

    tokenCache.set(key, {
      token,
      expiresAt: getCacheExpiry(token),
    });

    return token;
  });
}
