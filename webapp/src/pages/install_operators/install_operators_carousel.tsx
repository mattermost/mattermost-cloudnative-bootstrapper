import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useMatch, useSearchParams } from 'react-router-dom';
import { RootState } from '../../store';
import { Button} from '@mui/joy';
import CloudNativePGLogo from '../../static/cloudnativepglogo.png';
import MattermostLogo from '../../static/mattermost-operator-logo.jpg';
import NginxLogo from '../../static/nginx-logo.png';
import { useDeployCloudNativePGMutation, useDeployMattermostOperatorMutation, useDeployNginxOperatorMutation, useDeployRTCDServiceMutation, useDeployCallsOffloaderServiceMutation } from '../../client/bootstrapperApi';

type Props = {
    onSuccess: () => void;
    onError: (error: string) => void;
}

export default function InstallOperatorsCarousel({ onSuccess, onError }: Props) {
    const utilities = useSelector((state: RootState) => state.bootstrapper.utilities.filter((utility) => utility.deploymentRequestState !== 'succeeded'));
    const operatorCustomValues = useSelector((state: RootState) => state.bootstrapper.operatorCustomValues);
    const cloudProvider = useMatch('/:cloudProvider/cluster/operators')?.params.cloudProvider!;
    const [searchParams,] = useSearchParams();
    const clusterName = searchParams.get('clusterName') || "";
    const [carouselIndex, setCarouselIndex] = useState(0);

    const hasMutatorBeenCalled = useRef(false);

    const mattermostMutator = useDeployMattermostOperatorMutation();
    const nginxMutator = useDeployNginxOperatorMutation();
    const cloudNativePGMutator = useDeployCloudNativePGMutation();
    const rtcdMutator = useDeployRTCDServiceMutation();
    const callsOffloaderMutator = useDeployCallsOffloaderServiceMutation();

    const cards: Record<string, { title: string; description: string; component: React.ReactElement | null, icon: React.ReactElement | null, mutator: any }> = {
        'mattermost-operator': {
            title: 'Mattermost Operator',
            description: 'Please wait while we deploy the Mattermost Operator to your cluster. This may take a few minutes.',
            component: null,
            icon: <img src={MattermostLogo} alt="Mattermost Operator" style={{ height: '29px', marginRight: '12px' }} />,
            mutator: mattermostMutator,
        },
        'ingress-nginx': {
            title: 'Nginx Operator',
            description: 'The Nginx Operator provides ingress support for your cluster\'s various installations. Please wait while we deploy it to your cluster. This may take a few minutes.',
            component: null,
            icon: <img src={NginxLogo} alt="Nginx Operator" style={{ height: '29px', marginRight: '12px' }} />,
            mutator: nginxMutator,
        },
        'cnpg-system': {
            title: 'CloudNative PG',
            description: 'The Cloud Native PG Operator provides a way to create managed PostgreSQL databases for your Mattermost workspaces to use. Please wait while we deploy it to your cluster. This may take a few minutes.',
            component: null,
            icon: <img src={CloudNativePGLogo} alt="CloudNative PG" style={{ height: '29px', marginRight: '12px' }} />,
            mutator: cloudNativePGMutator,
        },
        'rtcd': {
            title: 'RTCD Service',
            description: 'The RTCD service handles real-time communication aspects of Mattermost Calls, enabling voice and video calling features. Please wait while we deploy it to your cluster. This may take a few minutes.',
            component: null,
            icon: <img src={MattermostLogo} alt="RTCD Service" style={{ height: '29px', marginRight: '12px' }} />,
            mutator: rtcdMutator,
        },
        'calls-offloader': {
            title: 'Calls Offloader',
            description: 'The Calls Offloader service enables call recordings, transcriptions, and live captions for Mattermost Calls. Please wait while we deploy it to your cluster. This may take a few minutes.',
            component: null,
            icon: <img src={MattermostLogo} alt="Calls Offloader" style={{ height: '29px', marginRight: '12px' }} />,
            mutator: callsOffloaderMutator,
        },
    };


    const numSelectedUtilities = utilities.filter(
        (utility) => utility.isChecked && utility.deploymentRequestState !== 'succeeded',
    ).length;

    const handleDeploy = useCallback(async () => {
        const utilityInProgress = utilities[carouselIndex];
        if (!utilityInProgress) return;
        
        const card = cards[utilityInProgress.key];
        if (!card?.mutator) return;
        
        const customValues = operatorCustomValues[utilityInProgress.key];
        card.mutator[0]({ clusterName, cloudProvider, customValues });
    }, [carouselIndex, utilities, cards, clusterName, cloudProvider, operatorCustomValues]);
    
    useEffect(() => {
        if (carouselIndex + 1 > numSelectedUtilities) {
            onSuccess();
        } else if (!hasMutatorBeenCalled.current) {
            const utilityInProgress = utilities[carouselIndex];
            if (utilityInProgress) {
                const card = cards[utilityInProgress.key];
                if (card?.component === null) {
                    hasMutatorBeenCalled.current = true;
                    handleDeploy();
                }
            }
        }
    }, [carouselIndex, numSelectedUtilities, onSuccess, handleDeploy, utilities, cards]);

    // Handle deployment success/error state changes
    useEffect(() => {
        const utilityInProgress = utilities[carouselIndex];
        if (!utilityInProgress) return;
        
        const card = cards[utilityInProgress.key];
        if (!card?.mutator) return;

        if (card.mutator[1].isSuccess) {
            hasMutatorBeenCalled.current = false;
            setCarouselIndex(prev => prev + 1);
        }

        if (card.mutator[1].isError) {
            onError(card.mutator[1].error);
        }
    }, [utilities, carouselIndex, cards, onError]);

    const utilityInProgress = utilities[carouselIndex];

    if (!utilityInProgress) {
        onSuccess();
        return null;
    }

    const card = cards[utilityInProgress.key];


    if (!card.mutator) {
        return null;
    }

    return (
        <div className="InstallOperators">
            <div className="leftPanel">
                <h1 className="title"> {utilityInProgress.displayName} (Utility {carouselIndex + 1} of {numSelectedUtilities})</h1>
                <div className="description">
                </div>
            </div>
            <div className="rightPanel">
                <div className="setup-card">
                    <div className="setup-card-content">
                        <div className="card-title">
                            <h2>{card.icon} {utilityInProgress.displayName}</h2>
                        </div>
                        <div className="details">
                            {card.description}
                            {card.component}
                        </div>
                    <div className="deploy-button">
                        <Button onClick={handleDeploy} loading={card.mutator[1].isLoading}>Deploy</Button>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}