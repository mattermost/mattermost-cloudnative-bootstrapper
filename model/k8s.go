package model

import (
	"encoding/base64"
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/eks"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"sigs.k8s.io/aws-iam-authenticator/pkg/token"
)

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
