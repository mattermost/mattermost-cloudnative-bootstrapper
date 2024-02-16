import { configureStore } from '@reduxjs/toolkit'
import installationsSlice from './installation/installationSlice'
import clustersSlice from './installation/clusterSlice'
import bootstrapperSlice from './installation/bootstrapperSlice'
import awsSlice from './installation/awsSlice'

export const store = configureStore({
    reducer: {
        installations: installationsSlice,
        clusters: clustersSlice,
        bootstrapper: bootstrapperSlice,
        aws: awsSlice,
    },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch