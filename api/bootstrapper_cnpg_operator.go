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
	// CNPGOperatorNamespace is the Kubernetes namespace where the CloudNative PG operator is deployed
	CNPGOperatorNamespace = "cnpg-system"
	// CNPGOperatorReleaseName is the Helm release name for the CloudNative PG operator
	CNPGOperatorReleaseName = "cnpg-system"
)

// handleDeletePGOperator handles the deletion of the CloudNative PG operator
func handleDeletePGOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "delete-cnpg")
	c.Ctx = logger.WithNamespace(c.Ctx, CNPGOperatorNamespace)
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, CNPGOperatorNamespace)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = helmClient.UninstallReleaseByName(CNPGOperatorReleaseName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete cnpg-system operator")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// handleDeployPGOperator handles the deployment of the CloudNative PG operator
func handleDeployPGOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "deploy-cnpg")
	c.Ctx = logger.WithNamespace(c.Ctx, "cnpg")
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		model.WriteBadRequestError(w, "Cluster name is required for CloudNative PostgreSQL operator deployment", "deploy-pg-operator", map[string]interface{}{
			"provided_cluster_name": clusterName,
		})
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	// Parse custom values from request body
	customValues, err := parseCustomValues(r)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse custom values")
		model.WriteBadRequestError(w, "Invalid custom values format", "deploy-pg-operator", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Validate custom values YAML if provided
	if err := validateCustomValues(customValues); err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Invalid custom values YAML")
		model.WriteBadRequestError(w, "Invalid YAML format in custom values", "deploy-pg-operator", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, "kube-system")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		model.WriteDeploymentError(w, "Failed to connect to the Kubernetes cluster for PostgreSQL operator deployment. Please verify your cluster is running and accessible.", "deploy-pg-operator", map[string]interface{}{
			"cluster_name": clusterName,
			"namespace":    "kube-system",
			"error":        err.Error(),
		})
		return
	}

	err = c.CloudProvider.HelmFileStorePre(c.Ctx, clusterName, "kube-system")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to execute file system preinstall steps for cnpg operator")
		model.WriteDeploymentError(w, "Failed to configure file storage prerequisites for PostgreSQL operator deployment. This may be due to insufficient permissions or storage configuration issues.", "deploy-pg-operator", map[string]interface{}{
			"cluster_name": clusterName,
			"namespace":    "kube-system",
			"error":        err.Error(),
		})
		return
	}

	chartRepo := repo.Entry{
		Name: "cnpg",
		URL:  "https://cloudnative-pg.github.io/charts",
	}

	err = helmClient.AddOrUpdateChartRepo(chartRepo)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to add or update chart repo")
		model.WriteDeploymentError(w, "Failed to add the CloudNative PostgreSQL Helm repository. This may be due to network connectivity issues.", "deploy-pg-operator", map[string]interface{}{
			"repository_name": chartRepo.Name,
			"repository_url":  chartRepo.URL,
			"cluster_name":    clusterName,
			"error":           err.Error(),
		})
		return
	}

	helmClient, err = c.CloudProvider.HelmClient(c.Ctx, clusterName, CNPGOperatorNamespace)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		model.WriteDeploymentError(w, "Failed to connect to the cnpg-system namespace for PostgreSQL operator deployment.", "deploy-pg-operator", map[string]interface{}{
			"cluster_name": clusterName,
			"namespace":    CNPGOperatorNamespace,
			"error":        err.Error(),
		})
		return
	}

	chartSpec := helmclient.ChartSpec{
		ReleaseName:     CNPGOperatorReleaseName,
		ChartName:       "cnpg/cloudnative-pg",
		Namespace:       CNPGOperatorNamespace,
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
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to install cnpg operator")
		model.WriteDeploymentError(w, "Failed to deploy the CloudNative PostgreSQL operator to your cluster. This could be due to insufficient resources, networking issues, or configuration problems.", "deploy-pg-operator", map[string]interface{}{
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
