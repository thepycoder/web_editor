.PHONY: build build-windows
build:
	go run ./cmd/bake-build

# Cross-compile Windows amd64 → dist/projectwhy_<version>.exe (GUI subsystem, no console window)
build-windows:
	go run ./cmd/bake-build -goos windows -goarch amd64 -ldflags "-H windowsgui"
