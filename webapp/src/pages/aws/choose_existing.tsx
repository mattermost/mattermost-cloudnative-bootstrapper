import React, { useEffect } from 'react';
import { Button, Option, Select } from '@mui/joy';

import { useDispatch } from 'react-redux';

import { AWSRegions } from '../../types/bootstrapper';
import { getEKSCluster, getEKSClusters, setEksClusterName,  setRegion } from '../../store/installation/awsSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import './aws_page.scss';
import { useNavigate } from 'react-router-dom';
import ClusterSelectDropdown from './cluster_select_dropdown';
import ConnectedLoadingSpinner from '../../components/common/connected_loading_spinner';

export default function ExistingAWSPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const clusterName = useSelector((state: RootState) => state.aws.clusterName);
    const possibleEKSClusters = useSelector((state: RootState) => state.aws.possibleEKSClusters);
    const fetchEKSClusterStatus = useSelector((state: RootState) => state.aws.status);

    const region = useSelector((state: RootState) => state.aws.region);

    useEffect(() => {
        dispatch(getEKSClusters() as any);
    }, [region])

    useEffect(() => {
        if (clusterName !== '') {
            dispatch(getEKSCluster(clusterName) as any);
        }
    }, [clusterName])

    return (
        <div className="AWSPage">
            <div className="leftPanel">
                <h1 className="title">Mattermost Operator via EKS</h1>
                <div className="description">
                    <p>Before we can deploy the Mattermost Operator we'll need to connect to an existing EKS Cluster.</p>
                </div>
            </div>
            <div className="rightPanel">
                <div className="setup-card">
                    <div className="setup-card-content">
                        <div className="card-title">
                            <h3>Choose Existing Cluster</h3>
                        </div>
                        <div className="inputs">
                            <label>AWS Region</label>
                            <Select onChange={(event, newValue) => { dispatch(setRegion(newValue)) }} size="sm" placeholder="AWS Region">
                                {Object.values(AWSRegions).map(region => (
                                    <Option value={region}>{region}</Option>
                                ))}
                            </Select>
                            <ClusterSelectDropdown onChange={(newValue) => {dispatch(setEksClusterName(newValue) as any)}} clusters={possibleEKSClusters || []}/>
                            <ConnectedLoadingSpinner state={fetchEKSClusterStatus} />
                            <div className="button-row">
                                <Button  size="md" color="primary" variant="plain" onClick={() => {navigate(`/aws/new`)}}>Create New Instead</Button>
                                {clusterName && <Button size="lg" color="primary" onClick={() => {navigate(`/cluster/summary?clusterName=${clusterName}`)}}>Next Step</Button>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}