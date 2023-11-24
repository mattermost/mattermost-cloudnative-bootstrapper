package api

import (
	"net/http"
	"reflect"
	"runtime"
	"strings"

	"github.com/mattermost/awat/model"
	"github.com/mattermost/mattermost-cloud-dash/internal/logger"
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
