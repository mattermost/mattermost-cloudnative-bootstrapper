package api

import (
	"context"
	"net/http"
	"strconv"

	provisioner "github.com/mattermost/mattermost-cloud/model"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/internal/logger"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/model"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/providers"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/telemetry"
)

type BootstrapperState struct {
	Provider      string               `json:"provider"`
	ClusterName   string               `json:"clusterName"`
	Credentials   *model.Credentials   `json:"credentials"`
	StateFilePath string               `json:"stateFilePath"`
	Telemetry     model.TelemetryState `json:"telemetry"`
	// TODO: Support setting a KubeConfigPath via CLI flag or env var for authentication
	// KubeConfigPath string `json:"kubeConfigPath"`
}

type Context struct {
	RequestID         string
	Ctx               context.Context
	Environment       string
	Pagination        provisioner.Paging
	CloudProviderName string
	CloudProvider     providers.CloudProvider
	BootstrapperState BootstrapperState
	TelemetryProvider *telemetry.TelemetryProvider
}

func NewContext(ctx context.Context, statePath string, telemetryDisabled bool) (*Context, error) {
	var state BootstrapperState
	if exists, err := CheckStateExists(statePath); exists && err == nil {
		// State file exists, read it
		state, err = GetState(statePath)
		if err != nil {
			return nil, err
		}
		logger.FromContext(ctx).Info("Loaded state file from file")
		// Old state files may not have a telemetry ID, so generate one
		if state.Telemetry.TelemetryID == "" {
			state.Telemetry.TelemetryID = model.NewTelemetryID()
			err := SetState(statePath, state)
			if err != nil {
				return nil, err
			}
		}
	} else if !exists && err == nil {
		// State file doesn't exist, initialize it
		err = InitState(statePath)
		if err != nil {
			return nil, err
		}
		logger.FromContext(ctx).Infof("Initialized state file")
	} else {
		// Some other error occurred
		return nil, err
	}

	state.StateFilePath = statePath

	// Disabling telemetry persists to state, so that users don't need to pass the flag every time
	if telemetryDisabled && !state.Telemetry.TelemetryDisabled {
		state.Telemetry.TelemetryDisabled = telemetryDisabled

		err := SetState(statePath, state)
		if err != nil {
			return nil, err
		}
	}

	// Initialize the telemetry provider
	telemetryProvider, err := telemetry.NewTelemetryProvider(state.Telemetry.TelemetryID, state.Telemetry.TelemetryDisabled)
	if err != nil {
		return nil, err
	}

	return &Context{
		Ctx:               ctx,
		BootstrapperState: state,
		// TODO: this is redundant, use the state.Provider instead everywhere
		CloudProviderName: state.Provider,
		TelemetryProvider: telemetryProvider,
	}, nil
}

func (c *Context) Clone() *Context {
	return &Context{
		RequestID:         c.RequestID,
		Ctx:               c.Ctx,
		Environment:       c.Environment,
		CloudProviderName: c.CloudProviderName,
		CloudProvider:     c.CloudProvider,
		BootstrapperState: c.BootstrapperState,
		TelemetryProvider: c.TelemetryProvider,
	}
}

func (bs BootstrapperState) Merge(newState BootstrapperState) BootstrapperState {
	if newState.Provider != "" {
		bs.Provider = newState.Provider
	}
	if newState.ClusterName != "" {
		bs.ClusterName = newState.ClusterName
	}
	if newState.Credentials != nil {
		bs.Credentials = newState.Credentials
	}
	return bs
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
