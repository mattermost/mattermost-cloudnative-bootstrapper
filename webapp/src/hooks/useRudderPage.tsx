import React from 'react';
import { useRudderPageMutation } from '../client/telemetryApi';

export default function useRudderPage() {
    const [rudderPage,] = useRudderPageMutation();

    return (category: string, name: string, properties: Record<string, any>) => {
        rudderPage({ category, name, properties });
    }
}