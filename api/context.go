package api

import (
	"context"
	"net/http"
	"strconv"

	"github.com/mattermost/mattermost-cloud-dash/providers"
	provisioner "github.com/mattermost/mattermost-cloud/model"
)

type Context struct {
	RequestID         string
	Ctx               context.Context
	Environment       string
	ProvisionerClient *provisioner.Client
	Pagination        provisioner.Paging
	CloudProviderName string
	CloudProvider     providers.CloudProvider
}

func (c *Context) Clone() *Context {
	return &Context{
		RequestID:         c.RequestID,
		Ctx:               c.Ctx,
		Environment:       c.Environment,
		ProvisionerClient: c.ProvisionerClient,
		CloudProviderName: c.CloudProviderName,
		CloudProvider:     c.CloudProvider,
	}
}

func GetPaginationFromRequest(r *http.Request) (provisioner.Paging, error) {
	pageStr := r.URL.Query().Get("page")
	perPageStr := r.URL.Query().Get("per_page")
	includeDeleted := r.URL.Query().Get("include_deleted")

	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return provisioner.Paging{}, err
	}

	perPage, err := strconv.Atoi(perPageStr)
	if err != nil {
		return provisioner.Paging{}, err
	}

	pagination := provisioner.Paging{
		Page:           page,
		PerPage:        perPage,
		IncludeDeleted: includeDeleted == "true",
	}

	return pagination, nil
}
