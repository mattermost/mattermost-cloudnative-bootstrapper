package api

import (
	"context"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"helm.sh/helm/v3/pkg/repo"

	helmclient "github.com/mittwald/go-helm-client"

	"github.com/mattermost/mattermost-cloudnative-bootstrapper/helm"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/internal/logger"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/model"
)

const (
	CallsOffloaderNamespace   = "mattermost-calls-offloader"
	CallsOffloaderReleaseName = "mattermost-calls-offloader"
)

// handleDeployCallsOffloaderService handles the deployment of the Calls Offloader service
func handleDeployCallsOffloaderService(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "deploy-calls-offloader")
	c.Ctx = logger.WithNamespace(c.Ctx, CallsOffloaderNamespace)

	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		model.WriteBadRequestError(w, "Cluster name is required for Calls Offloader deployment", "deploy-calls-offloader", map[string]interface{}{
			"provided_cluster_name": clusterName,
		})
		return
	}
	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	// Parse custom values from request body
	customValues, err := parseCustomValues(r)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse custom values")
		model.WriteBadRequestError(w, "Invalid custom values format", "deploy-calls-offloader", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Validate custom values YAML if provided
	if err := validateCustomValues(customValues); err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Invalid custom values YAML")
		model.WriteBadRequestError(w, "Invalid YAML format in custom values", "deploy-calls-offloader", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, CallsOffloaderNamespace)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		model.WriteDeploymentError(w, "Failed to connect to the Kubernetes cluster for Calls Offloader deployment. Please verify your cluster is running and accessible.", "deploy-calls-offloader", map[string]interface{}{
			"cluster_name": clusterName,
			"namespace":    CallsOffloaderNamespace,
			"error":        err.Error(),
		})
		return
	}

	chartRepo := repo.Entry{
		Name: "mattermost",
		URL:  "https://helm.mattermost.com",
	}

	err = helmClient.AddOrUpdateChartRepo(chartRepo)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to add or update chart repo")
		model.WriteDeploymentError(w, "Failed to add the Mattermost Helm repository for Calls Offloader deployment. This may be due to network connectivity issues.", "deploy-calls-offloader", map[string]interface{}{
			"repository_name": chartRepo.Name,
			"repository_url":  chartRepo.URL,
			"cluster_name":    clusterName,
			"error":           err.Error(),
		})
		return
	}

	// Use custom values if provided, otherwise use default values
	valuesYaml := helm.CallsOffloaderValues
	if customValues != "" {
		valuesYaml = customValues
	}

	chartSpec := helmclient.ChartSpec{
		ReleaseName:     CallsOffloaderReleaseName,
		ChartName:       "mattermost/mattermost-calls-offloader",
		Namespace:       CallsOffloaderNamespace,
		UpgradeCRDs:     true,
		Wait:            true,
		Timeout:         300 * time.Second,
		CreateNamespace: true,
		CleanupOnFail:   true,
		ValuesYaml:      valuesYaml,
	}

	// Install a chart release.
	// Note that helmclient.Options.Namespace should ideally match the namespace in chartSpec.Namespace.
	if _, err := helmClient.InstallOrUpgradeChart(context.Background(), &chartSpec, nil); err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to install calls-offloader service")
		model.WriteDeploymentError(w, "Failed to deploy the Calls Offloader service to your cluster. This could be due to insufficient resources, networking issues, or configuration problems.", "deploy-calls-offloader", map[string]interface{}{
			"chart_name":      chartSpec.ChartName,
			"release_name":    chartSpec.ReleaseName,
			"namespace":       chartSpec.Namespace,
			"cluster_name":    clusterName,
			"timeout_seconds": int(chartSpec.Timeout.Seconds()),
			"error":           err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// handleDeleteCallsOffloaderService handles the deletion of the Calls Offloader service
func handleDeleteCallsOffloaderService(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "delete-calls-offloader")
	c.Ctx = logger.WithNamespace(c.Ctx, CallsOffloaderNamespace)
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, CallsOffloaderNamespace)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = helmClient.UninstallReleaseByName(CallsOffloaderReleaseName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete calls-offloader service")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
