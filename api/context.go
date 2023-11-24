package api

import (
	"context"
	"net/http"
	"strconv"

	provisioner "github.com/mattermost/mattermost-cloud/model"
)

type Context struct {
	RequestID         string
	Ctx               context.Context
	Environment       string
	ProvisionerClient *provisioner.Client
	Pagination        provisioner.Paging
}

func (c *Context) Clone() *Context {
	return &Context{
		RequestID:         c.RequestID,
		Ctx:               c.Ctx,
		Environment:       c.Environment,
		ProvisionerClient: c.ProvisionerClient,
	}
}

func GetPaginationFromRequest(r *http.Request) (provisioner.Paging, error) {
	pageStr := r.URL.Query().Get("page")
	perPageStr := r.URL.Query().Get("per_page")

	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return provisioner.Paging{}, err
	}

	perPage, err := strconv.Atoi(perPageStr)
	if err != nil {
		return provisioner.Paging{}, err
	}

	pagination := provisioner.Paging{
		Page:    page,
		PerPage: perPage,
	}

	return pagination, nil
}
