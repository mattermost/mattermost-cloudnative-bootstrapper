package main

import (
	"context"
	"os"

	"github.com/mattermost/mattermost-cloudnative-bootstrapper/api"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/internal/logger"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "mcnb",
	Short: "mcnb runs the Mattermost Cloud Bootstrapper server",
	Run: func(cmd *cobra.Command, args []string) {
		_ = serverCmd.RunE(cmd, args)
	},
	// SilenceErrors allows us to explicitly log the error returned from rootCmd below.
	SilenceErrors: false,
}

func init() {
	serverCmd.PersistentFlags().String("state-file-path", api.DefaultStateFilePath(), "Path to the state file. Defaults to ~/.mcnb/state.json")
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
