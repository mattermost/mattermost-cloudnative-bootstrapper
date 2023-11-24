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
	"github.com/mattermost/mattermost-cloud-dash/api"
	"github.com/mattermost/mattermost-cloud-dash/internal/logger"
	provisioner "github.com/mattermost/mattermost-cloud/model"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

const defaultLocalServerAPI = "http://localhost:8070"

var serverCmd = &cobra.Command{
	Use:   "server",
	Short: "Run the Mattermost Cloud Dash server",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := context.Background()
		r := mux.NewRouter()

		ctx = logger.Init(ctx, logrus.DebugLevel)

		provisionerURL, _ := cmd.Flags().GetString("provisioner-url")

		ctx = logger.WithField(ctx, "provisioner-url", provisionerURL)

		provisionerClient := provisioner.NewClient(provisionerURL)

		api.Register(r, &api.Context{
			Ctx:               ctx,
			ProvisionerClient: provisionerClient,
		})

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
		// Important:
		// There are long-lived serial processes in the supervisors (especially
		// the cluster supervisor). It is quite possible that these will still
		// be terminated before completion if the k8s rolling grace period is
		// too low. Handling this will require further improvements.

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
