import React, { useState } from 'react';
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import './cluster_summary.scss';
import { Accordion, AccordionDetails, AccordionSummary, Button, Table, Typography } from '@mui/joy';
import { CheckOutlined } from '@mui/icons-material';
import { useGetClusterQuery, useGetKubeConfigQuery, useGetNodegroupsQuery } from '../../client/bootstrapperApi';

export default function ClusterSummaryPage() {
    const navigate = useNavigate();
    const cloudProvider = useMatch('/:cloudProvider/cluster/summary')?.params.cloudProvider!;
    const [searchParams,] = useSearchParams();
    const [copiedToClipboard, setCopiedToClipboard] = useState(false);

    const clusterName = searchParams.get('clusterName') || "";
    
    const {data: cluster, isSuccess: isClusterSuccess} = useGetClusterQuery({cloudProvider, clusterName}, {
        skip: cloudProvider === '' || !clusterName,
    });

    const {data: nodeGroups} = useGetNodegroupsQuery({cloudProvider, clusterName}, {
        skip: cloudProvider === '' || !clusterName || !isClusterSuccess,
    });

    const {data: kubeconfig} = useGetKubeConfigQuery({clusterName, cloudProvider}, {
        skip: !isClusterSuccess,
    });

    if (!clusterName) {
        navigate(`/${cloudProvider}`);
        return null;
    }

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
        if(!kubeconfig) return;
        const element = document.createElement('a');
        const file = new Blob([kubeconfig], { type: 'text/plain' }); 
        element.href = URL.createObjectURL(file);
        element.download = 'kubeconfig.yaml'; // Or .config
        document.body.appendChild(element); 
        element.click();
    }

    const handleCopyToClipboard = () => {
        if (!kubeconfig) return;
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
                    <p>Your Kubernetes cluster is good to go! On the right you'll find a summary of your selected cluster. Click continue to move on to deploying the Mattermost Operator and its dependencies</p>
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
                        <Button onClick={() => navigate(`/${cloudProvider}/cluster/operators?clusterName=${cluster?.Name}`)} size="lg" color="primary">Deploy Mattermost</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
