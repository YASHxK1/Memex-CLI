# Architecture and Implementation Sequence

## Runtime and package constraints

- TypeScript in strict mode; avoid `any`.
- Node.js `>=20.17` and ES modules (`"type": "module"`).
- Commander owns command and option parsing; `@inquirer/prompts` provides interactive prompts.
- `keyring` is the OS keychain integration. Keep keyring access behind a small module so commands and tests can replace it.
- `tsx` runs development commands; `tsc` builds `dist/`; Vitest runs tests.

## Responsibility map

| Area | Responsibility |
|---|---|
| `src/index.ts` | Create the CLI program, register commands, and invoke the chosen action. |
| `src/commands/` | Command-level orchestration, prompts, progress, output, and exit behavior. |
| `src/api/` | Typed HTTP client for the Memex backend; validate or safely decode responses. |
| `src/auth/` | Store, retrieve, and delete the backend token through the OS keychain. |
| `src/fs/` | Expand source files, filter supported extensions, read content, and calculate hashes. |
| `src/config.ts` | Read/write non-secret configuration under `~/.memex/config.json` and apply environment overrides. |

Keep filesystem, keychain, HTTP, and console access at module boundaries so unit tests can mock them. A command should coordinate these services rather than duplicate their behavior.

## Suggested build sequence

1. **Project foundation:** package scripts, strict TypeScript configuration, shared error and output conventions, and test setup.
2. **Configuration/auth:** config path and schema, config persistence, environment overrides, keychain adapter, and `login`/`logout`.
3. **Backend client:** typed methods for health/status, document index/delete, source listing, search, and reindex, matching backend routes.
4. **Source management:** `add`, `remove`, `list`; define canonical source identity and persist it in config.
5. **File discovery and indexing:** recursively enumerate supported `.md` and `.txt` files, hash contents, and upload only new/changed files.
6. **Search and operational commands:** `search`, `status`, `reindex`, including JSON output for search.
7. **Hardening and distribution:** test all command failure paths, run `npm run check`, build, then verify `npm link` and package installation.

The README does not specify source deduplication, ignored directories, symlink handling, delete semantics when removing a folder, or the exact hash algorithm. Define these explicitly in tests before implementation depends on them. A pragmatic default is canonical absolute paths, recursive `.md`/`.txt` discovery, and SHA-256 over file bytes; confirm or revise these choices as product behavior is finalized.

## Data flow

### Indexing

`memex index` loads config and credentials, discovers supported files under registered sources, reads each file, computes its hash, and sends `{path, content, hash}` to `POST /v1/documents`. The backend responds `unchanged` when the hash matches or indexes the new content. The CLI must not chunk or embed files.

### Search

`memex search` loads backend URL and token, sends the query and options to `POST /v1/search`, and formats results. For `--json`, write machine-readable results to stdout without progress or human-readable decorations mixed into the JSON stream.

### Source removal

The product contract says removing a source deletes its vectors. For a registered file, call `DELETE /v1/documents?path=...`. For a folder, enumerate previously indexed files or otherwise retain sufficient local path state to issue a delete for each indexed file. Do not assume the backend has a folder-delete operation.

## Error/output contract

- Exit code `0`: command completed successfully.
- Exit code `1`: operational failure (configuration, keychain, filesystem, network, or backend error).
- Exit code `2`: command usage/argument error.
- Human-facing errors go to stderr; command results go to stdout.
- Keep logs and progress off stdout in JSON mode.
- Convert transport and backend failures into concise actionable messages while retaining useful HTTP status/context for debugging.
