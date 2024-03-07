package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	mmv1beta1 "github.com/mattermost/mattermost-operator/apis/mattermost/v1beta1"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/eks"
	"github.com/aws/aws-sdk-go/service/iam"
	cnpgv1 "github.com/cloudnative-pg/cloudnative-pg/api/v1"
	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-cloud-dash/internal/logger"
	"github.com/mattermost/mattermost-cloud-dash/model"
	helmclient "github.com/mittwald/go-helm-client"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/repo"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/tools/clientcmd"
)

func initAWS(apiRouter *mux.Router, context *Context) {
	addContext := func(handler contextHandlerFunc) *contextHandler {
		return newContextHandler(context, handler)
	}

	awsRouter := apiRouter.PathPrefix("/aws").Subrouter()
	awsRouter.Handle("/set_credentials", addContext(handleSetAWSCredentials)).Methods(http.MethodPost)
	awsRouter.Handle("/eks_roles", addContext(handleListEKSRoles)).Methods(http.MethodGet)
	awsRouter.Handle("/clusters", addContext(handleListEKSClusters)).Methods(http.MethodGet)
	awsRouter.Handle("/eks_create", addContext(handleCreateEKS)).Methods(http.MethodPost)

	rdsRouter := awsRouter.PathPrefix("/rds").Subrouter()
	rdsRouter.Handle("", addContext(handleCreateRDSDatabase)).Methods(http.MethodPost)

	clusterNameRouter := awsRouter.PathPrefix("/cluster/{name:[A-Za-z0-9_-]+}").Subrouter()
	clusterNameRouter.Handle("", addContext(handleGetEKS)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/nodegroups", addContext(handleGetEKSNodeGroups)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/nodegroups", addContext(handleCreateNodeGroup)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/kubeconfig", addContext(handleGetEKSKubeConfig)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/installed_charts", addContext(handleGetInstalledCharts)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/deploy_mattermost_operator", addContext(handleDeployMattermostOperator)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/deploy_nginx_operator", addContext(handleDeployNginxOperator)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/deploy_pg_operator", addContext(handleDeployPGOperator)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/pg_operator", addContext(handleDeletePGOperator)).Methods(http.MethodDelete)
	clusterNameRouter.Handle("/mattermost_operator", addContext(handleDeleteMattermostOperator)).Methods(http.MethodDelete)
	clusterNameRouter.Handle("/nginx_operator", addContext(handleDeleteNginxOperator)).Methods(http.MethodDelete)
	clusterNameRouter.Handle("/namespaces", addContext(handleGetClusterNamespaces)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/new_mm_workspace", addContext(handleCreateMattermostWorkspace)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/installations", addContext(handleGetMattermostInstallations)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/cnpg/cluster", addContext(handleCreateCNPGCluster)).Methods(http.MethodPost)
}

func handleSetAWSCredentials(c *Context, w http.ResponseWriter, r *http.Request) {
	var awsCredentials model.AWSCredentials
	json.NewDecoder(r.Body).Decode(&awsCredentials)
	response := model.AWSCredentialsResponse{}
	model.SetAWSCredentials(awsCredentials.AccessKeyID, awsCredentials.SecretAccessKey)
	success, err := model.ValidateAWSCredentials(awsCredentials.AccessKeyID, awsCredentials.SecretAccessKey)
	response.Success = success
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to validate AWS credentials")
		response.Message = err.Error()
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func handleListEKSRoles(c *Context, w http.ResponseWriter, r *http.Request) {
	awsCredentials := model.GetAWSCredentials()

	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String("us-east-1"), // Change to your preferred region
		Credentials: credentials.NewStaticCredentials(awsCredentials.AccessKeyID, awsCredentials.SecretAccessKey, ""),
	})
	if err != nil {
		log.Fatalf("Error creating session: %v", err)
	}

	svc := iam.New(sess)

	eksSupportedRoles := []*iam.Role{}
	// List IAM roles
	input := &iam.ListRolesInput{}
	err = svc.ListRolesPages(input, func(page *iam.ListRolesOutput, lastPage bool) bool {
		for _, role := range page.Roles {
			// TODO Filter down to only those roles that have permission?

			eksSupportedRoles = append(eksSupportedRoles, role)
		}
		return !lastPage
	})
	if err != nil {
		log.Fatalf("Error listing roles: %v", err)
	}

	roles := model.ToEKSSupportedRoleResponse(eksSupportedRoles)

	json.NewEncoder(w).Encode(roles)
}

// TODO: Support looking in different regions based on query param
func handleListEKSClusters(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Listing EKS clusters")

	result, err := eksClient.ListClusters(&eks.ListClustersInput{})

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list EKS clusters")
		w.WriteHeader(http.StatusInternalServerError)
	}

	json.NewEncoder(w).Encode(result.Clusters)
}

func handleCreateEKS(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Creating EKS cluster")

	create, err := model.NewCreateEKSClusterRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse create EKS cluster request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	input := &eks.CreateClusterInput{
		ClientRequestToken: aws.String("1d2129a1-3d38-460a-9756-e5b91fddb951"),
		Name:               create.ClusterName,
		ResourcesVpcConfig: &eks.VpcConfigRequest{
			SecurityGroupIds: create.SecurityGroupIDs,
			SubnetIds:        create.SubnetIDs,
		},
		RoleArn: create.RoleARN,
		Version: create.KubernetesVersion,
	}

	result, err := eksClient.CreateCluster(input)
	if err != nil {
		if aerr, ok := err.(awserr.Error); ok {
			switch aerr.Code() {
			case eks.ErrCodeResourceInUseException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeResourceInUseException, aerr.Error())
			case eks.ErrCodeResourceLimitExceededException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeResourceLimitExceededException, aerr.Error())
			case eks.ErrCodeInvalidParameterException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeInvalidParameterException, aerr.Error())
			case eks.ErrCodeClientException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeClientException, aerr.Error())
			case eks.ErrCodeServerException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeServerException, aerr.Error())
			case eks.ErrCodeServiceUnavailableException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeServiceUnavailableException, aerr.Error())
			case eks.ErrCodeUnsupportedAvailabilityZoneException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeUnsupportedAvailabilityZoneException, aerr.Error())
			default:
				logger.FromContext(c.Ctx).Error(aerr.Error())
			}
		} else {
			// Print the error, cast err to awserr.Error to get the Code and
			// Message from an error.
			logger.FromContext(c.Ctx).Error(err.Error())
		}
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(result.Cluster)
}

func handleGetEKS(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Refreshing EKS cluster")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(clusterName),
	})

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to describe EKS cluster")
		w.WriteHeader(http.StatusInternalServerError)
	}

	json.NewEncoder(w).Encode(result.Cluster)
}

func handleGetEKSNodeGroups(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Refreshing EKS node groups")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	result, err := eksClient.ListNodegroups(&eks.ListNodegroupsInput{
		ClusterName: aws.String(clusterName),
	})

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list EKS node groups")
		w.WriteHeader(http.StatusInternalServerError)
	}

	var nodes []*eks.Nodegroup
	for _, nodeGroupName := range result.Nodegroups {
		describeNodeGroupInput := &eks.DescribeNodegroupInput{
			ClusterName:   aws.String(clusterName),
			NodegroupName: nodeGroupName,
		}

		nodeGroupResult, err := eksClient.DescribeNodegroup(describeNodeGroupInput)
		if err != nil {
			logger.FromContext(c.Ctx).WithError(err).Error("Failed to describe EKS node group")
			continue
		}

		nodes = append(nodes, nodeGroupResult.Nodegroup)
	}

	json.NewEncoder(w).Encode(nodes)
}

func handleCreateNodeGroup(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Creating EKS node group")

	vars := mux.Vars(r)
	clusterName := vars["name"]

	create, err := model.NewCreateNodeGroupRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse create EKS node group request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	instanceTypes := []*string{&create.InstanceType}

	input := &eks.CreateNodegroupInput{
		ClusterName:   aws.String(clusterName),
		NodegroupName: aws.String(create.NodegroupName),
		InstanceTypes: instanceTypes,
		ScalingConfig: &eks.NodegroupScalingConfig{
			MaxSize:     aws.Int64(create.ScalingConfig.MaxSize),
			MinSize:     aws.Int64(create.ScalingConfig.MinSize),
			DesiredSize: aws.Int64(2),
		},
		NodeRole: aws.String(create.RoleARN),
		Subnets:  aws.StringSlice(create.SubnetIDs),
	}

	result, err := eksClient.CreateNodegroup(input)
	if err != nil {
		if aerr, ok := err.(awserr.Error); ok {
			switch aerr.Code() {
			case eks.ErrCodeResourceInUseException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeResourceInUseException, aerr.Error())
			case eks.ErrCodeResourceLimitExceededException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeResourceLimitExceededException, aerr.Error())
			case eks.ErrCodeInvalidParameterException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeInvalidParameterException, aerr.Error())
			case eks.ErrCodeClientException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeClientException, aerr.Error())
			case eks.ErrCodeServerException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeServerException, aerr.Error())
			case eks.ErrCodeServiceUnavailableException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeServiceUnavailableException, aerr.Error())
			case eks.ErrCodeUnsupportedAvailabilityZoneException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeUnsupportedAvailabilityZoneException, aerr.Error())
			default:
				logger.FromContext(c.Ctx).Error(aerr.Error())
			}
		} else {
			// Print the error, cast err to awserr.Error to get
			logger.FromContext(c.Ctx).Error(err.Error())
		}
		w.WriteHeader(http.StatusInternalServerError)
	}

	json.NewEncoder(w).Encode(result.Nodegroup)
}

func handleCreateRDSDatabase(c *Context, w http.ResponseWriter, r *http.Request) {
	rdsClientStruct := model.NewRDSClient()
	rdsClient := rdsClientStruct.RDSClient

	create, err := model.NewCreateRDSDatabaseRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse create RDS database request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if !create.IsValid() {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	create.SetDefaults()

	input := create.ToCreateDBInstanceInput()

	result, err := rdsClient.CreateDBInstance(input)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create RDS database")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if result.DBInstance == nil {
		logger.FromContext(c.Ctx).Error("Failed to create RDS database")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	logger.FromContext(c.Ctx).Infof("%+v", result.DBInstance)

	// endpoint := *result.DBInstance.Endpoint.Address
	// port := *result.DBInstance.Endpoint.Port

	// Construct PostgreSQL connection string
	// connString := fmt.Sprintf("postgres://%s:%s@%s:%d/%s", create.MasterUsername, create.MasterPassword, endpoint, port, *input.DBName)

	// fmt.Println("Connection String:", connString)

	// w.Write([]byte(connString))

	json.NewEncoder(w).Encode(result.DBInstance)
}

func handleGetEKSKubeConfig(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Getting EKS kubeconfig")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(clusterName),
	})

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to describe EKS cluster")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	config, err := model.BuildHelmConfig(result.Cluster)
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

	kubeClient, err := model.NewK8sClientClusterName(clusterName)
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

		helmClient, err := model.AuthenticatedHelmGoClient(c.Ctx, clusterName, namespace.Name)
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

	_, actionConfig, _, err := model.AuthenticatedHelmClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	deleteClient := action.NewUninstall(actionConfig)

	_, err = deleteClient.Run("ingress-nginx")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete nginx operator")
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

	helmClient, err := model.AuthenticatedHelmGoClient(c.Ctx, clusterName, "ingress-nginx")

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
	c.Ctx = logger.WithNamespace(c.Ctx, "cnpg")
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	_, actionConfig, _, err := model.AuthenticatedHelmClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	deleteClient := action.NewUninstall(actionConfig)

	_, err = deleteClient.Run("cloudnative-pg")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete pg operator")
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

	helmClient, err := model.AuthenticatedHelmGoClient(c.Ctx, clusterName, "cnpg")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// TODO: Should this happen in a different place? We probably need this to be a part of the bootstrapping process
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
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to install mattermost operator")
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

	chartSpec = helmclient.ChartSpec{
		ReleaseName:     "cnpg",
		ChartName:       "cnpg/cloudnative-pg",
		Namespace:       "cnpg",
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

func handleGetClusterNamespaces(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(clusterName),
	})

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to describe EKS cluster")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	clientset, err := model.NewClientset(result.Cluster)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create clientset")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
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

	kubeClient, err := model.NewK8sClientClusterName(clusterName)
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

func handleCreateMattermostWorkspace(c *Context, w http.ResponseWriter, r *http.Request) {
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

	kubeClient, err := model.NewK8sClientClusterName(clusterName)
	// TODO: this logic starts in the AWS API because it needs to hit EKS to authenticate the kubeclient
	// Once we have the kubeClient, it's just kubernetes, so this should be refactored into its own package for re-use by other kubernetes flavours
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
					"kubernetes.io/ingress.class":                                   "nginx",
					"nginx.ingress.kubernetes.io/default-backend":                   namespaceName + ":8065",
					"service.beta.kubernetes.io/aws-load-balancer-backend-protocol": "tcp",
					"service.beta.kubernetes.io/aws-load-balancer-ssl-ports":        "https",
					"service.beta.kubernetes.io/aws-load-balancer-ssl-cert":         "arn:aws:acm:us-east-1:926412419614:certificate/e13f9426-e452-4670-9f6a-f56b3f346bf1",
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

	_, actionConfig, _, err := model.AuthenticatedHelmClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	deleteClient := action.NewUninstall(actionConfig)

	_, err = deleteClient.Run("mattermost-operator")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete mattermost operator")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleDeployMattermostOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	logger.FromContext(c.Ctx).Info("Getting EKS kubeconfig")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	helmClient, err := model.AuthenticatedHelmGoClient(c.Ctx, clusterName, "mattermost-operator")
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

	kubeClient, err := model.NewK8sClientClusterName(clusterName)
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
