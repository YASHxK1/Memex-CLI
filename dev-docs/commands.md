# Commands and User Experience

This page defines the CLI surface from the product README. Exact Commander syntax beyond the documented options can be decided during implementation, but command names and responsibilities should stay stable.

## `memex login`

Interactively collect backend URL and API token, validate connectivity if practical, persist the URL in `~/.memex/config.json`, and store the token in the OS keychain. Never serialize the token into JSON or print it. If validation fails, explain how to retry without leaving a partially configured state.

The README guarantees prompts and keychain storage but does not define whether login overwrites an existing URL/token or which keychain service/account identifiers are used. Pick stable identifiers, document them, and test overwrite/re-login behavior.

## `memex logout`

Delete the token from the keychain. Preserve non-secret settings and registered sources unless the user explicitly chooses to clear configuration. Make repeated logout safe and report whether credentials were present without revealing them.

## `memex add <path>`

Register a file or folder as an indexing source. Validate that the path exists and is readable. Store source configuration in the config file. Avoid indexing during `add`; the separate `index` command is the clear workflow in the README.

## `memex remove <path>`

Unregister the source and remove vectors for its indexed files. For folders, the implementation needs a reliable record of file paths previously indexed, especially if files have since been deleted locally. Define how failures are reported when local removal succeeds but a backend delete fails; prefer retaining enough state to retry cleanup.

## `memex list`

Show configured local sources and backend indexed sources/chunk counts. The README describes registered sources and chunk counts but does not specify whether this is a union of local configuration and backend state. Make the distinction clear in output or choose a consistent source of truth.

## `memex index`

Walk configured sources and index new or changed `.md` and `.txt` files. Use a stable content hash to avoid uploading unchanged content. Define whether deleted local files are automatically deleted from the backend; the README only guarantees upload of new/changed files, so deletion sync must be treated as an explicit behavior choice.

Report counts for discovered, indexed, unchanged, and failed files. Continue after per-file failures where safe, then return a nonzero exit code if any files failed. Avoid printing note contents or secrets.

## `memex reindex`

Call backend `POST /v1/reindex`. Explain that this rebuilds the backend collection and may take time. Do not re-upload files from the CLI: the backend stores source content and owns re-embedding.

## `memex search <query>`

Call backend search, default to 5 results, and support:

- `-k <count>`: result count (`top_k`), default `5`.
- `--min-score <score>`: minimum similarity score; the backend accepts `0.0` through `1.0`.
- `--json`: machine-readable output for agents.

Human output should show rank, score, source path, chunk index, and chunk text. Include heading if available. JSON output should be a documented stable representation of the backend result list. The CLI README does not fix JSON envelope shape; mirror the backend `{ "results": [...] }` shape unless a consumer requirement calls for a different shape.

## `memex status`

Show backend health, model, and index statistics. Use `/health` for liveness and `/v1/status` for authenticated model/collection/count information. Make the distinction clear if liveness succeeds while the protected status request fails.

## Help and version

Commander should provide command help and `memex --version`. Usage errors should produce exit code `2`; help/version should succeed without requiring configuration or credentials.
