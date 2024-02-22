package logger

import (
	"context"

	"github.com/sirupsen/logrus"
)

type (
	fieldsKey struct{}
	loggerKey struct{}
)

type LogWriter struct {
	Logger logrus.FieldLogger
}

func (w *LogWriter) Write(b []byte) (int, error) {
	n := len(b)
	if n > 0 && b[n-1] == '\n' {
		b = b[:n-1]
	}

	w.Logger.Warning(string(b))
	return n, nil
}

func Init(ctx context.Context, level logrus.Level) context.Context {
	contextLogger := logrus.New()
	contextLogger.SetFormatter(&logrus.JSONFormatter{})
	contextLogger.SetLevel(level)
	return WithLogger(ctx, contextLogger)
}

// FromContext returns a logger from the context. The Logger is configured with
// any fields set using WithField, or WithFields.
func FromContext(ctx context.Context) logrus.FieldLogger {
	logger := ctx.Value(loggerKey{})
	fields := getFields(ctx)
	if logger == nil {
		// This may be a bad idea?
		ctx = Init(ctx, logrus.InfoLevel)
		return FromContext(ctx)
	}
	return logger.(logrus.FieldLogger).WithFields(fields)
}

func getFields(ctx context.Context) logrus.Fields {
	fields := ctx.Value(fieldsKey{})
	if fields == nil {
		return logrus.Fields{}
	}
	return fields.(logrus.Fields)
}

func copyFields(ctx context.Context) logrus.Fields {
	new := logrus.Fields{}
	for k, v := range getFields(ctx) {
		new[k] = v
	}
	return new
}

// WithLogger creates a new Logger from fields, and sets it on the Context.
func WithLogger(ctx context.Context, logger logrus.FieldLogger) context.Context {
	ctx = context.WithValue(ctx, fieldsKey{}, getFields(ctx))
	return context.WithValue(ctx, loggerKey{}, logger)
}

// WithField adds the key and value to the context which will be added to the logger
// when retrieved with FromContext.
func WithField(ctx context.Context, key string, value interface{}) context.Context {
	new := copyFields(ctx)
	new[key] = value
	return context.WithValue(ctx, fieldsKey{}, new)
}

// WithFields adds fields to the context which will be added to the logger
// when retrieved with FromContext.
func WithFields(ctx context.Context, fields logrus.Fields) context.Context {
	new := copyFields(ctx)
	for k, v := range fields {
		new[k] = v
	}
	return context.WithValue(ctx, fieldsKey{}, new)
}

// WithNonSpillingField adds the key and value to the logger rather than the context
// this has for effect that the fields added there can only go down the stack
// and not up
func WithNonSpillingField(ctx context.Context, key string, value interface{}) context.Context {
	logger := FromContext(ctx).WithField(key, value)
	return WithLogger(ctx, logger)
}

// WithNonSpillingFields adds fields to the logger rather than the context
// this has for effect that the fields added there can only go down the stack
// and not up
func WithNonSpillingFields(ctx context.Context, fields logrus.Fields) context.Context {
	logger := FromContext(ctx).WithFields(fields)
	return WithLogger(ctx, logger)
}

func WithNamespace(ctx context.Context, namespace string) context.Context {
	return WithField(ctx, "namespace", namespace)
}

func WithClusterName(ctx context.Context, clusterName string) context.Context {
	return WithField(ctx, "clusterName", clusterName)
}
