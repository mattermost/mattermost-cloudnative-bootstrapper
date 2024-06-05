import React, {useEffect, useState} from 'react';

import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom';
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
import { requiredUtilitiesAreDeployed, setUtilities, setUtilityDeploymentState } from '../../store/installation/bootstrapperSlice';
import InstallOperatorsCarousel from './install_operators_carousel';
import { useGetClusterQuery, useGetInstalledHelmReleasesQuery } from '../../client/bootstrapperApi';
import RTKConnectedLoadingSpinner from '../../components/common/rtk_connected_loading_spinner';

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
        key: 'cnpg-system',
        operatorLogoUrl: CloudNativePGLogo,
        operatorDescription: 'The CloudNative PG Operator provides a way to create managed PostgreSQL databases for your Mattermost workspaces to use',
        isRequired: false,
        isChecked: false,
        deploymentRequestState: 'idle',
    },
];

export default function InstallOperatorsPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams,] = useSearchParams();
    const cloudProvider = useMatch('/:cloudProvider/cluster/operators')?.params.cloudProvider!;
    const clusterName = searchParams.get('clusterName') || "";
    const utilities = useSelector((state: RootState) => state.bootstrapper.utilities);
    const [isDeploying, setIsDeploying] = useState(false);
    const [deploymentFinished, setDeploymentFinished] = useState(false);

    // TODO: Wire this in - currently it's just looking at the namespace to see if something's deployed, but these actually contain the Helm deployment status
    const {data: releases, isLoading: isReleasesLoading, isFetching: isReleasesFetching, isSuccess: isReleasesSuccess, isError: isReleasesError, refetch: refetchReleases} = useGetInstalledHelmReleasesQuery({cloudProvider, clusterName}, {skip: cloudProvider === '' || !clusterName});

    const {data: cluster} = useGetClusterQuery({cloudProvider, clusterName}, {
        skip: cloudProvider === '' || !clusterName,
    });

    useEffect(() => {
        releases?.forEach((release) => {
            dispatch(setUtilityDeploymentState({ utility: release.Name, deploymentRequestState: 'succeeded', isChecked: true }))
        })
    }, [releases?.length])

    const requiredUtilitiesDeployed = useSelector(requiredUtilitiesAreDeployed);

    useEffect(() => {
        setDeploymentFinished(false);
    }, [utilities])

    const numSelectedUtilities = utilities.filter((utility) => utility.isChecked && utility.deploymentRequestState !== 'succeeded').length;

    if (isDeploying && !deploymentFinished) {
        return (
            <InstallOperatorsCarousel
                onSuccess={() => {
                    refetchReleases();
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
                    <p>We're ready to install the Mattermost Operator (required). Once you've installed the operator, you can also choose to deploy extra utilities like Nginx's operator (for ingress support), Or CloudNative Postgres (for database creation). If you plan to use RDS, you can skip CNPG.</p>
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
                                            isLoading={isReleasesLoading || isReleasesFetching}
                                        />
                                    )
                                })
                            }
                        </div>
                        <div className="next-step-button">
                            {isReleasesLoading || isReleasesFetching && <RTKConnectedLoadingSpinner isSuccess={isReleasesSuccess} isError={isReleasesError} isLoading={isReleasesLoading} isFetching={isReleasesFetching}/>}
                            {!isReleasesLoading && isReleasesSuccess && !isReleasesFetching && <>
                                <Button onClick={() => setIsDeploying(true)} disabled={deploymentFinished || numSelectedUtilities === 0} size="lg" color="primary">Deploy {numSelectedUtilities > 0 && <>{numSelectedUtilities} {numSelectedUtilities > 1 ? 'Utilities' : 'Utility'} </>}</Button>
                                {deploymentFinished && <div className="deployment-finished">Utilities installed successfully!</div>}
                                {requiredUtilitiesDeployed && <Button onClick={() => navigate(`/${cloudProvider}/create_mattermost_workspace?clusterName=${cluster?.Name}&type=aws`)} size="lg" color="primary">Create Workspace</Button>}
                            </>}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
