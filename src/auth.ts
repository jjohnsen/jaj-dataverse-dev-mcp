import { AzureCliCredential } from "@azure/identity";

import type { DataverseEnvironment } from "./environments.js";
import { getPacAccessToken } from "./auth/pac.js";

const credentials = new Map<string, AzureCliCredential>();

function getCredential(environment: DataverseEnvironment): AzureCliCredential {
  const key = environment.tenantId ?? "default";

  let credential = credentials.get(key);

  if (!credential) {
    credential = new AzureCliCredential(
      environment.tenantId ? { tenantId: environment.tenantId } : undefined,
    );

    credentials.set(key, credential);
  }

  return credential;
}

async function getAzureCliAccessToken(
  environment: DataverseEnvironment,
): Promise<string> {
  const credential = getCredential(environment);
  const environmentUrl = environment.url.replace(/\/$/, "");
  const token = await credential.getToken(environmentUrl + "/.default");

  if (!token) {
    throw new Error(
      "Unable to acquire Azure CLI token for " + environmentUrl,
    );
  }

  return token.token;
}

export async function getAccessToken(
  environment: DataverseEnvironment,
): Promise<string> {
  if (environment.auth === "pac") {
    return getPacAccessToken(environment);
  }

  return getAzureCliAccessToken(environment);
}
