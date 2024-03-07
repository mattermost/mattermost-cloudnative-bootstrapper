import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store';
import { Button, CircularProgress } from '@mui/joy';
import { deployCloudNativePG, deployMariner, deployMattermostOperator, deployNginxOperator, deployProvisioner } from '../../store/installation/bootstrapperSlice';
import InstallMattermost from './install_mattermost';
import InstallNginx from './install_nginx';
import CloudNativePGLogo from '../../static/cloudnativepglogo.png';
import MattermostLogo from '../../static/mattermost-operator-logo.jpg';
import NginxLogo from '../../static/Nginx logo.svg';
import MarinerLogo from '../../static/mariner-logo.png';
import ProvisionerLogo from '../../static/provisioner-logo.png';


type Props = {
    onSuccess: () => void;
    onError: (error: string) => void;
}

export default function InstallOperatorsCarousel({ onSuccess, onError }: Props) {
    const dispatch = useDispatch();
    const utilities = useSelector((state: RootState) => state.bootstrapper.utilities);
    const cluster = useSelector((state: RootState) => state.aws.eksCluster);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [isDeploying, setIsDeploying] = useState(false);

    const cards: Record<string, { title: string; description: string; component: React.ReactElement | null, icon: React.ReactElement | null }> = {
        'mattermost-operator': {
            title: 'Mattermost Operator',
            description: 'Please wait while we deploy the Mattermost Operator to your cluster. This may take a few minutes.',
            component: null,
            icon: <img src={MattermostLogo} alt="Mattermost Operator" style={{ height: '29px', marginRight: '12px' }} />,
        },
        'ingress-nginx': {
            title: 'Nginx Operator',
            description: 'The Nginx Operator provides ingress support for your cluster\'s various installations. Please wait while we deploy it to your cluster. This may take a few minutes.',
            component: null,
            icon: <img src={NginxLogo} alt="Nginx Operator" style={{ height: '29px', marginRight: '12px' }} />,
        },
        'cnpg': {
            title: 'CloudNative PG',
            description: 'The Cloud Native PG Operator provides a way to create managed PostgreSQL databases for your Mattermost workspaces to use. Please wait while we deploy it to your cluster. This may take a few minutes.',
            component: null,
            icon: <img src={CloudNativePGLogo} alt="CloudNative PG" style={{ height: '29px', marginRight: '12px' }} />,
        },
        'provisioner': {
            title: 'Mattermost Provisioning Server',
            description: 'The Mattermost Provisioning Server is used to manage Mattermost workspaces. Before we can deploy, we\'ll need more information.',
            component: <></>,
            icon: <img src={ProvisionerLogo} alt="Mattermost Provisioning Server" style={{ height: '29px', marginRight: '12px' }} />,
        },
        'mariner': {
            title: 'Mattermost Mariner Dashboard',
            description: 'The Mattermost Mariner Dashboard provides a UI for managing Mattermost workspaces. Before we can deploy, we\'ll need more information.',
            component: <></>,
            icon: <img src={MarinerLogo} alt="Mattermost Mariner Dashboard" style={{ height: '29px', marginRight: '12px' }} />,
        },
    };

    const utilityInProgress = utilities[carouselIndex];

    const card = cards[utilityInProgress.key];

    useEffect(() => {
        console.log('carouselIndex', carouselIndex);
        if (carouselIndex + 1 > numSelectedUtilities) {
            setIsDeploying(false);
            onSuccess();
        } else if (card.component === null) {
            console.log(card);
            setIsDeploying(true);
            handleDeploy();
        } else {
            setIsDeploying(false);
        }
    }, [carouselIndex])


    if (utilityInProgress.deploymentRequestState === 'succeeded') {
        setCarouselIndex(carouselIndex + 1);
    }

    const numSelectedUtilities = utilities.filter(
        (utility) => utility.isChecked,
    ).length;

    const getActionToDispatchFromUtilityKey = (utilityKey: string) => {
        switch (utilityKey) {
            case 'mattermost-operator':
                return deployMattermostOperator;
            case 'ingress-nginx':
                return deployNginxOperator;
            case 'provisioner':
                return deployProvisioner;
            case 'mariner':
                return deployMariner;
            case 'cnpg':
                return deployCloudNativePG;
            default:
                return null;
        }
    };

    const handleDeploy = async () => {
        setIsDeploying(true);

        console.log('handelDeploy');

        try {
            const actionToDispatch = getActionToDispatchFromUtilityKey(utilityInProgress.key);
            if (actionToDispatch) {
                await dispatch(actionToDispatch(cluster?.Name as string) as any); // Assuming your actions need cluster data
            } else {
                throw new Error(`Unsupported utility: ${utilityInProgress.key}`);
            }
            if (carouselIndex + 1 > numSelectedUtilities) {
                onSuccess();
            }
        } catch (error) {
            setIsDeploying(false);
            onError((error as any).message || "Deployment failed.");
        } finally {
            // setIsDeploying(false);
            setCarouselIndex(carouselIndex + 1);
        }
    };

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
                        <Button onClick={handleDeploy} loading={isDeploying}>Deploy</Button>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}