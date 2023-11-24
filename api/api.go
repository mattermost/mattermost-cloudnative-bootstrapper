package api

import (
	"github.com/gorilla/mux"
)

func Register(rootRouter *mux.Router, c *Context) {
	apiRouter := rootRouter.PathPrefix("/api/v1").Subrouter()
	initInstallation(apiRouter, c)
	initCluster(apiRouter, c)
}
