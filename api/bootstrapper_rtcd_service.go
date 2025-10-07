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
	// RTCDServiceNamespace is the Kubernetes namespace where the RTCD service is deployed
	RTCDServiceNamespace = "mattermost-rtcd"
	// RTCDServiceReleaseName is the Helm release name for the RTCD service
	RTCDServiceReleaseName = "mattermost-rtcd"
)

// handleDeleteRTCDService handles the deletion of the RTCD service
func handleDeleteRTCDService(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "delete-rtcd")
	c.Ctx = logger.WithNamespace(c.Ctx, RTCDServiceNamespace)
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, RTCDServiceNamespace)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = helmClient.UninstallReleaseByName(RTCDServiceReleaseName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete rtcd service")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// handleDeployRTCDService handles the deployment of the RTCD service
func handleDeployRTCDService(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "deploy-rtcd")
	c.Ctx = logger.WithNamespace(c.Ctx, RTCDServiceNamespace)

	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		model.WriteBadRequestError(w, "Cluster name is required for RTCD deployment", "deploy-rtcd", map[string]interface{}{
			"provided_cluster_name": clusterName,
		})
		return
	}
	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	// Parse custom values from request body
	customValues, err := parseCustomValues(r)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse custom values")
		model.WriteBadRequestError(w, "Invalid custom values format", "deploy-rtcd", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Validate custom values YAML if provided
	if err := validateCustomValues(customValues); err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Invalid custom values YAML")
		model.WriteBadRequestError(w, "Invalid YAML format in custom values", "deploy-rtcd", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, RTCDServiceNamespace)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		model.WriteDeploymentError(w, "Failed to connect to the Kubernetes cluster. Please verify your cluster is running and accessible.", "deploy-rtcd", map[string]interface{}{
			"cluster_name": clusterName,
			"namespace":    RTCDServiceNamespace,
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
		model.WriteDeploymentError(w, "Failed to add the Mattermost Helm repository. This may be due to network connectivity issues.", "deploy-rtcd", map[string]interface{}{
			"repository_name": chartRepo.Name,
			"repository_url":  chartRepo.URL,
			"cluster_name":    clusterName,
			"error":           err.Error(),
		})
		return
	}

	// Use custom values if provided, otherwise use default values
	valuesYaml := helm.RTCDServiceValues
	if customValues != "" {
		valuesYaml = customValues
	}

	chartSpec := helmclient.ChartSpec{
		ReleaseName:     RTCDServiceReleaseName,
		ChartName:       "mattermost/mattermost-rtcd",
		Namespace:       RTCDServiceNamespace,
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
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to install rtcd service")
		model.WriteDeploymentError(w, "Failed to deploy the RTCD service to your cluster. This could be due to insufficient resources, networking issues, or configuration problems.", "deploy-rtcd", map[string]interface{}{
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
