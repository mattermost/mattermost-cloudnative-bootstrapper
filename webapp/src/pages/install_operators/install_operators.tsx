import React, {useEffect, useState} from 'react';

import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MattermostLogo from '../../static/mattermost-operator-logo.jpg';
import NginxLogo from '../../static/Nginx logo.svg';
import MarinerLogo from '../../static/mariner-logo.png';
import ProvisionerLogo from '../../static/provisioner-logo.png';
import CloudNativePGLogo from '../../static/cloudnativepglogo.png';
import './install_operators.scss';
import { RootState } from '../../store';
import { getEKSCluster, getEKSNodeGroups, getKubeConfig } from '../../store/installation/awsSlice';
import OperatorCard from './operator_card';
import { Button } from '@mui/joy';
import { getInstalledHelmReleases, getNamespaces, requiredUtilitiesAreDeployed, setUtilities, setUtilityDeploymentState } from '../../store/installation/bootstrapperSlice';
import InstallOperatorsCarousel from './install_operators_carousel';

export type KubeUtility = {
    displayName: string;
    key: string;
    operatorLogoUrl: string;
    operatorDescription: string;
    isRequired: boolean;
    isChecked: boolean;
    deploymentRequestState: 'idle' | 'loading' | 'failed' | 'succeeded';
}

export const allUtilities: KubeUtility[] = [
    {
        displayName: 'Mattermost Operator',
        key: 'mattermost-operator',
        operatorLogoUrl: MattermostLogo,
        operatorDescription: 'The Mattermost Operator is required to deploy Mattermost workspaces on your cluster',
        isRequired: true,
        isChecked: true,
        deploymentRequestState: 'idle',
    },
    {
        displayName: 'Nginx Operator',
        key: 'ingress-nginx',
        operatorLogoUrl: NginxLogo,
        operatorDescription: 'The Nginx Operator provides ingress support for your cluster\'s various installations',
        isRequired: false,
        isChecked: false,
        deploymentRequestState: 'idle',
    },
    {
        displayName: 'CloudNative PG',
        key: 'cnpg',
        operatorLogoUrl: CloudNativePGLogo,
        operatorDescription: 'The CloudNative PG Operator provides a way to create managed PostgreSQL databases for your Mattermost workspaces to use',
        isRequired: false,
        isChecked: false,
        deploymentRequestState: 'idle',
    },
    {
        displayName: 'Mattermost Provisioning Server',
        key: 'provisioner',
        operatorLogoUrl: ProvisionerLogo,
        operatorDescription: 'The Mattermost Provisioning Server is used to manage Mattermost workspaces',
        isRequired: false,
        isChecked: false,
        deploymentRequestState: 'idle',
    },
    {
        displayName: 'Mattermost Mariner Dashboard',
        key: 'mariner',
        operatorLogoUrl: MarinerLogo,
        operatorDescription: 'The Mattermost Mariner Dashboard provides a UI for managing Mattermost workspaces',
        isRequired: false,
        isChecked: false,
        deploymentRequestState: 'idle',
    }
];

export default function InstallOperatorsPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams,] = useSearchParams();
    const utilities = useSelector((state: RootState) => state.bootstrapper.utilities);
    const cluster = useSelector((state: RootState) => state.aws.eksCluster);
    const [isDeploying, setIsDeploying] = useState(false);
    const [deploymentFinished, setDeploymentFinished] = useState(false);
    const namespaces = useSelector((state: RootState) => state.bootstrapper.cluster.namespaces);

    // TODO: Wire this in - currently it's just looking at the namespace to see if something's deployed, but these actually contain the Helm deployment status
    const releases = useSelector((state: RootState) => state.bootstrapper.cluster.releases);
    const requiredUtilitiesDeployed = useSelector(requiredUtilitiesAreDeployed);

    useEffect(() => {
        if (typeof cluster === 'undefined') {
            const clusterName = searchParams.get('clusterName');
            if (!clusterName) {
                navigate('/aws');
                return;
            }
            dispatch(getEKSCluster(clusterName) as any);
            dispatch(getNamespaces(clusterName) as any);
            // dispatch(getInstalledHelmReleases(clusterName) as any);
        } else {
            dispatch(getEKSNodeGroups(cluster?.Name as string) as any);
            dispatch(getKubeConfig(cluster?.Name as string) as any);
            dispatch(getNamespaces(cluster?.Name as string) as any);
            // dispatch(getInstalledHelmReleases(cluster?.Name as string) as any);
        }

    }, [])

    useEffect(() => {
        setDeploymentFinished(false);
    }, [utilities])

    useEffect(() => {
        namespaces.forEach((namespace) => {
            dispatch(setUtilityDeploymentState({ utility: namespace, deploymentRequestState: 'succeeded', isChecked: true }))
        })
    }, [namespaces])

    useEffect(() => {
        dispatch(getKubeConfig(cluster?.Name as string) as any);
        dispatch(getEKSNodeGroups(cluster?.Name as string) as any);
    }, [cluster?.Name]);

    const numSelectedUtilities = utilities.filter((utility) => utility.isChecked && utility.deploymentRequestState !== 'succeeded').length;

    if (isDeploying && !deploymentFinished) {
        return (
            <InstallOperatorsCarousel
                onSuccess={() => {
                    setIsDeploying(false);
                    setDeploymentFinished(true)
                }}
                onError={(error) => {setIsDeploying(false); alert(`Error: ${error}`)}}
            />
        )
    }

    return (
        <div className="InstallOperators">
            <div className="leftPanel">
                <h1 className="title">Available Operators & Utilities</h1>
                <div className="description">
                    <p>We're ready to install the Mattermost Operator (required). Once you've installed the operator, you can also choose to deploy extra utilities like Nginx's operator (for ingress support), the Mattermost provisioning server, and Mattermost's Mariner dashboard</p>
                </div>
            </div>
            <div className="rightPanel">
                <div className="setup-card">
                    <div className="setup-card-content">
                        <div className="card-title">
                            <h2>Installable Operators & Utilities</h2>
                        </div>
                        <div className="details">
                            {
                                utilities.map((utility) => {
                                    return (
                                        <OperatorCard
                                            key={utility.key}
                                            displayName={utility.displayName}
                                            operatorLogoUrl={utility.operatorLogoUrl}
                                            operatorDescription={utility.operatorDescription}
                                            onClickCheckBox={(checked) => {
                                                const newUtilities = utilities.map((util) => {
                                                    if (util.key === utility.key) {
                                                        return { ...util, isChecked: checked };
                                                    }
                                                    return util;
                                                });
                                                dispatch(setUtilities(newUtilities));
                                            }}
                                            isRequired={utility.isRequired}
                                            isChecked={utility.isChecked}
                                            deploymentRequestState={utility.deploymentRequestState}
                                        />
                                    )
                                })
                            }
                        </div>
                        <div className="next-step-button">
                            <Button onClick={() => setIsDeploying(true)} disabled={deploymentFinished || numSelectedUtilities === 0} size="lg" color="primary">Deploy {numSelectedUtilities > 0 && <>{numSelectedUtilities} {numSelectedUtilities > 1 ? 'Utilities' : 'Utility'} </>}</Button>
                            {deploymentFinished && <div className="deployment-finished">Utilities installed successfully!</div>}
                            {requiredUtilitiesDeployed && <Button onClick={() => navigate(`/create_mattermost_workspace?clusterName=${cluster?.Name}&type=aws`)} size="lg" color="primary">Create Mattermost Workspace</Button>}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
