package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	mmv1beta1 "github.com/mattermost/mattermost-operator/apis/mattermost/v1beta1"

	"github.com/aws/aws-sdk-go/aws"
	cnpgv1 "github.com/cloudnative-pg/cloudnative-pg/api/v1"
	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-cloud-dash/internal/logger"
	"github.com/mattermost/mattermost-cloud-dash/model"
	helmclient "github.com/mittwald/go-helm-client"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/repo"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/tools/clientcmd"
)

func initBootstrapper(apiRouter *mux.Router, context *Context) {
	addContext := func(handler contextHandlerFunc) *contextHandler {
		return newContextHandler(context, handler)
	}

	bootstrapperRouter := apiRouter.PathPrefix("/{cloudProvider:[A-Za-z0-9_-]+}").Subrouter()
	bootstrapperRouter.Handle("/set_credentials", addContext(handleSetCredentials)).Methods(http.MethodPost)
	bootstrapperRouter.Handle("/roles", addContext(handleListRoles)).Methods(http.MethodGet)
	bootstrapperRouter.Handle("/clusters", addContext(handleListClusters)).Methods(http.MethodGet)
	bootstrapperRouter.Handle("/cluster", addContext(handleCreateCluster)).Methods(http.MethodPost)

	rdsRouter := bootstrapperRouter.PathPrefix("/rds").Subrouter()
	rdsRouter.Handle("", addContext(handleCreateDatabase)).Methods(http.MethodPost)

	// TODO: Add middleware to handle checking that the cluster name passed won't send a 400, so that we don't have to do it in every api handler
	clusterNameRouter := bootstrapperRouter.PathPrefix("/cluster/{name:[A-Za-z0-9_-]+}").Subrouter()
	clusterNameRouter.Handle("", addContext(handleGetCluster)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/nodegroups", addContext(handleGetNodegroups)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/nodegroups", addContext(handleCreateNodeGroup)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/kubeconfig", addContext(handleGetKubeConfig)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/installed_charts", addContext(handleGetInstalledCharts)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/deploy_mattermost_operator", addContext(handleDeployMattermostOperator)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/deploy_nginx_operator", addContext(handleDeployNginxOperator)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/deploy_pg_operator", addContext(handleDeployPGOperator)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/pg_operator", addContext(handleDeletePGOperator)).Methods(http.MethodDelete)
	clusterNameRouter.Handle("/mattermost_operator", addContext(handleDeleteMattermostOperator)).Methods(http.MethodDelete)
	clusterNameRouter.Handle("/nginx_operator", addContext(handleDeleteNginxOperator)).Methods(http.MethodDelete)
	clusterNameRouter.Handle("/namespaces", addContext(handleGetClusterNamespaces)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/installation", addContext(handleCreateMattermostInstallation)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/installations", addContext(handleGetMattermostInstallations)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/cnpg/cluster", addContext(handleCreateCNPGCluster)).Methods(http.MethodPost)

	installationNameRouter := clusterNameRouter.PathPrefix("/installation/{installationName:[A-Za-z0-9_-]+}").Subrouter()
	installationNameRouter.Handle("", addContext(handleDeleteMattermostInstallation)).Methods(http.MethodDelete)
	installationNameRouter.Handle("", addContext(handlePatchMattermostInstallation)).Methods(http.MethodPatch)
}

func handleSetCredentials(c *Context, w http.ResponseWriter, r *http.Request) {
	var credentials model.Credentials
	json.NewDecoder(r.Body).Decode(&credentials)

	err := c.CloudProvider.SetCredentials(c.Ctx, &credentials)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to set credentials")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	response := model.CredentialsResponse{}

	success, err := c.CloudProvider.ValidateCredentials(&credentials)
	response.Success = success
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to validate credentials")
		response.Message = err.Error()
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func handleListRoles(c *Context, w http.ResponseWriter, r *http.Request) {
	roles, err := c.CloudProvider.ListRoles(c.Ctx)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list roles")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(roles)
}

// TODO: Support looking in different regions based on query param
func handleListClusters(c *Context, w http.ResponseWriter, r *http.Request) {
	result, err := c.CloudProvider.ListClusters(c.Ctx)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list clusters")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(result)
}

func handleCreateCluster(c *Context, w http.ResponseWriter, r *http.Request) {
	logger.FromContext(c.Ctx).Info("Creating cluster")

	create, err := model.NewCreateClusterRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse create cluster request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	result, err := c.CloudProvider.CreateCluster(c.Ctx, create)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create cluster")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(result)
}

func handleGetCluster(c *Context, w http.ResponseWriter, r *http.Request) {
	logger.FromContext(c.Ctx).Info("Fetching cluster")

	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	result, err := c.CloudProvider.GetCluster(c.Ctx, clusterName)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to describe cluster")
		w.WriteHeader(http.StatusInternalServerError)
	}

	json.NewEncoder(w).Encode(result)
}

func handleGetNodegroups(c *Context, w http.ResponseWriter, r *http.Request) {
	logger.FromContext(c.Ctx).Info("Refreshing node groups")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	nodes, err := c.CloudProvider.GetNodegroups(c.Ctx, clusterName)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list node groups")
		w.WriteHeader(http.StatusInternalServerError)
	}

	json.NewEncoder(w).Encode(nodes)
}

func handleCreateNodeGroup(c *Context, w http.ResponseWriter, r *http.Request) {
	logger.FromContext(c.Ctx).Info("Creating node group")

	vars := mux.Vars(r)
	clusterName := vars["name"]

	create, err := model.NewCreateNodeGroupRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse create node group request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	result, err := c.CloudProvider.CreateNodegroup(c.Ctx, clusterName, create)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create node group")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(result)
}

func handleCreateDatabase(c *Context, w http.ResponseWriter, r *http.Request) {
	// TODO: Implement
	w.Write([]byte("Not implemented"))
}

func handleGetKubeConfig(c *Context, w http.ResponseWriter, r *http.Request) {
	logger.FromContext(c.Ctx).Info("Getting kubeconfig")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	config, err := c.CloudProvider.GetKubeConfig(c.Ctx, clusterName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rawConfig, err := config.RawConfig()
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to get raw config")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	kubeconfigBytes, err := clientcmd.Write(rawConfig)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to write kubeconfig")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain") // Or appropriate content type

	w.Write(kubeconfigBytes)
}

func handleGetInstalledCharts(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "get-installed-charts")
	vars := mux.Vars(r)

	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	kubeClient, err := c.CloudProvider.KubeClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create k8s client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Get all namespaces to loop through
	namespaces, err := kubeClient.Clientset.CoreV1().Namespaces().List(c.Ctx, metav1.ListOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list namespaces")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if len(namespaces.Items) == 0 {
		json.NewEncoder(w).Encode([]model.InstalledReleases{})
		return
	}
	allReleases := []*release.Release{}
	for _, namespace := range namespaces.Items {
		logger.FromContext(c.Ctx).Info("Getting releases for namespace", namespace.Name)

		helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, namespace.Name)
		if err != nil {
			logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		release, err := helmClient.ListDeployedReleases()
		if err != nil {
			logger.FromContext(c.Ctx).WithError(err).Error("Failed to list deployed releases")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		allReleases = append(allReleases, release...)
	}

	logger.FromContext(c.Ctx).Errorf("%+v", allReleases)

	releasesRes := []model.InstalledReleases{}
	for _, release := range allReleases {
		releasesRes = append(releasesRes, model.InstalledReleases{
			Name:    release.Name,
			Version: release.Chart.Metadata.Version,
			Status:  release.Info.Status.String(),
		})
	}

	json.NewEncoder(w).Encode(releasesRes)
}

func handleDeleteNginxOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "delete-ingress-nginx")
	c.Ctx = logger.WithNamespace(c.Ctx, "ingress-nginx")

	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, "ingress-nginx")

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = helmClient.UninstallReleaseByName("ingress-nginx")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete ingress-nginx operator")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)

}

func handleDeployNginxOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "deploy-ingress-nginx")
	c.Ctx = logger.WithNamespace(c.Ctx, "ingress-nginx")

	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	// TODO: Before this can run, the subnets that the cluster was created on must be updated to have tags with the format:
	// kubernetes.io/cluster/cluster-name: shared (TODO: Confirm "shared" is correct?)

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, "ingress-nginx")

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	chartRepo := repo.Entry{
		Name: "nginx",
		URL:  "https://kubernetes.github.io/ingress-nginx",
	}

	err = helmClient.AddOrUpdateChartRepo(chartRepo)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to add or update chart repo")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// TODO - we need some sort of pre-post hooks for the install to allow for environment specific configurations
	valuesYaml := `controller:
    service:
      annotations:
        service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"
        service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "https"
        service.beta.kubernetes.io/aws-load-balancer-ssl-cert: arn:aws:acm:us-east-1:926412419614:certificate/e13f9426-e452-4670-9f6a-f56b3f346bf1`

	chartSpec := helmclient.ChartSpec{
		ReleaseName:     "ingress-nginx",
		ChartName:       "nginx/ingress-nginx",
		Namespace:       "ingress-nginx",
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
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to install mattermost operator")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)

}

func handleDeletePGOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "delete-cnpg")
	c.Ctx = logger.WithNamespace(c.Ctx, "cnpg-system")
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, "cnpg-system")

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = helmClient.UninstallReleaseByName("cnpg-system")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete cnpg-system operator")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleDeployPGOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "deploy-cnpg")
	c.Ctx = logger.WithNamespace(c.Ctx, "cnpg")
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, "kube-system")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// TODO: We need to be able to add pre/post hooks for helm charts to allow for provider specific configurations
	chartRepo := repo.Entry{
		Name: "aws-ebs-csi-driver",
		URL:  "https://kubernetes-sigs.github.io/aws-ebs-csi-driver/",
	}

	err = helmClient.AddOrUpdateChartRepo(chartRepo)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to add or update chart repo")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	chartSpec := helmclient.ChartSpec{
		ReleaseName:     "aws-ebs-csi-driver",
		ChartName:       "aws-ebs-csi-driver/aws-ebs-csi-driver",
		Namespace:       "kube-system",
		UpgradeCRDs:     true,
		Wait:            true,
		Timeout:         300 * time.Second,
		CreateNamespace: true,
		CleanupOnFail:   true,
	}

	// Install a chart release.
	// Note that helmclient.Options.Namespace should ideally match the namespace in chartSpec.Namespace.
	if _, err := helmClient.InstallOrUpgradeChart(context.Background(), &chartSpec, nil); err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to install aws-ebs-csi-driver")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	chartRepo = repo.Entry{
		Name: "cnpg",
		URL:  "https://cloudnative-pg.github.io/charts",
	}

	err = helmClient.AddOrUpdateChartRepo(chartRepo)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to add or update chart repo")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	helmClient, err = c.CloudProvider.HelmClient(c.Ctx, clusterName, "cnpg-system")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	chartSpec = helmclient.ChartSpec{
		ReleaseName:     "cnpg-system",
		ChartName:       "cnpg/cloudnative-pg",
		Namespace:       "cnpg-system",
		UpgradeCRDs:     true,
		Wait:            true,
		Timeout:         300 * time.Second,
		CreateNamespace: true,
		CleanupOnFail:   true,
	}

	// Install a chart release.
	// Note that helmclient.Options.Namespace should ideally match the namespace in chartSpec.Namespace.
	if _, err := helmClient.InstallOrUpgradeChart(context.Background(), &chartSpec, nil); err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to install cnpg operator")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func handleGetClusterNamespaces(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	kubeClient, err := c.CloudProvider.KubeClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create clientset")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	namespaces, err := kubeClient.Clientset.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list namespaces")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(namespaces.Items)

}

func handleCreateCNPGCluster(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	kubeClient, err := c.CloudProvider.KubeClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create clientset")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	namespace := &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "cnpg-cluster",
			Namespace: "cnpg-cluster",
		},
	}

	// TODO: Check for existence before creating to avoid error
	_, err = kubeClient.Clientset.CoreV1().Namespaces().Create(context.TODO(), namespace, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create namespace")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	dbCluster := &cnpgv1.Cluster{
		ObjectMeta: metav1.ObjectMeta{
			Name:      clusterName + "-cnpg-cluster",
			Namespace: "cnpg-cluster",
		},
		Spec: cnpgv1.ClusterSpec{
			Instances:            1,
			StorageConfiguration: cnpgv1.StorageConfiguration{Size: "1Gi"},
		},
	}

	gvr := schema.GroupVersionResource{
		Group:    "postgresql.cnpg.io",
		Version:  "v1",
		Resource: "clusters",
	}

	unstructuredObj, err := model.ConvertToUnstructured(dbCluster)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to convert to unstructured")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	unstructuredObj.Object["apiVersion"] = "postgresql.cnpg.io/v1"
	unstructuredObj.Object["kind"] = "Cluster"

	// Create the CRD Instance
	_, err = kubeClient.DynamicClient.Resource(gvr).Namespace("cnpg-cluster").Create(context.TODO(), unstructuredObj, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create CRD")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func handlePatchMattermostInstallation(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	installationName := vars["installationName"]
	if installationName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	patchRequest, err := model.NewMattermostWorkspacePatchRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse patch mattermost workspace request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if !patchRequest.IsValid() {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	kubeClient, err := c.CloudProvider.KubeClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create clientset")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	installation, err := kubeClient.MattermostClientsetV1Beta.MattermostV1beta1().Mattermosts(installationName).Get(context.TODO(), installationName, metav1.GetOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to get installation")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	installation.Spec.Version = patchRequest.Version
	installation.Spec.Image = patchRequest.Image

	installation, err = kubeClient.MattermostClientsetV1Beta.MattermostV1beta1().Mattermosts(installationName).Update(context.TODO(), installation, metav1.UpdateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to update installation")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(installation)

}

func handleDeleteMattermostInstallation(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	installationName := vars["installationName"]
	if installationName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	kubeClient, err := c.CloudProvider.KubeClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create clientset")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Delete the CRD

	err = kubeClient.MattermostClientsetV1Beta.MattermostV1beta1().Mattermosts(installationName).Delete(context.TODO(), installationName, metav1.DeleteOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete CRD")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Delete the namespace

	err = kubeClient.Clientset.CoreV1().Namespaces().Delete(context.TODO(), installationName, metav1.DeleteOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete namespace")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func handleCreateMattermostInstallation(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	create, err := model.NewCreateMattermostWorkspaceRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse create mattermost workspace request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if !create.IsValid() {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	kubeClient, err := c.CloudProvider.KubeClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create clientset")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	namespaceName := "mm-installation-" + create.InstallationName

	namespace := &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:      namespaceName,
			Namespace: namespaceName,
		},
	}

	_, err = kubeClient.Clientset.CoreV1().Namespaces().Create(context.TODO(), namespace, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create namespace")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	writer := create.DBConnectionString
	reader := create.DBReplicasConnectionString

	if create.CreateDatabase {
		dbCluster := &cnpgv1.Cluster{
			ObjectMeta: metav1.ObjectMeta{
				Name:      namespaceName + "-cnpg-cluster",
				Namespace: namespaceName,
			},
			Spec: cnpgv1.ClusterSpec{
				Instances:            1,
				StorageConfiguration: cnpgv1.StorageConfiguration{Size: "1Gi"},
			},
		}

		gvr := schema.GroupVersionResource{
			Group:    "postgresql.cnpg.io",
			Version:  "v1",
			Resource: "clusters",
		}

		unstructuredObj, err := model.ConvertToUnstructured(dbCluster)
		if err != nil {
			logger.FromContext(c.Ctx).WithError(err).Error("Failed to convert to unstructured")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		unstructuredObj.Object["apiVersion"] = "postgresql.cnpg.io/v1"
		unstructuredObj.Object["kind"] = "Cluster"

		secretName := namespaceName + "-cnpg-cluster-app"

		// Create the CRD Instance
		_, err = kubeClient.DynamicClient.Resource(gvr).Namespace(namespaceName).Create(context.TODO(), unstructuredObj, metav1.CreateOptions{})
		if err != nil {
			logger.FromContext(c.Ctx).WithError(err).Error("Failed to create CRD")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		// TODO: add a proper poll to wait for secret to be created
		time.Sleep(5 * time.Second)

		secret, err := kubeClient.Clientset.CoreV1().Secrets(namespaceName).Get(context.TODO(), secretName, metav1.GetOptions{})
		if err != nil {
			logger.FromContext(c.Ctx).WithError(err).Error("Failed to get secret")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		decodedUri := secret.Data["uri"]

		initial := string(decodedUri)

		// Replacements
		writer = strings.Replace(initial, "postgresql:", "postgres:", 1) // Replace once
		reader = strings.Replace(writer, fmt.Sprintf("%s-rw:", secretName), fmt.Sprintf("%s-ro:", secretName), 1)
	}

	databaseSecret := &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "database",
			Namespace: namespaceName,
		},
		Type: v1.SecretTypeOpaque,
		StringData: map[string]string{
			"DB_CONNECTION_CHECK_URL":           writer,
			"DB_CONNECTION_STRING":              writer,
			"MM_SQLSETTINGS_DATASOURCEREPLICAS": reader, // Assuming read replicas for now
		},
	}

	// Create the database secret
	_, err = kubeClient.Clientset.CoreV1().Secrets(namespaceName).Create(context.TODO(), databaseSecret, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).Errorf("Error creating database secret:", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// License Secret
	licenseSecret := &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "mattermost-license",
			Namespace: namespaceName, // Create the namespace if needed
		},
		Type: v1.SecretTypeOpaque,
		StringData: map[string]string{
			"license": create.License, // To be filled from request
		},
	}

	// Create the secret
	_, err = kubeClient.Clientset.CoreV1().Secrets(namespaceName).Create(context.TODO(), licenseSecret, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).Errorf("Error creating license secret:", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// TODO: Add support for the create.CreateS3Bucket flag to create the bucket for the user
	filestoreSecret := &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "mattermost-s3",
			Namespace: namespaceName,
		},
		Type: v1.SecretTypeOpaque,
		StringData: map[string]string{
			"accesskey": create.S3AccessKey,
			"secretkey": create.S3SecretKey,
		},
	}

	// Create the filestore secret
	_, err = kubeClient.Clientset.CoreV1().Secrets(namespaceName).Create(context.TODO(), filestoreSecret, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).Errorf("Error creating filestore secret:", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	mattermostCRD := &mmv1beta1.Mattermost{
		ObjectMeta: metav1.ObjectMeta{
			Name:      namespaceName,
			Namespace: namespaceName,
		},
		Spec: mmv1beta1.MattermostSpec{
			Size:    create.Size,
			Version: create.Version,
			Ingress: &mmv1beta1.Ingress{
				Enabled:      true,
				Host:         create.FullDomainName,
				IngressClass: aws.String("nginx"),
				Annotations: map[string]string{
					"kubernetes.io/ingress.class": "nginx",
				},
			},
			Database: mmv1beta1.Database{
				External: &mmv1beta1.ExternalDatabase{
					Secret: "database",
				},
			},
			FileStore: mmv1beta1.FileStore{
				External: &mmv1beta1.ExternalFileStore{
					URL:    "s3.amazonaws.com",
					Secret: "mattermost-s3",
					Bucket: namespaceName + "-bucket",
				},
			},
			LicenseSecret: "mattermost-license",
			MattermostEnv: []v1.EnvVar{
				{Name: "MM_FILESETTINGS_AMAZONS3SSE", Value: "true"},
				{Name: "MM_FILESETTINGS_AMAZONS3SSL", Value: "true"},
			},
		},
	}

	// Create the Mattermost CRD
	mattermost, err := kubeClient.MattermostClientsetV1Beta.MattermostV1beta1().Mattermosts(namespaceName).Create(context.TODO(), mattermostCRD, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).Errorf("Error creating Mattermost CRD:", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(mattermost)
}

func handleDeleteMattermostOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "delete-mattermost")
	c.Ctx = logger.WithNamespace(c.Ctx, "mattermost-operator")
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, "mattermost-operator")

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = helmClient.UninstallReleaseByName("mattermost-operator")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete mattermost-operator operator")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleDeployMattermostOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	logger.FromContext(c.Ctx).Info("Getting kubeconfig")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	helmClient, err := c.CloudProvider.HelmClient(c.Ctx, clusterName, "mattermost-operator")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	chartRepo := repo.Entry{Name: "mattermost", URL: "https://helm.mattermost.com"}

	err = helmClient.AddOrUpdateChartRepo(chartRepo)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to add or update chart repo")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	chartSpec := helmclient.ChartSpec{
		ReleaseName:     "mattermost-operator",
		ChartName:       "mattermost/mattermost-operator",
		Namespace:       "mattermost-operator",
		UpgradeCRDs:     true,
		Wait:            true,
		Timeout:         300 * time.Second,
		CreateNamespace: true,
		CleanupOnFail:   true,
	}

	// Install a chart release.
	// Note that helmclient.Options.Namespace should ideally match the namespace in chartSpec.Namespace.
	if _, err := helmClient.InstallOrUpgradeChart(context.Background(), &chartSpec, nil); err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to install mattermost operator")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func handleGetMattermostInstallations(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	kubeClient, err := c.CloudProvider.KubeClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create clientset")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	installations, err := kubeClient.MattermostClientsetV1Beta.MattermostV1beta1().Mattermosts("").List(context.Background(), metav1.ListOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list mattermost installations")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(installations.Items)
}
