# JAJ Dataverse Dev MCP
Lightweight MCP server for day-to-day Dataverse and Power Platform development.

Connect your agents to multiple Dataverse environments using your existing Azure CLI identity.
The server exposes a thin, agent-friendly layer over the Web API for data, metadata, solutions, components, troubleshooting, and development tasks.

**Agent → MCP → Azure CLI identity → Dataverse Web API**

## Quick Start for VS Code + GitHub Copilot

Add the server to `.vscode/mcp.json`:

```json
{
  "servers": {
		"dataverse-dev": {
			"command": "npx",
			"args": [ "-y", "jaj-dataverse-dev-mcp" ]
		}
	}
}
```

Save the file and press **Start**. The first start may take some time while `npx` downloads the package.

Sign in with the [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli):

```bash
az login
```

Create `environments.json` in your project root with the environments you need:

```json
{
  "environments": {
    "dev": {
      "url": "https://org8ffb6d07.crm.dynamics.com/",
      "allowWrite": true
    }
  }
}
```

Open Copilot and try:

- List the available Dataverse environments
- Call whoami for the dev environment
- Show me the names and IDs of the five most recently created accounts
- List the unmanaged solutions

That's it!

> Other MCP-compatible agents follow the same pattern: run jaj-dataverse-dev-mcp over stdio and provide access to your local Azure CLI session and connection configuration.

## Why this project?
There are already several Dataverse MCP implementations, including Microsoft's own tooling.

This project grew out of day-to-day development work where agents frequently needed capabilities beyond the available specialized tools.
In many cases, the agent could solve the task successfully by constructing Dataverse Web API requests directly.

This MCP embraces that approach.

Instead of hiding Dataverse behind a large abstraction, it provides broad access to the Web API through a thin wrapper.

It is also designed for developers and consultants who regularly move between projects, customers, and Dataverse environments.

One MCP server can work with multiple Dataverse environments while using existing Azure CLI identity.
No separate app registration, client ID, or client secret is required.


## Prerequisites

- Node.js 20+
- [Azure CLI installed](https://learn.microsoft.com/cli/azure/install-azure-cli) and signed in
- Access to one or more Dataverse environment URLs

## Authentication
```
# Authentication is based on your current Azure CLI identity:

az login

# Useful variants:

az login --tenant <tenant-id>       # Specific tenant, if your tenant is not the default
az login --allow-no-subscriptions   # Tenant without subscriptions
az login --use-device-code          # Remote/headless environments

# To inspect the currently active Azure CLI account:

az account show
```

## Dataverse environments

Environments are configured in `environments.json` in the project root and identified by friendly names such as dev, test, prod.  
Agents use these names when selecting which Dataverse environment to work with.

If an environment is in a different tenant than the default Azure CLI tenant, add a `tenantId` for that environment.

`DATAVERSE_ENVIRONMENTS_PATH` can be used to override the config file path at runtime.

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

## Add project-specific Copilot instructions
For better agent behavior, add Dataverse-specific instructions to the project where you use the MCP.

See: [docs/examples/copilot-instructions.md](https://github.com/jjohnsen/jaj-dataverse-dev-mcp/blob/HEAD/docs/examples/copilot-instructions.md)

Copy [`docs/examples/copilot-instructions.md`](docs/examples/copilot-instructions.md) to `.github/copilot-instructions.md` in the workspace where you use the MCP server, then customize it for your project:

* replace `YOUR-dev`, `YOUR-test`, and `YOUR-prod` with the environment names from `environments.json`
* replace `YOUR_DEFAULT_SOLUTION` with the unique name of the primary Dataverse solution
* adjust the default environment and safety rules for the project

Commit the customized file to the project repository so all contributors use the same guidance.

## Run directly with npx

The package can also be launched manually with stdio as default transport:

```
npx -y jaj-dataverse-dev-mcp
```
For development or clients that use Streamable HTTP add `--http`.

## What can it be used for?

Although the MCP is intentionally a thin wrapper around the Dataverse Web API, it can support a broad range of development and troubleshooting tasks, for example:

- query and update Dataverse records
- inspect tables, columns, metadata, publishers, and solutions
- create and configure unmanaged solutions
- add existing components to solutions
- work with Dataverse actions and functions
- export solutions for deployment to other environments

This makes it useful for both direct development tasks and agent-driven workflows where the agent inspects Dataverse, decides on the next action, and performs it through the MCP.