# HTML is all you need

A dead-simple, single file html editor and deployment tool for single page, static websites.

## Why this exists

Because deploying a single page, static website for a bakery or flower shop, does not need to be made by Wordpress.

## Multi-site model

One **Windows binary per client**. Deploy credentials and the default project folder name are baked from a per-site env file under [`sites/`](sites/). Site HTML is **not** in the binary — it lives in the project folder on disk and syncs with Cloudflare Pages.

| Client | Env file | Baked project folder | Pages project |
|--------|----------|----------------------|---------------|
| De Rotonde | `sites/derotonde.env` | `~/ProjectWhyWebsite` | `derotonde` |
| Janasey | `sites/janasey.env` | `~/JanaseyWebsite` | `janasey` |

`templates/` is reference/source only and is not embedded in the build.

## Quick start: build Windows binaries

**Prerequisites:** [Go](https://go.dev/dl/) on your build machine. Clients only need the built `.exe`.

1. Create per-site env files (gitignored) from the examples:
  ```bash
   cp sites/derotonde.env.example sites/derotonde.env
   cp sites/janasey.env.example sites/janasey.env
   # Fill PROJECTWHY_CF_API_TOKEN and PROJECTWHY_CF_ACCOUNT_ID in each file.
   ```
   The API token needs *Account · Cloudflare Pages · Edit*. Use a **Direct Upload** Pages project per site.

   Optional keys:
   - `PROJECTWHY_CF_PROJECT_NAME` — Cloudflare Pages project name
   - `PROJECTWHY_PROJECT_FOLDER` — single folder name under the user home (default project dir when `-project` / `PROJECTWHY_DIR` are unset)
   - `PROJECTWHY_DEFAULT_DEPLOY_PROVIDER` — `cloudflare` or `netlify`

2. Build:
  ```bash
   make build-windows-derotonde   # → dist/projectwhy_derotonde.exe
   make build-windows-janasey     # → dist/projectwhy_janasey.exe
   # Or: make build-windows CLIENT=derotonde
   ```

Unsigned builds may trigger **Windows SmartScreen** ("Windows protected your PC"): choose *More info* → *Run anyway*, or sign the binary for enterprise rollout.

**Stopping the server:** with a `-H windowsgui` build there is no console — use **Stop local server** in the editor status bar or end the process in Task Manager.

## Local development

Always pass **both** `-project` (site files) and `-env` (deploy target) for the client you’re editing. Otherwise a repo-root `.env` for another site can sync the wrong live website into your folder.

```bash
# De Rotonde
go run ./cmd/projectwhy \
  -project /home/victor/ProjectWhyWebsite \
  -env sites/derotonde.env

# Janasey (use ?debug until the Pages project has content you want to pull)
go run ./cmd/projectwhy \
  -project /home/victor/Projects/janasey \
  -env sites/janasey.env
# First-time / local HTML work without overwriting from host:
# open http://127.0.0.1:4070/editor.html?debug
```

If you pass `-project` without `-env`, the browser opens with `?debug` so a mismatched cwd `.env` cannot wipe the folder.

Append `?debug` yourself anytime to skip the automatic download of the live website.

**Editing the editor UI:** edit [cmd/projectwhy/web/editor.html](cmd/projectwhy/web/editor.html), then rebuild (the file is embedded at compile time).

Flags:

- `-listen` — bind address (default `127.0.0.1:4070`)
- `-project` — project root; overrides `PROJECTWHY_DIR` and the baked folder
- `-env` — dotenv with Cloudflare/Netlify defaults for this client (e.g. `sites/janasey.env`)
- `PROJECTWHY_DIR` — project root when `-project` is not set
- Default without either: `~/` + baked `PROJECTWHY_PROJECT_FOLDER`, or `~/ProjectWhyWebsite` if nothing was baked
- `-no-browser` — do not open a browser tab

## Staging

```bash
go run ./cmd/projectwhy -project ~/ProjectWhyWebsite-staging -listen 127.0.0.1:4071
```

## Versioning

The semver lives in [internal/version/version.go](internal/version/version.go) and is shown in the editor status bar.

- **bake-build** reads the version from source and bakes it into the binary automatically.
- **Plain `go build`** uses the same source default; override with `-ldflags "-X main.version=…"`.

To bump, edit `internal/version/version.go`.

## Makefile

```
make build                         # host binary for CLIENT (default derotonde)
make build CLIENT=janasey          # host binary for janasey
make build-windows                 # Windows exe for CLIENT (default derotonde)
make build-windows-derotonde       # dist/projectwhy_derotonde.exe
make build-windows-janasey         # dist/projectwhy_janasey.exe
```
