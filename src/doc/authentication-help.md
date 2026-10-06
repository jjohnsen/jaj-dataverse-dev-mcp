# Dataverse authentication failed

Check your Dataverse authentication setup and retry the operation.

## Environment configuration

Verify that `environments.json` contains the correct Dataverse URL and authentication settings.

Azure CLI is the default when `auth` is omitted:

```json
{
  "url": "https://your-org.crm.dynamics.com/",
  "allowWrite": false
}
```

To use PAC CLI:

```json
{
  "url": "https://your-org.crm.dynamics.com/",
  "auth": "pac",
  "pacProfile": "My Profile",
  "allowWrite": false
}
```

`pacProfile` is optional. When it is omitted, the currently selected PAC authentication profile is used.

## Azure CLI

If `auth` is omitted or set to `azure-cli`:

```bash
az login
az account show
```

## PAC CLI

If `auth` is set to `pac`:

```bash
pac auth list
```

If `pacProfile` is configured, verify that the profile exists.

If `pacProfile` is not configured, select the correct profile:

```bash
pac auth select --name "<profile>"
```

Verify that PAC can acquire a token:

```bash
pac auth token
```
