# Memex-CLI Developer Guide

This folder is the implementation guide for building the TypeScript command-line client for Memex. It describes the expected product behavior and implementation boundaries from the project README; it is not a description of existing source code.

## Product boundary

The CLI is responsible for command parsing, interactive setup, local configuration, secret retrieval, source discovery, hashing, API calls, and terminal output. The backend owns chunking, embedding, vector storage, and semantic retrieval. Keep this division clear: do not add local embeddings or Qdrant behavior to the CLI.

## Documents

- [Architecture and implementation sequence](architecture.md)
- [Commands and user experience](commands.md)
- [Configuration, credentials, and backend integration](configuration-and-api.md)
- [Development, tests, and release](development-and-release.md)

## Product acceptance checklist

- [ ] A user can configure a backend URL and token with `memex login`.
- [ ] The token is held in the operating system keychain, never in the JSON config file.
- [ ] A user can add/remove local file or folder sources, list them, and incrementally index Markdown/text notes.
- [ ] Search supports a human-readable format and JSON for agents.
- [ ] Backend errors and usage errors follow the documented exit-code/output contract.
- [ ] Commands are tested with the backend client mocked, and `npm run check` passes.
