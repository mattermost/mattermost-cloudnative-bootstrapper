
export interface CreateMattermostWorkspaceRequest {
    dbConnectionOption: string;
    filestoreOption: string;
    localFilestoreConfig?: LocalFileStore;
    localExternalFilestoreConfig?: LocalExternalFileStore;
    s3FilestoreConfig?: S3FileStore;
    ExistingDBConnection?: ExistingDBConnection;
    domainName: string;
    enterpriseLicense?: string;
    installationName: string;
}

export interface ExistingDBConnection {
    dbConnectionString: string;
    dbReplicasConnectionString: string;
}

export interface LocalFileStore {
    storageSize: string;
}

export interface LocalExternalFileStore {
    volumeClaimName: string;
}

export interface S3FileStore {
    url: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucketName: string
}

export interface PatchMattermostWorkspaceRequest {
    version: string;
    name: string;
    image: string;
    replicas: number;
    license: string;
    endpoint: string;
}

export interface Mattermost {
    kind: string;
    apiVersion: string;
    metadata: Metadata;
    spec: Spec;
    status: Status;
}

export interface Metadata {
    name: string;
    namespace: string;
    uid: string;
    resourceVersion: string;
    generation: number;
    creationTimestamp: string;
    managedFields: ManagedField[];
}

export interface ManagedField {
    manager: string;
    operation: string;
    apiVersion: string;
    time: string;
    fieldsType: string;
    fieldsV1?: FieldsV1; // Could be optional
}

export interface FieldsV1 {
}

export interface Spec {
    image: string;
    version: string;
    replicas: number;
    mattermostEnv: MattermostEnvItem[];
    licenseSecret: string;
    ingressName: string;
    ingress: Ingress;
    imagePullPolicy: string;
    database: Database;
    fileStore: FileStore;
    elasticSearch: Record<string, any>; // Assuming flexibility here
    scheduling: Scheduling;
    probes: Probes;
    podExtensions: Record<string, any>; // Assuming flexibility here
}

export interface MattermostEnvItem {
    name: string;
    value: string;
} 

export interface Ingress {
    enabled: boolean;
    host: string;
    annotations: Record<string, string>; 
    ingressClass: string;
}

export interface Database {
    external: ExternalConfig; 
}

export enum FilestoreType {
    InClusterExternal = 'InClusterExternal',
    InClusterLocal = 'InClusterLocal',
    ExistingS3 = 'ExistingS3',
    AWSS3 = 'AWSS3',
    Minio = 'Minio',
}

export interface FileStore {
    external: ExternalConfig; 
}

export interface ExternalConfig {
    url?: string;
    bucket?: string;
    secret: string;
}

export interface Scheduling {
    resources: Resources;
}

export interface Resources {
    limits: ResourceValues;
    requests: ResourceValues;
}

export interface ResourceValues {
    cpu: string;
    memory: string;
}

export interface Probes {
    livenessProbe: Record<string, any>; // Assuming flexibility here
    readinessProbe: Record<string, any>; // Assuming flexibility here
}

export interface Status {
    state: string;
    version: string;
    image: string;
    endpoint: string;
    replicas: number;
    updatedReplicas: number;
    observedGeneration: number;
}