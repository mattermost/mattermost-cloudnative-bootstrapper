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
import { useGetClusterQuery, useGetPossibleClustersQuery, useSetRegionMutation } from '../../client/bootstrapperApi';
import RTKConnectedLoadingSpinner from '../../components/common/rtk_connected_loading_spinner';

export default function ExistingAWSPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const cloudProvider = useMatch('/:cloudProvider/existing')?.params.cloudProvider!;
    const [updateRegion,] = useSetRegionMutation();

    const clusterName = useSelector((state: RootState) => state.aws.clusterName);
    const region = useSelector((state: RootState) => state.aws.region);

    const {data: possibleClusters, isLoading, isError, isSuccess} = useGetPossibleClustersQuery({cloudProvider, region}, {
        skip: cloudProvider === '' || (cloudProvider !== 'custom' && !region),
    });

    const {isLoading: clusterLoading, isError: clusterError, isSuccess: clusterSuccess} = useGetClusterQuery({cloudProvider, clusterName}, {
        skip: clusterName === '',
    });


    const onClickContinue = () => {
        if (cloudProvider !== 'custom' && !region) {
            updateRegion({region, cloudProvider});
        }
        navigate(`/${cloudProvider}/cluster/summary?clusterName=${clusterName}`);
    }

    const getTitle = () => {
        switch (cloudProvider) {
            case 'aws':
                return 'Mattermost Operator via EKS';
            case 'gcp':
                return 'Mattermost Operator via GKE';
            default:
                return 'Mattermost Operator via Kubernetes ';
        }
    }

    return (
        <div className="AWSPage">
            <div className="leftPanel">
                <h1 className="title">{getTitle()}</h1>
                <div className="description">
                    <p>Before we can deploy the Mattermost Operator we&apos;ll need to connect to an existing Cluster.</p>
                </div>
            </div>
            <div className="rightPanel">
                <div className="setup-card">
                    <div className="setup-card-content">
                        <div className="card-title">
                            <h3>Choose Existing Cluster</h3>
                        </div>
                        <div className="inputs">
                            {cloudProvider !== 'custom' &&
                                <>
                                    <label>AWS Region</label>
                                    <Select onChange={(event, newValue) => { dispatch(setRegion(newValue)) }} size="sm" placeholder="AWS Region">
                                        {Object.values(AWSRegions).map(region => (
                                            <Option key={region} value={region}>{region}</Option>
                                        ))}
                                    </Select>
                                </>
                            }
                            <ClusterSelectDropdown onChange={(newValue) => { dispatch(setEksClusterName(newValue) as any) }} clusters={possibleClusters || []} />
                            <RTKConnectedLoadingSpinner isError={isError || clusterError || (isSuccess && !possibleClusters.length)} isErrorText={(isSuccess && !possibleClusters.length) ? 'No clusters found. Try another region?' : undefined} isSuccess={isSuccess && clusterSuccess} isLoading={isLoading || clusterLoading} />
                            <div className="button-row">
                                {/* TODO: Uncomment when we fully support creating new <Button  size="md" color="primary" variant="plain" onClick={() => {navigate(`/aws/new`)}}>Create New Instead</Button> */}
                                {clusterName && <Button size="lg" color="primary" onClick={onClickContinue}>Next Step</Button>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}