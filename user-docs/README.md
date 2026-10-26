# Memex-CLI User Guide

Memex-CLI indexes Markdown and text notes in your Memex backend and searches them when you need relevant context. The CLI sends files and queries to the backend; the backend handles chunking, embeddings, and search.

## Guides

- [Install and get started](getting-started.md)
- [Commands and workflows](commands.md)
- [Configuration and automation](configuration.md)
- [Troubleshooting](troubleshooting.md)

## Typical workflow

```sh
memex login
memex add ~/notes
memex index
memex search "What did I decide about the project architecture?"
```

Run `memex --help` or `memex <command> --help` to see command-line help.
