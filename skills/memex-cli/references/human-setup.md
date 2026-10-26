# Install and Get Started

## Requirements

- Node.js 20.17 or newer
- A running Memex backend and its API token
- An operating-system keychain for interactive token storage, or `MEMEX_TOKEN` for a headless environment

## Install

Install the published package globally:

```sh
npm install -g memex-cli
memex --version
```

To install from a source checkout:

```sh
git clone https://github.com/<your-username>/Memex-CLI.git
cd Memex-CLI
npm install
npm run build
npm link
```

## Connect to the backend

Run the interactive setup:

```sh
memex login
```

Enter the backend URL (for example, `http://localhost:8000`) and API token when prompted. Login checks the protected backend status endpoint before saving the URL and storing the token in the OS keychain.

For a headless session, provide the URL and token through environment variables:

```sh
export MEMEX_BACKEND_URL="http://localhost:8000"
export MEMEX_TOKEN="your-api-token"
```

The token is not saved in the CLI config file. Keep environment variables out of shell history and logs.

## Add and index notes

Register a single `.md` or `.txt` file, or a folder containing them:

```sh
memex add ~/notes
memex add ~/notes/project-plan.md
```

Then index the registered sources:

```sh
memex index
```

The CLI recursively finds `.md` and `.txt` files and skips symbolic links. It hashes file bytes and sends new or changed files to the backend. It also removes indexed documents that no longer exist under successfully scanned registered sources. The command prints discovered, indexed, unchanged, deleted, and failed counts.

## Search

```sh
memex search "How does the deployment process work?"
```

Search returns up to five matches by default. To get more results or filter out lower similarity scores:

```sh
memex search "deployment process" -k 8 --min-score 0.4
```

To return JSON for a script or AI agent, add `--json`:

```sh
memex search "deployment process" --json -k 5
```
