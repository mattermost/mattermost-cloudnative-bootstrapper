package static

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed all:build
var embeddedFiles embed.FS

// GetEmbeddedFileSystem returns the embedded file system containing the webapp build files
// It returns the build subdirectory as the root to serve files from
func GetEmbeddedFileSystem() (http.FileSystem, error) {
	buildDir, err := fs.Sub(embeddedFiles, "build")
	if err != nil {
		return nil, err
	}
	return http.FS(buildDir), nil
}

// IsEmbedded returns true if the embedded files are available
// This can be used to check if the server was built with embedded assets
func IsEmbedded() bool {
	// Try to read a common file that should exist in the build
	_, err := embeddedFiles.Open("build/index.html")
	return err == nil
}
