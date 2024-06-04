package api_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/mattermost/mattermost-cloudnative-bootstrapper/api"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStateFunctions(t *testing.T) {
	tempDir := t.TempDir() // Create a temporary directory for tests
	stateFilePath := filepath.Join(tempDir, "test_state.json")

	t.Run("CheckStateExists", func(t *testing.T) {
		t.Run("FileDoesNotExist", func(t *testing.T) {
			exists, err := api.CheckStateExists(stateFilePath)
			require.NoError(t, err)
			assert.False(t, exists)
		})

		t.Run("FileExists", func(t *testing.T) {
			// Create the file
			err := api.InitState(stateFilePath)
			require.NoError(t, err)

			exists, err := api.CheckStateExists(stateFilePath)
			require.NoError(t, err)
			assert.True(t, exists)
		})
	})

	t.Run("InitState", func(t *testing.T) {
		// Test that the file is created
		err := api.InitState(stateFilePath)
		require.NoError(t, err)

		// Test that the file has the correct contents
		state, err := api.GetState(stateFilePath)
		require.NoError(t, err)
		assert.Equal(t, api.BootstrapperState{}, state) // Compare with a blank state
	})

	t.Run("GetState", func(t *testing.T) {
		t.Run("FileDoesNotExist", func(t *testing.T) {
			// Remove the file (if it exists from previous tests)
			_ = os.Remove(stateFilePath)

			_, err := api.GetState(stateFilePath)
			require.Error(t, err) // Expect an error if the file doesn't exist
		})

		t.Run("FileExists", func(t *testing.T) {
			// Initialize a state file (if it doesn't exist)
			_ = api.InitState(stateFilePath)

			state, err := api.GetState(stateFilePath)
			require.NoError(t, err)
			assert.Equal(t, api.BootstrapperState{}, state) // Compare with a blank state
		})
	})

	t.Run("SetState", func(t *testing.T) {
		newState := api.BootstrapperState{
			// ... populate with some test data ...
		}

		err := api.SetState(stateFilePath, newState)
		require.NoError(t, err)

		// Read the state back and verify it
		readState, err := api.GetState(stateFilePath)
		require.NoError(t, err)
		assert.Equal(t, newState, readState)
	})
}
