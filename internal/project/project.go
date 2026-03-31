package project

import (
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// ErrInvalidAssetName is returned for unsafe or empty asset filenames.
var ErrInvalidAssetName = errors.New("invalid asset name")

// Root is the directory containing index.html, assets/, and .web-editor.json.
type Root struct {
	dir string
}

func NewRoot(dir string) (*Root, error) {
	abs, err := filepath.Abs(dir)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(abs, 0o755); err != nil {
		return nil, err
	}
	assets := filepath.Join(abs, "assets")
	if err := os.MkdirAll(assets, 0o755); err != nil {
		return nil, err
	}
	return &Root{dir: abs}, nil
}

func (r *Root) Dir() string { return r.dir }

// SanitizeAssetName rejects path tricks; returns cleaned base name or error.
func SanitizeAssetName(name string) (string, error) {
	name = filepath.ToSlash(name)
	if name == "" || strings.Contains(name, "/") || strings.Contains(name, `\`) {
		return "", ErrInvalidAssetName
	}
	base := filepath.Base(name)
	if base == "." || base == ".." || base != name {
		return "", ErrInvalidAssetName
	}
	return base, nil
}

func (r *Root) configPath() string { return filepath.Join(r.dir, ".web-editor.json") }
func (r *Root) indexPath() string  { return filepath.Join(r.dir, "index.html") }
func (r *Root) assetsDir() string  { return filepath.Join(r.dir, "assets") }

func (r *Root) ReadConfig() (map[string]any, error) {
	b, err := os.ReadFile(r.configPath())
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]any{}, nil
		}
		return nil, err
	}
	var out map[string]any
	if err := json.Unmarshal(b, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = map[string]any{}
	}
	return out, nil
}

func (r *Root) WriteConfig(data map[string]any) error {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(r.configPath(), b, 0o644)
}

func (r *Root) ReadIndex() ([]byte, error) {
	return os.ReadFile(r.indexPath())
}

func (r *Root) WriteIndex(html []byte) error {
	return os.WriteFile(r.indexPath(), html, 0o644)
}

func (r *Root) IndexExists() (bool, error) {
	_, err := os.Stat(r.indexPath())
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *Root) ListAssets() ([]string, error) {
	entries, err := os.ReadDir(r.assetsDir())
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}
	var names []string
	for _, e := range entries {
		if e.Type().IsRegular() {
			names = append(names, e.Name())
		}
	}
	if names == nil {
		names = []string{}
	}
	return names, nil
}

func (r *Root) ReadAsset(name string) (io.ReadCloser, int64, error) {
	clean, err := SanitizeAssetName(name)
	if err != nil {
		return nil, 0, err
	}
	path := filepath.Join(r.assetsDir(), clean)
	st, err := os.Stat(path)
	if err != nil {
		return nil, 0, err
	}
	if !st.Mode().IsRegular() {
		return nil, 0, fs.ErrNotExist
	}
	f, err := os.Open(path)
	if err != nil {
		return nil, 0, err
	}
	return f, st.Size(), nil
}

func (r *Root) WriteAsset(name string, rdr io.Reader) error {
	clean, err := SanitizeAssetName(name)
	if err != nil {
		return err
	}
	path := filepath.Join(r.assetsDir(), clean)
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, rdr)
	return err
}

func (r *Root) DeleteAsset(name string) error {
	clean, err := SanitizeAssetName(name)
	if err != nil {
		return err
	}
	path := filepath.Join(r.assetsDir(), clean)
	return os.Remove(path)
}
