import { configureStore } from '@reduxjs/toolkit'
import bootstrapperSlice from './installation/bootstrapperSlice'
import awsSlice from './installation/awsSlice'
import dashboardSlice from './installation/dashboardSlice'
import { dashboardApi } from '../client/dashboardApi'
import {bootstrapperApi} from '../client/bootstrapperApi'

export const store = configureStore({
    reducer: {
        dashboard: dashboardSlice,
        bootstrapper: bootstrapperSlice,
        aws: awsSlice,
        [dashboardApi.reducerPath]: dashboardApi.reducer,
        [bootstrapperApi.reducerPath]: bootstrapperApi.reducer,
    },
    middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(dashboardApi.middleware).concat(bootstrapperApi.middleware),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch