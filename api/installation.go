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
	installationRouter.Handle("/{installation:[A-Za-z0-9]{26}}", addContext(handleGetInstallation)).Methods(http.MethodGet)
	installationRouter.Handle("/{installation:[A-Za-z0-9]{26}}", addContext(handlePatchInstallation)).Methods(http.MethodPatch)
	installationRouter.Handle("/{installation:[A-Za-z0-9]{26}}", addContext(handleDeleteInstallation)).Methods(http.MethodDelete)
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

func handleGetInstallation(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	installationID := vars["installation"]

	installation, err := c.ProvisionerClient.GetInstallation(installationID, &provisioner.GetInstallationRequest{})

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to get installation")
		return
	}

	if installation == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	logger.FromContext(c.Ctx).WithField("installation", installation.ID).Info("Installation retrieved")

	json, err := json.Marshal(installation)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to marshal installation")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(json)
}

func handlePatchInstallation(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	installationID := vars["installation"]

	patchInstallationRequest, err := provisioner.NewPatchInstallationRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse patch installation request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	installation, err := c.ProvisionerClient.UpdateInstallation(installationID, patchInstallationRequest)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to patch installation")
		return
	}

	logger.FromContext(c.Ctx).WithField("installation", installation.ID).Info("Installation patched")

	json, err := json.Marshal(installation)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to marshal installation")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(json)
}

func handleDeleteInstallation(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	installationID := vars["installation"]

	err := c.ProvisionerClient.DeleteInstallation(installationID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to delete installation")
		return
	}

	logger.FromContext(c.Ctx).WithField("installation", installationID).Info("Installation deleted")

	w.WriteHeader(http.StatusOK)
}
