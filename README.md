# HTML is all you need

A dead-simple, single file html editor and deployment tool for single page, static websites.

## Why this exists

Because deploying a single page, static website for a bakery or flower shop, does not need to be made by Wordpress.

## Desktop host (Windows 11 / single `.exe`)

For locked-down PCs without Python or ImageMagick, use the Go wrapper: it serves the CMS UI from [cmd/projectwhy/web/editor.html](cmd/projectwhy/web/editor.html) (embedded in the binary) on localhost, reads and writes the project on disk, proxies **Netlify** and **Cloudflare** APIs (no CORS issues in the browser), and by default uses a console window plus an optional **Stop local server** action for shutdown. You can build without a console on Windows (see below).

**Prerequisites:** [Go](https://go.dev/dl/) on your build machine (users only need the built `.exe`).

**Run locally (development):**

```bash
go run ./cmd/projectwhy -listen 127.0.0.1:4070
```

Flags and environment:

- `-listen` — bind address (default `127.0.0.1:4070`).
- `-project` — project root; overrides `PROJECTWHY_DIR`.
- `PROJECTWHY_DIR` — project root when `-project` is not set (default: `%USERPROFILE%\ProjectWhyWebsite` on Windows, `~/ProjectWhyWebsite` elsewhere).
- `-no-browser` — do not open a browser tab (e.g. CI).

**Versioning:** the semver lives in [internal/version/version.go](internal/version/version.go) (shown in the editor status bar). `bake-build` passes `-X main.version=…` and writes `dist/projectwhy_<version>` on Unix or `dist/projectwhy_<version>.exe` on Windows unless you set **`-o`**. Plain `go build` uses that same default from source; override with `-ldflags "-X main.version=…"`.

**Netlify token and site ID** / **Cloudflare Pages (optional)**

Only [cmd/projectwhy/web/editor.html](cmd/projectwhy/web/editor.html) is embedded by a plain `go build`. To **bake** deploy defaults from the repo's `.env` into the binary automatically, use the bake helper (it generates a short-lived `z_baked_env.gen.go`, runs `go build`, then deletes it):

- **Netlify:** `PROJECTWHY_NETLIFY_TOKEN`, `PROJECTWHY_NETLIFY_SITE_ID`
- **Cloudflare Pages:** `PROJECTWHY_CF_API_TOKEN`, `PROJECTWHY_CF_ACCOUNT_ID`, `PROJECTWHY_CF_PROJECT_NAME` (API token needs *Account · Cloudflare Pages · Edit*; use a **Direct Upload** Pages project name)

Run:

```bash
go run ./cmd/bake-build
```

- **`-o`** — output path (default: `dist/projectwhy_<version>` / `dist/projectwhy_<version>.exe` on Windows).
- **`-env`** — path to `.env` (default: `.env` at the module root). If the file is missing or has no deploy keys, the build still succeeds; nothing is baked.
- **`-ldflags`** — extra linker flags, appended after `-s -w` and `-X main.version=…`.
- **`-keep`** — keep `cmd/projectwhy/z_baked_env.gen.go` for debugging (normally removed; the file is gitignored).
- **`-goos` / `-goarch`** — target platform for the **built** `projectwhy` binary (default: host). Use these for cross-compilation. Do **not** set `GOOS`/`GOARCH` in the shell when running `go run ./cmd/bake-build`: that compiles `bake-build` itself for the target OS and fails with `exec format error` on Linux/macOS.

Cross-compile example (Linux → Windows amd64): `go run ./cmd/bake-build -goos windows -goarch amd64` → `dist/projectwhy_<version>.exe` (the helper sets `CGO_ENABLED=0` when the target differs from the host).

At **runtime** (when you did not bake, or use a plain `go build`), credentials are resolved in this order:

1. Existing environment variables.
2. The **first** `.env` found among: next to the executable, the current working directory, then the resolved project root (`-project` / `PROJECTWHY_DIR` / default `~/ProjectWhyWebsite`).

Manual bake without the helper (equivalent when values have no awkward characters):

```bash
go build -ldflags="-s -w -X main.version=0.1.3 -X main.bakedNetlifyToken=YOUR_TOKEN -X main.bakedNetlifySiteID=YOUR_SITE_ID" -o dist/projectwhy_0.1.3 ./cmd/projectwhy
```

If the project's saved config already contains a token or site ID, those are kept; defaults only fill empty fields.

**Convenience:** `make build` runs `go run ./cmd/bake-build` (requires GNU/BSD `make`).

**Windows release build (static binary):**

```bash
go run ./cmd/bake-build -goos windows -goarch amd64
```

**Windows build without a console window:** link as a GUI app so double-clicking the `.exe` does not open a terminal (`fmt` / `log` output is not visible unless you log to a file):

```bash
go build -ldflags "-H windowsgui -X main.version=0.1.3" -o dist/projectwhy_0.1.3.exe ./cmd/projectwhy
```

With baked Netlify defaults and cross-compile from Linux/macOS:

```bash
go run ./cmd/bake-build -goos windows -goarch amd64 -ldflags "-H windowsgui"
```

Unsigned builds may trigger **Windows SmartScreen** ("Windows protected your PC"): choose *More info* → *Run anyway*, or sign the binary for enterprise rollout.

**Stopping the server:** close the console window (console builds only), press Ctrl+C in that console, or use **Stop local server** in the editor status bar (HTTP mode only; may report a connection error after exit, which is normal). With a `-H windowsgui` build there is no console—use **Stop local server** or end the process in Task Manager.

**Changing the editor UI:** edit [cmd/projectwhy/web/editor.html](cmd/projectwhy/web/editor.html), then `go build` (the file is embedded at compile time).

**Debug mode:** append `?debug` to the editor URL (e.g. `http://127.0.0.1:4070/editor.html?debug`) to skip the automatic download from the live website on startup. This is useful when you have made local template changes (such as adding `data-toggleable` attributes) and do not want them overwritten by the deployed version.
