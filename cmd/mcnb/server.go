package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/api"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/internal/logger"
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
