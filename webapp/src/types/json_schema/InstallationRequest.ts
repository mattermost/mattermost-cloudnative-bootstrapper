import { UiSchema } from "@rjsf/utils";
import { databaseOptions, filestoreOptions } from "../Installation";

// Define the interface for your data structure
interface InstallationFormData {
    Name: string;
    OwnerID: string;
    GroupID: string;
    Version: string;
    Image: string;
    DNS: string;
    DNSNames: string[];
    License: string;
    Size: string;
    Affinity: string;
    Database: string;
    Filestore: string;
    APISecurityLock: boolean;
    DeletionLocked: boolean;
    MattermostEnv: { [key: string]: EnvVar };
    PriorityEnv: { [key: string]: EnvVar };
    Annotations: string[];
    GroupSelectionAnnotations: string[];
    SingleTenantDatabaseConfig: SingleTenantDatabaseRequest;
    ExternalDatabaseConfig: ExternalDatabaseRequest;
}

// Define the interface for SingleTenantDatabaseRequest
interface SingleTenantDatabaseRequest {
    PrimaryInstanceType: string;
    ReplicaInstanceType: string;
    ReplicasCount: number;
}

// Define the interface for ExternalDatabaseRequest
interface ExternalDatabaseRequest {
    SecretName: string;
}

// Define the interface for EnvVar
interface EnvVar {
    // Define properties for EnvVar
}

export const createInstallationSchema = {
    type: 'object',
    properties: {
        Name: { type: 'string' },
        OwnerID: { type: 'string' },
        // DNS: { type: 'string' },
        DNSNames: {
            type: 'array',
            items: { type: 'string' },
        },
        Database: { 
            type: 'string',
            enum: databaseOptions,
        },
        Filestore: { 
            type: 'string',
            enum: filestoreOptions,
        },
        GroupID: { type: 'string' },
        Version: { type: 'string' },
        Image: { type: 'string' },
        License: { type: 'string' },
        Size: { type: 'string' },
        Affinity: { type: 'string' },
        APISecurityLock: { type: 'boolean' },
        DeletionLocked: { type: 'boolean' },
        // MattermostEnv: {
        //     type: 'object',
        //     additionalProperties: {
        //         type: 'object', // Assuming EnvVarMap is an object with objects as values
        //         properties: {
        //             // Define properties for EnvVar if applicable
        //         },
        //     },
        // },
        // PriorityEnv: {
        //     type: 'object',
        //     additionalProperties: {
        //         type: 'object', // Assuming EnvVarMap is an object with objects as values
        //         properties: {
        //             // Define properties for EnvVar if applicable
        //         },
        //     },
        // },
        Annotations: {
            type: 'array',
            items: { type: 'string' },
        },
        GroupSelectionAnnotations: {
            type: 'array',
            items: { type: 'string' },
        },
        // SingleTenantDatabaseConfig: {
        //     type: 'object',
        //     properties: {
        //         PrimaryInstanceType: { type: 'string' },
        //         ReplicaInstanceType: { type: 'string' },
        //         ReplicasCount: { type: 'integer' },
        //     },
        // },
        // ExternalDatabaseConfig: {
        //     type: 'object',
        //     properties: {
        //         SecretName: { type: 'string' },
        //     },
        // },
    },
    required: ['Name', 'OwnerID', 'DNSNames', 'Filestore', 'Database'], // Specify required fields here
    // Add any additional validation or constraints as needed
};


export const createInstallationUISchema: UiSchema = {
    classNames: 'form-container',
    'ui:order': [
        'Name',
        'OwnerID',
        'DNSNames',
        'Database',
        'Filestore',
        'GroupID',
        'Version',
        'Image',
        'License',
        'Size',
        'Affinity',
        'APISecurityLock',
        'DeletionLocked',
        'MattermostEnv',
        'PriorityEnv',
        'Annotations',
        'GroupSelectionAnnotations',
        'SingleTenantDatabaseConfig',
        'ExternalDatabaseConfig',
    ],
    'ui:options': {
        label: false,
    },
    Name: {
        'ui:placeholder': 'Enter Name',
    },
    OwnerID: {
        'ui:placeholder': 'Enter Owner ID',
    },
    // Add similar configurations for other fields
    SingleTenantDatabaseConfig: {
        'ui:field': 'group',
        'ui:order': ['PrimaryInstanceType', 'ReplicaInstanceType', 'ReplicasCount'],
        PrimaryInstanceType: {
            'ui:placeholder': 'Enter Primary Instance Type',
        },
        ReplicaInstanceType: {
            'ui:placeholder': 'Enter Replica Instance Type',
        },
        ReplicasCount: {
            'ui:widget': 'updown',
            'ui:placeholder': 'Enter Replicas Count',
        },
    },
    ExternalDatabaseConfig: {
        'ui:field': 'group',
        SecretName: {
            'ui:placeholder': 'Enter Secret Name',
        },
    },
};

