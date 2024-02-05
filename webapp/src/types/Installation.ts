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


export function isEnvVarMap(obj: any): obj is EnvVarMap {
    if (obj && typeof obj === 'object') {
        return Object.values(obj).every(
            (value) => typeof value === 'object' && ('value' in value! || value === null)
        );
    }

    return false;
}

export type AllowedIPRange = {
    CIDRBlock: string;
    Description: string;
    Enabled: boolean;
    OwnerID?: string;
};

export const filestoreOptions = [
    'aws-s3',
    'minio',
    'aws-multitenant-s3',
    'bifrost',
];

export const databaseOptions = [
    'mysql-operator',
    'aws-rds',
    'aws-rds-postgres',
    'aws-multitenant-rds-mysql',
    'aws-multitenant-rds-postgres',
    'aws-multitenant-rds-postgres-pgbouncer',
    'perseus',
    'external',
];



export interface PatchInstallationRequest {
    OwnerID?: string;
    Image?: string;
    Version?: string;
    Size?: string;
    License?: string;
    AllowedIPRanges?: AllowedIPRange[]; // Assuming AllowedIPRanges type definition exists
    OverrideIPRanges?: boolean;
    PriorityEnv: EnvVar;
    MattermostEnv: EnvVar;
};

export const patchInstallationJSONSchema = {
    type: 'object',
    properties: {
        OwnerID: { type: 'string', title: 'Owner ID' },
        Image: { type: 'string', title: 'Image' },
        Version: { type: 'string', title: 'Version' },
        Size: { type: 'string', title: 'Size' },
        License: { type: 'string', title: 'License' },
        OverrideIPRanges: { type: 'boolean', title: 'Override IP Ranges' },
        // PriorityEnv: {
        //     type: "object",
        //     additionalProperties: {
        //         type: "string",
        //     }
        // },
        // MattermostEnv: {
        //     type: "object",
        //     additionalProperties: {
        //         type: "string",
        //     }
        // },
    },
};

export const patchInstallationUISchema = {
    OwnerID: {
        'ui:placeholder': 'Enter Owner ID',
    },
    Image: {
        'ui:placeholder': 'Enter Image URL',
    },
    Version: {
        'ui:placeholder': 'Enter Version',
    },
    Size: {
        'ui:placeholder': 'Enter Size',
    },
    License: {
        'ui:widget': 'textarea',
        'ui:placeholder': 'Enter License details',
    },
    AllowedIPRanges: {
        // Define UI settings for AllowedIPRanges if needed
    },
    OverrideIPRanges: {
        'ui:widget': 'checkbox',
    },
    // PriorityEnv: {
    //     // Define UI settings for PriorityEnv if needed
    //     "ui:widget": "textarea"
    // },
    // MattermostEnv: {
    //     // Define UI settings for MattermostEnv if needed
    //     "ui:widget": "textarea"
    // },
};
