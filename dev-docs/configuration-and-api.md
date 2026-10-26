# Configuration, Credentials, and Backend Integration

## Local config

Non-secret settings live in `~/.memex/config.json`. The README's example is:

```json
{
  "backendUrl": "http://localhost:8000",
  "sources": ["/home/you/notes"],
  "defaults": { "topK": 5, "minScore": 0.3 }
}
```

Create the parent directory with user-only permissions where supported. Write configuration atomically (temporary file plus rename) so interruption does not truncate the user's settings. Validate loaded data and provide a recoverable error for malformed config; do not silently reset source registration.

Environment overrides documented by the README:

| Variable | Purpose |
|---|---|
| `MEMEX_BACKEND_URL` | Override backend URL. |
| `MEMEX_TOKEN` | Supply token in CI/headless environments without keychain. |

Keep environment credentials in memory only. Define precedence clearly: command-line options (if added) override environment, which overrides config, which overrides built-in defaults. The README does not specify CLI URL flags; do not add them without documenting them.

## Keychain handling

Use the `keyring` package as the OS keychain adapter. The token must never be stored in the JSON config, logs, command output, or error messages. Centralize the keychain service/account identifiers and test get/set/delete operations behind a mock. On a headless system, allow `MEMEX_TOKEN` to supply the secret without attempting an interactive prompt.

If keychain access is unavailable and there is no environment token, explain the supported setup path and exit with an operational error. Avoid prompting for secrets when stdin is not interactive.

## Backend API mapping

The current backend README defines these calls:

| CLI behavior | Backend request |
|---|---|
| Liveness | `GET /health` (public) |
| Statistics | `GET /v1/status` |
| Index/update a file | `POST /v1/documents` with `{path, content, hash}` |
| Delete indexed file | `DELETE /v1/documents?path=<encoded path>` |
| List indexed sources | `GET /v1/sources` |
| Semantic search | `POST /v1/search` with `{query, top_k, min_score}` |
| Rebuild embedding collection | `POST /v1/reindex` |

All `/v1/*` requests require `Authorization: Bearer <token>`. Add the token in one shared API client path rather than constructing headers independently in commands. Encode query parameters with the platform URL API. Use a finite request timeout and include the backend URL/status in sanitized errors; never include the Authorization header or token.

## Typed API models

Keep API input/output types in `src/api/` and isolate runtime parsing. Relevant backend response shapes are:

```ts
type SearchResponse = {
  results: Array<{
    score: number;
    path: string;
    heading: string | null;
    chunk_index: number;
    text: string;
  }>;
};

type SourcesResponse = {
  sources: Array<{ path: string; chunks: number }>;
};
```

Treat response data as untrusted at runtime even when TypeScript types are present. Tests should cover malformed JSON, non-success HTTP status, timeout/network failure, and correct auth header construction with a fake transport.

## URL and path rules

Paths sent to the backend must be stable identities across index and delete. Decide whether the CLI sends absolute paths or paths relative to a registered root; the README examples show paths like `notes/design.md` in results but do not define the request convention. Choose one convention, test it on Windows/macOS/Linux as applicable, and ensure paths are not accidentally changed by current working directory.
