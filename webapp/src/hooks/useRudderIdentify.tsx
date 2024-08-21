import React from 'react';
import { useRudderIdentifyMutation } from '../client/telemetryApi';

export default function useRudderIdentify() {
    const [rudderIdentify,] = useRudderIdentifyMutation();

    return (userId: string, traits: Record<string, any>) => {
        rudderIdentify({ userId, traits });
    }
}