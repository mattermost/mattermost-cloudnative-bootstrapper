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
