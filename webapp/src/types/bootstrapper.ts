import { CreateNodegroup } from "./Cluster";


export type State = {
    credentials: CloudCredentials;
    provider: string;
    clusterName: string;
}

export type CloudCredentials = {
    accessKeyId: string;
    accessKeySecret: string;
    region: string;
    kubeconfig: string;
    kubeconfigType: string;
}

export type Release = {
    Name: string;
    Version: number;
    Namespace: string;
    Status: string;
};

export enum AWSRegions {
    US_EAST_2 = 'us-east-2',
    US_EAST_1 = 'us-east-1',
    US_WEST_1 = 'us-west-1',
    US_WEST_2 = 'us-west-2',
    AF_SOUTH_1 = 'af-south-1',
    AP_EAST_1 = 'ap-east-1',
    AP_SOUTH_1 = 'ap-south-1',
    AP_SOUTHEAST_3 = 'ap-southeast-3',
    AP_SOUTHEAST_4 = 'ap-southeast-4',
    AP_SOUTHEAST_2 = 'ap-southeast-2',
    AP_NORTHEAST_3 = 'ap-northeast-3',
    AP_NORTHEAST_2 = 'ap-northeast-2',
    AP_SOUTHEAST_1 = 'ap-southeast-1',
    AP_NORTHEAST_1 = 'ap-northeast-1',
    CA_CENTRAL_1 = 'ca-central-1',
    CA_WEST_1 = 'ca-west-1',
    EU_CENTRAL_1 = 'eu-central-1',
    EU_WEST_1 = 'eu-west-1',
    EU_WEST_2 = 'eu-west-2',
    EU_SOUTH_1 = 'eu-south-1',
    EU_WEST_3 = 'eu-west-3',
    EU_SOUTH_2 = 'eu-south-2',
    EU_NORTH_1 = 'eu-north-1',
    EU_CENTRAL_2 = 'eu-central-2',
    IL_CENTRAL_1 = 'il-central-1',
    ME_SOUTH_1 = 'me-south-1',
    ME_CENTRAL_1 = 'me-central-1',
    SA_EAST_1 = 'sa-east-1',
    US_GOV_EAST_1 = 'us-gov-east-1',
    US_GOV_WEST_1 = 'us-gov-west-1'
};

export enum SupportedKubernetesVersions {
    V1_29 = '1.29',
    V1_28 = '1.28',
    V1_27 = '1.27',
    V1_26 = '1.26',
};

type AWSNodeGroupPresets = {
    [presetName: string]: CreateNodegroup;
};

export const awsNodeGroupPresets: AWSNodeGroupPresets = {
    "custom": {
        preset: "custom",
        nodeGroupName: "",
        instanceType: "",
        scalingConfig: { minSize: 1, maxSize: 2 },
        amiType: "",
        releaseVersion: "",
        labels: {},
        tags: {}
    },
    "10users": {
        preset: "10users",
        nodeGroupName: "",
        instanceType: "t3.micro",
        scalingConfig: { minSize: 2, maxSize: 2 },
        amiType: "AL2_x86_64",
        releaseVersion: "1.21",
        labels: {},
        tags: {}
    },
    "100users": {
        preset: "100users",
        nodeGroupName: "",
        instanceType: "t3.small",
        scalingConfig: { minSize: 2, maxSize: 2 },
        amiType: "AL2_x86_64",
        releaseVersion: "1.21",
        labels: {},
        tags: {}
    },
    "1000users": {
        preset: "1000users",
        nodeGroupName: "",
        instanceType: "t3.medium",
        scalingConfig: { minSize: 2, maxSize: 5 },
        amiType: "AL2_x86_64",
        releaseVersion: "1.21",
        labels: {},
        tags: {}
    },
    "5000users": {
        preset: "5000users",
        nodeGroupName: "",
        instanceType: "t3.large",
        scalingConfig: { minSize: 3, maxSize: 10 },
        amiType: "AL2_x86_64",
        releaseVersion: "1.21",
        labels: {},
        tags: {}
    },
    "10000users": {
        preset: "10000users",
        nodeGroupName: "",
        instanceType: "t3.Xlarge",
        scalingConfig: { minSize: 4, maxSize: 15 },
        amiType: "AL2_x86_64",
        releaseVersion: "1.21",
        labels: {},
        tags: {}
    },
    "25000users": {
        preset: "25000users",
        nodeGroupName: "",
        instanceType: "t3.2xlarge",
        scalingConfig: { minSize: 5, maxSize: 25 },
        amiType: "AL2_x86_64",
        releaseVersion: "1.21",
        labels: {},
        tags: {}
    }
};


interface ManagedField {
    manager: string;
    operation: string;
    apiVersion: string;
    time: string;
    fieldsType: string;
    fieldsV1: FieldsV1;
}

interface FieldsV1 {
    "f:metadata": {
        "f:labels": {
            ".": any;
            "f:kubernetes.io/metadata.name": any;
            "f:name": any;
        }
    }
}

interface Labels {
    "kubernetes.io/metadata.name": string;
    name: string;
}

interface Metadata {
    name: string;
    uid: string;
    resourceVersion: string;
    creationTimestamp: string;
    labels: Labels;
    managedFields: ManagedField[];
}

interface Spec {
    finalizers: string[];
}

interface Status {
    phase: string;
}

export interface Namespace {
    metadata: Metadata;
    spec: Spec;
    status: Status;
}