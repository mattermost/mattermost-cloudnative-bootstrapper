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
};

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