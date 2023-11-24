package main

import (
	"context"
	"os"

	"github.com/mattermost/mattermost-cloud-dash/internal/logger"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "cdash",
	Short: "Mattermost Cloud Dash runs a dashboard for the Mattermost Cloud Provisioner",
	Run: func(cmd *cobra.Command, args []string) {
		_ = serverCmd.RunE(cmd, args)
	},
	// SilenceErrors allows us to explicitly log the error returned from rootCmd below.
	SilenceErrors: false,
}

func init() {
	_ = rootCmd.MarkFlagRequired("provisioner-url")
	rootCmd.PersistentFlags().String("provisioner-url", "", "The URL of the provisioning server.")
	rootCmd.AddCommand(serverCmd)
}

func main() {
	ctx := context.Background()
	ctx = logger.Init(ctx, logrus.InfoLevel)
	if err := rootCmd.ExecuteContext(ctx); err != nil {
		logger.FromContext(ctx).WithError(err).Error("command failed")
		os.Exit(1)
	}
}
