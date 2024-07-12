package model

import (
	"context"
	"fmt"

	"github.com/mattermost/mattermost-cloudnative-bootstrapper/internal/logger"
	mmclientv1beta1 "github.com/mattermost/mattermost-operator/pkg/client/v1beta1/clientset/versioned"
	helmclient "github.com/mittwald/go-helm-client"
	apixclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// KubeClient interfaces with a Kubernetes cluster in the same way kubectl would.
type KubeClient struct {
	Config                    *rest.Config
	Clientset                 kubernetes.Interface
	ApixClientset             apixclient.Interface
	MattermostClientsetV1Beta mmclientv1beta1.Interface
	DynamicClient             *dynamic.DynamicClient
}

func ConvertToUnstructured(obj interface{}) (*unstructured.Unstructured, error) {
	// convert to unstructured.Unstructured
	unstructuredMap, err := runtime.DefaultUnstructuredConverter.ToUnstructured(obj)
	if err != nil {
		return nil, err
	}

	unstructuredObj := &unstructured.Unstructured{Object: unstructuredMap}
	return unstructuredObj, nil
}

func (k *KubeClient) GetHelmClient(c context.Context, namespace string) (helmclient.Client, error) {
	opt := &helmclient.RestConfClientOptions{
		Options: &helmclient.Options{
			Namespace:        namespace,
			RepositoryCache:  "/tmp/.helmcache",
			RepositoryConfig: "/tmp/.helmrepo",
			Debug:            true,
			Linting:          true, // Change this to false if you don't want linting.
			DebugLog: func(format string, v ...interface{}) {
				logger.FromContext(c).Debug(fmt.Sprintf(format, v...))
			},
		},
		RestConfig: k.Config,
	}

	helmClient, err := helmclient.NewClientFromRestConf(opt)
	if err != nil {
		return nil, err
	}

	return helmClient, nil
}
