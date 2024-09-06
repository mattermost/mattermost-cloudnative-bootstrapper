import React from 'react';
import { useRudderTrackMutation } from '../client/telemetryApi';


export default function useRudderTrack() {
    const [rudderTrack,] = useRudderTrackMutation();

    return (event: string, properties: Record<string, any>) => {
        rudderTrack({ event, properties });
    }
}