.PHONY: build_windows build_linux build_macos build_macos_amd64 build

build_windows:
	GOOS=windows GOARCH=amd64 go build -o build/mmbs.exe ./cmd/mcnb

build_linux:
	GOOS=linux GOARCH=amd64 go build -o build/mmbs-linux ./cmd/mcnb

build_macos:
	GOOS=darwin GOARCH=arm64 go build -o build/mmbs-mac_arm64 ./cmd/mcnb

build_macos_amd64:
	GOOS=darwin GOARCH=amd64 go build -o build/mmbs-mac_amd64 ./cmd/mcnb

build: build_macos

# build: build_windows build_linux build_macos build_macos_amd64