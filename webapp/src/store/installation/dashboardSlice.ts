import { createSlice } from "@reduxjs/toolkit";

export interface DashboardState {
    selectedClusterName?: string;
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
        }
    },
    extraReducers: (builder) => {
    },
});


export const {setSelectedClusterName} = dashboardSlice.actions;


export default dashboardSlice.reducer;