package updater

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// Download streams url to dest (overwrite). Uses a temp file + rename.
func Download(ctx context.Context, url, dest string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "ProjectWhy-Updater")

	client := &http.Client{Timeout: 5 * time.Minute}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
		return fmt.Errorf("download %s: %s — %s", url, res.Status, string(b))
	}

	dir := filepath.Dir(dest)
	tmp, err := os.CreateTemp(dir, ".projectwhy-dl-*")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	defer func() {
		tmp.Close()
		_ = os.Remove(tmpPath)
	}()

	if _, err := io.Copy(tmp, res.Body); err != nil {
		return err
	}
	if err := tmp.Sync(); err != nil {
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}

	_ = os.Remove(dest)
	if err := os.Rename(tmpPath, dest); err != nil {
		return err
	}
	return nil
}
