import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const authenticationHelpPath = fileURLToPath(
  new URL("./authentication-help.md", import.meta.url),
);

let cachedAuthenticationHelp: string | undefined;

export function getAuthenticationHelp(): string {
  if (!cachedAuthenticationHelp) {
    cachedAuthenticationHelp = readFileSync(
      authenticationHelpPath,
      "utf8",
    ).trim();
  }

  return cachedAuthenticationHelp;
}
