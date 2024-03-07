package model

import (
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/discovery/cached/memory"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

type RESTClientGetter struct {
	clientconfig clientcmd.ClientConfig
}

func NewRESTClientGetter(kubeconfig string, namespace string) (*RESTClientGetter, error) {
	clientconfig, err := clientcmd.NewClientConfigFromBytes([]byte(kubeconfig))
	if err != nil {
		return nil, err
	}

	rawconfig, err := clientconfig.RawConfig()
	if err != nil {
		return nil, err
	}

	clientconfig = clientcmd.NewDefaultClientConfig(rawconfig, &clientcmd.ConfigOverrides{
		Context: api.Context{
			Namespace: namespace,
		},
	})

	return &RESTClientGetter{clientconfig}, nil
}

func (r *RESTClientGetter) ToRESTConfig() (*rest.Config, error) {
	return r.clientconfig.ClientConfig()
}

func (r *RESTClientGetter) ToDiscoveryClient() (discovery.CachedDiscoveryInterface, error) {
	restconfig, err := r.clientconfig.ClientConfig()
	if err != nil {
		return nil, err
	}
	dc, err := discovery.NewDiscoveryClientForConfig(restconfig)
	if err != nil {
		return nil, err
	}
	return memory.NewMemCacheClient(dc), nil
}

func (r *RESTClientGetter) ToRESTMapper() (meta.RESTMapper, error) {
	dc, err := r.ToDiscoveryClient()
	if err != nil {
		return nil, err
	}
	return restmapper.NewDeferredDiscoveryRESTMapper(dc), nil
}

func (r *RESTClientGetter) ToRawKubeConfigLoader() clientcmd.ClientConfig {
	return r.clientconfig
}

type InstalledReleases struct {
	Name      string
	Version   string
	Namespace string
	Status    string
}
