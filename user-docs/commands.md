# Commands and Workflows

| Command | What it does |
|---|---|
| `memex login` | Prompts for backend URL and API token, checks the connection, and stores credentials. |
| `memex logout` | Removes the token from the OS keychain. |
| `memex add <path>` | Registers a supported file or folder for indexing. |
| `memex remove <path>` | Unregisters a source and deletes its indexed documents from the backend. |
| `memex list` | Shows registered local sources and backend indexed documents with chunk counts. |
| `memex index` | Uploads new or changed files and deletes stale indexed documents. |
| `memex reindex` | Asks the backend to rebuild its embedding collection from stored documents. |
| `memex search <query>` | Searches indexed notes. |
| `memex status` | Shows backend liveness, model, collection, and document/chunk counts. |

## Search options

```text
-k, --top-k <count>    Number of results (1–100; default 5)
--min-score <score>    Similarity threshold from 0 to 1
--json                 Return a JSON object with a `results` array
```

For example:

```sh
memex search "meeting notes about launch" --top-k 10 --min-score 0.35
```

## Updating notes

Run `memex index` after editing or adding notes. Content hashes let the backend skip unchanged files. If a local file has been removed, the next successful scan of its registered source removes the corresponding backend document.

## Removing a source

```sh
memex remove ~/notes/old-project
```

The CLI finds indexed documents under that file or folder using the backend source list, deletes them, and then unregisters the local source. If a backend deletion fails, the source stays registered so you can retry cleanup.

## Using search with an AI agent

Give the agent shell access and add an instruction like this to its project guidance:

```text
Before answering questions about my notes, run:
    memex search "<focused query>" --json -k 5
Use relevant returned chunks as context and cite their file paths. If results do not answer the question, say so.
```

JSON is written to stdout. Errors are written to stderr, so scripts can capture each stream separately. Exit code `0` means success, `1` means an operational failure, and `2` means invalid command usage.
