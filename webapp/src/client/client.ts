import { CreateMattermostWorkspaceRequest } from "../types/Installation";
import { CloudCredentials, CreateAWSNodeGroup, CreateEKSClusterRequest } from "../types/bootstrapper";

export const baseUrl = process.env.NODE_ENV == 'development' ? 'http://localhost:3000' : 'http://localhost:8070';

export async function getInstallationByID(id: string) {
    const response = await fetch(`${baseUrl}/api/v1/installation/${id}`);
    const data = await response.json();
    return data;
}

export async function deleteInstallation(id: string) {
    const response = await fetch(`${baseUrl}/api/v1/installation/${id}`, {
        method: 'DELETE'
    });
    const data = await response.json();
    return data;
}


export async function setAndCheckCloudCredentials(credentials: CloudCredentials, provider: string) {
    const response = await fetch(`${baseUrl}/api/v1/${provider}/set_credentials`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
    });
    const data = await response.json();
    return data;
}

export async function fetchAWSPotentialARNs() {
    const response = await fetch(`${baseUrl}/api/v1/aws/roles`);
    const data = await response.json();
    return data;
}

export async function createEKSCluster(createEKSClusterRequest: CreateEKSClusterRequest) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(createEKSClusterRequest)
    });
    const data = await response.json();
    return data;
}

export async function getEKSCluster(clusterName: string) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster/${clusterName}`);
    const data = await response.json();
    return data;
}

export async function fetchEKSClusters() {
    const response = await fetch(`${baseUrl}/api/v1/aws/clusters`);
    const data = await response.json();
    return data;
}

export async function fetchEKSNodeGroups(clusterName: string) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster/${clusterName}/nodegroups`);
    const data = await response.json();
    return data;
}

export async function fetchEKSKubeConfig(clusterName: string) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster/${clusterName}/kubeconfig`);
    const data = await response.text();
    return data;
}

export async function createEKSNodeGroup(clusterName: string, createNodeGroup: CreateAWSNodeGroup) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster/${clusterName}/nodegroups`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(createNodeGroup)
    });
    const data = await response.json();
    return data;
}


export async function deployMattermostOperator(clusterName: string) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster/${clusterName}/deploy_mattermost_operator`, {
        method: 'POST',
    });
    const data = await response.json();
    return data;
}

export async function deployCloudNativePG(clusterName: string) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster/${clusterName}/deploy_pg_operator`, {
        method: 'POST',
    });
    const data = await response.json();
    return data;

}

export async function deployNginxOperator(clusterName: string) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster/${clusterName}/deploy_nginx_operator`, {
        method: 'POST',
    });
    const data = await response.json();
    return data;
}

export async function fetchEKSNamespaces(clusterName: string) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster/${clusterName}/namespaces`);
    const data = await response.json();
    return data;
}

export async function fetchInstalledHelmReleases(clusterName: string) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster/${clusterName}/installed_charts`);
    const data = await response.json();
    return data;
}


export async function doCreateMattermostWorkspace(clusterName: string, installation: CreateMattermostWorkspaceRequest) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster/${clusterName}/installation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(installation)
    });
    const data = await response.json();
    return data;
}

export async function doFetchMattermostInstallationsForCluster(clusterName: string) {
    const response = await fetch(`${baseUrl}/api/v1/aws/cluster/${clusterName}/installations`);
    const data = await response.json();
    return data;
}