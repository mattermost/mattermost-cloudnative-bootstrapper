package api

import (
	"net/http"
	"reflect"
	"runtime"
	"strings"

	"github.com/gorilla/mux"
	"github.com/mattermost/awat/model"
	"github.com/mattermost/mattermost-cloud-dash/internal/logger"
	"github.com/mattermost/mattermost-cloud-dash/providers"
	provisioner "github.com/mattermost/mattermost-cloud/model"
	"github.com/sirupsen/logrus"
)

type contextHandlerFunc func(c *Context, w http.ResponseWriter, r *http.Request)

type contextHandler struct {
	context     *Context
	handler     contextHandlerFunc
	handlerName string
}

func (h contextHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ww := NewWrappedWriter(w)
	context := h.context.Clone()
	context.RequestID = model.NewID()
	context.Ctx = logger.Init(context.Ctx, logrus.DebugLevel)
	requestPagination, err := GetPaginationFromRequest(r)
	if err != nil {
		context.Pagination = provisioner.Paging{}
	} else {
		context.Pagination = requestPagination
	}

	muxVars := mux.Vars(r)
	cloudProviderName := muxVars["cloudProvider"]

	context.CloudProviderName = cloudProviderName

	var provider providers.CloudProvider
	switch context.CloudProviderName {
	case "aws":
		provider = providers.GetAWSProvider()
	// case "gcp":
	//     provider = &GCPCloudProvider{}
	// ... other cases
	default:
		// err = fmt.Errorf("unsupported cloud provider: %s", context.CloudProviderName)
		logger.FromContext(context.Ctx).WithError(err).Error("failed to parse cloud provider")
	}

	// if err != nil {
	// 	// TODO: Graceful error handling and exit
	// 	return nil
	// }

	// Associate with context
	context.CloudProvider = provider

	h.handler(context, ww, r)
}

func newContextHandler(context *Context, handler contextHandlerFunc) *contextHandler {
	// Obtain the handler function name to be used for API metrics.
	splitFuncName := strings.Split((runtime.FuncForPC(reflect.ValueOf(handler).Pointer()).Name()), ".")
	context.Ctx = logger.Init(context.Ctx, logrus.DebugLevel)
	return &contextHandler{
		context:     context,
		handler:     handler,
		handlerName: splitFuncName[len(splitFuncName)-1],
	}
}
