import { createSlice } from "@reduxjs/toolkit";
import { CloudCredentials } from "../../types/bootstrapper";
import { KubeUtility, allUtilities } from "../../pages/install_operators/install_operators";
import { RootState } from "..";

export interface BootstrapperState {
    cloudProvider: string;
    kubernetesOption: string;
    cloudCredentials: CloudCredentials;
    clusterName?: string;
    utilities: KubeUtility[];
    operatorCustomValues: Record<string, string>; // Maps operator key to custom values.yaml
}

const initialState: BootstrapperState = {
    cloudProvider: '',
    kubernetesOption: '',
    cloudCredentials: { accessKeyId: '', accessKeySecret: '', sessionToken: '', region: '', kubeconfig: '', kubeconfigType: '' },
    utilities: allUtilities,
    operatorCustomValues: {},
}

export const bootstrapperSlice = createSlice({
    name: 'bootstrapper',
    initialState,
    reducers: {
        setClusterName: (state, action) => {
            state.clusterName = action.payload
        },
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
        },
        setOperatorCustomValues: (state, { payload: { operatorKey, values } }) => {
            state.operatorCustomValues[operatorKey] = values;
        },
        clearOperatorCustomValues: (state, { payload: { operatorKey } }) => {
            delete state.operatorCustomValues[operatorKey];
        },
        resetState: (state) => {
            state.cloudProvider = '';
            state.kubernetesOption = '';
            state.cloudCredentials = { accessKeyId: '', accessKeySecret: '', sessionToken: '', region: '', kubeconfig: '', kubeconfigType: '' };
            state.clusterName = undefined;
            state.utilities = allUtilities;
            state.operatorCustomValues = {};
        },
    },
    extraReducers: (builder) => {
    }
});

export const getRequiredUtilities = (state: RootState) => {
    return state.bootstrapper.utilities.filter((utility: KubeUtility) => utility.isRequired);
}

export const requiredUtilitiesAreDeployed = (state: RootState) => {
    const requiredUtilities: KubeUtility[] = getRequiredUtilities(state);
    return requiredUtilities.every((utility: KubeUtility) => utility.isRequired && utility.deploymentRequestState === 'succeeded');
}

export const { setCloudProvider, setCloudCredentials, setKubernetesOption, setUtilities, setUtilityDeploymentState, setOperatorCustomValues, clearOperatorCustomValues, resetState } = bootstrapperSlice.actions;


export default bootstrapperSlice.reducer;