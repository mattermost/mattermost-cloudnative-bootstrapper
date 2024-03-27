import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { baseUrl } from './client';
import { CreateMattermostWorkspaceRequest, Mattermost, PatchMattermostWorkspaceRequest } from '../types/Installation';
import { Cluster } from '../types/Cluster';

export const dashboardApi = createApi({
    reducerPath: 'dashboardApi', // Unique identifier for the reducer
    baseQuery: fetchBaseQuery({ baseUrl: `${baseUrl}/api/v1` }),
    tagTypes: ['Installation', 'Cluster'],
    endpoints: (builder) => ({
        getClusters: builder.query<string[], string>({
            query: (cloudProvider) => `/${cloudProvider}/clusters`,
        }),
        getMattermostInstallationsForCluster: builder.query<Mattermost[], { clusterName: string, cloudProvider: string }>({
            query: ({ clusterName, cloudProvider }) => `/${cloudProvider}/cluster/${clusterName}/installations`,
            providesTags: (result, error, { clusterName }) =>
                result
                    ? [
                        ...result.map((installation) => ({ type: 'Installation' as const, id: installation.metadata.name })),
                        { type: 'Installation' as const, id: clusterName }
                    ]
                    : [{ type: 'Installation' as const, id: clusterName }], // Tag on error too 
        }),
        getCluster: builder.query<Cluster, { clusterName: string, cloudProvider: string }>({
            query: ({ clusterName, cloudProvider }) => `/${cloudProvider}/cluster/${clusterName}`,
        }),
        deleteInstallation: builder.mutation<void, { clusterName: string, cloudProvider: string, installationName: string }>({
            query: ({ clusterName, cloudProvider, installationName }) => ({
                url: `/${cloudProvider}/cluster/${clusterName}/installation/${installationName}`,
                method: 'DELETE'
            }),
        }),
        patchInstallation: builder.mutation<Mattermost, { clusterName: string, cloudProvider: string, installationName: string, patch: PatchMattermostWorkspaceRequest }>({
            query: ({ clusterName, cloudProvider, installationName, patch }) => ({
                url: `/${cloudProvider}/cluster/${clusterName}/installation/${installationName}`,
                method: 'PATCH',
                body: patch
            }),
            invalidatesTags: ['Installation']
        }),
        createMattermostWorkspace: builder.mutation<Mattermost, {cloudProvider: string, clusterName: string, workspaceInfo: CreateMattermostWorkspaceRequest}>({
            query: ({ cloudProvider, clusterName, workspaceInfo }) => ({
                url: `/${cloudProvider}/cluster/${clusterName}/installation`,
                method: 'POST',
                body: workspaceInfo,
            }),
        }),
    }),
});

export const { useGetMattermostInstallationsForClusterQuery, useGetClustersQuery, useDeleteInstallationMutation, usePatchInstallationMutation, useCreateMattermostWorkspaceMutation } = dashboardApi;