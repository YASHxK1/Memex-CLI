# Configuration and Automation

## Config file

Non-secret settings are stored at `~/.memex/config.json`:

```json
{
  "backendUrl": "http://localhost:8000",
  "sources": ["/home/you/notes"],
  "defaults": {
    "topK": 5,
    "minScore": 0.3
  }
}
```

The API token is stored in your OS keychain, never in this JSON file.

## Environment variables

| Variable | Purpose |
|---|---|
| `MEMEX_BACKEND_URL` | Override the backend URL from the config file. |
| `MEMEX_TOKEN` | Supply an API token for CI, scripts, or machines without a keychain. |
| `MEMEX_CONFIG_DIR` | Use a different directory for `config.json`. |

The CLI uses the backend URL and token in `MEMEX_BACKEND_URL` and `MEMEX_TOKEN` when set. These values take precedence over saved URL and keychain credentials, respectively.

Example for one command:

```sh
MEMEX_BACKEND_URL="https://memex.example.com" MEMEX_TOKEN="$MEMEX_API_TOKEN" memex status
```

## Search defaults

Set default result count and minimum score in the config file's `defaults` object. The search command's `-k` and `--min-score` options override these defaults for that invocation.

## Backend and privacy

The CLI sends note contents during indexing and search queries to the configured backend. Keep the backend URL pointed at a service you trust. For use beyond localhost, configure HTTPS on the backend deployment. Embedding and vector search are performed by the backend according to its configuration.
