package envload

import (
	"os"
	"strings"
)

// ParseFile reads a minimal dotenv file and returns key → value (last wins on duplicate keys).
func ParseFile(path string) (map[string]string, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	out := make(map[string]string)
	s := string(b)
	s = strings.TrimPrefix(s, "\ufeff")
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimSpace(strings.TrimSuffix(line, "\r"))
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		i := strings.IndexByte(line, '=')
		if i <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:i])
		val := strings.TrimSpace(line[i+1:])
		if key == "" {
			continue
		}
		if len(val) >= 2 {
			if val[0] == '"' && val[len(val)-1] == '"' {
				val = val[1 : len(val)-1]
			} else if val[0] == '\'' && val[len(val)-1] == '\'' {
				val = val[1 : len(val)-1]
			}
		}
		out[key] = val
	}
	return out, nil
}

// LoadFile parses a minimal dotenv file and sets variables only when os.Getenv(key) is empty.
func LoadFile(path string) error {
	m, err := ParseFile(path)
	if err != nil {
		return err
	}
	for k, v := range m {
		if os.Getenv(k) == "" {
			_ = os.Setenv(k, v)
		}
	}
	return nil
}

// LoadFileOverride parses a dotenv file and always sets the variables (overwrites existing).
func LoadFileOverride(path string) error {
	m, err := ParseFile(path)
	if err != nil {
		return err
	}
	for k, v := range m {
		_ = os.Setenv(k, v)
	}
	return nil
}

// TryLoadFirst calls LoadFile on the first path that exists and is a regular file.
func TryLoadFirst(paths ...string) {
	for _, p := range paths {
		if p == "" {
			continue
		}
		st, err := os.Stat(p)
		if err != nil || st.IsDir() {
			continue
		}
		if err := LoadFile(p); err == nil {
			return
		}
	}
}
