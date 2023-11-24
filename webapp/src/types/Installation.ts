import { ExternalDatabaseConfig, SingleTenantDatabaseConfig } from './database';

export interface Installation {
    ID: string;
    OwnerID: string;
    GroupID?: string;
    GroupSequence?: number;
    Version: string;
    Image: string;
    Name: string;
    Database: string;
    SingleTenantDatabaseConfig?: SingleTenantDatabaseConfig;
    ExternalDatabaseConfig?: ExternalDatabaseConfig;
    Filestore: string;
    License: string;
    AllowedIPRanges?: AllowedIPRange[];
    MattermostEnv: EnvVarMap;
    PriorityEnv: EnvVarMap;
    Size: string;
    Affinity: string;
    State: string;
    CRVersion: string;
    CreateAt: number;
    DeleteAt: number;
    DeletionPendingExpiry?: number;
    APISecurityLock: boolean;
    DeletionLocked: boolean;
    LockAcquiredBy?: string;
    LockAcquiredAt: number;
    GroupOverrides?: Record<string, string>;
    configMergedWithGroup: boolean;
    configMergeGroupSequence: number;
};


export type CreateInstallationRequest = {
    Name: string;
    OwnerID: string;
    GroupID: string;
    Version: string;
    Image: string;
    DNS?: string;
    DNSNames?: string[];
    License: string;
    Size: string;
    Affinity: string;
    Database: string;
    Filestore: string;
    APISecurityLock: boolean;
    DeletionLocked: boolean;
    MattermostEnv: EnvVarMap;
    PriorityEnv: EnvVarMap;
    Annotations: string[];
    GroupSelectionAnnotations: string[];
    // SingleTenantDatabaseConfig?: SingleTenantDatabaseRequest;
    // ExternalDatabaseConfig?: ExternalDatabaseRequest;
};


type EnvVarMap = Record<string, EnvVar>;


export interface EnvVar {
    value?: string;
}


export type AllowedIPRange = {
    CIDRBlock: string;
    Description: string;
    Enabled: boolean;
    OwnerID?: string;
};

export const filestoreOptions = [
    { value: 'aws-s3', label: 'AWS S3' },
    { value: 'minio', label: 'MinIO' },
    { value: 'aws-multitenant-s3', label: 'AWS Multitenant S3' },
    { value: 'bifrost', label: 'Bifrost' },
];

export const databaseOptions = [
    { value: 'mysql-operator', label: 'MySQL Operator' },
    { value: 'aws-rds', label: 'AWS RDS MySQL' },
    { value: 'aws-rds-postgres', label: 'AWS RDS PostgreSQL' },
    { value: 'aws-multitenant-rds-mysql', label: 'AWS Multitenant RDS MySQL' },
    { value: 'aws-multitenant-rds-postgres', label: 'AWS Multitenant RDS PostgreSQL' },
    { value: 'aws-multitenant-rds-postgres-pgbouncer', label: 'AWS Multitenant RDS PostgreSQL PGBouncer' },
    { value: 'perseus', label: 'Perseus' },
    { value: 'external', label: 'External' },
];