import { CreateInstallationRequest } from "../types/Installation";

export  async function getInstallations(page: number, per_page: number)  {
    const response = await fetch(`http://localhost:3000/api/v1/installations/list?page=${page}&per_page=${per_page}`);
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