package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"web_editor/internal/envload"
	"web_editor/internal/httpserver"
	"web_editor/internal/project"
	"web_editor/internal/updater"
)

// App version for update checks (semver, with or without leading "v"). "dev" (default) skips automatic update checks.
//
//	go build -ldflags "-X main.version=1.0.0"
var version = "dev"

// Optional default GitHub repo when PROJECTWHY_GITHUB_REPO is unset:
//
//	go build -ldflags "-X main.bakedGitHubRepo=myorg/projectwhy"
var bakedGitHubRepo string

// Optional link-time defaults for internal builds. Prefer baking from .env via:
//
//	go run ./cmd/bake-build -o dist/projectwhy
//
// Or: go build -ldflags "-X main.bakedNetlifyToken=TOKEN -X main.bakedNetlifySiteID=ID"
var bakedNetlifyToken string
var bakedNetlifySiteID string

func defaultProjectDir() string {
	if runtime.GOOS == "windows" {
		if u := os.Getenv("USERPROFILE"); u != "" {
			return filepath.Join(u, "ProjectWhyWebsite")
		}
	}
	h, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(".", "ProjectWhyWebsite")
	}
	return filepath.Join(h, "ProjectWhyWebsite")
}

// loadDotenv loads the first existing .env among: next to the binary, cwd, then project root.
// Project root matters when the binary is on PATH or run from a cwd that has no .env, while
// PROJECTWHY_DIR or -project points at a folder that contains .env (e.g. ~/ProjectWhyWebsite/.env).
func loadDotenv(projectRoot string) {
	exe, err := os.Executable()
	exeDir := ""
	if err == nil {
		exeDir = filepath.Dir(exe)
	}
	wd, err := os.Getwd()
	if err != nil {
		wd = ""
	}
	paths := []string{
		filepath.Join(exeDir, ".env"),
		filepath.Join(wd, ".env"),
	}
	if projectRoot != "" {
		paths = append(paths, filepath.Join(projectRoot, ".env"))
	}
	envload.TryLoadFirst(paths...)
}

func resolvedNetlifyDefaults() httpserver.NetlifyDefaults {
	token := os.Getenv("PROJECTWHY_NETLIFY_TOKEN")
	if token == "" {
		token = bakedNetlifyToken
	}
	siteID := os.Getenv("PROJECTWHY_NETLIFY_SITE_ID")
	if siteID == "" {
		siteID = bakedNetlifySiteID
	}
	return httpserver.NetlifyDefaults{Token: token, SiteID: siteID}
}

func resolveProjectDir(flagPath string) string {
	if flagPath != "" {
		return flagPath
	}
	if e := os.Getenv("PROJECTWHY_DIR"); e != "" {
		return e
	}
	return defaultProjectDir()
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	cmd.Stdout = nil
	cmd.Stderr = nil
	if err := cmd.Start(); err != nil {
		log.Printf("open browser: %v", err)
	}
}

func envSkipUpdateCheck() bool {
	s := strings.TrimSpace(strings.ToLower(os.Getenv("PROJECTWHY_SKIP_UPDATE")))
	return s == "1" || s == "true" || s == "yes"
}

func main() {
	listen := flag.String("listen", "127.0.0.1:4070", "HTTP listen address")
	projectDir := flag.String("project", "", "Project root (default: PROJECTWHY_DIR or home/ProjectWhyWebsite)")
	noBrowser := flag.Bool("no-browser", false, "Do not open a browser tab")
	skipUpdateCheck := flag.Bool("skip-update-check", false, "Do not check GitHub for updates on startup (also PROJECTWHY_SKIP_UPDATE=1)")
	flag.Parse()

	loadDotenv(resolveProjectDir(*projectDir))

	if !*skipUpdateCheck && !envSkipUpdateCheck() && !strings.EqualFold(strings.TrimSpace(version), "dev") {
		owner, repoName, err := updater.ResolveRepo(bakedGitHubRepo)
		if err == nil {
			exe, exeErr := os.Executable()
			if exeErr == nil {
				ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
				avail, latestTag, _, downloadURL, uerr := updater.UpdateAvailable(ctx, version, owner, repoName)
				cancel()
				if uerr != nil {
					log.Printf("update check: %v", uerr)
				} else if avail {
					fmt.Fprintf(os.Stderr, "Updating ProjectWhy %s → %s…\n", strings.TrimSpace(version), latestTag)
					ctx2, cancel2 := context.WithTimeout(context.Background(), 15*time.Minute)
					aerr := updater.ApplyUpdate(ctx2, downloadURL, exe, false)
					cancel2()
					if aerr != nil {
						log.Printf("update failed: %v", aerr)
					} else {
						fmt.Fprintf(os.Stderr, "Update installed. Start ProjectWhy again to run the new version.\n")
						os.Exit(0)
					}
				}
			}
		}
	}

	rootPath := resolveProjectDir(*projectDir)
	pr, err := project.NewRoot(rootPath)
	if err != nil {
		log.Fatalf("project dir: %v", err)
	}

	srv := httpserver.New(pr, editorHTML, *listen, resolvedNetlifyDefaults())

	go func() {
		host := *listen
		openURL := "http://" + host + "/editor.html"
		openURL = strings.Replace(openURL, "//0.0.0.0:", "//127.0.0.1:", 1)
		time.Sleep(150 * time.Millisecond)
		if !*noBrowser {
			openBrowser(openURL)
		}
	}()

	fmt.Printf("ProjectWhy %s — http://%s — close this window or press Ctrl+C to stop.\n", version, *listen)
	fmt.Printf("Project folder: %s\n", pr.Dir())

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sig
		log.Println("shutting down…")
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
		os.Exit(0)
	}()

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
