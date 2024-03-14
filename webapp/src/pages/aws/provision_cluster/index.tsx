import React, { useEffect, useState } from 'react';
import { Button, Chip, CircularProgress, Option, Select, Table } from '@mui/joy';

import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './provision_cluster.scss';
import { RootState } from '../../../store';
import { createNodeGroupValid, getEKSCluster, getEKSNodeGroups, setCreateNodeGroup, createNodeGroup as createEKSNodeGroup } from '../../../store/installation/awsSlice';
import NodeGroupCard from './node_group_card';
import NodeGroupCreationForm from './node_group_creation_form';
import { awsNodeGroupPresets } from '../../../types/bootstrapper';

export default function ProvisionClusterPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams,] = useSearchParams();
    const cluster = useSelector((state: RootState) => state.aws.eksCluster);
    const nodeGroups = useSelector((state: RootState) => state.aws.nodeGroups);
    const [countdown, setCountdown] = useState(11);
    const createNodeGroup = useSelector((state: RootState) => state.aws.createNodeGroup);
    const createNodeGroupButtonEnabled = useSelector(createNodeGroupValid);
    const createNodeGroupRequestState = useSelector((state: RootState) => state.aws.createNodeGroupRequestState);

    useEffect(() => {
        if (typeof cluster === 'undefined') {
            const clusterName = searchParams.get('clusterName');
            if (!clusterName) {
                navigate('/aws');
                return;
            }
            dispatch(getEKSCluster(clusterName) as any);
        } else {
            dispatch(getEKSNodeGroups(cluster?.Name as string) as any);
        }
    }, [])

    useEffect(() => {
        dispatch(setCreateNodeGroup({ ...createNodeGroup, clusterName: cluster?.Name as string }) as any);
        dispatch(getEKSNodeGroups(cluster?.Name as string) as any);
        handleCreateNodeGroupChange('clusterName', cluster?.Name as string);
    }, [cluster?.Name]);

    useEffect(() => {
        const status = cluster?.Status;
        if (status === 'ACTIVE' || status === 'DELETING' || status === 'FAILED') {
            // If the cluster status is one of the final states, stop the refresh.
            return;
        }

        // Update cluster information every 5 seconds
        const intervalId = setInterval(() => {
            dispatch((getEKSCluster(cluster?.Name as string)) as any);
            setCountdown(11); // Reset countdown on refresh
        }, 10000);

        // Countdown timer
        const countdownId = setInterval(() => {
            setCountdown(prevCountdown => prevCountdown - 1);
        }, 1000);

        // Cleanup on component unmount or status update
        return () => {
            clearInterval(intervalId);
            clearInterval(countdownId);
        };
    }, [dispatch, cluster?.Status]);

    useEffect(() => {
        if (!nodeGroups || nodeGroups?.length === 0) {
            return;
        }

        const nodeGroup = nodeGroups[0];
        if (nodeGroup.Status === 'ACTIVE' || nodeGroup.Status === 'FAILED') {
            // If the node group status is one of the final states, stop the refresh.
            return;
        }

        const intervalId = setInterval(() => {
            dispatch(getEKSNodeGroups(cluster?.Name as string) as any);
        }, 10000);

        return () => {
            clearInterval(intervalId);
        }
    }, [nodeGroups]);

    const cardTitle = () => {
        if (cluster?.Status === 'ACTIVE') {
            return <h3>{cluster?.Name} <Chip color="success">{cluster?.Status}</Chip></h3>;
        }
        if (cluster?.Status === 'DELETING') {
            return <h3>{cluster?.Name} <Chip color="danger">{cluster?.Status}</Chip></h3>;
        }
        if (cluster?.Status === 'FAILED') {
            return <h3>{cluster?.Name} <Chip color="danger">{cluster?.Status}</Chip></h3>;
        }
        return (<><CircularProgress size="sm" /><h3>{cluster?.Name} <Chip color="primary">{cluster?.Status}</Chip></h3></>);
    }

    const handleCreateNodeGroupChange = (key: string, value: string) => {
        dispatch(setCreateNodeGroup({ ...createNodeGroup, [key]: value }));
    }

    const handlePresetChange = (preset: string) => {
        dispatch(setCreateNodeGroup(awsNodeGroupPresets[preset]));
    }

    const handleSubmit = async () => {
        dispatch(createEKSNodeGroup({ clusterName: cluster?.Name as string, createNodeGroup }) as any)
    }

    console.log(!nodeGroups || nodeGroups?.length === 0);

    return (
        <div className="SetupPage">
            <div className="leftPanel">
                <h1 className="title">Provision Your Cluster</h1>
                <div className="description">
                    <p>Your cluster's been created, but for now it's just an empty shell. We need to provision the cluster with some cloud resources before we can get to deploying the Mattermost Operator. We provide some basic defaults on the right based on the number of users you expect to be in your Mattermost workspace, but make any adjustments that'll better fit your organization.</p>
                </div>
            </div>
            <div className="rightPanel">
                <div className="setup-card">
                    <div className="setup-card-content">
                        <div className="card-title">
                            {cardTitle()}
                        </div>
                        <div className="details">
                            {nodeGroups?.map((nodeGroup) => (
                                <NodeGroupCard
                                    key={nodeGroup.NodegroupName || ''}
                                    name={nodeGroup.NodegroupName || ''}
                                    instanceType={nodeGroup.InstanceTypes!.join(', ')}
                                    status={nodeGroup.Status!}
                                    nodeGroup={nodeGroup}
                                />
                            ))}
                            {nodeGroups && nodeGroups?.length > 0 &&
                                <div className="next-step">
                                    <Button disabled={nodeGroups[0].Status !== 'ACTIVE'} onClick={() => navigate(`/cluster/summary?clusterName=${cluster?.Name}&type=eks`)} size="lg" color="primary">Next Step</Button>
                                </div>}
                            {(!nodeGroups || !nodeGroups?.length) && <>
                                <label>Node Groups</label>
                                <p>Select a preset based on the number of users you'll have on Mattermost. If you're between user counts, it's best to size-up.</p>
                                <Select onChange={(event, newValue) => handlePresetChange(newValue as string)} size="sm" placeholder="Node Group Preset">
                                    <Option value="10users">1-10 Users</Option>
                                    <Option value="100users">11-100 Users</Option>
                                    <Option value="1000users">101-1000 Users</Option>
                                    <Option value="5000users">1001-5000 Users</Option>
                                    <Option value="10000users">5001-10000 Users</Option>
                                    <Option value="25000users">10000-25000+ Users</Option>
                                    <Option value="custom">Custom</Option>
                                </Select>
                                <NodeGroupCreationForm handleSubmit={handleSubmit} createNodeGroupButtonEnabled={createNodeGroupButtonEnabled} />
                            </>
                            }

                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
