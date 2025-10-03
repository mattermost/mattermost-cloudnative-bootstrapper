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
	@echo Running staticcheck
	@echo $(GOBIN)
	GOBIN=$(GOBIN) $(GO) install honnef.co/go/tools/cmd/staticcheck@latest
	$(GOBIN)/staticcheck ./...
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

.PHONY: build-webapp
build-webapp: node_modules
	@echo Building webapp for production
	cd webapp; npm run build

.PHONY: build-server-embedded
build-server-embedded: build-webapp
	@echo Building server with embedded frontend
	@echo Copying webapp build files to static/build
	rm -rf static/build
	mkdir -p static
	cp -r webapp/build static/
	go build -o build/mcnb-server ./cmd/mcnb
	@echo Cleaning up copied files
	rm -rf static/build

.PHONY: run-server-dev
run-server-dev:
	@echo Starting API server with go run on http://localhost:8070
	@echo "The server will run in API-only mode (no embedded frontend)"
	@echo "Press Ctrl+C to stop the server"
	go run ./cmd/mcnb server --disable-telemetry

.PHONY: run-webapp-dev
run-webapp-dev: node_modules
	@echo Starting React development server on http://localhost:3000
	@echo "API calls will be proxied to http://localhost:8070"
	@echo "Make sure the API server is running with 'make run-server-dev'"
	@echo "Press Ctrl+C to stop the development server"
	cd webapp && npm start
