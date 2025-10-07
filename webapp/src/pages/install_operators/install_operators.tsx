import React, {useEffect, useState} from 'react';

import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import MattermostLogo from '../../static/mattermost-operator-logo.jpg';
import NginxLogo from '../../static/nginx-logo.png';
import CloudNativePGLogo from '../../static/cloudnativepglogo.png';
import './install_operators.scss';
import { RootState } from '../../store';
import OperatorCard from './operator_card';
import { Button } from '@mui/joy';
import { requiredUtilitiesAreDeployed, setUtilities, setUtilityDeploymentState, setOperatorCustomValues } from '../../store/installation/bootstrapperSlice';
import InstallOperatorsCarousel from './install_operators_carousel';
import { 
    useGetClusterQuery, 
    useGetInstalledHelmReleasesQuery,
    useGetMattermostOperatorDefaultValuesQuery,
    useGetNginxOperatorDefaultValuesQuery,
    useGetCNPGOperatorDefaultValuesQuery,
    useGetRTCDServiceDefaultValuesQuery,
    useGetCallsOffloaderDefaultValuesQuery
} from '../../client/bootstrapperApi';
import RTKConnectedLoadingSpinner from '../../components/common/rtk_connected_loading_spinner';
import ErrorModal from '../../components/common/ErrorModal';
import OperatorValuesModal from '../../components/common/operator_values_modal';

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
    {
        displayName: 'RTCD Service',
        key: 'rtcd',
        operatorLogoUrl: MattermostLogo,
        operatorDescription: 'The RTCD service handles real-time communication aspects of Mattermost Calls, enabling voice and video calling features',
        isRequired: false,
        isChecked: false,
        deploymentRequestState: 'idle',
    },
    {
        displayName: 'Calls Offloader',
        key: 'calls-offloader',
        operatorLogoUrl: MattermostLogo,
        operatorDescription: 'The Calls Offloader service enables call recordings, transcriptions, and live captions for Mattermost Calls',
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
    const operatorCustomValues = useSelector((state: RootState) => state.bootstrapper.operatorCustomValues);
    const [isDeploying, setIsDeploying] = useState(false);
    const [deploymentFinished, setDeploymentFinished] = useState(false);
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [currentError, setCurrentError] = useState<any>(null);
    const [valuesModalOpen, setValuesModalOpen] = useState(false);
    const [selectedOperator, setSelectedOperator] = useState<string | null>(null);

    // TODO: Wire this in - currently it's just looking at the namespace to see if something's deployed, but these actually contain the Helm deployment status
    const {data: releases, isLoading: isReleasesLoading, isFetching: isReleasesFetching, isSuccess: isReleasesSuccess, isError: isReleasesError, error: releasesError, refetch: refetchReleases} = useGetInstalledHelmReleasesQuery({cloudProvider, clusterName}, {skip: cloudProvider === '' || !clusterName});

    // Fetch default values for each operator
    const {data: mattermostDefaultValues} = useGetMattermostOperatorDefaultValuesQuery({cloudProvider, clusterName}, {skip: cloudProvider === '' || !clusterName});
    const {data: nginxDefaultValues} = useGetNginxOperatorDefaultValuesQuery({cloudProvider, clusterName}, {skip: cloudProvider === '' || !clusterName});
    const {data: cnpgDefaultValues} = useGetCNPGOperatorDefaultValuesQuery({cloudProvider, clusterName}, {skip: cloudProvider === '' || !clusterName});
    const {data: rtcdDefaultValues} = useGetRTCDServiceDefaultValuesQuery({cloudProvider, clusterName}, {skip: cloudProvider === '' || !clusterName});
    const {data: callsOffloaderDefaultValues} = useGetCallsOffloaderDefaultValuesQuery({cloudProvider, clusterName}, {skip: cloudProvider === '' || !clusterName});

    useGetClusterQuery({cloudProvider, clusterName}, {
        skip: cloudProvider === '' || !clusterName,
    });

    useEffect(() => {
        releases?.forEach((release) => {
            // Map release names to utility keys
            let utilityKey: string;
            switch (release.Name) {
                case 'mattermost-operator':
                    utilityKey = 'mattermost-operator';
                    break;
                case 'ingress-nginx':
                    utilityKey = 'ingress-nginx';
                    break;
                case 'cnpg-system':
                    utilityKey = 'cnpg-system';
                    break;
                case 'mattermost-rtcd':
                    utilityKey = 'rtcd';
                    break;
                case 'mattermost-calls-offloader':
                    utilityKey = 'calls-offloader';
                    break;
                default:
                    return; // Skip unknown releases
            }
            
            dispatch(setUtilityDeploymentState({ 
                utility: utilityKey, 
                deploymentRequestState: 'succeeded', 
                isChecked: true 
            }));
        })
    }, [releases?.length, dispatch])

    const requiredUtilitiesDeployed = useSelector(requiredUtilitiesAreDeployed);

    useEffect(() => {
        setDeploymentFinished(false);
    }, [utilities])

    const numSelectedUtilities = utilities.filter((utility) => utility.isChecked && utility.deploymentRequestState !== 'succeeded').length;

    const handleShowOptions = (operatorKey: string) => {
        setSelectedOperator(operatorKey);
        setValuesModalOpen(true);
    };

    const handleSaveValues = (values: string) => {
        if (selectedOperator) {
            dispatch(setOperatorCustomValues({ operatorKey: selectedOperator, values }));
        }
    };

    const getOperatorDisplayName = (operatorKey: string): string => {
        const utility = utilities.find(u => u.key === operatorKey);
        return utility?.displayName || operatorKey;
    };

    const getDefaultValues = (operatorKey: string): string => {
        switch (operatorKey) {
            case 'mattermost-operator':
                return mattermostDefaultValues?.values || '# Loading default values...';
            case 'ingress-nginx':
                return nginxDefaultValues?.values || '# Loading default values...';
            case 'cnpg-system':
                return cnpgDefaultValues?.values || '# Loading default values...';
            case 'rtcd':
                return rtcdDefaultValues?.values || '# Loading default values...';
            case 'calls-offloader':
                return callsOffloaderDefaultValues?.values || '# Loading default values...';
            default:
                return '# No default values available for this operator';
        }
    };

    if (isDeploying && !deploymentFinished) {
        return (
            <InstallOperatorsCarousel
                onSuccess={() => {
                    refetchReleases();
                    setIsDeploying(false);
                    setDeploymentFinished(true)
                }}
                onError={(error) => {
                    setIsDeploying(false);
                    setCurrentError(error);
                    setErrorModalOpen(true);
                }}
            />
        )
    }

    return (
        <div className="InstallOperators">
            <div className="leftPanel">
                <h1 className="title">Available Operators & Utilities</h1>
                <div className="description">
                    <p>We&apos;re ready to install the Mattermost Operator (required). Once you&apos;ve installed the operator, you can also choose to deploy extra utilities like Nginx&apos;s operator (for ingress support), Or CloudNative Postgres (for database creation). If you plan to use RDS, you can skip CNPG.</p>
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
                                            onShowOptions={() => handleShowOptions(utility.key)}
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
                            {(isReleasesLoading || isReleasesFetching) && <RTKConnectedLoadingSpinner isSuccess={isReleasesSuccess} isError={isReleasesError} isLoading={isReleasesLoading} isFetching={isReleasesFetching}/>}
                            {!isReleasesLoading && isReleasesSuccess && !isReleasesFetching && <>
                                <Button onClick={() => setIsDeploying(true)} disabled={deploymentFinished || numSelectedUtilities === 0} size="lg" color="primary">Deploy {numSelectedUtilities > 0 && <>{numSelectedUtilities} {numSelectedUtilities > 1 ? 'Utilities' : 'Utility'} </>}</Button>
                                {deploymentFinished && <div className="deployment-finished">Utilities installed successfully!</div>}
                                {requiredUtilitiesDeployed && <Button onClick={() => navigate(`/${cloudProvider}/create_mattermost_workspace?clusterName=${clusterName}`)} size="lg" color="primary">Create Workspace</Button>}
                            </>}
                        </div>
                    </div>
                </div>
            </div>
            <ErrorModal
                open={errorModalOpen}
                title="Deployment Error"
                error={currentError}
                onClose={() => {
                    setErrorModalOpen(false);
                    setCurrentError(null);
                }}
            />
            {selectedOperator && (
                <OperatorValuesModal
                    open={valuesModalOpen}
                    onClose={() => {
                        setValuesModalOpen(false);
                        setSelectedOperator(null);
                    }}
                    onSave={handleSaveValues}
                    operatorName={getOperatorDisplayName(selectedOperator)}
                    defaultValues={getDefaultValues(selectedOperator)}
                    currentValues={operatorCustomValues[selectedOperator]}
                />
            )}
        </div >
    );
}
