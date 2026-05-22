# HTML is all you need

A dead-simple, single file html editor and deployment tool for single page, static websites.

## Why this exists

Because deploying a single page, static website for a bakery or flower shop, does not need to be made by Wordpress.

## Quick start: build for Windows (Cloudflare Pages, no console)

The default target is a single `.exe` for Windows that runs as a GUI app (no terminal window), with Cloudflare Pages credentials baked in.

**Prerequisites:** [Go](https://go.dev/dl/) on your build machine. Users only need the built `.exe`.

1. Create a `.env` file at the repo root:

   ```
   PROJECTWHY_CF_API_TOKEN=your-cloudflare-api-token
   PROJECTWHY_CF_ACCOUNT_ID=your-account-id
   PROJECTWHY_CF_PROJECT_NAME=your-pages-project-name
   ```

   The API token needs *Account · Cloudflare Pages · Edit*. Use a **Direct Upload** Pages project.

2. Build:

   ```bash
   go run ./cmd/bake-build -goos windows -goarch amd64 -ldflags "-H windowsgui"
   ```

   Output: `dist/projectwhy_<version>.exe`

   Or using make:

   ```bash
   make build-windows
   ```

Unsigned builds may trigger **Windows SmartScreen** ("Windows protected your PC"): choose *More info* → *Run anyway*, or sign the binary for enterprise rollout.

**Stopping the server:** with a `-H windowsgui` build there is no console — use **Stop local server** in the editor status bar or end the process in Task Manager.

## Local development

Run the editor locally:

```bash
go run ./cmd/projectwhy -listen 127.0.0.1:4070
```

Append `?debug` to the URL (`http://127.0.0.1:4070/editor.html?debug`) to skip the automatic download of the live website on startup — useful when you have local template changes you don't want overwritten.

**Editing the editor UI:** edit [cmd/projectwhy/web/editor.html](cmd/projectwhy/web/editor.html), then `go build` (the file is embedded at compile time).

Flags:

- `-listen` — bind address (default `127.0.0.1:4070`)
- `-project` — project root; overrides `PROJECTWHY_DIR`
- `PROJECTWHY_DIR` — project root when `-project` is not set (default: `%USERPROFILE%\ProjectWhyWebsite` on Windows, `~/ProjectWhyWebsite` elsewhere)
- `-no-browser` — do not open a browser tab

## Versioning

The semver lives in [internal/version/version.go](internal/version/version.go) and is shown in the editor status bar.

- **`bake-build`** reads the version from source and bakes it into the binary automatically.
- **Plain `go build`** uses the same source default; override with `-ldflags "-X main.version=…"`.

To bump, edit `internal/version/version.go`.

## Makefile

```
make build          # bake-build for the host platform
make build-windows  # cross-compile Windows amd64 GUI .exe with Cloudflare baked in
```
