package updater

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"golang.org/x/mod/semver"
)

// StagingPath returns the path for the downloaded replacement binary beside finalExe.
func StagingPath(finalExe string) string {
	if runtime.GOOS == "windows" {
		ext := filepath.Ext(finalExe)
		if ext == "" {
			ext = ".exe"
		}
		base := strings.TrimSuffix(finalExe, ext)
		return base + ".new.exe"
	}
	return finalExe + ".new"
}

// RunSelfUpdate checks GitHub releases/latest, downloads if newer than currentVersion, then schedules swap after exit.
// currentVersion: use a semver-like tag from -ldflags "-X main.version=1.0.0" or "v1.0.0". "dev" (default) always takes latest release.
func RunSelfUpdate(ctx context.Context, currentVersion, owner, repo, currentExePath string) error {
	tag, assets, err := FetchLatestRelease(ctx, owner, repo)
	if err != nil {
		return err
	}
	assetName, url, err := PickAssetURL(assets)
	if err != nil {
		return err
	}

	latestRaw := strings.TrimSpace(tag)
	latest := latestRaw
	if !strings.HasPrefix(latest, "v") {
		latest = "v" + latest
	}
	latest = semver.Canonical(latest)
	if !semver.IsValid(latest) {
		return fmt.Errorf("release tag %q is not a valid semver", tag)
	}

	curRaw := strings.TrimSpace(currentVersion)
	isDev := curRaw == "" || strings.EqualFold(curRaw, "dev")

	if !isDev {
		cur := curRaw
		if !strings.HasPrefix(cur, "v") {
			cur = "v" + cur
		}
		cur = semver.Canonical(cur)
		if !semver.IsValid(cur) {
			return fmt.Errorf("current version %q is not valid semver (use v1.2.3 or build with -ldflags \"-X main.version=1.2.3\")", currentVersion)
		}
		if semver.Compare(latest, cur) <= 0 {
			fmt.Fprintf(os.Stderr, "ProjectWhy is up to date (%s; latest release %s).\n", cur, latest)
			return nil
		}
		fmt.Fprintf(os.Stderr, "Updating %s → %s (asset %s)…\n", cur, latest, assetName)
	} else {
		fmt.Fprintf(os.Stderr, "Updating to latest release %s (asset %s)…\n", latest, assetName)
	}

	stage := StagingPath(currentExePath)
	_ = os.Remove(stage)
	if err := Download(ctx, url, stage); err != nil {
		return fmt.Errorf("download: %w", err)
	}
	if runtime.GOOS != "windows" {
		if err := os.Chmod(stage, 0o755); err != nil {
			return fmt.Errorf("chmod staging: %w", err)
		}
	}

	pid := os.Getpid()
	if err := scheduleReplaceAndRestart(pid, stage, currentExePath); err != nil {
		return err
	}

	fmt.Fprintf(os.Stderr, "Exiting so the update script can replace the binary and restart…\n")
	return nil
}
