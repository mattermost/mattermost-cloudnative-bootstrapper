package model

import (
	"encoding/base64"
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/eks"
	mmclientv1alpha1 "github.com/mattermost/mattermost-operator/pkg/client/clientset/versioned"
	mmclientv1beta1 "github.com/mattermost/mattermost-operator/pkg/client/v1beta1/clientset/versioned"
	apixclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"sigs.k8s.io/aws-iam-authenticator/pkg/token"
)

// KubeClient interfaces with a Kubernetes cluster in the same way kubectl would.
type KubeClient struct {
	config                     *rest.Config
	Clientset                  kubernetes.Interface
	ApixClientset              apixclient.Interface
	MattermostClientsetV1Alpha mmclientv1alpha1.Interface
	MattermostClientsetV1Beta  mmclientv1beta1.Interface
}

func NewK8sClientClusterName(clusterName string) (*KubeClient, error) {

	eksClientStruct := NewEKSClient()
	eksClient := eksClientStruct.EKSClient

	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(clusterName),
	})
	if err != nil {
		return nil, err
	}

	cluster := result.Cluster

	gen, err := token.NewGenerator(true, false)
	if err != nil {
		return nil, err
	}
	opts := &token.GetTokenOptions{
		ClusterID: aws.StringValue(cluster.Name),
	}
	tok, err := gen.GetWithOptions(opts)
	if err != nil {
		return nil, err
	}
	ca, err := base64.StdEncoding.DecodeString(aws.StringValue(cluster.CertificateAuthority.Data))
	if err != nil {
		return nil, err
	}

	config := &rest.Config{
		Host:        aws.StringValue(cluster.Endpoint),
		BearerToken: tok.Token,
		TLSClientConfig: rest.TLSClientConfig{
			CAData: ca,
		},
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	mattermostV1AlphaClientset, err := mmclientv1alpha1.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	mattermostV1BetaClientset, err := mmclientv1beta1.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	// monitoringV1Clientset, err := monitoringclientV1.NewForConfig(config)
	// if err != nil {
	// 	return nil, err
	// }

	// slothV1Clientset, err := slothclientV1.NewForConfig(config)
	// if err != nil {
	// 	return nil, err
	// }

	return &KubeClient{
		config:                     config,
		Clientset:                  clientset,
		ApixClientset:              apixclient.NewForConfigOrDie(config),
		MattermostClientsetV1Alpha: mattermostV1AlphaClientset,
		MattermostClientsetV1Beta:  mattermostV1BetaClientset,
	}, nil
}

func NewClientset(cluster *eks.Cluster) (*kubernetes.Clientset, error) {
	gen, err := token.NewGenerator(true, false)
	if err != nil {
		return nil, err
	}
	opts := &token.GetTokenOptions{
		ClusterID: aws.StringValue(cluster.Name),
	}
	tok, err := gen.GetWithOptions(opts)
	if err != nil {
		return nil, err
	}
	ca, err := base64.StdEncoding.DecodeString(aws.StringValue(cluster.CertificateAuthority.Data))
	if err != nil {
		return nil, err
	}
	clientset, err := kubernetes.NewForConfig(
		&rest.Config{
			Host:        aws.StringValue(cluster.Endpoint),
			BearerToken: tok.Token,
			TLSClientConfig: rest.TLSClientConfig{
				CAData: ca,
			},
		},
	)
	if err != nil {
		return nil, err
	}
	return clientset, nil
}

func BuildHelmConfig(cluster *eks.Cluster) (clientcmd.ClientConfig, error) {
	gen, err := token.NewGenerator(true, false)
	if err != nil {
		return nil, err
	}
	opts := &token.GetTokenOptions{
		ClusterID: aws.StringValue(cluster.Name),
	}
	tok, err := gen.GetWithOptions(opts)
	if err != nil {
		return nil, err
	}
	ca, err := base64.StdEncoding.DecodeString(aws.StringValue(cluster.CertificateAuthority.Data))
	if err != nil {
		return nil, err
	}

	config := api.NewConfig()
	config.Clusters[aws.StringValue(cluster.Name)] = &api.Cluster{
		Server:                   aws.StringValue(cluster.Endpoint),
		CertificateAuthorityData: ca,
	}

	config.AuthInfos[aws.StringValue(cluster.Name)] = &api.AuthInfo{
		Token: tok.Token,
	}

	config.Contexts[aws.StringValue(cluster.Name)] = &api.Context{
		Cluster:  aws.StringValue(cluster.Name),
		AuthInfo: aws.StringValue(cluster.Name),
	}

	config.CurrentContext = aws.StringValue(cluster.Name)

	clientConfig := clientcmd.NewDefaultClientConfig(*config, &clientcmd.ConfigOverrides{})

	if err != nil {
		return nil, err
	}

	return clientConfig, nil
}

// 4. buildKubeConfig: Populates using your AWS-EKS interaction
func BuildKubeconfig(clusterName, clusterEndpoint, caData string) (clientcmd.ClientConfig, error) {
	// Decode the CA data
	decodedCAData, err := base64.StdEncoding.DecodeString(caData)
	if err != nil {
		return nil, fmt.Errorf("failed to decode CA data: %w", err)
	}

	// Create a kubeconfig API object
	config := api.NewConfig()

	// Populate cluster details
	config.Clusters[clusterName] = &api.Cluster{
		Server:                   clusterEndpoint,
		CertificateAuthorityData: decodedCAData,
	}

	// Assuming token-based authentication (adjust as needed)
	config.AuthInfos[clusterName] = &api.AuthInfo{
		// Placeholder - Replace with your authentication token retrieval logic
		Token: "your-authentication-token",
	}

	// Set the current context
	config.Contexts[clusterName] = &api.Context{
		Cluster:  clusterName,
		AuthInfo: clusterName,
	}
	config.CurrentContext = clusterName

	// Build the rest.Config from the kubeconfig API object
	clientConfig := clientcmd.NewDefaultClientConfig(*config, &clientcmd.ConfigOverrides{})
	if err != nil {
		return nil, fmt.Errorf("failed to create client config: %w", err)
	}

	return clientConfig, nil
}
