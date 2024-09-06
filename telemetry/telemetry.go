package telemetry

import (
	"os"

	rudder "github.com/rudderlabs/analytics-go/v4"
)

type TelemetryProvider struct {
	TelemetryDisabled bool   `json:"telemetryDisabled"`
	TelemetryID       string `json:"telemetryID"`
	Client            rudder.Client
}

type Track struct {
	Event      string                 `json:"event"`
	Properties map[string]interface{} `json:"properties"`
}

func (t *Track) ToRudderTrack(telemetryID string) rudder.Track {
	return rudder.Track{
		AnonymousId: telemetryID,
		Event:       t.Event,
		Properties:  t.Properties,
	}
}

type Identify struct {
	Traits map[string]interface{} `json:"traits"`
	UserID string                 `json:"userId"`
}

func (t *Identify) ToRudderIdentify(telemetryID string) rudder.Identify {
	return rudder.Identify{
		AnonymousId: telemetryID,
		Traits:      t.Traits,
		UserId:      t.UserID,
	}
}

type Page struct {
	Category   string                 `json:"category"`
	Name       string                 `json:"name"`
	Properties map[string]interface{} `json:"properties"`
}

func (t *Page) ToRudderPage(telemetryID string) rudder.Page {
	return rudder.Page{
		AnonymousId: telemetryID,
		Name:        t.Name,
		Properties:  t.Properties,
	}
}

const dataPlaneURL = "https://pdat.matterlytics.com"

var writeKey = os.Getenv("RUDDER_WRITE_KEY")

// NewTelemetryProvider creates a new TelemetryProvider
func NewTelemetryProvider(telemetryID string, telemetryDisabled bool) (*TelemetryProvider, error) {
	client := rudder.New(writeKey, dataPlaneURL)

	provider := &TelemetryProvider{
		TelemetryID:       telemetryID,
		TelemetryDisabled: telemetryDisabled,
		Client:            client,
	}
	return provider, nil
}

func (t *TelemetryProvider) Track(trackEvent *Track) error {
	if t.TelemetryDisabled {
		return nil
	}

	track := trackEvent.ToRudderTrack(t.TelemetryID)

	return t.Client.Enqueue(track)
}

func (t *TelemetryProvider) Page(pageEvent *Page) error {
	if t.TelemetryDisabled {
		return nil
	}

	page := pageEvent.ToRudderPage(t.TelemetryID)

	return t.Client.Enqueue(page)
}

func (t *TelemetryProvider) Identify(identifyEvent *Identify) error {
	if t.TelemetryDisabled {
		return nil
	}

	identify := identifyEvent.ToRudderIdentify(t.TelemetryID)

	return t.Client.Enqueue(identify)
}

func (t *TelemetryProvider) Flush() {
	t.Client.Close()
}

func (t *TelemetryProvider) IsDisabled() bool {
	return t.TelemetryDisabled
}

func (t *TelemetryProvider) GetTelemetryID() string {
	return t.TelemetryID
}
