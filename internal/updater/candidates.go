package updater

import (
	"fmt"
	"runtime"
)

func candidateAssetNames() []string {
	goos := runtime.GOOS
	goarch := runtime.GOARCH
	var out []string
	switch goos {
	case "windows":
		out = []string{
			fmt.Sprintf("projectwhy-windows-%s.exe", goarch),
			"projectwhy-windows-amd64.exe",
			"projectwhy.exe",
		}
	case "darwin":
		out = []string{
			fmt.Sprintf("projectwhy-darwin-%s", goarch),
			"projectwhy-darwin-amd64",
			"projectwhy-darwin-arm64",
			"projectwhy",
		}
	default:
		out = []string{
			fmt.Sprintf("projectwhy-%s-%s", goos, goarch),
			fmt.Sprintf("projectwhy-linux-%s", goarch),
			"projectwhy-linux-amd64",
			"projectwhy",
		}
	}
	return out
}
