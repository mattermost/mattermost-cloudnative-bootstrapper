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
	// NginxOperatorNamespace is the Kubernetes namespace where the Nginx operator is deployed
	NginxOperatorNamespace = "ingress-nginx"
	// NginxOperatorReleaseName is the Helm release name for the Nginx operator
	NginxOperatorReleaseName = "ingress-nginx"
)

// handleDeleteNginxOperator handles the deletion of the Nginx operator
func handleDeleteNginxOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "delete-ingress-nginx")
	c.Ctx = logger.WithNamespace(c.Ctx, NginxOperatorNamespace)

	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, NginxOperatorNamespace)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = helmClient.UninstallReleaseByName(NginxOperatorReleaseName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete ingress-nginx operator")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// handleDeployNginxOperator handles the deployment of the Nginx operator
func handleDeployNginxOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "deploy-ingress-nginx")
	c.Ctx = logger.WithNamespace(c.Ctx, NginxOperatorNamespace)

	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		model.WriteBadRequestError(w, "Cluster name is required for Nginx operator deployment", "deploy-nginx-operator", map[string]interface{}{
			"provided_cluster_name": clusterName,
		})
		return
	}
	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	// Parse custom values from request body
	customValues, err := parseCustomValues(r)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse custom values")
		model.WriteBadRequestError(w, "Invalid custom values format", "deploy-nginx-operator", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Validate custom values YAML if provided
	if err := validateCustomValues(customValues); err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Invalid custom values YAML")
		model.WriteBadRequestError(w, "Invalid YAML format in custom values", "deploy-nginx-operator", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// TODO: Before this can run, the subnets that the cluster was created on must be updated to have tags with the format:
	// kubernetes.io/cluster/cluster-name: shared (TODO: Confirm "shared" is correct?)

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, NginxOperatorNamespace)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		model.WriteDeploymentError(w, "Failed to connect to the Kubernetes cluster for Nginx operator deployment. Please verify your cluster is running and accessible.", "deploy-nginx-operator", map[string]interface{}{
			"cluster_name": clusterName,
			"namespace":    NginxOperatorNamespace,
			"error":        err.Error(),
		})
		return
	}

	chartRepo := repo.Entry{
		Name: "nginx",
		URL:  "https://kubernetes.github.io/ingress-nginx",
	}

	err = helmClient.AddOrUpdateChartRepo(chartRepo)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to add or update chart repo")
		model.WriteDeploymentError(w, "Failed to add the Nginx Helm repository. This may be due to network connectivity issues.", "deploy-nginx-operator", map[string]interface{}{
			"repository_name": chartRepo.Name,
			"repository_url":  chartRepo.URL,
			"cluster_name":    clusterName,
			"error":           err.Error(),
		})
		return
	}

	// Use custom values if provided, otherwise use default values
	valuesYaml := helm.NginxOperatorValues
	if customValues != "" {
		valuesYaml = customValues
	}

	chartSpec := helmclient.ChartSpec{
		ReleaseName:     NginxOperatorReleaseName,
		ChartName:       "nginx/ingress-nginx",
		Namespace:       NginxOperatorNamespace,
		UpgradeCRDs:     true,
		Wait:            true,
		Timeout:         3000 * time.Second,
		CreateNamespace: true,
		CleanupOnFail:   true,
		ValuesYaml:      valuesYaml,
	}

	// Install a chart release.
	// Note that helmclient.Options.Namespace should ideally match the namespace in chartSpec.Namespace.
	if _, err := helmClient.InstallOrUpgradeChart(context.Background(), &chartSpec, nil); err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to install nginx operator")
		model.WriteDeploymentError(w, "Failed to deploy the Nginx ingress controller to your cluster. This could be due to insufficient resources, networking issues, or missing subnet tags.", "deploy-nginx-operator", map[string]interface{}{
			"chart_name":      chartSpec.ChartName,
			"release_name":    chartSpec.ReleaseName,
			"namespace":       chartSpec.Namespace,
			"cluster_name":    clusterName,
			"timeout_seconds": int(chartSpec.Timeout.Seconds()),
			"error":           err.Error(),
			"note":            "Ensure your cluster subnets have the kubernetes.io/cluster/cluster-name tag",
		})
		return
	}

	w.WriteHeader(http.StatusCreated)
}
