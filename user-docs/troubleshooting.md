# Troubleshooting

## `Backend URL is not configured`

Run `memex login` or set `MEMEX_BACKEND_URL` for the current shell. Check that the URL includes the scheme and host, such as `http://localhost:8000`.

## `No API token configured` or authorization failure

Run `memex login` with a valid backend token. Confirm the token matches the backend's configured API token. For headless use, set `MEMEX_TOKEN` in the process environment.

## Cannot connect or request timed out

Check that the backend is running and reachable at the configured URL. Run `memex status` to check liveness and index statistics. If the backend is remote, check its HTTPS and network configuration.

## Keychain support is unavailable

Use a platform with keychain support or set `MEMEX_TOKEN` for the current process. The CLI does not write the token to `config.json` as a fallback.

## A source cannot be added

Check that the path exists and is readable. Direct sources must be `.md` or `.txt` files, or a directory. Symbolic links cannot be registered; nested symbolic links are skipped while scanning.

## Indexing reports failed files

Read the per-file errors printed to stderr, then address file permissions, availability, or backend connectivity and run `memex index` again. Failed scans are not used to delete stale backend documents.

## A removed local file still appears in search

Run `memex index` after deleting local files. Stale backend documents are removed for registered sources that the CLI scanned successfully.

## Find command help

```sh
memex --help
memex search --help
```
