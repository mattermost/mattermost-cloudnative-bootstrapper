export GOBIN ?= $(PWD)/bin
GO ?= $(shell command -v go 2> /dev/null)

.PHONY: build_desktop_windows
build_desktop_windows:
	GOOS=windows GOARCH=amd64 go build -o build/mmbs.exe ./cmd/mcnb

.PHONY: build_desktop_linux
build_desktop_linux:
	GOOS=linux GOARCH=amd64 go build -o build/mmbs-linux ./cmd/mcnb

.PHONY: build_desktop_macos
build_desktop_macos:
	GOOS=darwin GOARCH=arm64 go build -o build/mmbs-mac_arm64 ./cmd/mcnb

.PHONY: build_desktop_macos_amd64
build_desktop_macos_amd64:
	GOOS=darwin GOARCH=amd64 go build -o build/mmbs-mac_amd64 ./cmd/mcnb

.PHONY: build_desktop_desktop
build_desktop_desktop: build_desktop_macos

.PHONY: lint-server
lint-server:
	@echo Running lint
	@echo $(GOBIN)
	GOBIN=$(GOBIN) $(GO) install golang.org/x/lint/golint
	$(GOBIN)/golint -set_exit_status $(./...)
	@echo lint success

.PHONY: govet
govet:
	@echo Running govet
	$(GO) vet ./...
	@echo Govet success

.PHONY: node_modules
node_modules:
	@echo Getting dependencies using npm
	git --version
	cd webapp; npm install


.PHONY: lint-webapp
lint-webapp: node_modules
	@echo Running eslint
	cd webapp; npm run lint

.PHONY: check-style
check-style: lint-server govet lint-webapp