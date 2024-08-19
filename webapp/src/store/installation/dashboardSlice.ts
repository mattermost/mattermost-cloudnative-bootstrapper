import { createSlice } from "@reduxjs/toolkit";
import { Mattermost } from "../../types/Installation";

export interface DashboardState {
    selectedClusterName?: string;
    installationToEdit?: Mattermost;
}

const initialState: DashboardState = {
    selectedClusterName: undefined,
}

export const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setSelectedClusterName: (state, action) => {
            state.selectedClusterName = action.payload;
        },
        setInstallationToEdit: (state, action) => {
            state.installationToEdit = action.payload;
        },
    },
    extraReducers: (builder) => {
    },
});


export const {setSelectedClusterName, setInstallationToEdit} = dashboardSlice.actions;


export default dashboardSlice.reducer;