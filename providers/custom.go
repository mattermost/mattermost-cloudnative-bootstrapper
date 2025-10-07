package providers

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/user"
	"path/filepath"
	"sync"

	"github.com/mattermost/mattermost-cloudnative-bootstrapper/model"
	mmclientv1beta1 "github.com/mattermost/mattermost-operator/pkg/client/v1beta1/clientset/versioned"
	helmclient "github.com/mittwald/go-helm-client"
	v1 "k8s.io/api/core/v1"
	apixclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

type CustomKubeProvider struct {
	Credentials     *model.Credentials
	credentialsLock *sync.Mutex
	kubeClient      *model.KubeClient
}

var customProviderInstance *CustomKubeProvider
var customProviderInstanceOnce sync.Once

func GetCustomProvider(credentials *model.Credentials) *CustomKubeProvider {
	customProviderInstanceOnce.Do(func() {
		customProviderInstance = &CustomKubeProvider{
			Credentials:     credentials,
			credentialsLock: &sync.Mutex{},
		}
	})

	// Always update credentials if they are provided and different from what we have
	if credentials != nil && customProviderInstance.Credentials != credentials {
		customProviderInstance.credentialsLock.Lock()
		customProviderInstance.Credentials = credentials
		customProviderInstance.credentialsLock.Unlock()
	}

	return customProviderInstance
}

func expandTilde(filePath string) (string, error) {
	// Check if the path starts with a tilde (~)
	if len(filePath) > 0 && filePath[0] == '~' {
		usr, err := user.Current()
		if err != nil {
			return "", fmt.Errorf("error getting current user: %w", err)
		}
		dir := usr.HomeDir

		if filePath == "~" {
			// In case of "~", which won't be caught by the "else if"
			return dir, nil
		} else if len(filePath) > 1 && filePath[1] == '/' {
			// Use filepath.Join to safely combine paths
			return filepath.Join(dir, filePath[2:]), nil
		}
	}
	// If there's no ~ or it's not at the start, return the original path
	return filePath, nil
}

func (p *CustomKubeProvider) GetCustomProviderCredentials() *model.Credentials {
	p.credentialsLock.Lock()
	defer p.credentialsLock.Unlock()
	// If the kubecfg is set to load from file, the kubecfg will have the file path - replace it with the actual config
	return p.Credentials
}

func (p *CustomKubeProvider) SetCredentials(c context.Context, credentials *model.Credentials) error {
	p.credentialsLock.Lock()
	defer p.credentialsLock.Unlock()

	p.Credentials = credentials

	if p.Credentials.KubecfgType == "file" {
		kubecfgFilePath, err := expandTilde(p.Credentials.Kubecfg)
		if err != nil {
			return nil
		}

		configByte, err := os.ReadFile(kubecfgFilePath)
		if err != nil {
			return nil
		}

		p.Credentials.Kubecfg = string(configByte)
		p.Credentials.KubecfgType = ""
	}

	return nil
}

func (p *CustomKubeProvider) ValidateCredentials(c context.Context, creds *model.Credentials) (bool, error) {
	if p.Credentials == nil {
		return false, errors.New("no credentials set")
	}

	// Additional validation for required fields
	if p.Credentials.Kubecfg == "" {
		return false, errors.New("kubeconfig content is required")
	}

	kubeClient, err := p.KubeClient(c, "")
	if err != nil {
		return false, fmt.Errorf("Unable to instantiate KubeClient: %w", err)
	}

	_, err = kubeClient.Clientset.Discovery().ServerVersion()
	if err != nil {
		return false, fmt.Errorf("Unable to hit discovery endpoint for cluster: %w", err)
	}

	return true, nil
}

func (p *CustomKubeProvider) GetCluster(c context.Context, name string) (*model.Cluster, error) {
	kubeClient, err := p.KubeClient(c, name)
	if err != nil {
		return nil, err
	}

	discoveryClient := kubeClient.Clientset.Discovery()
	serverVersion, err := discoveryClient.ServerVersion()
	if err != nil {
		return nil, fmt.Errorf("failed to get server version: %w", err)
	}
	serverVersionString := serverVersion.String()

	// Get node information
	nodes, err := kubeClient.Clientset.CoreV1().Nodes().List(c, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}

	// var oldestNodeGroup string
	var oldestCreationTime *metav1.Time // Store the oldest timestamp found
	var nodegroups []*model.ClusterNodegroup

	for _, node := range nodes.Items {
		// Compare creation timestamps
		if oldestCreationTime == nil || node.ObjectMeta.CreationTimestamp.Before(oldestCreationTime) {
			oldestCreationTime = &node.ObjectMeta.CreationTimestamp
		}
		nodegroup := kubeNodegroupToClusterNodegroup(node)
		nodegroups = append(nodegroups, nodegroup)
	}

	// Create the ClusterSummary struct
	clusterSummary := &model.Cluster{
		Name:              new(string), // Assuming you have the cluster name from your kubeconfig
		PlatformVersion:   &serverVersionString,
		Version:           &serverVersion.GitVersion,
		ClusterNodegroups: nodegroups,
		// ... potentially add Tags
	}
	if oldestCreationTime != nil {
		clusterSummary.CreatedAt = &oldestCreationTime.Time
	}
	return clusterSummary, nil
}

func (p *CustomKubeProvider) HelmClient(c context.Context, clusterName string, namespace string) (helmclient.Client, error) {
	k8sClient, err := p.KubeClient(c, clusterName)
	if err != nil {
		return nil, err
	}

	return k8sClient.GetHelmClient(c, namespace)
}

func (p *CustomKubeProvider) HelmFileStorePre(c context.Context, clusterName string, namespace string) error {
	// No-op in custom Kubernetes provider
	return nil
}

func (p *CustomKubeProvider) GetKubeConfig(c context.Context, clusterName string) (clientcmd.ClientConfig, error) {
	credentials := p.GetCustomProviderCredentials()
	if credentials == nil {
		return nil, fmt.Errorf("no credentials set for custom provider")
	}

	// Parse the YAML data into a clientcmdapi.Config object
	config, err := clientcmd.Load([]byte(credentials.Kubecfg))
	if err != nil {
		return nil, err
	}

	// Create a clientcmd.ClientConfig from the rest.Config
	clientConfig := clientcmd.NewDefaultClientConfig(*config, &clientcmd.ConfigOverrides{})
	return clientConfig, nil
}

func (p *CustomKubeProvider) KubeClient(c context.Context, clusterName string) (*model.KubeClient, error) {
	config, err := p.GetKubeRestConfig(c, clusterName)
	if err != nil {
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	mattermostV1BetaClientset, err := mmclientv1beta1.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	return &model.KubeClient{
		Config:                    config,
		Clientset:                 clientset,
		ApixClientset:             apixclient.NewForConfigOrDie(config),
		MattermostClientsetV1Beta: mattermostV1BetaClientset,
		DynamicClient:             dynamicClient,
	}, nil
}

func (p *CustomKubeProvider) GetKubeRestConfig(c context.Context, clusterName string) (*rest.Config, error) {
	credentials := p.GetCustomProviderCredentials()
	if credentials == nil {
		return nil, fmt.Errorf("no credentials set for custom provider")
	}

	var config *api.Config
	if credentials.KubecfgType == "file" {
		// Load the kubeconfig from a file
		kubecfgFilePath, err := expandTilde(credentials.Kubecfg)
		if err != nil {
			return nil, err
		}
		loadedConfig, err := clientcmd.LoadFromFile(kubecfgFilePath)
		if err != nil {
			return nil, err
		}
		config = loadedConfig
	} else {
		// Load the kubeconfig from a string
		loadedConfig, err := clientcmd.Load([]byte(credentials.Kubecfg))
		if err != nil {
			return nil, err
		}
		config = loadedConfig
	}

	contextName := ""
	if config.CurrentContext != "" {
		contextName = config.CurrentContext
	}

	var cluster *api.Cluster
	var authInfo *api.AuthInfo
	for name, c := range config.Clusters {
		if contextName == "" || name == config.Contexts[contextName].Cluster {
			cluster = c
			break
		}
	}
	for name, a := range config.AuthInfos {
		if contextName == "" || name == config.Contexts[contextName].AuthInfo {
			authInfo = a
			break
		}
	}

	if cluster == nil || authInfo == nil {
		return nil, fmt.Errorf("invalid or incomplete kubeconfig")
	}

	tlsClientConfig := rest.TLSClientConfig{}
	if cluster.CertificateAuthorityData != nil {
		tlsClientConfig.CAData = cluster.CertificateAuthorityData
	} else if cluster.InsecureSkipTLSVerify {
		tlsClientConfig.Insecure = true
	}

	restConfig := &rest.Config{
		Host:            cluster.Server,
		TLSClientConfig: tlsClientConfig,
	}

	if authInfo.Token != "" {
		restConfig.BearerToken = authInfo.Token
	} else if authInfo.ClientCertificateData != nil && authInfo.ClientKeyData != nil {
		restConfig.CertData = authInfo.ClientCertificateData
		restConfig.KeyData = authInfo.ClientKeyData
	}

	return restConfig, nil
}

func (p *CustomKubeProvider) ListClusters(c context.Context, region string) ([]*string, error) {
	config, err := clientcmd.Load([]byte(p.GetCustomProviderCredentials().Kubecfg))
	if err != nil {
		return nil, err
	}

	clusters := []*string{}
	for clusterName := range config.Clusters {
		clusters = append(clusters, &clusterName)
	}

	return clusters, nil
}

// unimplemented methods because custom doesn't support creation of clusters

func (p *CustomKubeProvider) ListRoles(c context.Context) ([]*model.SupportedRolesResponse, error) {
	return nil, fmt.Errorf("unsupported operation")
}

func (p *CustomKubeProvider) CreateCluster(c context.Context, create *model.CreateClusterRequest) (*model.Cluster, error) {
	return nil, fmt.Errorf("unsupported operation")
}

func (p *CustomKubeProvider) SetRegion(c context.Context, region string) error {
	return fmt.Errorf("unsupported operation")
}

func (p *CustomKubeProvider) GetNodegroups(c context.Context, clusterName string) ([]*model.ClusterNodegroup, error) {
	cluster, err := p.GetCluster(c, clusterName)
	if err != nil {
		return nil, err
	}

	return cluster.ClusterNodegroups, nil
}

func (p *CustomKubeProvider) CreateNodegroup(c context.Context, name string, create *model.CreateNodegroupRequest) (*model.ClusterNodegroup, error) {
	return nil, fmt.Errorf("unsupported operation")
}

func kubeNodegroupToClusterNodegroup(node v1.Node) *model.ClusterNodegroup {
	labels := map[string]*string{}
	for k, v := range node.Labels {
		labels[k] = &v
	}
	clusterNodegroup := &model.ClusterNodegroup{
		InstanceTypes: extractInstanceTypes(&node), // Extract and format instance types
		Labels:        labels,
		// Assuming "kubernetes.io/hostname" label holds the node name
		NodegroupName: labels["kubernetes.io/hostname"],
		// Assume node role is either "worker" or "master" based on labels
		NodeRole: getNodeRole(&node),
		Status:   clusterStatusFromNodeConditions(node.Status.Conditions),
	}
	return clusterNodegroup
}

// Helper to extract and format instance types
func extractInstanceTypes(node *v1.Node) []*string {
	instanceType := node.Labels["node.kubernetes.io/instance-type"]
	if instanceType == "" {
		// Fallback to NodeInfo if label is missing
		instanceType = node.Status.NodeInfo.MachineID
	}
	return []*string{&instanceType}
}

// Helper to determine node role based on labels
func getNodeRole(node *v1.Node) *string {
	role := "worker"
	if _, isMaster := node.Labels["node-role.kubernetes.io/master"]; isMaster {
		role = "master"
		return &role
	}
	return &role
}

// Helper to map Node Conditions to a ClusterStatus enum
func clusterStatusFromNodeConditions(conditions []v1.NodeCondition) model.ClusterStatus {
	for _, condition := range conditions {
		if condition.Type == v1.NodeReady && condition.Status == v1.ConditionTrue {
			return "Stable"
		}
	}
	return "Unknown"
}
