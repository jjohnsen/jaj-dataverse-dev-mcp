# JAJ Dataverse Dev MCP

MCP server for day-to-day Dataverse and Power Platform development. It connects to one or more Dataverse environments using your existing Azure CLI identity and exposes Dataverse capabilities to MCP-compatible agents such as GitHub Copilot.

The server is intentionally a thin layer over the Dataverse Web API, giving agents broad access to data, metadata, solutions, components, actions, and common development and troubleshooting tasks without hiding the underlying platform behind a large abstraction.

Specialized tools can be added where better semantics, validation, and safety are useful, while the generic Web API access remains available as an escape hatch.

**Agent → MCP → Azure CLI identity → Dataverse Web API**

## Prerequisites

- Node.js 22+
- Azure CLI installed and signed in
- Access to one or more Dataverse environment URLs

## Getting started

### 1. Install

```bash
npm install
```

### 2. Authenticate with Azure CLI

```bash
az login
```

Useful variants:

```bash
az login --tenant <tenant-id> # Specific tenant, if your tenant is not the default
az login --allow-no-subscriptions # Tenant without subscriptions
az login --use-device-code # Remote/headless environments
```

### 3. Configure Dataverse environments

Copy `environments.example.json` to `environments.json` and adjust names and URLs.

If an environment is in a different tenant than the default Azure CLI tenant, add a `tenantId` for that environment.

`DATAVERSE_ENVIRONMENTS_PATH` can also be used to override the config file path at runtime.

Example:

```json
{
  "environments": {
    "dev": {
      "url": "https://YOUR-DEV.crm.dynamics.com/",
      "allowWrite": true
    },
    "test": {
      "url": "https://YOUR-TEST.crm4.dynamics.com",
      "allowWrite": false
    },
    "prod": {
      "url": "https://YOUR-PROD.crm4.dynamics.com",
      "allowWrite": false,
      "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  }
}
```

### 4. Run the server locally

```bash
npm run start
```

Keep this process running while an agent uses the MCP server.

### 5. Add the server to GitHub Copilot in VS Code

Create `.vscode/mcp.json` in the workspace where you want to use the server:

```json
{
  "servers": {
    "dataverse-dev": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

For other MCP-compatible agents, add a **Streamable HTTP** server using the same endpoint.

### 6. Verify and test the server in your agent

Keep `npm run start` running, open your agent in the workspace, and confirm that the `dataverse-dev` tools are available. In GitHub Copilot Chat, use **Agent** mode and select **Tools** to enable them.

Try these prompts:

- `List the available Dataverse environments`
- `Call whoami for the dev environment`

The first prompt should return the environments from `environments.json`. The second should return the authenticated Dataverse user, business unit, and organization.

### 7. Add Dataverse instructions for GitHub Copilot

Copy [`docs/examples/copilot-instructions.md`](docs/examples/copilot-instructions.md) to `.github/copilot-instructions.md` in the workspace where you use the MCP server, then customize it for your project:

* replace `YOUR-dev`, `YOUR-test`, and `YOUR-prod` with the connection names from `connections.json`
* replace `YOUR_DEFAULT_SOLUTION` with the unique name of the primary Dataverse solution
* adjust the default connection and safety rules for the project

These repository-wide instructions help GitHub Copilot select the appropriate Dataverse tools and connections consistently, while applying project-specific safeguards.

Commit the customized file to the project repository so all contributors use the same guidance.

## MCP tools

The server currently exposes these tools:

- `ping` - checks that the MCP server is running
- `list_environments` - lists configured Dataverse environments and whether writes are enabled
- `whoami` - calls the Dataverse `WhoAmI` endpoint for a selected environment
- `dataverse_request` - executes a Dataverse Web API request with method, path, optional body and headers

## Safety

A few safeguards are built in:

- POST, PATCH, and DELETE requests are blocked when `allowWrite` is disabled
- Requests are restricted to the Dataverse /api/data/v9.2/ endpoint
- The local HTTP server validates the request host and origin

## What can it be used for?

Although the MCP is intentionally a thin wrapper around the Dataverse Web API, it can support a broad range of development and troubleshooting tasks, for example:

- query and update Dataverse records
- inspect tables, columns, metadata, publishers, and solutions
- create and configure unmanaged solutions
- add existing components to solutions
- work with Dataverse actions and functions
- export solutions for deployment to other environments

This makes it useful for both direct development tasks and agent-driven workflows where the agent inspects Dataverse, decides on the next action, and performs it through the MCP.

## Development

### Run development server

```bash
npm run dev
```

### MCP Inspector

```bash
npm run inspect
```

To list tools using Inspector directly:

```bash
npm run inspect:tools
```

## Packaged binary via npx

The package also supports running the MCP server directly as a packaged binary via `npx`, which is the easiest installation path for local MCP clients.

```bash
npx -y jaj-dataverse-dev-mcp
```

Use --help for options

## Local package install from a tarball

To test the package locally before publishing, build it, pack it, and install the generated tarball in a clean folder:

```bash
npm install
npm run build
npm pack
```

This creates a file such as:

```bash
jaj-dataverse-dev-mcp-1.0.0.tgz
```

Then install it in a separate temporary project:

```bash
mkdir -p /tmp/jaj-mcp-test
cd /tmp/jaj-mcp-test
npm init -y
npm install /workspaces/jaj-dataverse-mcp/jaj-dataverse-dev-mcp-1.0.0.tgz
```

Now you can invoke the installed binary the same way a real user would:

```bash
npx jaj-dataverse-dev-mcp --help
npx jaj-dataverse-dev-mcp
npx jaj-dataverse-dev-mcp --http --port 3000
```

This validates the packaged CLI entry point and the runtime behavior without publishing to npm.