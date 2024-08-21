import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { baseUrl } from './client';



export const telemetryApi = createApi({
    reducerPath: 'telemetryApi',
    baseQuery: fetchBaseQuery({ baseUrl: `${baseUrl}/api/v1` }),
    tagTypes: ['Telemetry'],
    endpoints: (builder) => ({
        rudderPage: builder.mutation<void, { category: string, name: string, properties: Record<string, any> }>({
            query: ({ category, name, properties }) => ({
                url: `/telemetry/page`,
                method: 'POST',
                body: { category, name, properties },
            }),
        }),
        rudderTrack: builder.mutation<void, { event: string, properties: Record<string, any> }>({
            query: ({ event, properties }) => ({
                url: `/telemetry/track`,
                method: 'POST',
                body: { event, properties },
            }),
        }),
        rudderIdentify: builder.mutation<void, { userId: string, traits: Record<string, any> }>({
            query: ({ userId, traits }) => ({
                url: `/telemetry/identify`,
                method: 'POST',
                body: { userId, traits },
            }),
        }),
    })
});

export const { useRudderPageMutation, useRudderTrackMutation, useRudderIdentifyMutation } = telemetryApi;