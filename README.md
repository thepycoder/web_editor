# HTML is all you need

A dead-simple, single file html editor and deployment tool for single page, static websites.

## Why this exists

Because deploying a single page, static website for a bakery or flower shop, does not need to be made by Wordpress.

## Desktop host (Windows 11 / single `.exe`)

For locked-down PCs without Python or ImageMagick, use the Go wrapper: it serves the CMS UI from [cmd/projectwhy/web/editor.html](cmd/projectwhy/web/editor.html) (embedded in the binary) on localhost, reads and writes the project on disk, proxies Netlify’s API (no CORS issues in the browser), and uses a console window plus an optional **Stop local server** action for shutdown.

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
- `-update` — check your public GitHub repo’s **latest** release; if the tag is newer than the baked version (or you are on `dev`), download the matching asset, exit, then a small script replaces the running binary and restarts it. Set `PROJECTWHY_GITHUB_REPO=owner/repo` or build with `-ldflags "-X main.bakedGitHubRepo=owner/repo"`. Bake a semver with `-ldflags "-X main.version=1.2.3"` so unchanged releases are skipped.

**Self-update release layout**

Create a [GitHub release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) (not draft) with a semver tag such as `v1.0.0`, and attach **one** binary whose **file name** matches the running platform, in this order of preference:

- Windows amd64: `projectwhy-windows-amd64.exe`, or `projectwhy.exe`
- Linux amd64: `projectwhy-linux-amd64`, or `projectwhy`
- macOS: `projectwhy-darwin-arm64` / `projectwhy-darwin-amd64`, or `projectwhy`

The API is unauthenticated; very heavy polling may hit rate limits.

**Windows release build (static binary):**

```bash
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o dist/projectwhy.exe ./cmd/projectwhy
```

Unsigned builds may trigger **Windows SmartScreen** (“Windows protected your PC”): choose *More info* → *Run anyway*, or sign the binary for enterprise rollout.

**Stopping the server:** close the console window, press Ctrl+C, or use **Stop local server** in the editor status bar (HTTP mode only; may report a connection error after exit, which is normal).

**Changing the editor UI:** edit [cmd/projectwhy/web/editor.html](cmd/projectwhy/web/editor.html), then `go build` (the file is embedded at compile time).