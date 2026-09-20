import { getAccessToken } from "./auth.js";
import { getEnvironment, type DataverseEnvironment } from "./environments.js";

export type DataverseMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface DataverseRequest {
  environment: string;
  method: DataverseMethod;
  path: string;
  body?: unknown;

  /**
   * Examples:
   * return=representation
   * odata.include-annotations="*"
   */
  prefer?: string;

  ifMatch?: string;
  ifNoneMatch?: string;
  accept?: string;
}

export interface DataverseResponse {
  status: number;
  statusText: string;
  contentType: string | null;
  headers: Record<string, string>;
  body: unknown;
}

function isWrite(method: DataverseMethod): boolean {
  return method !== "GET";
}

function buildUrl(environment: DataverseEnvironment, path: string): URL {
  const baseUrl = environment.url.replace(/\/$/, "");
  const apiBase = new URL(`${baseUrl}/api/data/v9.2/`);
  const normalizedPath = path.replace(/^\/+/, "");

  if (normalizedPath.includes("://") || normalizedPath.includes("\\")) {
    throw new Error("path must be relative to the Dataverse Web API endpoint");
  }

  const requestUrl = new URL(normalizedPath, apiBase);

  // Prevent ../ or similar input from escaping /api/data/v9.2/.
  if (
    requestUrl.origin !== apiBase.origin ||
    !requestUrl.pathname.startsWith(apiBase.pathname)
  ) {
    throw new Error("Request path must remain inside /api/data/v9.2/");
  }

  return requestUrl;
}

function responseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  const usefulHeaders = [
    "location",
    "odata-entityid",
    "odata-version",
    "retry-after",
    "request-id",
    "x-ms-service-request-id",
  ];

  for (const name of usefulHeaders) {
    const value = headers.get(name);

    if (value) {
      result[name] = value;
    }
  }

  return result;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/json") ||
    contentType.includes("+json")
  ) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
}

export async function dataverseRequest(
  request: DataverseRequest,
): Promise<DataverseResponse> {
  const environment = getEnvironment(request.environment);

  if (isWrite(request.method) && !environment.allowWrite) {
    throw new Error(
      `Write operations are disabled for environment '${request.environment}'`,
    );
  }

  const url = buildUrl(environment, request.path);
  const token = await getAccessToken(environment);

  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    Accept: request.accept ?? "application/json",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
  });

  if (request.prefer) {
    headers.set("Prefer", request.prefer);
  }

  if (request.ifMatch) {
    headers.set("If-Match", request.ifMatch);
  }

  if (request.ifNoneMatch) {
    headers.set("If-None-Match", request.ifNoneMatch);
  }

  let body: string | undefined;

  if (request.body !== undefined) {
    headers.set("Content-Type", "application/json");

    body = JSON.stringify(request.body);
  }

  const response = await fetch(url, { method: request.method, headers, body });

  const parsedBody = await parseResponse(response);

  if (!response.ok) {
    const details =
      typeof parsedBody === "string"
        ? parsedBody
        : JSON.stringify(parsedBody, null, 2);

    throw new Error(
      `Dataverse ${response.status} ${response.statusText}\n${details}`,
    );
  }

  return {
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get("content-type"),
    headers: responseHeaders(response.headers),
    body: parsedBody,
  };
}
