import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { CloudCredentials } from "../../types/bootstrapper";
import { setAndCheckCloudCredentials as setCredentials } from '../../client/client';

export interface BootstrapperState {
    status: 'idle' | 'loading' | 'failed' | 'succeeded';
    error?: string | undefined;
    cloudProvider: string;
    kubernetesOption: string;
    cloudCredentials: CloudCredentials;
}

const initialState: BootstrapperState = {
    status: 'idle',
    cloudProvider: '',
    kubernetesOption: '',
    cloudCredentials: {accessKeyId: '', accessKeySecret: '', region: '', kubeconfig: ''},
}

export const setAndCheckCloudCredentials = createAsyncThunk("bootstrapper/setAndCheckCloudCredentials", async ({credentials, cloudProvider}: {credentials: CloudCredentials, cloudProvider: string}) => {
    const response = await setCredentials(credentials, cloudProvider)
    return response;
})

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
    }
});



export const { setCloudProvider, setCloudCredentials, setKubernetesOption } = bootstrapperSlice.actions;


export default bootstrapperSlice.reducer;