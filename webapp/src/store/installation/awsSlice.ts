import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchAWSPotentialARNs, createEKSCluster as createCluster, getEKSCluster as getCluster, fetchEKSNodeGroups, createEKSNodeGroup, fetchEKSKubeConfig, fetchEKSClusters } from "../../client/client";
import { RootState } from "..";
import { Cluster, CreateClusterRequest, CreateNodegroup, Nodegroup } from "../../types/Cluster";

export interface AWSState {
    status: 'idle' | 'loading' | 'failed' | 'succeeded';
    arnFetchStatus: 'idle' | 'loading' | 'failed' | 'succeeded';
    createNodeGroupRequestState: 'idle' | 'loading' | 'failed' | 'succeeded';
    fetchKubeConfigStatus: 'idle' | 'loading' | 'failed' | 'succeeded';
    potentialClustersFetchStatus: 'idle' | 'loading' | 'failed' | 'succeeded';
    error?: string | undefined;
    kubernetesOption: string;
    region: string;
    clusterName: string;
    selectedARN: string;
    kubernetesVersion: string;
    possibleARNs?: string[];
    possibleEKSClusters?: string[];
    securityGroupIds?: string[];
    subnetIds?: string[];
    eksCluster?: Cluster;
    nodeGroups?: Nodegroup[];
    createNodeGroup: CreateNodegroup; 
    kubeconfig: string;
}

const initialState: AWSState = {
    status: 'idle',
    arnFetchStatus: 'idle',
    createNodeGroupRequestState: 'idle',
    fetchKubeConfigStatus: 'idle',
    potentialClustersFetchStatus: 'idle',
    kubernetesOption: '',
    region: '',
    selectedARN: '',
    possibleARNs: [],
    clusterName: '',
    kubernetesVersion: '',
    securityGroupIds: [],
    subnetIds: [],
    createNodeGroup: {

    } as CreateNodegroup,
    kubeconfig: '',
}

export const fetchPossibleARN = createAsyncThunk("aws/fetchPossibleARN", async () => {
    const response = await fetchAWSPotentialARNs()
    return response;
})

export const createEKSCluster = createAsyncThunk("aws/createEKSCluster", async (createEKSClusterRequest: CreateClusterRequest) => {
    const response = await createCluster(createEKSClusterRequest);
    return response;
});

export const getEKSCluster = createAsyncThunk("aws/getEKSCluster", async (clusterName: string) => {
    const response = await getCluster(clusterName);
    return response;
});

export const getEKSNodeGroups = createAsyncThunk("aws/getEKSNodeGroups", async (clusterName: string) => {
    if (clusterName === '' || clusterName === undefined) {
        return [];
    }
    const response = await fetchEKSNodeGroups(clusterName);
    return response;
});

export const createNodeGroup = createAsyncThunk("aws/createNodeGroup", async ({clusterName, createNodeGroup}: {clusterName:string, createNodeGroup: CreateNodegroup}) => {
    const response = await createEKSNodeGroup(clusterName, createNodeGroup);
    return response;
});

export const getKubeConfig = createAsyncThunk("aws/getKubeConfig", async (clusterName: string) => {
    if (clusterName === '' || clusterName === undefined) {
        return "";
    }
    const response = await fetchEKSKubeConfig(clusterName);
    return response;
});

export const getEKSClusters = createAsyncThunk("aws/getEKSClusters", async () => {
    const response = await fetchEKSClusters();
    return response;
});


export const awsSlice = createSlice({
    name: 'aws',
    initialState,
    reducers: {
        setRegion: (state, action) => {
            state.region = action.payload
        },
        setKubernetesOption: (state, action) => {
            state.kubernetesOption = action.payload
        },
        setSelectedARN: (state, action) => {
            state.selectedARN = action.payload
        },
        setPossibleARN: (state, action) => {
            state.possibleARNs = action.payload
        },
        setEksClusterName: (state, action) => {
            state.clusterName = action.payload
        },
        setKubernetesVersion: (state, action) => {
            state.kubernetesVersion = action.payload
        },
        setSecurityGroupIds: (state, action) => {
            state.securityGroupIds = action.payload
        },
        setSubnetIds: (state, action) => {
            state.subnetIds = action.payload
        },
        setCreateNodeGroup: (state, action) => {
            state.createNodeGroup = action.payload
        },
        resetAWSState: (state) => {
            return initialState;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPossibleARN.pending, (state) => {
                state.arnFetchStatus = 'loading';
            })
            .addCase(fetchPossibleARN.fulfilled, (state, action) => {
                state.arnFetchStatus = 'succeeded';
                state.possibleARNs = action.payload;
            })
            .addCase(fetchPossibleARN.rejected, (state, action) => {
                state.arnFetchStatus = 'failed';
                state.error = action.error.message;
            });
        builder.addCase(createEKSCluster.pending, (state) => {
            state.status = 'loading';
        }).addCase(createEKSCluster.fulfilled, (state, action) => {
            state.status = 'succeeded';
            state.eksCluster = action.payload;
        }).addCase(createEKSCluster.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.error.message;
        });
        builder.addCase(getEKSCluster.pending, (state) => {
            state.status = 'loading';
        }).addCase(getEKSCluster.fulfilled, (state, action) => {
            state.status = 'succeeded';
            state.eksCluster = action.payload;
        }).addCase(getEKSCluster.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.error.message;
        });
        builder.addCase(getEKSNodeGroups.pending, (state) => {
            state.status = 'loading';
        }).addCase(getEKSNodeGroups.fulfilled, (state, action) => {
            state.status = 'succeeded';
            state.nodeGroups = action.payload;
        }).addCase(getEKSNodeGroups.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.error.message;
        });
        builder.addCase(createNodeGroup.pending, (state) => {
            state.createNodeGroupRequestState = 'loading';
        }).addCase(createNodeGroup.fulfilled, (state, action) => {
            state.createNodeGroupRequestState = 'succeeded';
            state.nodeGroups = [action.payload];
        }).addCase(createNodeGroup.rejected, (state, action) => {
            state.createNodeGroupRequestState = 'failed';
            state.error = action.error.message;
        });
        builder.addCase(getKubeConfig.pending, (state) => {
            state.fetchKubeConfigStatus = 'loading';
        }).addCase(getKubeConfig.fulfilled, (state, action) => {
            state.fetchKubeConfigStatus = 'succeeded';
            state.kubeconfig = action.payload;
        }).addCase(getKubeConfig.rejected, (state, action) => {
            state.fetchKubeConfigStatus = 'failed';
            state.error = action.error.message;
        });
        builder.addCase(getEKSClusters.pending, (state) => {
            state.potentialClustersFetchStatus = 'loading';
        }).addCase(getEKSClusters.fulfilled, (state, action) => {
            state.potentialClustersFetchStatus = 'succeeded';
            state.possibleEKSClusters = action.payload;
        }).addCase(getEKSClusters.rejected, (state, action) => {
            state.potentialClustersFetchStatus = 'failed';
            state.error = action.error.message;
        });
    }
})

export const awsFormComplete = (state: RootState) => {
    console.log(state.aws);
    return state.aws.region !== '' && state.aws.clusterName !== '' && state.aws.selectedARN !== '' && state.aws.kubernetesVersion !== '' && (state.aws.subnetIds && state.aws.subnetIds.length > 0);
}

export const getCreateEKSClusterRequest = (state: RootState) => {
    return {
        region: state.aws.region,
        clusterName: state.aws.clusterName,
        kubernetesVersion: state.aws.kubernetesVersion,
        securityGroupIds: state.aws.securityGroupIds,
        subnetIds: state.aws.subnetIds,
        roleArn: state.aws.selectedARN
    } as CreateClusterRequest;
}

export const createNodeGroupValid = (state: RootState) => {
    console.log(state.aws.createNodeGroup);
    return state.aws.createNodeGroup.nodeGroupName !== '' && state.aws.createNodeGroup.instanceType !== '' && state.aws.createNodeGroup.amiType !== '' && state.aws.createNodeGroup.releaseVersion !== '';
}


export const { setRegion, setKubernetesOption, setSelectedARN, setPossibleARN, setEksClusterName, setKubernetesVersion, setSecurityGroupIds, setSubnetIds, setCreateNodeGroup, resetAWSState } = awsSlice.actions;
export default awsSlice.reducer;