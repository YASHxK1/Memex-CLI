# Development, Testing, and Release

## Setup

Requirements: Node.js `>=20.17` and npm. From a source checkout:

```bash
npm install
```

For end-to-end manual checks, run a Memex backend and configure the CLI with `memex login`. Unit tests must not require a live backend, keychain, or real user notes.

## Scripts

```bash
npm run dev -- search "test"   # run a command through tsx
npm run typecheck              # tsc --noEmit
npm test                       # Vitest
npm run build                  # compile to dist/
npm run check                  # typecheck + tests + build
```

Run `npm run check` before considering a change complete. Inspect generated package contents before publishing so source maps/build output and package entry points agree with `package.json`.

## Test strategy

- Unit-test each command's argument mapping, service calls, success output, and failure behavior.
- Mock the backend client for command tests; test the API client separately with a fake HTTP transport.
- Mock keyring operations; assert the token never appears in persisted config or output.
- Use temporary directories and fixture files for discovery, hashing, config, and indexing tests.
- Cover nested directories, unsupported extensions, unreadable/missing files, duplicate source registration, changed/unchanged content, and path removal.
- Assert exit codes and stdout/stderr independently, including clean JSON stdout when `--json` is used.
- Keep platform-sensitive path and keychain behavior behind adapters so CI can run without an OS keychain.

## TypeScript conventions

- Keep `strict` enabled and avoid `any`; prefer `unknown` plus validation at system boundaries.
- Keep commands small and delegate filesystem/config/API/keychain work to modules.
- Make output formatting deterministic and separately test human and JSON renderers.
- Centralize exit-code mapping and error formatting to avoid commands exiting inconsistently.
- Never log tokens or note contents as incidental diagnostics.

## Build and local package verification

After a successful check:

```bash
npm run build
npm link
memex --version
memex --help
```

The README distribution target is npm package `Memex-CLI`. Before a release, verify package name/version, executable bin mapping, Node engine, included `dist/` files, and installation in a clean temporary project. Publish only after validating a real backend connection and keychain flow in a controlled environment.

## Future work

`memex watch`, shell completions, and PDF/code repository sources are roadmap items. Keep the initial command/API/filesystem abstractions extensible, but do not let roadmap features complicate the Markdown/text indexing MVP.
