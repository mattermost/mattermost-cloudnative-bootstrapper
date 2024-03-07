import { configureStore } from '@reduxjs/toolkit'
import bootstrapperSlice from './installation/bootstrapperSlice'
import awsSlice from './installation/awsSlice'
import dashboardSlice from './installation/dashboardSlice'
import { dashboardApi } from '../client/dashboardApi'

export const store = configureStore({
    reducer: {
        dashboard: dashboardSlice,
        bootstrapper: bootstrapperSlice,
        aws: awsSlice,
        [dashboardApi.reducerPath]: dashboardApi.reducer,
    },
    middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(dashboardApi.middleware),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch