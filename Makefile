.PHONY: build build-windows build-windows-derotonde build-windows-janasey

# Client site env under sites/<CLIENT>.env (default: derotonde)
CLIENT ?= derotonde

build:
	go run ./cmd/bake-build -env sites/$(CLIENT).env -o dist/projectwhy_$(CLIENT)

# Cross-compile Windows amd64 → dist/projectwhy_<CLIENT>.exe (GUI subsystem, no console window)
build-windows:
	go run ./cmd/bake-build -env sites/$(CLIENT).env \
		-goos windows -goarch amd64 -ldflags "-H windowsgui" \
		-o dist/projectwhy_$(CLIENT).exe

build-windows-derotonde:
	$(MAKE) build-windows CLIENT=derotonde

build-windows-janasey:
	$(MAKE) build-windows CLIENT=janasey
