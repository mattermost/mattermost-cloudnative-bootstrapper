package api

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-cloud-dash/internal/logger"
	provisioner "github.com/mattermost/mattermost-cloud/model"
)

func initInstallation(apiRouter *mux.Router, context *Context) {
	addContext := func(handler contextHandlerFunc) *contextHandler {
		return newContextHandler(context, handler)
	}

	installationsRouter := apiRouter.PathPrefix("/installations").Subrouter()
	installationsRouter.Handle("/list", addContext(handleListInstallations)).Methods(http.MethodGet)

	installationRouter := apiRouter.PathPrefix("/installation").Subrouter()
	installationRouter.Handle("", addContext(handleCreateInstallation)).Methods(http.MethodPost)
}

func handleListInstallations(c *Context, w http.ResponseWriter, r *http.Request) {
	installation, err := c.ProvisionerClient.GetInstallations(&provisioner.GetInstallationsRequest{
		Paging: c.Pagination,
	})

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to get installations")
		return
	}

	logger.FromContext(c.Ctx).WithField("count", len(installation)).Info("Installations retrieved")

	json, err := json.Marshal(installation)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to marshal installations")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(json)
}

func handleCreateInstallation(c *Context, w http.ResponseWriter, r *http.Request) {
	createInstallationRequest, err := provisioner.NewCreateInstallationRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse create installation request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	logger.FromContext(c.Ctx).Errorf("Create installation request: %+v", createInstallationRequest)
	createInstallationRequest.Affinity = provisioner.InstallationAffinityMultiTenant

	installation, err := c.ProvisionerClient.CreateInstallation(createInstallationRequest)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create installation")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	logger.FromContext(c.Ctx).WithField("installation", installation.ID).Info("Installation created")

	json, err := json.Marshal(installation)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to marshal installation")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(json)
}
