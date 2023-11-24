import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Cluster } from "../../types/Cluster";
import { Pagination } from "../../types/common";
import { getClusters } from "../../client/client";
import { RootState } from "..";

export interface ClustersState {
    clusters: Cluster[];
    pagination: Pagination;
    status: 'idle' | 'loading' | 'failed' | 'succeeded';
    error?: string | undefined;
    lastPage?: number;
}


const initialState: ClustersState = {
    clusters: [],
    pagination: {
        page: 0,
        per_page: 20,
        total: 0,
    },
    status: 'idle',
}

export const fetchClusters = createAsyncThunk("clusters/fetchClusters", async ({page, per_page}: {page: number, per_page: number}) => {
    const response = await getClusters(page, per_page);

    return response;
});

export const clustersSlice = createSlice({
    name: 'clusters',
    initialState,
    reducers: {
        incrementPage: (state) => {
            // Redux Toolkit allows us to write "mutating" logic in reducers. It
            // doesn't actually mutate the state because it uses the Immer library,
            // which detects changes to a "draft state" and produces a brand new
            // immutable state based off those changes
            state.pagination.page += 1
        },
        decrementPage: (state) => {
            if (state.pagination.page > 0) {
                state.pagination.page -= 1
            } else {
                state.pagination.page = 0
            }
        },
        setPage: (state, action: PayloadAction<number>) => {
            state.pagination.page += action.payload
        },
        setPerPage: (state, action: PayloadAction<number>) => {
            state.pagination.per_page += action.payload
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchClusters.pending, (state, action) => {
                state.status = 'loading'
            })
            .addCase(fetchClusters.fulfilled, (state, action) => {
                state.status = 'succeeded'
                // Add any fetched posts to the array
                if (action.payload.length < state.pagination.per_page) {
                    state.lastPage = state.pagination.page
                }
                state.clusters = state.clusters.concat(action.payload);
            })
            .addCase(fetchClusters.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
    }    
})


export const selectClustersForPage = (state: RootState) => {
    const { page, per_page } = state.clusters.pagination;
    const start = page * per_page;
    const end = start + per_page;
    return state.clusters.clusters.slice(start, end);
}

export const selectClustersPagination = (state: RootState) => {
    return state.clusters.pagination
}


export const { incrementPage, decrementPage, setPage, setPerPage } = clustersSlice.actions;


export default clustersSlice.reducer;