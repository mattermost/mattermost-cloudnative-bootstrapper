package helm

import (
	_ "embed"
)

// Embedded YAML configurations for Helm charts

//go:embed values/nginx-operator.yaml
var NginxOperatorValues string

//go:embed values/rtcd-service.yaml
var RTCDServiceValues string

//go:embed values/calls-offloader.yaml
var CallsOffloaderValues string

//go:embed values/mattermost-operator.yaml
var MattermostOperatorValues string

//go:embed values/cnpg-operator.yaml
var CNPGOperatorValues string
