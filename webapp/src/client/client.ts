import { CreateInstallationRequest, PatchInstallationRequest } from "../types/Installation";
import { CloudCredentials, CreateAWSNodeGroup, CreateEKSClusterRequest } from "../types/bootstrapper";

export  async function getInstallations(page: number, per_page: number)  {
    const response = await fetch(`http://localhost:3000/api/v1/installations/list?page=${page}&per_page=${per_page}&include_deleted=true`);
    const data = await response.json();
    return data;
}

export async function getClusters(page:number, per_page: number) {
    const response = await fetch(`http://localhost:3000/api/v1/clusters/list?page=${page}&per_page=${per_page}`);
    const data = await response.json();
    return data;
}

export async function createInstallation(installation: CreateInstallationRequest) {
    const response = await fetch(`http://localhost:3000/api/v1/installation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(installation)
    });
    const data = await response.json();
    return data;
}

export async function patchInstallation(id: string, installation: PatchInstallationRequest) {
    const response = await fetch(`http://localhost:3000/api/v1/installation/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(installation)
    });
    const data = await response.json();
    return data;
}

export async function getInstallationByID(id: string) {
    const response = await fetch(`http://localhost:3000/api/v1/installation/${id}`);
    const data = await response.json();
    return data;
}

export async function deleteInstallation(id: string) {
    const response = await fetch(`http://localhost:3000/api/v1/installation/${id}`, {
        method: 'DELETE'
    });
    const data = await response.json();
    return data;
}


export async function setAndCheckCloudCredentials(credentials: CloudCredentials, provider: string) {
    const response = await fetch(`http://localhost:3000/api/v1/${provider}/set_credentials`, {
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
    const response = await fetch(`http://localhost:3000/api/v1/aws/eks_roles`);
    const data = await response.json();
    return data;
}

export async function createEKSCluster(createEKSClusterRequest: CreateEKSClusterRequest) {
    const response = await fetch(`http://localhost:3000/api/v1/aws/eks_create`, {
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
    const response = await fetch(`http://localhost:3000/api/v1/aws/cluster/${clusterName}`);
    const data = await response.json();
    return data;
}

export async function fetchEKSNodeGroups(clusterName: string) {
    const response = await fetch(`http://localhost:3000/api/v1/aws/cluster/${clusterName}/nodegroups`);
    const data = await response.json();
    return data;
}

export async function fetchEKSKubeConfig(clusterName: string) {
    const response = await fetch(`http://localhost:3000/api/v1/aws/cluster/${clusterName}/kubeconfig`);
    const data = await response.text();
    return data;
}

export async function createEKSNodeGroup(clusterName: string, createNodeGroup: CreateAWSNodeGroup) {
    const response = await fetch(`http://localhost:3000/api/v1/aws/cluster/${clusterName}/nodegroups`, {
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
    const response = await fetch(`http://localhost:3000/api/v1/aws/cluster/${clusterName}/deploy_mattermost_operator`, {
        method: 'POST',
    });
    const data = await response.json();
    return data;
}

export async function deployNginxOperator(clusterName: string) {
    const response = await fetch(`http://localhost:3000/api/v1/aws/cluster/${clusterName}/deploy_nginx_operator`, {
        method: 'POST',
    });
    const data = await response.json();
    return data;
}

export async function fetchEKSNamespaces(clusterName: string) {
    const response = await fetch(`http://localhost:3000/api/v1/aws/cluster/${clusterName}/namespaces`);
    const data = await response.json();
    return data;
}
