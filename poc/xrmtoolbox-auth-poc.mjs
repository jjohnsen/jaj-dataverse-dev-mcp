const clientId = "51f81489-12ee-4a9e-aaae-a2591f45987d";

const environmentUrl = (
  process.argv[2] ??
  process.env.POC_DATAVERSE_URL ??
  ""
).replace(/\/$/, "");

const tenant = process.argv[3] ?? process.env.POC_TENANT ?? "organizations";

if (!environmentUrl) {
  console.error(
    "Usage: node poc/xrmtoolbox-auth-poc.mjs <dataverse-url> [tenant-id|organizations]",
  );
  console.error(
    "Example: node poc/xrmtoolbox-auth-poc.mjs https://org.crm.dynamics.com",
  );
  process.exit(1);
}

const authority = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`;
const scope = `${environmentUrl}/user_impersonation openid profile offline_access`;

function formBody(values) {
  return new URLSearchParams(values).toString();
}

async function postForm(url, values) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody(values),
  });

  const body = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

async function requestDeviceCode() {
  const result = await postForm(`${authority}/devicecode`, {
    client_id: clientId,
    scope,
  });

  if (!result.ok) {
    throw new Error(
      `Device code request failed (${result.status}):\n${JSON.stringify(
        result.body,
        null,
        2,
      )}`,
    );
  }

  return result.body;
}

async function pollForToken(deviceCode) {
  let intervalSeconds = Number(deviceCode.interval ?? 5);
  const expiresAt = Date.now() + Number(deviceCode.expires_in ?? 900) * 1000;

  while (Date.now() < expiresAt) {
    await new Promise((resolve) =>
      setTimeout(resolve, intervalSeconds * 1000),
    );

    const result = await postForm(`${authority}/token`, {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: clientId,
      device_code: deviceCode.device_code,
    });

    if (result.ok) {
      return result.body;
    }

    const error = result.body?.error;

    if (error === "authorization_pending") {
      continue;
    }

    if (error === "slow_down") {
      intervalSeconds += 5;
      continue;
    }

    throw new Error(
      `Token request failed (${result.status}):\n${JSON.stringify(
        result.body,
        null,
        2,
      )}`,
    );
  }

  throw new Error("Device code expired before authentication completed.");
}

function decodeJwtPayload(token) {
  const [, payload] = token.split(".");

  if (!payload) {
    return undefined;
  }

  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
  } catch {
    return undefined;
  }
}

async function whoAmI(accessToken) {
  const response = await fetch(
    `${environmentUrl}/api/data/v9.2/WhoAmI`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Dataverse WhoAmI failed (${response.status} ${response.statusText}):\n${text}`,
    );
  }

  return JSON.parse(text);
}

console.log("XrmToolBox / Microsoft Dataverse public client auth POC");
console.log(`Environment: ${environmentUrl}`);
console.log(`Tenant:      ${tenant}`);
console.log(`Client ID:   ${clientId}`);
console.log("");

const deviceCode = await requestDeviceCode();

console.log(deviceCode.message ?? "Complete the device login in your browser.");
console.log("");
console.log("Waiting for sign-in...");

const tokenResponse = await pollForToken(deviceCode);
const accessToken = tokenResponse.access_token;

if (!accessToken) {
  throw new Error("Microsoft identity platform did not return an access token.");
}

const claims = decodeJwtPayload(accessToken);

console.log("");
console.log("Token acquired.");
console.log("Token claims:");
console.log(
  JSON.stringify(
    {
      aud: claims?.aud,
      tid: claims?.tid,
      scp: claims?.scp,
      exp: claims?.exp,
    },
    null,
    2,
  ),
);

console.log("");
console.log("Calling Dataverse WhoAmI...");

const identity = await whoAmI(accessToken);

console.log("");
console.log("SUCCESS: Dataverse accepted the token.");
console.log(JSON.stringify(identity, null, 2));
