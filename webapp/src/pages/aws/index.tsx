import React, { useEffect } from 'react';
import { Button, CircularProgress, Input, Option, Select } from '@mui/joy';

import { useDispatch } from 'react-redux';

import { AWSRegions, SupportedKubernetesVersions } from '../../types/bootstrapper';
import { awsFormComplete, createEKSCluster, fetchPossibleARN, getCreateEKSClusterRequest, setEksClusterName, setKubernetesVersion, setRegion, setSecurityGroupIds, setSelectedARN, setSubnetIds } from '../../store/installation/awsSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import DynamicRows, { Row } from '../../components/common/subnet_entry';
import './aws_page.scss';
import { useNavigate } from 'react-router-dom';
import ARNSelector from '../../components/aws/arn_selector';

export default function AWSPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const formComplete = useSelector(awsFormComplete);
    const createEKSClusterRequestStatus = useSelector((state: RootState) => state.aws.status);
    const cluster = useSelector((state: RootState) => state.aws.eksCluster);
    const createEKSClusterRequest = useSelector(getCreateEKSClusterRequest);

    useEffect(() => {
        if (createEKSClusterRequestStatus === 'succeeded' && cluster?.Name !== undefined) {
            navigate(`/aws/creating_cluster?clusterName=${cluster.Name}`);
        }
    
    }, [createEKSClusterRequestStatus, cluster?.Name])

    const handleSubnetChanges = (rows: Row[]) => {
        let securityGroupIds: string[] = [];
        let subnetIds: string[] = [];

        rows.forEach(row => {
            if (row.value.startsWith('sg-')) {
                securityGroupIds.push(row.value);
            } else if (row.value !== '') {
                subnetIds.push(row.value);
            }
        });

        dispatch(setSubnetIds(subnetIds));
        dispatch(setSecurityGroupIds(securityGroupIds));
    };


    const handleCreateEKSClusterClick = () => {
        dispatch(createEKSCluster(createEKSClusterRequest) as any);
    }

    return (
        <div className="AWSPage">
            <div className="leftPanel">
                <h1 className="title">Mattermost Operator via EKS</h1>
                <div className="description">
                    <p>Before we can deploy the Mattermost Operator we'll need to get an EKS cluster up and running. Complete the form to the right and we'll handle the rest.</p>
                </div>
            </div>
            <div className="rightPanel">
                <div className="setup-card">
                    <div className="setup-card-content">
                        <div className="card-title">
                            <h3>Create an EKS Cluster</h3>
                        </div>
                        <div className="inputs">
                            <label>AWS Region</label>
                            <Select onChange={(event, newValue) => { dispatch(setRegion(newValue)) }} size="sm" placeholder="AWS Region">
                                {Object.values(AWSRegions).map(region => (
                                    <Option value={region}>{region}</Option>
                                ))}
                            </Select>
                            <label>Cluster Name</label>
                            <Input size="sm" placeholder="Cluster Name" onChange={(event) => { dispatch(setEksClusterName(event.target.value)) }} />
                            <label>Kubernetes Version</label>
                            <Select onChange={(event, newValue) => { dispatch(setKubernetesVersion(newValue)) }} size="sm" placeholder="Kubernetes Version">
                                {Object.values(SupportedKubernetesVersions).map(version => (
                                    <Option value={version}>{version}</Option>
                                ))}
                            </Select>
                            <ARNSelector onChange={(value) => dispatch(setSelectedARN(value))} />
                            <label>Resources VPC Configuration</label>
                            <DynamicRows onChange={handleSubnetChanges} />
                            {formComplete && createEKSClusterRequestStatus !== 'loading' && <Button size="lg" color="primary" onClick={handleCreateEKSClusterClick}>Create</Button>}
                            {createEKSClusterRequestStatus === 'loading' && <CircularProgress />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}