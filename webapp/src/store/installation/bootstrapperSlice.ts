import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { CloudCredentials } from "../../types/bootstrapper";
import { setAndCheckCloudCredentials as setCredentials, deployMattermostOperator as depMattermostOperator, deployNginxOperator as depNginxOperator, fetchEKSNamespaces } from '../../client/client';
import { KubeUtility, allUtilities } from "../../pages/install_operators/install_operators";
import { RootState } from "..";

export interface BootstrapperState {
    status: 'idle' | 'loading' | 'failed' | 'succeeded';
    error?: string | undefined;
    cloudProvider: string;
    kubernetesOption: string;
    cloudCredentials: CloudCredentials;
    utilities: KubeUtility[];
    cluster: {
        namespacesRequestStatus: 'idle' | 'loading' | 'failed' | 'succeeded',
        namespaces: string[]
    };
}

const initialState: BootstrapperState = {
    status: 'idle',
    cloudProvider: '',
    kubernetesOption: '',
    cloudCredentials: { accessKeyId: '', accessKeySecret: '', region: '', kubeconfig: '' },
    utilities: allUtilities,
    cluster: {namespacesRequestStatus: 'idle', namespaces: []},
}

export const setAndCheckCloudCredentials = createAsyncThunk("bootstrapper/setAndCheckCloudCredentials", async ({ credentials, cloudProvider }: { credentials: CloudCredentials, cloudProvider: string }) => {
    const response = await setCredentials(credentials, cloudProvider)
    return response;
})

export const getNamespaces = createAsyncThunk("bootstrapper/getNamespaces", async (clusterName: string) => {
    const response = await fetchEKSNamespaces(clusterName)
    return response;
});

export const deployMattermostOperator = createAsyncThunk("bootstrapper/deployMattermostOperator", async (clusterName: string) => {
    const response = await depMattermostOperator(clusterName)
    return {utility: 'mattermost-operator', ...response};
});

export const deployNginxOperator = createAsyncThunk("bootstrapper/deployNginxOperator", async (clusterName: string) => {
    const response = await depNginxOperator(clusterName)
    return {utility: 'ingress-nginx', ...response};
});

export const deployMariner = createAsyncThunk("bootstrapper/deployMariner", async (clusterName: string) => {

    return null;
});

export const deployProvisioner = createAsyncThunk("bootstrapper/deployProvisioner", async (clusterName: string) => {

    return null;
});

export const bootstrapperSlice = createSlice({
    name: 'bootstrapper',
    initialState,
    reducers: {
        setCloudProvider: (state, action) => {
            state.cloudProvider = action.payload
        },
        setCloudCredentials: (state, action) => {
            state.cloudCredentials = action.payload
        },
        setKubernetesOption: (state, action) => {
            state.kubernetesOption = action.payload
        },
        setUtilities: (state, action) => {
            state.utilities = action.payload
        },
        setUtilityDeploymentState: (state, { payload: { utility, deploymentRequestState, isChecked } }) => {
            state.utilities = state.utilities.map((util) => {
                if (util.key === utility) {
                    return { ...util, deploymentRequestState, isChecked }
                }
                return util;
            });
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(setAndCheckCloudCredentials.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(setAndCheckCloudCredentials.fulfilled, (state) => {
                state.status = 'succeeded';
            })
            .addCase(setAndCheckCloudCredentials.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            });
        builder
            .addCase(getNamespaces.pending, (state) => {
                state.cluster.namespacesRequestStatus = 'loading';
            }).addCase(getNamespaces.fulfilled, (state, action) => {
                state.cluster.namespacesRequestStatus = 'succeeded';
                state.cluster.namespaces = action.payload.map((namespace: any) => namespace.metadata.name);
            }).addCase(getNamespaces.rejected, (state, action) => {
                state.cluster.namespacesRequestStatus = 'failed';
            });

        builder.addCase(deployMattermostOperator.pending, (state, action) => {
            state.utilities = state.utilities.map((utility) => {
                if (utility.key === 'mattermost-operator') {
                    return { ...utility, deploymentRequestState: 'loading' }
                }
                return utility;
            });
        }).addCase(deployMattermostOperator.fulfilled, (state, action) => {
            state.utilities = state.utilities.map((utility) => {
                if (utility.key === 'mattermost-operator') {
                    return { ...utility, deploymentRequestState: 'succeeded' }
                }
                return utility;
            });
        }).addCase(deployMattermostOperator.rejected, (state, action) => {
            state.utilities = state.utilities.map((utility) => {
                if (utility.key === 'mattermost-operator') {
                    return { ...utility, deploymentRequestState: 'failed' }
                }
                return utility;
            });
        });
        builder.addCase(deployNginxOperator.pending, (state, action) => {
            state.utilities = state.utilities.map((utility) => {
                if (utility.key === 'ingress-nginx') {
                    return { ...utility, deploymentRequestState: 'loading' }
                }
                return utility;
            });
        }).addCase(deployNginxOperator.fulfilled, (state, action) => {
            state.utilities = state.utilities.map((utility) => {
                if (utility.key === 'ingress-nginx') {
                    return { ...utility, deploymentRequestState: 'succeeded' }
                }
                return utility;
            });
        }).addCase(deployNginxOperator.rejected, (state, action) => {
            state.utilities = state.utilities.map((utility) => {
                if (utility.key === 'ingress-nginx') {
                    return { ...utility, deploymentRequestState: 'failed' }
                }
                return utility;
            });
        });
    }
});

export const getRequiredUtilities = (state: RootState) => {
    return state.bootstrapper.utilities.filter((utility: KubeUtility) => utility.isRequired);
}

export const requiredUtilitiesAreDeployed = (state: RootState) => {
    const requiredUtilities: KubeUtility[] = getRequiredUtilities(state);
    return requiredUtilities.every((utility: KubeUtility) => utility.isRequired && utility.deploymentRequestState === 'succeeded');
}


export const { setCloudProvider, setCloudCredentials, setKubernetesOption, setUtilities, setUtilityDeploymentState } = bootstrapperSlice.actions;


export default bootstrapperSlice.reducer;