# Memex-CLI

The command-line client for **Memex**, a self-hosted memory bank for LLMs. Memex-CLI reads your Markdown/text notes, sends them to your [Memex-backend](./README-backend.md) for indexing, and lets any LLM with shell access run `memex search` to pull relevant context from your own knowledge.

The CLI is a thin client: it handles arguments, prompts, credentials, and file discovery. Chunking, embedding (Qwen3-Embedding), and vector search (Qdrant) all happen in the backend.

---

## Architecture

```
 LLM / you ──► memex search "query" ──► Memex-CLI ──HTTPS──► Memex-backend ──► Qdrant
                                          │
                                          └── OS keychain (API token)
```

## Tech stack

| Area | Choice |
|---|---|
| Language | TypeScript (100%), strict mode |
| Runtime | Node.js `>=20.17`, ES modules (`"type": "module"`) |
| CLI framework | Commander (arguments, subcommands) |
| Interactive UX | `@inquirer/prompts` |
| Secrets | `keyring` (OS keychain) |
| Build / dev | `tsc`, `tsx` |
| Testing | Vitest |
| Distribution | npm package `Memex-CLI` |

## Installation

```bash
npm install -g Memex-CLI
memex --version
```

From source:

```bash
git clone https://github.com/<your-username>/Memex-CLI.git
cd Memex-CLI
npm install
npm run build
npm link
```

Requires a running Memex-backend. See the backend README for setup.

## Quick start

```bash
memex login                     # prompts for backend URL + API token, stores token in OS keychain
memex add ~/notes               # register a notes folder
memex index                     # upload new/changed files for indexing
memex search "what is memex and what is its tech stack"
```

## Commands

| Command | Description |
|---|---|
| `memex login` | Interactive setup: backend URL and API token (token saved to OS keychain) |
| `memex logout` | Remove the stored token |
| `memex add <path>` | Register a folder or file as a source |
| `memex remove <path>` | Unregister a source and delete its vectors |
| `memex list` | Show registered sources and chunk counts |
| `memex index` | Upload new and changed `.md`/`.txt` files (hash-based, incremental) |
| `memex reindex` | Ask the backend to rebuild the collection |
| `memex search "<query>"` | Return the top-k relevant chunks |
| `memex status` | Show backend health, model, and index statistics |

### Search options

```bash
memex search "query" -k 8        # number of results (default 5)
memex search "query" --json      # machine-readable output for agents
memex search "query" --min-score 0.4
```

### Example output

```
$ memex search "how do i improve the tech stack of my memex project" -k 2

[1] score=0.81  notes/memex-design.md  (chunk 3)
Memex uses Qwen3-Embedding for vectors and Qdrant for storage...

[2] score=0.74  notes/ideas.md  (chunk 1)
Possible upgrade: add a reranker after retrieval...
```

## Using Memex with an LLM

Give your LLM or agent shell access and add this to its instructions file (`CLAUDE.md`, `AGENTS.md`, etc.):

```
You have access to my personal knowledge base through the `memex` CLI.
Before answering questions about my projects or notes, run:
    memex search "<focused query>" --json -k 5
Use the returned chunks as context and cite file names.
If results are irrelevant, say so instead of guessing.
```

## Configuration

Non-secret settings live in `~/.memex/config.json`. The API token is **never** written to disk; it is stored in the OS keychain.

```json
{
  "backendUrl": "http://localhost:8000",
  "sources": ["/home/you/notes"],
  "defaults": { "topK": 5, "minScore": 0.3 }
}
```

Environment overrides: `MEMEX_BACKEND_URL`, `MEMEX_TOKEN` (for CI or headless machines without a keychain).

## Project structure

```
Memex-CLI/
├── src/
│   ├── index.ts            # entrypoint, Commander setup
│   ├── commands/           # login, add, index, search, ...
│   ├── api/                # typed backend client
│   ├── auth/               # keyring wrapper
│   ├── fs/                 # file discovery, hashing
│   └── config.ts
├── tests/
├── tsconfig.json
└── package.json
```

## Scripts

```bash
npm run dev -- search "test"   # run via tsx
npm run typecheck              # tsc --noEmit
npm test                       # vitest
npm run build                  # tsc -> dist/
npm run check                  # typecheck + test + build
```

## Development conventions

- CLI-first: every feature is a command before it is anything else.
- Strict TypeScript, no `any`; backend responses are validated against typed schemas.
- Every command has unit tests with the backend client mocked.
- Exit codes: `0` success, `1` error, `2` usage error. Errors go to stderr; results go to stdout.

## Roadmap

- [ ] `memex watch` for automatic re-indexing
- [ ] Shell completions
- [ ] Support for additional sources (PDFs, code repos)

## License

MIT