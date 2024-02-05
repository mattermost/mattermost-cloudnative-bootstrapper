import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { CreateInstallationRequest, Installation, PatchInstallationRequest } from '../../types/Installation';
import { RootState } from '..';
import { Pagination } from '../../types/common';
import { getInstallations, deleteInstallation as cDeleteInstallation, createInstallation as createAnInstallation, getInstallationByID, patchInstallation as cPatchInstallation } from '../../client/client';

export interface InstallationFilter {
    searchTerm: string;
    state: string;
    size: string;
}

export interface InstallationsState {
    installations: Installation[];
    pagination: Pagination;
    status: 'idle' | 'loading' | 'failed' | 'succeeded';
    error?: string | undefined;
    lastPage?: number;
    filter: InstallationFilter;
}

const initialState: InstallationsState = {
    installations: [],
    pagination: {
        page: 0,
        per_page: 20,
        total: 0,
    },
    status: 'idle',
    filter: {
        searchTerm: '',
        state: '',
        size: '',
    }
}

export const fetchInstallations = createAsyncThunk("installations/fetchInstallations", async ({ page, per_page }: { page: number, per_page: number }) => {
    const response = await getInstallations(page, per_page);
    return response;
});

export const createInstallation = createAsyncThunk("installations/createInstallation", async (installation: CreateInstallationRequest) => {
    const response = await createAnInstallation(installation);
    return response;
});

export const patchInstallation = createAsyncThunk(
    "installations/patchInstallation",
    async ({id, patch}: {id: string, patch: PatchInstallationRequest}) => {
        const response = await cPatchInstallation(id, patch);
        return response;
    }
);

export const deleteInstallation = createAsyncThunk(
    "installations/deleteInstallation",
    async (id: string) => {
        const response = await cDeleteInstallation(id);
        return response;
    }
);

// Async thunk to fetch a single installation by ID
export const fetchInstallationByID = createAsyncThunk(
    'installations/fetchInstallationByID',
    async (id: string) => {
        const response = await getInstallationByID(id); // You'll need to implement getInstallationByID
        return response;
    }
);

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
        },
        setInstallationSearchTerm: (state, action: PayloadAction<string>) => {
            state.filter.searchTerm = action.payload;
        },
        setInstallationStateFilter: (state, action: PayloadAction<string>) => {
            if (action.payload === 'all') {
                state.filter.state = '';
                return;
            }
            state.filter.state = action.payload;
        },
        setInstallationSizeFilter: (state, action: PayloadAction<string>) => {
            if (action.payload === 'all') {
                state.filter.size = '';
                return;
            }
            state.filter.size = action.payload;
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchInstallations.pending, (state, action) => {
                state.status = 'loading'
            })
            .addCase(fetchInstallations.fulfilled, (state, action) => {
                state.status = 'succeeded'
                // Merge any fetched installations to the array
                state.installations = action.payload.reduce((acc: Installation[], installation: Installation) => {
                    const index = acc.findIndex((inst) => inst.ID === installation.ID);
                    if (index !== -1) {
                        acc[index] = installation;
                    } else {
                        acc.push(installation);
                    }
                    return acc;
                }, state.installations);
            })
            .addCase(fetchInstallations.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            });

        builder.addCase(createInstallation.pending, (state, action) => {
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

        builder
            .addCase(fetchInstallationByID.pending, (state, action) => {
                state.status = 'loading';
            })
            .addCase(fetchInstallationByID.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.installations.push(action.payload); // Assuming action.payload is a single installation
            })
            .addCase(fetchInstallationByID.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            });
        
        builder
            .addCase(patchInstallation.pending, (state, action) => {
                state.status = 'loading';
            })
            .addCase(patchInstallation.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.installations.map((installation: Installation) => {
                    if (installation.ID === action.payload.ID) {
                        return action.payload;
                    }
                    return installation;
                });
            })
            .addCase(patchInstallation.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            });
    }
})


export const selectInstallationsForPage = (state: RootState) => {
    return state.installations.installations.slice(state.installations.pagination.page * state.installations.pagination.per_page, (state.installations.pagination.page + 1) * state.installations.pagination.per_page)
}

export const selectInstallationsPagination = (state: RootState) => {
    return state.installations.pagination
}

// Selector to retrieve a single installation by ID
export const selectInstallationByID = (id: string) => (state: RootState) => {
    return state.installations.installations.find(
        (installation) => installation.ID === id
    );
};

// Selector to retrieve installations for the current page with filters applied
export const selectFilteredInstallationsForPage = (state: RootState) => {
    let installations = state.installations.installations;

    const { searchTerm, state: installationStateFilter, size: installationSizeFilter } = state.installations.filter;

    if (installations.length === 0) {
        return [];
    }

    console.log(installations);
    console.log(searchTerm);
    // Apply the filters
    if (searchTerm) {
        installations = installations.filter(installation => {
            return Object.values(installation).some(value =>{ 
                if (!value) return false;
                console.log(value.toString().toLowerCase(), searchTerm.toLowerCase());
                return value.toString().toLowerCase().includes(searchTerm.toLowerCase())
            })
        });
    }
    if (installationStateFilter) {
        installations = installations.filter(installation => installation.State === installationStateFilter);
    }
    if (installationSizeFilter) {
        installations = installations.filter(installation => installation.Size === installationSizeFilter);
    }

    if (installations.length < state.installations.pagination.per_page) {
        return installations.slice(0, installations.length)
    }

    // Return the installations for the current page
    return installations.slice(state.installations.pagination.page * state.installations.pagination.per_page, (state.installations.pagination.page + 1) * state.installations.pagination.per_page);
}

// Action creators are generated for each case reducer function
export const { incrementPage, setPage, decrementPage, setInstallationStateFilter, setInstallationSearchTerm, setInstallationSizeFilter } = installationsSlice.actions

export default installationsSlice.reducer;