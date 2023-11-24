import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { CreateInstallationRequest, Installation } from '../../types/Installation';
import { RootState } from '..';
import { Pagination } from '../../types/common';
import { getInstallations, createInstallation as createAnInstallation } from '../../client/client';

export interface InstallationsState {
    installations: Installation[];
    pagination: Pagination;
    status: 'idle' | 'loading' | 'failed' | 'succeeded';
    error?: string | undefined;
    lastPage?: number;
}

const initialState: InstallationsState = {
    installations: [],
    pagination: {
        page: 0,
        per_page: 20,
        total: 0,
    },
    status: 'idle',
}

export const fetchInstallations = createAsyncThunk("installations/fetchInstallations", async ({page, per_page}: {page: number, per_page: number}) => {
    const response = await getInstallations(page, per_page);
    return response;
});

export const createInstallation = createAsyncThunk("installations/createInstallation", async (installation: CreateInstallationRequest) => { 
    const response = await createAnInstallation(installation);
    return response;
});

export const installationsSlice = createSlice({
    name: 'installations',
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
            .addCase(fetchInstallations.pending, (state, action) => {
                state.status = 'loading'
            })
            .addCase(fetchInstallations.fulfilled, (state, action) => {
                state.status = 'succeeded'
                // Add any fetched posts to the array
                if (action.payload.length < state.pagination.per_page) {
                    state.lastPage = state.pagination.page
                }
                state.installations = state.installations.concat(action.payload)
            })
            .addCase(fetchInstallations.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
            .addCase(createInstallation.pending, (state, action) => {
                state.status = 'loading'
            })
            .addCase(createInstallation.fulfilled, (state, action) => {
                state.status = 'succeeded'
                state.installations = state.installations.concat([action.payload])
            })
            .addCase(createInstallation.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
    }
})


export const selectInstallationsForPage = (state: RootState) => {
    return state.installations.installations.slice(state.installations.pagination.page * state.installations.pagination.per_page, (state.installations.pagination.page + 1) * state.installations.pagination.per_page)
}

export const selectInstallationsPagination = (state: RootState) => {
    return state.installations.pagination
}

// Action creators are generated for each case reducer function
export const { incrementPage, setPage, decrementPage } = installationsSlice.actions

export default installationsSlice.reducer