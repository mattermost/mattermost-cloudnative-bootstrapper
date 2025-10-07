package api

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	mmv1beta1 "github.com/mattermost/mattermost-operator/apis/mattermost/v1beta1"

	"github.com/aws/aws-sdk-go/aws"
	cnpgv1 "github.com/cloudnative-pg/cloudnative-pg/api/v1"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/internal/logger"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/model"
	"helm.sh/helm/v3/pkg/release"
	v1 "k8s.io/api/core/v1"
	apiErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/tools/clientcmd"
)

func initBootstrapper(apiRouter *mux.Router, context *Context) {
	addContext := func(handler contextHandlerFunc) *contextHandler {
		return newContextHandler(context, handler)
	}

	// Adapts a HandlerFunc tinto a contextHandler for use with existing middleware
	wsAdapter := func(contextHandler contextHandlerFunc, middleware *contextHandler) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			middleware.ServeHTTP(w, r)
		}
	}

	bootstrapperRouter := apiRouter.PathPrefix("/{cloudProvider:[A-Za-z0-9_-]+}").Subrouter()
	bootstrapperRouter.Handle("/set_credentials", addContext(handleSetCredentials)).Methods(http.MethodPost)
	bootstrapperRouter.Handle("/region", addContext(handleSetRegion)).Methods(http.MethodPut)
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
	clusterNameRouter.Handle("/deploy_rtcd", addContext(handleDeployRTCDService)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/deploy_calls_offloader", addContext(handleDeployCallsOffloaderService)).Methods(http.MethodPost)

	// Default values endpoints
	clusterNameRouter.Handle("/default_values/mattermost_operator", addContext(handleGetMattermostOperatorDefaultValues)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/default_values/nginx_operator", addContext(handleGetNginxOperatorDefaultValues)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/default_values/cnpg_operator", addContext(handleGetCNPGOperatorDefaultValues)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/default_values/rtcd_service", addContext(handleGetRTCDServiceDefaultValues)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/default_values/calls_offloader", addContext(handleGetCallsOffloaderDefaultValues)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/pg_operator", addContext(handleDeletePGOperator)).Methods(http.MethodDelete)
	clusterNameRouter.Handle("/mattermost_operator", addContext(handleDeleteMattermostOperator)).Methods(http.MethodDelete)
	clusterNameRouter.Handle("/nginx_operator", addContext(handleDeleteNginxOperator)).Methods(http.MethodDelete)
	clusterNameRouter.Handle("/rtcd", addContext(handleDeleteRTCDService)).Methods(http.MethodDelete)
	clusterNameRouter.Handle("/calls_offloader", addContext(handleDeleteCallsOffloaderService)).Methods(http.MethodDelete)
	clusterNameRouter.Handle("/namespaces", addContext(handleGetClusterNamespaces)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/installation", addContext(handleCreateMattermostInstallation)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/installations", addContext(handleGetMattermostInstallations)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/cnpg/cluster", addContext(handleCreateCNPGCluster)).Methods(http.MethodPost)

	installationNameRouter := clusterNameRouter.PathPrefix("/installation/{installationName:[A-Za-z0-9_-]+}").Subrouter()
	installationNameRouter.HandleFunc("/ws_logs", wsAdapter(handleInstallationLogsWebsocket, addContext(handleInstallationLogsWebsocket)))
	installationNameRouter.Handle("/pods", addContext(handleGetPodsForNamespace)).Methods(http.MethodGet)
	installationNameRouter.Handle("", addContext(handleDeleteMattermostInstallation)).Methods(http.MethodDelete)
	installationNameRouter.Handle("", addContext(handlePatchMattermostInstallation)).Methods(http.MethodPatch)
	installationNameRouter.Handle("/secrets", addContext(handleGetMattermostInstallationSecrets)).Methods(http.MethodGet)
}

func handleSetCredentials(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	cloudProvider := vars["cloudProvider"]

	logger.FromContext(c.Ctx).Debugf("Setting credentials for provider: %s", cloudProvider)

	var credentials model.Credentials
	json.NewDecoder(r.Body).Decode(&credentials)

	logger.FromContext(c.Ctx).Debugf("Received credentials for %s provider", cloudProvider)

	err := c.CloudProvider.SetCredentials(c.Ctx, &credentials)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to set credentials")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	response := model.CredentialsResponse{}

	success, err := c.CloudProvider.ValidateCredentials(c.Ctx, &credentials)
	response.Success = success
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to validate credentials")
		response.Message = err.Error()
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}

	logger.FromContext(c.Ctx).Debugf("Credentials validated successfully for %s", cloudProvider)

	// Update both credentials and provider in state
	err = UpdateStateCredentialsAndProvider(c.BootstrapperState, &credentials, cloudProvider)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to update state credentials - settings will not be persisted")
	} else {
		logger.FromContext(c.Ctx).Debugf("Successfully saved credentials and provider (%s) to state", cloudProvider)
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func handleSetRegion(c *Context, w http.ResponseWriter, r *http.Request) {
	var updateRegion model.UpdateRegionRequest
	json.NewDecoder(r.Body).Decode(&updateRegion)

	if updateRegion.Region == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	credentials := c.BootstrapperState.Credentials

	credentials.Region = updateRegion.Region

	err := c.CloudProvider.SetCredentials(c.Ctx, credentials)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to set region")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = UpdateStateCredentials(c.BootstrapperState, credentials)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to update state credentials - settings will not be persisted")
	}

	w.WriteHeader(http.StatusCreated)
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

func handleListClusters(c *Context, w http.ResponseWriter, r *http.Request) {
	region := r.URL.Query().Get("region")
	result, err := c.CloudProvider.ListClusters(c.Ctx, region)
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

	// Update cluster name in state when accessing a cluster
	err = UpdateStateClusterName(c.BootstrapperState, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to update cluster name in state")
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

func handleGetMattermostInstallationSecrets(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	installationName := vars["installationName"]
	if installationName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithField(c.Ctx, "installation", installationName)

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

	namespaceName := installationName

	c.Ctx = logger.WithNamespace(c.Ctx, namespaceName)

	databaseSecret, err := kubeClient.Clientset.CoreV1().Secrets(namespaceName).Get(c.Ctx, model.SecretNameDatabase, metav1.GetOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to get database secret")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	filestoreSecret, err := kubeClient.Clientset.CoreV1().Secrets(namespaceName).Get(c.Ctx, model.SecretNameFilestore, metav1.GetOptions{})
	if err != nil && !apiErrors.IsNotFound(err) {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to get filestore secret")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	var licenseSecret *v1.Secret
	licenseSecretName := model.GetLicenseSecretName(installation)
	if licenseSecretName != "" {
		licenseSecret, err = kubeClient.Clientset.CoreV1().Secrets(namespaceName).Get(c.Ctx, licenseSecretName, metav1.GetOptions{})
		if err != nil && !apiErrors.IsNotFound(err) {
			logger.FromContext(c.Ctx).WithError(err).Error("Failed to get license secret")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	installationSecrets := model.InstallationSecrets{
		DatabaseSecret:  databaseSecret,
		FilestoreSecret: filestoreSecret,
		LicenseSecret:   licenseSecret,
	}

	installationSecretsResponse, err := installationSecrets.ToInstallationSecretsResponse()
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to convert installation secrets to response")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(installationSecretsResponse)
}

func handlePatchMattermostInstallation(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	installationName := vars["installationName"]
	if installationName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithField(c.Ctx, "installation", installationName)

	patchRequest, err := model.NewMattermostWorkspacePatchRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse patch mattermost workspace request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	logger.FromContext(c.Ctx).Infof("Patch request: %+v", patchRequest.FilestorePatch)

	if !patchRequest.IsValid() {
		logger.FromContext(c.Ctx).Errorf("Invalid patch request - version validation failed for version: %s", patchRequest.Version)
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

	MMFilestore := installation.Spec.FileStore
	if patchRequest.HasFilestoreChanges() {
		logger.FromContext(c.Ctx).Info("Filestore changes detected")
		// Fetch the installation's existing filestore secrets
		// Merge the new updated ones into the old one
		// Push the updated secret to k8s
		// Update the installation CRD with anything necessary (ie, if the bucket url or name changes)
		filestorePatch := patchRequest.FilestorePatch
		if filestorePatch.FilestoreOption == model.FilestoreOptionExistingS3 {
			existingFilestoreSecret, err := kubeClient.Clientset.CoreV1().Secrets(installationName).Get(c.Ctx, model.SecretNameFilestore, metav1.GetOptions{})
			if err != nil {
				logger.FromContext(c.Ctx).WithError(err).Error("Failed to get filestore secret")
				w.WriteHeader(http.StatusInternalServerError)
				return
			}

			filestore := model.KubeS3FilestoreSecretToS3Filestore(existingFilestoreSecret, &installation.Spec.FileStore)

			// Update the existing filestore with the new values
			if filestorePatch.S3Filestore.BucketName != "" {
				filestore.BucketName = filestorePatch.S3Filestore.BucketName
			}

			if filestorePatch.S3Filestore.BucketURL != "" {
				filestore.BucketURL = filestorePatch.S3Filestore.BucketURL
			}

			if filestorePatch.S3Filestore.AccessKey != "" {
				filestore.AccessKey = filestorePatch.S3Filestore.AccessKey
			}

			if filestorePatch.S3Filestore.SecretKey != "" {
				filestore.SecretKey = filestorePatch.S3Filestore.SecretKey
			}

			existingFilestoreSecret.StringData = map[string]string{
				"accesskey": filestore.AccessKey,
				"secretkey": filestore.SecretKey,
			}

			_, err = kubeClient.Clientset.CoreV1().Secrets(installationName).Update(context.TODO(), existingFilestoreSecret, metav1.UpdateOptions{})
			if err != nil {
				logger.FromContext(c.Ctx).WithError(err).Error("Failed to update filestore secret")
				w.WriteHeader(http.StatusInternalServerError)
				return
			}

			MMFilestore.External.Bucket = filestore.BucketName
			MMFilestore.External.URL = filestore.BucketURL
			MMFilestore.External.Secret = model.SecretNameFilestore
		} else if filestorePatch.FilestoreOption == model.FilestoreOptionInClusterLocal {
			MMFilestore.Local.StorageSize = filestorePatch.LocalFileStore.StorageSize
			MMFilestore.Local.Enabled = true
		} else if filestorePatch.FilestoreOption == model.FilestoreOptionInClusterExternal {
			MMFilestore.ExternalVolume.VolumeClaimName = filestorePatch.LocalExternalFileStore.VolumeClaimName
		}
	}

	if patchRequest.License != nil {

		existingLicenseSecretName := model.GetLicenseSecretName(installation)

		// A secret for this already exists, so delete it
		if existingLicenseSecretName != "" {
			err := kubeClient.Clientset.CoreV1().Secrets(installationName).Delete(c.Ctx, existingLicenseSecretName, metav1.DeleteOptions{})
			if err != nil {
				logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete existing license secret")
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
		}

		licenseSecret := model.NewMattermostLicenseSecret(installationName, *patchRequest.License)
		_, err = kubeClient.Clientset.CoreV1().Secrets(installationName).Create(context.TODO(), licenseSecret, metav1.CreateOptions{})
		if err != nil {
			logger.FromContext(c.Ctx).WithError(err).Error("Failed to update license secret")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		setEnv := false
		for i, envVar := range installation.Spec.MattermostEnv {
			if envVar.Name == model.MMENVLicense {
				setEnv = true
				installation.Spec.MattermostEnv[i] = v1.EnvVar{Name: model.MMENVLicense, ValueFrom: &v1.EnvVarSource{
					SecretKeyRef: &v1.SecretKeySelector{Key: "license", LocalObjectReference: v1.LocalObjectReference{Name: licenseSecret.ObjectMeta.Name}, Optional: aws.Bool(true)}, // Add comma to separate items
				}}
			}
		}

		if !setEnv {
			installation.Spec.MattermostEnv = append(installation.Spec.MattermostEnv, v1.EnvVar{Name: model.MMENVLicense, ValueFrom: &v1.EnvVarSource{
				SecretKeyRef: &v1.SecretKeySelector{Key: "license", LocalObjectReference: v1.LocalObjectReference{Name: licenseSecret.ObjectMeta.Name}, Optional: aws.Bool(true)}, // Add comma to separate items
			}})
		}
	}

	database := installation.Spec.Database
	if patchRequest.DatabasePatch != nil {
		databaseSecret, err := kubeClient.Clientset.CoreV1().Secrets(installationName).Get(c.Ctx, model.SecretNameDatabase, metav1.GetOptions{})
		if err != nil {
			logger.FromContext(c.Ctx).WithError(err).Error("Failed to get database secret")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		existingStringData := databaseSecret.Data

		if patchRequest.DatabasePatch.ConnectionString != "" {
			existingStringData["DB_CONNECTION_CHECK_URL"] = []byte(patchRequest.DatabasePatch.ConnectionString)
			existingStringData["DB_CONNECTION_STRING"] = []byte(patchRequest.DatabasePatch.ConnectionString)
		}

		if patchRequest.DatabasePatch.ReplicaConnectionString != "" {
			existingStringData["MM_SQLSETTINGS_DATASOURCEREPLICAS"] = []byte(patchRequest.DatabasePatch.ReplicaConnectionString)
		}

		updatedSecret, err := kubeClient.Clientset.CoreV1().Secrets(installationName).Update(c.Ctx, databaseSecret, metav1.UpdateOptions{})
		if err != nil {
			logger.FromContext(c.Ctx).WithError(err).Error("Failed to update database secret")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		database.External.Secret = updatedSecret.ObjectMeta.Name
	}

	// Update environment variables if provided
	if len(patchRequest.MattermostEnv) > 0 {
		logger.FromContext(c.Ctx).Infof("Updating environment variables, count: %d", len(patchRequest.MattermostEnv))
		installation.Spec.MattermostEnv = patchRequest.MattermostEnv
	}

	installation.Spec.Version = patchRequest.Version
	installation.Spec.Image = patchRequest.Image
	installation.Spec.FileStore = MMFilestore
	installation.Spec.Database = database

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
			Name: namespaceName,
		},
	}

	_, err = kubeClient.Clientset.CoreV1().Namespaces().Get(context.TODO(), namespaceName, metav1.GetOptions{})
	if err != nil {
		if apiErrors.IsNotFound(err) { // If not found, create it
			_, err = kubeClient.Clientset.CoreV1().Namespaces().Create(context.TODO(), namespace, metav1.CreateOptions{})
			if err != nil {
				logger.FromContext(c.Ctx).WithError(err).Error("Failed to create namespace")
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
			logger.FromContext(c.Ctx).Info("Namespace created successfully")
		} else { // Some other error occurred
			logger.FromContext(c.Ctx).WithError(err).Error("Error while checking namespace existence")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	var writer string
	var reader string
	var databaseSecretName string

	if create.DBConnectionOption == model.DatabaseOptionCreateForMe {
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
	} else if create.DBConnectionOption == model.DatabaseOptionExisting {
		if create.ExistingDBSecretName != "" {
			databaseSecretName = create.ExistingDBSecretName
		} else {
			writer = create.ExistingDBConnection.ConnectionString
			reader = create.ExistingDBConnection.ConnectionString
		}
	}

	if databaseSecretName == "" {
		databaseSecret := &v1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      model.SecretNameDatabase,
				Namespace: namespaceName,
			},
			Type: v1.SecretTypeOpaque,
			StringData: map[string]string{
				"DB_CONNECTION_CHECK_URL":           writer,
				"DB_CONNECTION_STRING":              writer,
				"MM_SQLSETTINGS_DATASOURCEREPLICAS": reader, // Assuming read replicas for now
				"MM_CONFIG":                         writer,
			},
		}

		// Create the database secret
		_, err = kubeClient.Clientset.CoreV1().Secrets(namespaceName).Create(context.TODO(), databaseSecret, metav1.CreateOptions{})
		if err != nil {
			logger.FromContext(c.Ctx).Errorf("Error creating database secret:", err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		databaseSecretName = databaseSecret.ObjectMeta.Name
	}

	// License Secret
	licenseSecret := model.NewMattermostLicenseSecret(namespaceName, create.License)

	// Create the secret
	_, err = kubeClient.Clientset.CoreV1().Secrets(namespaceName).Create(context.TODO(), licenseSecret, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).Errorf("Error creating license secret:", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	filestoreSecret := create.GetMMOperatorFilestoreSecret(namespaceName)
	if filestoreSecret != nil {
		// Create the filestore secret
		filestoreSecret, err = kubeClient.Clientset.CoreV1().Secrets(namespaceName).Create(context.TODO(), filestoreSecret, metav1.CreateOptions{})
		if err != nil {
			logger.FromContext(c.Ctx).Errorf("Error creating filestore secret:", err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	filestore := create.GetMMOperatorFilestore(namespaceName, filestoreSecret)
	if filestore.External != nil && filestore.External.Secret == "" && create.FilestoreSecretName != "" {
		filestore.External.Secret = create.FilestoreSecretName
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
					Secret: func() string {
						if databaseSecretName != "" {
							return databaseSecretName
						}
						return model.SecretNameDatabase
					}(),
				},
			},
			FileStore: filestore,
			MattermostEnv: []v1.EnvVar{
				{Name: "MM_FILESETTINGS_AMAZONS3SSE", Value: "true"},
				{Name: "MM_FILESETTINGS_AMAZONS3SSL", Value: "true"},
				{Name: model.MMENVLicense, ValueFrom: &v1.EnvVarSource{
					SecretKeyRef: &v1.SecretKeySelector{Key: "license", LocalObjectReference: v1.LocalObjectReference{Name: licenseSecret.ObjectMeta.Name}, Optional: aws.Bool(true)}, // Add comma to separate items
				}},
				{Name: "MM_CONFIG", ValueFrom: &v1.EnvVarSource{
					SecretKeyRef: &v1.SecretKeySelector{
						Key: "MM_CONFIG",
						LocalObjectReference: v1.LocalObjectReference{Name: func() string {
							if databaseSecretName != "" {
								return databaseSecretName
							}
							return model.SecretNameDatabase
						}()},
					},
				}},
			},
			PodTemplate: &mmv1beta1.PodTemplate{
				SecurityContext: &v1.PodSecurityContext{
					FSGroup: aws.Int64(2000),
				},
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

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// TODO: this just allows everything. This application isn't intended to run on a server,
		// so it should be fine, but will need to double check that this is safe.
		return true
	},
}

func handleInstallationLogsWebsocket(c *Context, w http.ResponseWriter, r *http.Request) {
	logger.FromContext(c.Ctx).Info("Attempting to upgrade HTTP request to websocket connection")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to upgrade websocket connection")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	logger.FromContext(c.Ctx).Info("Upgraded HTTP request to websocket connection")

	defer conn.Close()

	query := r.URL.Query()

	vars := mux.Vars(r)
	installationName := vars["installationName"]
	if installationName == "" {
		logger.FromContext(c.Ctx).Error("No installation name provided")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	clusterName := vars["name"]
	if clusterName == "" {
		logger.FromContext(c.Ctx).Error("No cluster name provided")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	pods := query["pods"]
	if len(pods) == 0 {
		logger.FromContext(c.Ctx).Error("No pods provided")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	kubeClient, err := c.CloudProvider.KubeClient(c.Ctx, clusterName)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create clientset")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	logWriterChan := make(chan string)

	// Single go routine to handle log writes into the websocket, prevents concurrent writes to websocket, which would cause a panic
	go func() {
		for logLine := range logWriterChan {
			if err := conn.WriteMessage(websocket.TextMessage, []byte(logLine)); err != nil {
				logger.FromContext(c.Ctx).WithError(err).Error("Error writing to WebSocket")
				return // Exit goroutine on write error
			}
		}
	}()

	var wg sync.WaitGroup
	wg.Add(len(pods))

	for _, pod := range pods {
		go func(podName string) {
			defer wg.Done()

			req := kubeClient.Clientset.CoreV1().Pods(installationName).GetLogs(podName, &v1.PodLogOptions{Follow: true, SinceSeconds: aws.Int64(600)})
			podLogs, err := req.Stream(c.Ctx)
			if err != nil {
				logger.FromContext(c.Ctx).WithError(err).Error("Error in opening pod log stream")
				return
			}

			defer podLogs.Close()

			scanner := bufio.NewScanner(podLogs)
			for scanner.Scan() {
				logLine := scanner.Text()
				logWriterChan <- logLine
			}

			// Check for errors during log reading.
			if err := scanner.Err(); err != nil {
				logger.FromContext(c.Ctx).WithError(err).Errorf("Error scanning logs from pod %s", podName)
			}
		}(pod)
	}

	wg.Wait()

	logger.FromContext(c.Ctx).Info("closing websocket connection")
}

func handleGetPodsForNamespace(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	namespace := vars["installationName"]
	if namespace == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	kubeClient, err := c.CloudProvider.KubeClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create clientset")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	kubePods, err := kubeClient.Clientset.CoreV1().Pods(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list pods")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	pods := model.KubePodsToPods(kubePods.Items)

	json.NewEncoder(w).Encode(pods)
}
