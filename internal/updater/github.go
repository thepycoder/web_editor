package updater

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const githubAPI = "https://api.github.com"

type releaseJSON struct {
	TagName string `json:"tag_name"`
	Assets  []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

// FetchLatestRelease returns the latest published release (GitHub public API).
func FetchLatestRelease(ctx context.Context, owner, repo string) (tag string, assets map[string]string, _ error) {
	url := fmt.Sprintf("%s/repos/%s/%s/releases/latest", githubAPI, owner, repo)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "ProjectWhy-Updater")

	client := &http.Client{Timeout: 30 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return "", nil, fmt.Errorf("GitHub API %s: %s", res.Status, strings.TrimSpace(string(b)))
	}

	var body releaseJSON
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return "", nil, err
	}
	if body.TagName == "" {
		return "", nil, fmt.Errorf("release has no tag_name")
	}
	m := make(map[string]string, len(body.Assets))
	for _, a := range body.Assets {
		if a.Name != "" && a.BrowserDownloadURL != "" {
			m[a.Name] = a.BrowserDownloadURL
		}
	}
	return body.TagName, m, nil
}

// PickAssetURL chooses a release asset for this OS/arch. Order matters.
func PickAssetURL(assets map[string]string) (name, u string, err error) {
	if len(assets) == 0 {
		return "", "", fmt.Errorf("release has no downloadable assets")
	}
	candidates := candidateAssetNames()
	for _, c := range candidates {
		if u, ok := assets[c]; ok {
			return c, u, nil
		}
	}
	var names []string
	for n := range assets {
		names = append(names, n)
	}
	return "", "", fmt.Errorf("no matching asset for this platform (want one of %v); release has: %v",
		candidates, names)
}
