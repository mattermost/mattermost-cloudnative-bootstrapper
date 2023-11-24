export type Cluster = {
    ID: string;
    State: string;
    Provider: string;
    ProviderMetadataAWS?: AWSMetadata;
    Provisioner: string;
    ProvisionerMetadataKops?: KopsMetadata;
    ProvisionerMetadataEKS?: EKSMetadata;
    // UtilityMetadata?: UtilityMetadata;
    AllowInstallations: boolean;
    CreateAt: number;
    DeleteAt: number;
    APISecurityLock: boolean;
    LockAcquiredBy?: string | null;
    LockAcquiredAt: number;
    Networking: string;
};


export type AWSMetadata = {
    Zones: string[];
};


type KopsMetadata = {
    Name: string;
    Version: string;
    AMI: string;
    MasterInstanceType: string;
    MasterCount: number;
    NodeInstanceType: string;
    NodeMinCount: number;
    NodeMaxCount: number;
    MaxPodsPerNode: number;
    VPC: string;
    Networking: string;
    KmsKeyId: string;
    // MasterInstanceGroups: KopsInstanceGroupsMetadata;
    // NodeInstanceGroups: KopsInstanceGroupsMetadata;
    // CustomInstanceGroups?: KopsInstanceGroupsMetadata;
    // ChangeRequest?: KopsMetadataRequestedState;
    // RotatorRequest?: RotatorMetadata;
    Warnings?: string[];
};


type EKSMetadata = {
    Name: string;
    Version: string;
    AMI: string;
    VPC: string;
    Networking: string;
    ClusterRoleARN: string;
    NodeRoleARN: string;
    MaxPodsPerNode: number;
    // NodeGroups: { [key: string]: NodeGroupMetadata };
    // ChangeRequest?: EKSMetadataRequestedState;
    Warnings?: string[];
};


//   type UtilityMetadata = {
//     DesiredVersions: UtilityGroupVersions;
//     ActualVersions: UtilityGroupVersions;
//   };