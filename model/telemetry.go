package model

import (
	"bytes"
	"encoding/base32"

	"github.com/pborman/uuid"
)

type TelemetryState struct {
	TelemetryDisabled bool   `json:"telemetryDisabled"`
	TelemetryID       string `json:"telemetryID"`
}

var encoding = base32.NewEncoding("ybndrfg8ejkmcpqxot1uwisza345h769")

// Generates a unique 26 character alpha-numeric string
func NewTelemetryID() string {
	var b bytes.Buffer
	encoder := base32.NewEncoder(encoding, &b)
	encoder.Write(uuid.NewRandom())
	encoder.Close()
	b.Truncate(26) // removes the '==' padding
	return b.String()
}
