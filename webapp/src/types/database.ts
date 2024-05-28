
export interface SingleTenantDatabaseConfig {
    PrimaryInstanceType: string;
    ReplicaInstanceType: string;
    ReplicasCount: number;
};

export interface ExternalDatabaseConfig {
    SecretName: string;
};