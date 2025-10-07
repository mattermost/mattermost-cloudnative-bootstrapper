package api

import (
	"context"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"helm.sh/helm/v3/pkg/repo"

	helmclient "github.com/mittwald/go-helm-client"

	"github.com/mattermost/mattermost-cloudnative-bootstrapper/internal/logger"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/model"
)

const (
	// MattermostOperatorNamespace is the Kubernetes namespace where the Mattermost operator is deployed
	MattermostOperatorNamespace = "mattermost-operator"
	// MattermostOperatorReleaseName is the Helm release name for the Mattermost operator
	MattermostOperatorReleaseName = "mattermost-operator"
)

// handleDeleteMattermostOperator handles the deletion of the Mattermost operator
func handleDeleteMattermostOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "delete-mattermost")
	c.Ctx = logger.WithNamespace(c.Ctx, MattermostOperatorNamespace)
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, MattermostOperatorNamespace)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = helmClient.UninstallReleaseByName(MattermostOperatorReleaseName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete mattermost-operator operator")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// handleDeployMattermostOperator handles the deployment of the Mattermost operator
func handleDeployMattermostOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	logger.FromContext(c.Ctx).Info("Getting kubeconfig")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		model.WriteBadRequestError(w, "Cluster name is required for Mattermost operator deployment", "deploy-mattermost-operator", map[string]interface{}{
			"provided_cluster_name": clusterName,
		})
		return
	}

	// Parse custom values from request body
	customValues, err := parseCustomValues(r)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse custom values")
		model.WriteBadRequestError(w, "Invalid custom values format", "deploy-mattermost-operator", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Validate custom values YAML if provided
	if err := validateCustomValues(customValues); err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Invalid custom values YAML")
		model.WriteBadRequestError(w, "Invalid YAML format in custom values", "deploy-mattermost-operator", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, MattermostOperatorNamespace)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		model.WriteDeploymentError(w, "Failed to connect to the Kubernetes cluster for Mattermost operator deployment. Please verify your cluster is running and accessible.", "deploy-mattermost-operator", map[string]interface{}{
			"cluster_name": clusterName,
			"namespace":    MattermostOperatorNamespace,
			"error":        err.Error(),
		})
		return
	}

	chartRepo := repo.Entry{Name: "mattermost", URL: "https://helm.mattermost.com"}

	err = helmClient.AddOrUpdateChartRepo(chartRepo)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to add or update chart repo")
		model.WriteDeploymentError(w, "Failed to add the Mattermost Helm repository for Mattermost operator deployment. This may be due to network connectivity issues.", "deploy-mattermost-operator", map[string]interface{}{
			"repository_name": chartRepo.Name,
			"repository_url":  chartRepo.URL,
			"cluster_name":    clusterName,
			"error":           err.Error(),
		})
		return
	}

	chartSpec := helmclient.ChartSpec{
		ReleaseName:     MattermostOperatorReleaseName,
		ChartName:       "mattermost/mattermost-operator",
		Namespace:       MattermostOperatorNamespace,
		UpgradeCRDs:     true,
		Wait:            true,
		Timeout:         300 * time.Second,
		CreateNamespace: true,
		CleanupOnFail:   true,
		ValuesYaml:      customValues, // Use custom values if provided (empty string means use chart defaults)
	}

	// Install a chart release.
	// Note that helmclient.Options.Namespace should ideally match the namespace in chartSpec.Namespace.
	if _, err := helmClient.InstallOrUpgradeChart(context.Background(), &chartSpec, nil); err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to install mattermost operator")
		model.WriteDeploymentError(w, "Failed to deploy the Mattermost operator to your cluster. This could be due to insufficient resources, networking issues, or configuration problems.", "deploy-mattermost-operator", map[string]interface{}{
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
