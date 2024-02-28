import React, { useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './cluster_summary.scss';
import { RootState } from '../../store';
import { getEKSCluster, getEKSNodeGroups, getKubeConfig } from '../../store/installation/awsSlice';
import { Accordion, AccordionDetails, AccordionSummary, Button, Table, Typography } from '@mui/joy';
import { CheckOutlined } from '@mui/icons-material';


export default function ClusterSummaryPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams,] = useSearchParams();
    const cluster = useSelector((state: RootState) => state.aws.eksCluster);
    const nodeGroups = useSelector((state: RootState) => state.aws.nodeGroups);
    const kubeconfig = useSelector((state: RootState) => state.aws.kubeconfig);
    const [copiedToClipboard, setCopiedToClipboard] = useState(false);

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
            dispatch(getKubeConfig(cluster?.Name as string) as any);
        }
    }, [])

    useEffect(() => {
        dispatch(getKubeConfig(cluster?.Name as string) as any);
        dispatch(getEKSNodeGroups(cluster?.Name as string) as any);
    }, [cluster?.Name]);

    const tableRow = (key: string, value: string) => (
        <tr>
            <td>{key}</td>
            <td>{value}</td>
        </tr>
    )

    // Helper function to format Date object or string to a readable format
    const formatDate = (date?: Date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString("en-US", {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    };


    const handleDownloadKubeConfig = () => {
        const element = document.createElement('a');
        const file = new Blob([kubeconfig], { type: 'text/plain' }); 
        element.href = URL.createObjectURL(file);
        element.download = 'kubeconfig.yaml'; // Or .config
        document.body.appendChild(element); 
        element.click();
    }

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(kubeconfig)
        .then(() => {
            setCopiedToClipboard(true);
        })
        .catch(err => {
            // Error handling
            console.error('Failed to copy kubeconfig:', err); 
        });

    }

    return (
        <div className="SetupPage">
            <div className="leftPanel">
                <h1 className="title">Your Kubernetes Cluster</h1>
                <div className="description">
                    <p>Your Kubernetes cluster is good to go! On the right you'll find a summary of everything we've created so far. Click continue to move on to deploying the Mattermost Operator and its dependencies</p>
                </div>
            </div>
            <div className="rightPanel">
                <div className="setup-card">
                    <div className="setup-card-content">
                        <div className="card-title">
                            <h2>Cluster Summary</h2>
                        </div>
                        <div className="details">
                            <label>EKS Cluster</label>
                            <Table>
                                <tbody>
                                    {tableRow('ARN', cluster?.Arn as string)}
                                    {tableRow('CreatedAt', formatDate(cluster?.CreatedAt as Date))}
                                    {tableRow('Endpoint', cluster?.Endpoint as string)}
                                    {tableRow('Version', cluster?.Version as string)}
                                    {tableRow('Role ARN', cluster?.RoleArn as string)}
                                </tbody>
                            </Table>
                            <label>Nodegroup</label>
                            <Table>
                                <tbody>
                                    {nodeGroups && nodeGroups.length > 0 && <>
                                        {tableRow('Name', nodeGroups[0].NodegroupName!)}
                                        {tableRow('Instance Type', (nodeGroups[0].InstanceTypes![0] as string) || '')}
                                        {tableRow('Status', nodeGroups[0].Status!)}
                                    </>}
                                </tbody>
                            </Table>
                            <Accordion>
                                <AccordionSummary>
                                    <label>Your Kubeconfig</label>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Typography component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {kubeconfig}
                                    </Typography>
                                </AccordionDetails>
                                <div className="kubeconfig-buttons">
                                    <Button className="download-kubeconfig" variant="outlined" color="primary" onClick={handleDownloadKubeConfig}>Download Config</Button>
                                    <Button className="copy-kubeconfig" variant="outlined" color={copiedToClipboard ? "success":"primary"} onClick={handleCopyToClipboard}>{copiedToClipboard ? <><CheckOutlined /> Copied</>: "Copy Config"}</Button>
                                </div>
                            </Accordion>
                        </div>
                        <div className="next-step-button">

                        <Button onClick={() => navigate(`/cluster/operators?clusterName=${cluster?.Name}&type=eks`)} size="lg" color="primary">Deploy Mattermost</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
