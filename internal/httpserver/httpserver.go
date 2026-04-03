package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"web_editor/internal/project"
)

// NetlifyDefaults are optional internal token/site ID (from .env, env vars, or -ldflags).
// They are merged into GET /api/project/config when the project file omits them.
type NetlifyDefaults struct {
	Token  string
	SiteID string
}

type Server struct {
	root       *project.Root
	editorHTML []byte
	appVersion string
	netlify    NetlifyDefaults

	srv *http.Server

	shutdownOnce sync.Once
}

func New(root *project.Root, editorHTML []byte, addr string, netlify NetlifyDefaults, appVersion string) *Server {
	s := &Server{root: root, editorHTML: editorHTML, appVersion: appVersion, netlify: netlify}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", s.handleEditor)
	mux.HandleFunc("GET /editor.html", s.handleEditor)
	mux.HandleFunc("GET /api/health", s.handleHealth)
	mux.HandleFunc("POST /api/shutdown", s.handleShutdown)
	mux.HandleFunc("GET /api/project/config", s.handleGetConfig)
	mux.HandleFunc("PUT /api/project/config", s.handlePutConfig)
	mux.HandleFunc("GET /api/project/index.html", s.handleGetIndex)
	mux.HandleFunc("PUT /api/project/index.html", s.handlePutIndex)
	mux.HandleFunc("GET /api/project/assets", s.handleListAssets)
	mux.HandleFunc("GET /api/project/assets/", s.handleAssetPath)
	mux.HandleFunc("PUT /api/project/assets/", s.handleAssetPath)
	mux.HandleFunc("DELETE /api/project/assets/", s.handleAssetPath)
	mux.HandleFunc("/api/netlify/", s.handleNetlifyProxy)

	s.srv = &http.Server{
		Addr:              addr,
		Handler:           logRequests(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}
	return s
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func (s *Server) ListenAndServe() error {
	return s.srv.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.srv.Shutdown(ctx)
}

func (s *Server) handleEditor(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	html := bytes.ReplaceAll(s.editorHTML, []byte("__PW_VERSION__"), []byte(s.appVersion))
	_, _ = w.Write(html)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":         true,
		"projectDir": s.root.Dir(),
		"version":    s.appVersion,
	})
}

func isLoopback(r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func (s *Server) handleShutdown(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !isLoopback(r) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	w.WriteHeader(http.StatusNoContent)
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	s.shutdownOnce.Do(func() {
		go func() {
			time.Sleep(80 * time.Millisecond)
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := s.srv.Shutdown(ctx); err != nil {
				log.Printf("shutdown: %v", err)
			}
			os.Exit(0)
		}()
	})
}

func (s *Server) handleGetConfig(w http.ResponseWriter, r *http.Request) {
	cfg, err := s.root.ReadConfig()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	out := mergeConfigWithNetlifyDefaults(cfg, s.netlify)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

func mergeConfigWithNetlifyDefaults(cfg map[string]any, def NetlifyDefaults) map[string]any {
	out := make(map[string]any, len(cfg)+1)
	for k, v := range cfg {
		out[k] = v
	}
	var n map[string]any
	if existing, ok := out["netlify"].(map[string]any); ok && existing != nil {
		n = cloneAnyMap(existing)
	} else {
		n = map[string]any{}
	}
	token := stringFromAny(n["token"])
	siteID := stringFromAny(n["siteId"])
	if def.Token != "" && token == "" {
		n["token"] = def.Token
	}
	if def.SiteID != "" && siteID == "" {
		n["siteId"] = def.SiteID
	}
	out["netlify"] = n
	return out
}

func cloneAnyMap(m map[string]any) map[string]any {
	c := make(map[string]any, len(m))
	for k, v := range m {
		c[k] = v
	}
	return c
}

func stringFromAny(v any) string {
	s, _ := v.(string)
	return s
}

func (s *Server) handlePutConfig(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var cfg map[string]any
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&cfg); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if err := s.root.WriteConfig(cfg); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleGetIndex(w http.ResponseWriter, r *http.Request) {
	b, err := s.root.ReadIndex()
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(b)
}

// handlePutIndex writes index.html to disk (used by Netlify "Website → Laptop" sync; no manual-save UI).
func (s *Server) handlePutIndex(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	b, err := io.ReadAll(io.LimitReader(r.Body, 50<<20))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := s.root.WriteIndex(b); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleListAssets(w http.ResponseWriter, r *http.Request) {
	names, err := s.root.ListAssets()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(names)
}

// asset name from "/api/project/assets/foo.png"
func assetNameFromSuffix(path string) (string, error) {
	const prefix = "/api/project/assets/"
	if !strings.HasPrefix(path, prefix) {
		return "", project.ErrInvalidAssetName
	}
	name := strings.TrimPrefix(path, prefix)
	if name == "" || strings.Contains(name, "/") {
		return "", project.ErrInvalidAssetName
	}
	return project.SanitizeAssetName(name)
}

func (s *Server) handleAssetPath(w http.ResponseWriter, r *http.Request) {
	name, err := assetNameFromSuffix(r.URL.Path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		rc, size, err := s.root.ReadAsset(name)
		if err != nil {
			if os.IsNotExist(err) {
				http.Error(w, "not found", http.StatusNotFound)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rc.Close()
		if size > 0 {
			w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
		}
		w.Header().Set("Content-Type", "application/octet-stream")
		_, _ = io.Copy(w, rc)
	case http.MethodPut:
		defer r.Body.Close()
		if err := s.root.WriteAsset(name, io.LimitReader(r.Body, 80<<20)); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	case http.MethodDelete:
		if err := s.root.DeleteAsset(name); err != nil {
			if os.IsNotExist(err) {
				http.Error(w, "not found", http.StatusNotFound)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleNetlifyProxy(w http.ResponseWriter, r *http.Request) {
	target, _ := url.Parse("https://api.netlify.com")
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.Director = func(req *http.Request) {
		sub := strings.TrimPrefix(req.URL.Path, "/api/netlify")
		if sub == "" {
			sub = "/"
		}
		if !strings.HasPrefix(sub, "/") {
			sub = "/" + sub
		}
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		req.URL.Path = sub
		req.URL.RawPath = ""
		req.Host = target.Host
		allowed := pickHeaders(req.Header, "Authorization", "Content-Type", "Accept", "Accept-Encoding", "User-Agent")
		req.Header = allowed
		auth := strings.TrimSpace(req.Header.Get("Authorization"))
		if s.netlify.Token != "" && auth == "" {
			req.Header.Set("Authorization", "Bearer "+s.netlify.Token)
		}
	}
	proxy.Transport = &http.Transport{
		Proxy:               http.ProxyFromEnvironment,
		MaxIdleConns:        10,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 30 * time.Second,
	}
	proxy.ServeHTTP(w, r)
}

func pickHeaders(src http.Header, keys ...string) http.Header {
	dst := http.Header{}
	for _, k := range keys {
		if v := src.Values(k); len(v) > 0 {
			dst[k] = append([]string(nil), v...)
		}
	}
	return dst
}
