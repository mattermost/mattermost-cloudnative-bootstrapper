import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { CloudCredentials, Namespace, Release, State } from "../types/bootstrapper";
import { RootState } from '../store';
import { baseUrl } from './client';
import { Cluster, Nodegroup } from '../types/Cluster';

export const bootstrapperApi = createApi({
    reducerPath: 'bootstrapperApi',
    baseQuery: fetchBaseQuery({ baseUrl: `${baseUrl}/api/v1` }),
    tagTypes: ['BootstrapperState', 'Namespaces', 'HelmReleases', 'MattermostWorkspace', 'NginxOperator', 'CloudNativePGOperator', 'MattermostOperator', 'NginxOperator', 'CloudNativePGOperator', 'CloudCredentials'],
    endpoints: (builder) => ({
        getState: builder.query<State, void>({
            query: () => '/state/hydrate',
        }),
        setRegion: builder.mutation<void, { region: string, cloudProvider: string }>({
            query: ({ region, cloudProvider }) => ({
                url: `/${cloudProvider}/region`,
                method: 'PUT',
                body: { region },
            }),
        }),
        setAndCheckCloudCredentials: builder.mutation({
            query: ({ credentials, cloudProvider }) => ({
                url: `${cloudProvider}/set_credentials`,
                method: 'POST',
                body: credentials as CloudCredentials,
            }),
        }),
        // TODO: pass through the region once the backend supports it
        getPossibleClusters: builder.query<string[], { cloudProvider: string, region: string }>({
            query: ({ cloudProvider, region }) => `/${cloudProvider}/clusters?region=${region}`,
        }),
        getCluster: builder.query<Cluster, { clusterName: string, cloudProvider: string }>({
            query: ({ clusterName, cloudProvider }: { clusterName: string, cloudProvider: string }) => `/${cloudProvider}/cluster/${clusterName}`,
        }),
        getNodegroups: builder.query<Nodegroup[], { cloudProvider: string, clusterName: string }>({
            query: ({ cloudProvider, clusterName }) => `/${cloudProvider}/cluster/${clusterName}/nodegroups`,
        }),
        getKubeConfig: builder.query<string, { cloudProvider: string, clusterName: string }>({
            query: (({ clusterName, cloudProvider }) => {
                return {
                    url: `/${cloudProvider}/cluster/${clusterName}/kubeconfig`,
                    responseHandler: (response) => response.text(),
                }
            }),
        }),
        getNamespaces: builder.query<Namespace[], { cloudProvider: string, clusterName: string }>({
            query: ({ cloudProvider, clusterName }) => `/${cloudProvider}/cluster/${clusterName}/namespaces`,
        }),
        getInstalledHelmReleases: builder.query<Release[], { cloudProvider: string, clusterName: string }>({
            query: ({ cloudProvider, clusterName }) => `/${cloudProvider}/cluster/${clusterName}/installed_charts`,
            providesTags: ['HelmReleases']
        }),
        deployMattermostOperator: builder.mutation<undefined, { cloudProvider: string, clusterName: string }>({
            query: ({ clusterName, cloudProvider }) => ({
                url: `/${cloudProvider}/cluster/${clusterName}/deploy_mattermost_operator`,
                method: 'POST',
            }),
        }),
        deployNginxOperator: builder.mutation<undefined, { cloudProvider: string, clusterName: string }>({
            query: ({ clusterName, cloudProvider }) => ({
                url: `/${cloudProvider}/cluster/${clusterName}/deploy_nginx_operator`,
                method: 'POST',
            }),
        }),
        deployCloudNativePG: builder.mutation<undefined, { cloudProvider: string, clusterName: string }>({
            query: ({ clusterName, cloudProvider }) => ({
                url: `/${cloudProvider}/cluster/${clusterName}/deploy_pg_operator`,
                method: 'POST',
            }),
        }),
    }),
});


export const selectCloudCredentials = (state: RootState) => state.bootstrapper.cloudCredentials;

export const {
    useSetAndCheckCloudCredentialsMutation,
    useGetNamespacesQuery,
    useDeployMattermostOperatorMutation,
    useDeployNginxOperatorMutation,
    useDeployCloudNativePGMutation,
    useGetInstalledHelmReleasesQuery,
    useGetPossibleClustersQuery,
    useGetClusterQuery,
    useGetNodegroupsQuery,
    useGetKubeConfigQuery,
    useGetStateQuery,
    useSetRegionMutation,
} = bootstrapperApi;
