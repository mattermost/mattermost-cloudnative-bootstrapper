package api

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	provisioner "github.com/mattermost/mattermost-cloud/model"
)

type Pagination struct {
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
	Total   int `json:"total"`
}

func initCluster(apiRouter *mux.Router, context *Context) {
	addContext := func(handler contextHandlerFunc) *contextHandler {
		return newContextHandler(context, handler)
	}

	clustersRouter := apiRouter.PathPrefix("/clusters").Subrouter()
	clustersRouter.Handle("/list", addContext(handleListClusters)).Methods(http.MethodGet)
}

func handleListClusters(c *Context, w http.ResponseWriter, r *http.Request) {

	clusters, err := c.ProvisionerClient.GetClusters(&provisioner.GetClustersRequest{Paging: c.Pagination})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json, err := json.Marshal(clusters)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(json)

}
