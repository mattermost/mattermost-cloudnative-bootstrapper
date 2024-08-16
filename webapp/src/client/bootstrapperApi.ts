import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError, FetchBaseQueryMeta } from '@reduxjs/toolkit/query/react';
import { CloudCredentials, Namespace, Release, State } from "../types/bootstrapper";
import { RootState } from '../store';
import { baseUrl, wsBaseUrl } from './client';
import { Cluster, Nodegroup } from '../types/Cluster';
import { InstallationLogLine, Pod } from '../types/Installation';


const websocketBaseQuery: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError,
    {},
    FetchBaseQueryMeta
> = async (args, api, extraOptions) => {
    const ws = new WebSocket(`${wsBaseUrl}/api/v1${args}`);

    return new Promise((resolve, reject) => {
        ws.onerror = (e) => {
            console.log(e);
            reject({
                error: {
                    status: 'CUSTOM_ERROR',
                    error: 'WebSocket connection error',
                    data: e,
                },
                meta: {},
            });
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            resolve({ data });
            console.log(event);
        };
    });
};

const baseQuery = fetchBaseQuery({
    baseUrl: `${baseUrl}/api/v1`,
});

const splitBaseQuery = async (args: string | FetchArgs, api: any, extraOptions: any): Promise<any> => {
    console.log(args);
    if (typeof args === 'string' && args.includes('ws_logs')) {
        return websocketBaseQuery(args, api, extraOptions)
    } else {
        return baseQuery(args, api, extraOptions)
    }
};

export const bootstrapperApi = createApi({
    reducerPath: 'bootstrapperApi',
    baseQuery: splitBaseQuery,
    tagTypes: ['BootstrapperState', 'Namespaces', 'HelmReleases', 'MattermostWorkspace', 'NginxOperator', 'CloudNativePGOperator', 'MattermostOperator', 'NginxOperator', 'CloudNativePGOperator', 'CloudCredentials', 'InstallationLogs'],
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
        getPodsForInstallation: builder.query<Pod[], { cloudProvider: string, clusterName: string, installationName: string }>({
            query: ({ cloudProvider, clusterName, installationName }) => ({ 
                url: `/${cloudProvider}/cluster/${clusterName}/installation/${installationName}/pods`,
                method: 'GET',
            }),
        }),
        watchInstallationLogs: builder.query<InstallationLogLine[], { cloudProvider: string; clusterName: string; installationName: string; pods: string[] }>({
            queryFn: ({ cloudProvider, clusterName, installationName, pods }) => {
                return { data: [] as InstallationLogLine[]};
            },
            keepUnusedDataFor: 0,
            async onCacheEntryAdded(
                arg: any,
                { updateCachedData, cacheDataLoaded, cacheEntryRemoved }: any
            ) {
                const ws = new WebSocket(
                    `${wsBaseUrl}/api/v1/${arg.cloudProvider}/cluster/${arg.clusterName}/installation/${arg.installationName}/ws_logs?${arg.pods.map((pod: string) => `pods=${pod}`).join('&')}`,
                );
                try {
                    await cacheDataLoaded;
                    const listener = (event: any) => {
                        const logLine = JSON.parse(event.data) as InstallationLogLine;
                        updateCachedData((draft: any) => {
                            draft.push(logLine);
                        });
                    };
                    ws.addEventListener('message', listener);
                } catch {
                    // no-op
                }
                await cacheEntryRemoved;
                ws.close();
            },
            providesTags: ['InstallationLogs']
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
    useWatchInstallationLogsQuery,
    useGetPodsForInstallationQuery,
} = bootstrapperApi;
