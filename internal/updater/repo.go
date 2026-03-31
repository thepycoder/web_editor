package updater

import (
	"fmt"
	"os"
	"strings"
)

// ResolveRepo returns owner/repo from PROJECTWHY_GITHUB_REPO or bakedDefault (e.g. "myorg/projectwhy").
func ResolveRepo(bakedDefault string) (owner, repo string, err error) {
	s := strings.TrimSpace(os.Getenv("PROJECTWHY_GITHUB_REPO"))
	if s == "" {
		s = strings.TrimSpace(bakedDefault)
	}
	if s == "" {
		return "", "", fmt.Errorf("set PROJECTWHY_GITHUB_REPO=owner/repo or build with -ldflags \"-X main.bakedGitHubRepo=owner/repo\"")
	}
	parts := strings.Split(s, "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", fmt.Errorf("invalid GitHub repo %q (want owner/repo)", s)
	}
	return parts[0], parts[1], nil
}
