package main

import (
	"context"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/api"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/internal/logger"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/static"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

const defaultLocalServerAPI = "http://localhost:8070"

var serverCmd = &cobra.Command{
	Use:   "server",
	Short: "Run the Mattermost CloudNative Bootstrapper server",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := context.Background()
		r := mux.NewRouter()

		stateFilePath, _ := cmd.Flags().GetString("state-file-path")
		telemetryDisabled, _ := cmd.Flags().GetBool("disable-telemetry")

		ctx = logger.Init(ctx, logrus.DebugLevel)

		logger.FromContext(ctx).Infof("Using state file path: %s", stateFilePath)

		apiContext, err := api.NewContext(ctx, stateFilePath, telemetryDisabled)
		if err != nil {
			return err
		}

		api.Register(r, apiContext)

		// Serve embedded static files if available (server mode)
		if static.IsEmbedded() {
			logger.FromContext(ctx).Info("Serving embedded frontend files")
			staticFileSystem, err := static.GetEmbeddedFileSystem()
			if err != nil {
				logger.FromContext(ctx).WithError(err).Error("Failed to get embedded file system")
			} else {
				// Create a custom handler for SPA routing
				spaHandler := http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
					// Skip API routes - let them return 404 naturally
					if strings.HasPrefix(req.URL.Path, "/api/v1") {
						http.NotFound(w, req)
						return
					}

					// Try to serve the requested file first
					if file, err := staticFileSystem.Open(req.URL.Path[1:]); err == nil {
						http.ServeContent(w, req, req.URL.Path, time.Time{}, file.(io.ReadSeeker))
						defer file.Close()
						return
					}

					// If file not found and it's not an API route, serve index.html for SPA routing
					indexFile, err := staticFileSystem.Open("index.html")
					if err != nil {
						http.NotFound(w, req)
						return
					}
					defer indexFile.Close()

					w.Header().Set("Content-Type", "text/html; charset=utf-8")
					http.ServeContent(w, req, "index.html", time.Time{}, indexFile.(io.ReadSeeker))
				})

				// Serve everything through our custom handler
				r.PathPrefix("/").Handler(spaHandler)
			}
		} else {
			logger.FromContext(ctx).Info("No embedded frontend files found - running in API-only mode")
		}

		srv := &http.Server{
			Addr:           ":8070",
			Handler:        r,
			ReadTimeout:    180 * time.Second,
			WriteTimeout:   180 * time.Second,
			IdleTimeout:    time.Second * 180,
			MaxHeaderBytes: 1 << 20,
			ErrorLog:       log.New(&logger.LogWriter{Logger: logger.FromContext(ctx)}, "", 0),
		}
		logger.FromContext(ctx).Infof("Starting server...")
		go func() {
			logger.FromContext(ctx).WithField("addr", srv.Addr).Info("API server listening")
			if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				logger.FromContext(ctx).WithError(err).Error("Failed to listen and serve")
			}
		}()

		c := make(chan os.Signal, 1)
		// We'll accept graceful shutdowns when quit via:
		//  - SIGINT (Ctrl+C)
		//  - SIGTERM (Ctrl+/) (Kubernetes pod rolling termination)
		// SIGKILL and SIGQUIT will not be caught.
		signal.Notify(c, os.Interrupt, syscall.SIGTERM)
		// Block until we receive a valid signal.
		sig := <-c
		logger.FromContext(ctx).WithField("shutdown-signal", sig.String()).Info("Shutting down")

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			logger.FromContext(ctx).WithField("err", err.Error()).Error("error shutting down server")
		}

		return nil
	},
}
