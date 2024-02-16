import * as React from 'react';
import logo from '../static/logo.png';
import './bootstrapper_header.scss';
import { Breadcrumbs, Link, Typography } from '@mui/joy';
import SettingsIcon from '@mui/icons-material/Settings';

type Props = {
    currentStep: string;
}

export default function BootstrapperHeader({ currentStep }: Props) {
    let breadcrumbSteps = [
        { key: 'setup', label: 'Setup' },
        { key: 'create_eks_cluster', label: 'Create EKS Cluster' },
        { key: 'wait_for_eks', label: 'Wait for EKS' },
        { key: 'provision_cluster', label: 'Provision Cluster' },
        { key: 'cluster_summary', label: 'Cluster Summary'},
        { key: 'install_operator', label: 'Install Operator' },
        { key: 'install_mattermost', label: 'Install Mattermost' },
        { key: 'install_database', label: 'Install Database' },
        { key: 'install_storage', label: 'Install Storage' },
        { key: 'install_ingress', label: 'Install Ingress' },
        { key: 'install_monitoring', label: 'Install Monitoring' },
        { key: 'install_logging', label: 'Install Logging' },
        { key: 'install_license', label: 'Install License' },
        { key: 'install_complete', label: 'Install Complete' }
    ]
    const currentStepIndex = breadcrumbSteps.findIndex((step) => step.key === currentStep);
    const stepsSoFar = breadcrumbSteps.slice(0, currentStepIndex);
    return (
        <>
            <header className="BootstrapperHeader">
                <a href="https://mattermost.com" target="_blank" className="BootstrapperHeader-title">            <img src={logo} className="BootstrapperHeader-logo" alt="Mattermost Logo" /></a>
                <a href="https://mattermost.com" className="BootstrapperHeader-contact_us">Contact Us</a>
            </header>
            <div>
                <Breadcrumbs separator=">" aria-label="breadcrumb">
                    <SettingsIcon />
                    {stepsSoFar.map((item) => (
                        <Link disabled key={item.key} color="success" href="#usage-with-link-and-typography">
                            {item.label}
                        </Link>
                    ))}

                    <Typography>{breadcrumbSteps[currentStepIndex].label}</Typography>
                </Breadcrumbs>
            </div>
        </>
    );
}