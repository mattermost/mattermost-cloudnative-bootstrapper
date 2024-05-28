export type Cluster = {
	ClientRequestToken?: string;
	CreatedAt?: Date;
	Endpoint?: string;
	Id?: string;
	Name?: string;
	PlatformVersion?: string;
	RoleArn?: string;
	Status?: ClusterStatus; 
	Tags?: { [key: string]: string };
	Version?: string;
    Arn?: string;
};

export type CreateClusterRequest = {
    region: string;
    clusterName: string;
    kubernetesVersion: string;
    securityGroupIds: string[];
    subnetIds: string[];
    roleArn: string;
}

export type Nodegroup = {
    AmiType?: string;
    ClusterName?: string;
    CreationRoleArn?: string;
    InstanceTypes?: string[];
    Labels?: { [key: string]: string };
    NodegroupName?: string;
    ReleaseVersion?: string;
    RemoteAccess?: { [key: string]: string };
    ScalingConfig?: { [key: string]: string };
    Status?: string;
    Tags?: { [key: string]: string };
    UpdatedAt?: Date;
    subnetIds: string[];
    NodeRole: string;
}

export type CreateNodegroup = {
    preset: string;
    nodeGroupName: string;
    instanceType: string;
    scalingConfig: { minSize: number, maxSize: number };
    amiType: string;
    releaseVersion: string;
    labels: { [key: string]: string };
    tags: { [key: string]: string };
    roleARN?: string;
    subnetIds?: string[];
}

export type ClusterStatus = "CREATING" | "ACTIVE" | "DELETING" | "FAILED" | "UPDATING";


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