import React from 'react';
import { Button, Option, Select } from '@mui/joy';

import { useDispatch } from 'react-redux';

import { AWSRegions } from '../../types/bootstrapper';
import { setEksClusterName,  setRegion } from '../../store/installation/awsSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import './aws_page.scss';
import { useMatch, useNavigate } from 'react-router-dom';
import ClusterSelectDropdown from './cluster_select_dropdown';
import { useGetClusterQuery, useGetPossibleClustersQuery } from '../../client/bootstrapperApi';
import RTKConnectedLoadingSpinner from '../../components/common/rtk_connected_loading_spinner';

export default function ExistingAWSPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const cloudProvider = useMatch('/:cloudProvider/existing')?.params.cloudProvider!;

    const clusterName = useSelector((state: RootState) => state.aws.clusterName);
    const region = useSelector((state: RootState) => state.aws.region);

    const {data: possibleClusters, isLoading, isError, isSuccess} = useGetPossibleClustersQuery({cloudProvider, region}, {
        skip: cloudProvider === '' || !region,
    });

    const {isLoading: clusterLoading, isError: clusterError, isSuccess: clusterSuccess} = useGetClusterQuery({cloudProvider, clusterName}, {
        skip: clusterName === '',
    });

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
                            <ClusterSelectDropdown onChange={(newValue) => {dispatch(setEksClusterName(newValue) as any)}} clusters={possibleClusters || []}/>
                            <RTKConnectedLoadingSpinner isError={isError || clusterError} isSuccess={isSuccess && clusterSuccess} isLoading={isLoading || clusterLoading} />
                            <div className="button-row">
                                <Button  size="md" color="primary" variant="plain" onClick={() => {navigate(`/aws/new`)}}>Create New Instead</Button>
                                {clusterName && <Button size="lg" color="primary" onClick={() => {navigate(`${cloudProvider}/cluster/summary?clusterName=${clusterName}`)}}>Next Step</Button>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}