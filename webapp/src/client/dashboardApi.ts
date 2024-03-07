import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import { baseUrl } from './client';
import { Mattermost } from '../types/Installation';
import { Cluster } from '../types/Cluster';

export const dashboardApi = createApi({
    reducerPath: 'dashboardApi', // Unique identifier for the reducer
    baseQuery: fetchBaseQuery({ baseUrl: `${baseUrl}/api/v1` }),
    endpoints: (builder) => ({
        getClusters: builder.query<string[], string>({
            query: (cloudProvider) => `/${cloudProvider}/clusters`,
        }),
        getMattermostInstallationsForCluster: builder.query<Mattermost[], {clusterName: string, cloudProvider: string}>({
            query: ({clusterName, cloudProvider}) => `${cloudProvider}/cluster/${clusterName}/installations`,  
        }),
        getCluster: builder.query<Cluster, {clusterName: string, cloudProvider: string}>({
            query: ({clusterName, cloudProvider}) => `${cloudProvider}/cluster/${clusterName}`,
        }),
    }),
});

export const { useGetMattermostInstallationsForClusterQuery, useGetClustersQuery } = dashboardApi;