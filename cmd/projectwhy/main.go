package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net"
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
	appversion "web_editor/internal/version"
)

// App version: empty uses appversion.Version; override with:
//
//	go build -ldflags "-X main.version=1.0.0"
var version string

func init() {
	if version == "" {
		version = appversion.Version
	}
}

// Optional link-time defaults for internal builds. Prefer baking from .env via:
//
//	go run ./cmd/bake-build -o dist/projectwhy
//
// Or: go build -ldflags "-X main.bakedNetlifyToken=TOKEN -X main.bakedNetlifySiteID=ID -X main.bakedDeployProvider=cloudflare"
var bakedNetlifyToken string
var bakedNetlifySiteID string

// Optional Cloudflare Pages defaults (bake-build or -ldflags).
var bakedCfApiToken string
var bakedCfAccountID string
var bakedCfProjectName string

// Default deploy UI/API selection: bake-build, -ldflags -X main.bakedDeployProvider=..., or PROJECTWHY_DEFAULT_DEPLOY_PROVIDER.
var bakedDeployProvider string

// Optional home-subdir name for the default project folder (bake-build PROJECTWHY_PROJECT_FOLDER).
var bakedProjectFolder string

func projectFolderName() string {
	if f := strings.TrimSpace(bakedProjectFolder); f != "" {
		if clean := filepath.Base(f); clean == f && clean != "." && clean != ".." {
			return clean
		}
	}
	return "ProjectWhyWebsite"
}

func defaultProjectDir() string {
	folder := projectFolderName()
	if runtime.GOOS == "windows" {
		if u := os.Getenv("USERPROFILE"); u != "" {
			return filepath.Join(u, folder)
		}
	}
	h, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(".", folder)
	}
	return filepath.Join(h, folder)
}

// loadDotenv loads deploy defaults from dotenv files.
// Order (first existing file wins for empty keys via LoadFile):
//  1. project root .env (site-specific when using -project)
//  2. cwd .env
//  3. next to the binary
// Use -env to force a specific file (overrides these).
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
	var paths []string
	if projectRoot != "" {
		paths = append(paths, filepath.Join(projectRoot, ".env"))
	}
	paths = append(paths,
		filepath.Join(wd, ".env"),
		filepath.Join(exeDir, ".env"),
	)
	envload.TryLoadFirst(paths...)
}

func loadEnvFile(path string) {
	if path == "" {
		return
	}
	if !filepath.IsAbs(path) {
		if wd, err := os.Getwd(); err == nil {
			path = filepath.Join(wd, path)
		}
	}
	if err := envload.LoadFileOverride(path); err != nil {
		log.Fatalf("env file %s: %v", path, err)
	}
	fmt.Println("Loaded env from", path)
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

func resolvedCloudflareDefaults() httpserver.CloudflareDefaults {
	apiTok := os.Getenv("PROJECTWHY_CF_API_TOKEN")
	if apiTok == "" {
		apiTok = bakedCfApiToken
	}
	acct := os.Getenv("PROJECTWHY_CF_ACCOUNT_ID")
	if acct == "" {
		acct = bakedCfAccountID
	}
	proj := os.Getenv("PROJECTWHY_CF_PROJECT_NAME")
	if proj == "" {
		proj = bakedCfProjectName
	}
	return httpserver.CloudflareDefaults{APIToken: apiTok, AccountID: acct, ProjectName: proj}
}

func normalizeDeployProvider(s string) string {
	s = strings.TrimSpace(strings.ToLower(s))
	switch s {
	case "cloudflare":
		return "cloudflare"
	case "netlify":
		return "netlify"
	default:
		return ""
	}
}

// resolvedDeployProviderDefault returns netlify or cloudflare for GET /api/project/config when the project file omits provider.
// Precedence: PROJECTWHY_DEFAULT_DEPLOY_PROVIDER > baked value > cloudflare.
func resolvedDeployProviderDefault() string {
	raw := os.Getenv("PROJECTWHY_DEFAULT_DEPLOY_PROVIDER")
	if raw == "" {
		raw = bakedDeployProvider
	}
	if n := normalizeDeployProvider(raw); n != "" {
		return n
	}
	return "cloudflare"
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

// tryShutdownExisting asks any process already listening on addr (localhost)
// to exit via POST /api/shutdown, then briefly waits for the port to free up.
func tryShutdownExisting(addr string) {
	url := "http://" + strings.Replace(addr, "0.0.0.0:", "127.0.0.1:", 1) + "/api/shutdown"
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Post(url, "", nil)
	if err != nil {
		return
	}
	resp.Body.Close()
	log.Println("asked previous instance to shut down, waiting for port...")
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		time.Sleep(200 * time.Millisecond)
		conn, err := net.DialTimeout("tcp", addr, 200*time.Millisecond)
		if err != nil {
			return // nothing listening (or port became free)
		}
		conn.Close()
	}
}

func main() {
	listen := flag.String("listen", "127.0.0.1:4070", "HTTP listen address")
	projectDir := flag.String("project", "", "Project root (default: PROJECTWHY_DIR or home/<baked or ProjectWhyWebsite>)")
	envFile := flag.String("env", "", "Dotenv path with deploy defaults (e.g. sites/janasey.env); overrides cwd/.env")
	noBrowser := flag.Bool("no-browser", false, "Do not open a browser tab")
	flag.Parse()

	if *envFile != "" {
		loadEnvFile(*envFile)
	} else {
		tentative := *projectDir
		if tentative == "" {
			tentative = os.Getenv("PROJECTWHY_DIR")
		}
		if tentative == "" {
			tentative = defaultProjectDir()
		}
		loadDotenv(tentative)
	}

	rootPath := resolveProjectDir(*projectDir)
	pr, err := project.NewRoot(rootPath)
	if err != nil {
		log.Fatalf("project dir: %v", err)
	}

	srv := httpserver.New(pr, editorHTML, *listen, resolvedNetlifyDefaults(), resolvedCloudflareDefaults(), resolvedDeployProviderDefault(), version)

	tryShutdownExisting(*listen)

	skipHostSync := *projectDir != "" && *envFile == ""
	go func() {
		host := *listen
		openURL := "http://" + host + "/editor.html"
		openURL = strings.Replace(openURL, "//0.0.0.0:", "//127.0.0.1:", 1)
		// Avoid wiping a -project folder with whatever host cwd/.env points at.
		if skipHostSync {
			openURL += "?debug"
		}
		time.Sleep(150 * time.Millisecond)
		if !*noBrowser {
			openBrowser(openURL)
		}
	}()

	fmt.Printf("ProjectWhy %s — http://%s — close this window or press Ctrl+C to stop.\n", version, *listen)
	fmt.Printf("Project folder: %s\n", pr.Dir())
	cf := resolvedCloudflareDefaults()
	if cf.ProjectName != "" {
		fmt.Printf("Cloudflare Pages project: %s\n", cf.ProjectName)
	}
	if skipHostSync {
		fmt.Println("Note: opened with ?debug (no -env). Host sync skipped. Use -env sites/<client>.env to sync/publish that site.")
	}

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
