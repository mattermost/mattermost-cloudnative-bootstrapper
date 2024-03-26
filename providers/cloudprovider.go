package providers

import (
	"context"

	"github.com/mattermost/mattermost-cloud-dash/model"
	helmclient "github.com/mittwald/go-helm-client"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// TODO - consider some sort of AppError struct that can return a status code and a message + some other details, to aid in
// error handling and response generation in the API handlers, and to make it easier to handle errors in the UI
type CloudProvider interface {
	SetCredentials(c context.Context, credentials *model.Credentials) error
	ValidateCredentials(creds *model.Credentials) (bool, error)
	ListRoles(c context.Context) ([]*model.SupportedRolesResponse, error)
	ListClusters(c context.Context) ([]*string, error)
	CreateCluster(c context.Context, create *model.CreateClusterRequest) (*model.Cluster, error)
	GetCluster(c context.Context, name string) (*model.Cluster, error)
	GetNodegroups(c context.Context, clusterName string) ([]*model.ClusterNodegroup, error)
	CreateNodegroup(c context.Context, name string, create *model.CreateNodegroupRequest) (*model.ClusterNodegroup, error)
	GetKubeRestConfig(c context.Context, clusterName string) (*rest.Config, error)
	GetKubeConfig(c context.Context, clusterName string) (clientcmd.ClientConfig, error)
	KubeClient(c context.Context, clusterName string) (*model.KubeClient, error)
	HelmClient(c context.Context, clusterName string, namespace string) (helmclient.Client, error)
}
