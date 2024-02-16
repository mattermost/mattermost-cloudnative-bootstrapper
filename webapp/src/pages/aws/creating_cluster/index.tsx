import React, { useEffect, useState } from 'react';
import { Button, Chip, CircularProgress, Table } from '@mui/joy';

import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './creating_cluster.scss';
import { RootState } from '../../../store';
import { getEKSCluster } from '../../../store/installation/awsSlice';

export default function CreatingClusterLoadingScreen() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams,] = useSearchParams();
    const cluster = useSelector((state: RootState) => state.aws.eksCluster);
    const [countdown, setCountdown] = useState(11);

    useEffect(() => {
        if (typeof cluster === 'undefined') {
            const clusterName = searchParams.get('clusterName');
            if (!clusterName) {
                navigate('/aws');
                return;
            }
            dispatch(getEKSCluster(clusterName) as any);
        }
    }, [])

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

    // Helper function to format Date object or string to a readable format
    const formatDate = (date?: Date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString("en-US", {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    };

    const tableRow = (key: string, value: string) => (
        <tr>
            <td>{key}</td>
            <td>{value}</td>
        </tr>
    )

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

    return (
        <div className="SetupPage">
            <div className="leftPanel">
                <h1 className="title">EKS Cluster Creation in Progress</h1>
                <div className="description">
                    <p>The Mattermost Operator Bootstrapper has kicked off the creation of your EKS cluster. This can take a while, so sit tight. Once the cluster becomes stable, we'll let you know.</p>
                </div>
            </div>
            <div className="rightPanel">
                <div className="setup-card">
                    <div className="setup-card-content">
                        <div className="card-title">
                            {cardTitle()}
                        </div>
                        <div className="details">
                            <label>Details</label>
                            <Table>
                                <tbody>
                                    {tableRow('ARN', cluster?.Arn as string)}
                                    {tableRow('CreatedAt', formatDate(cluster?.CreatedAt as Date))}
                                    {tableRow('Endpoint', cluster?.Endpoint as string)}
                                    {tableRow('Version', cluster?.Version as string)}
                                    {tableRow('Role ARN', cluster?.RoleArn as string)}
                                </tbody>
                            </Table>
                        </div>
                        {(cluster?.Status === 'CREATING' || cluster?.Status === 'UPDATING') && <div className="refresh-countdown">
                            Refreshing cluster information in {countdown} seconds...
                            <Button onClick={() => { dispatch(getEKSCluster(cluster?.Name as string)  as any)}} size="sm" variant="plain">Refresh Now</Button>
                        </div>
                        }
                        {cluster?.Status === 'ACTIVE' &&
                            <>
                                <div className="success-message">Success! Your EKS cluster is ready to go.</div>
                                <Button size="lg" color="primary" onClick={() => { navigate('/aws/provision_cluster') }}>Provision Cluster</Button>
                            </>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
