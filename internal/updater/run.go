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

// UpdateAvailable fetches the latest release and reports whether a newer semver than
// currentVersion exists. currentVersion must be a valid semver and not "dev" or empty.
func UpdateAvailable(ctx context.Context, currentVersion, owner, repo string) (available bool, latestTag, assetName, downloadURL string, err error) {
	tag, assets, err := FetchLatestRelease(ctx, owner, repo)
	if err != nil {
		return false, "", "", "", err
	}
	assetName, downloadURL, err = PickAssetURL(assets)
	if err != nil {
		return false, "", "", "", err
	}

	latestRaw := strings.TrimSpace(tag)
	latest := latestRaw
	if !strings.HasPrefix(latest, "v") {
		latest = "v" + latest
	}
	latest = semver.Canonical(latest)
	if !semver.IsValid(latest) {
		return false, "", "", "", fmt.Errorf("release tag %q is not a valid semver", tag)
	}

	curRaw := strings.TrimSpace(currentVersion)
	if curRaw == "" || strings.EqualFold(curRaw, "dev") {
		return false, "", "", "", fmt.Errorf("current version is dev or empty")
	}
	cur := curRaw
	if !strings.HasPrefix(cur, "v") {
		cur = "v" + cur
	}
	cur = semver.Canonical(cur)
	if !semver.IsValid(cur) {
		return false, "", "", "", fmt.Errorf("current version %q is not valid semver (use v1.2.3 or build with -ldflags \"-X main.version=1.2.3\")", currentVersion)
	}
	if semver.Compare(latest, cur) <= 0 {
		return false, latest, "", "", nil
	}
	return true, latest, assetName, downloadURL, nil
}

// ApplyUpdate downloads the asset and schedules replacement of currentExePath after this process exits.
// If restartAfter is true, the post-exit script also starts the new binary; otherwise only the swap runs.
func ApplyUpdate(ctx context.Context, downloadURL, currentExePath string, restartAfter bool) error {
	stage := StagingPath(currentExePath)
	_ = os.Remove(stage)
	if err := Download(ctx, downloadURL, stage); err != nil {
		return fmt.Errorf("download: %w", err)
	}
	if runtime.GOOS != "windows" {
		if err := os.Chmod(stage, 0o755); err != nil {
			return fmt.Errorf("chmod staging: %w", err)
		}
	}

	pid := os.Getpid()
	if err := scheduleReplace(pid, stage, currentExePath, restartAfter); err != nil {
		return err
	}
	if restartAfter {
		fmt.Fprintf(os.Stderr, "Exiting so the update script can replace the binary and restart…\n")
	}
	return nil
}
