import * as React from 'react';
import logo from '../static/logo.png';
import './bootstrapper_header.scss';

type Props = {
    currentStep: string;
}

export default function BootstrapperHeader({ currentStep }: Props) {
    // TODO: Rethink breadcrumbs, add here.
    return (
        <>
            <header className="BootstrapperHeader">
                <a href="https://mattermost.com" target="_blank" className="BootstrapperHeader-title" rel="noreferrer">            <img src={logo} className="BootstrapperHeader-logo" alt="Mattermost Logo" /></a>
                <a href="https://mattermost.com" className="BootstrapperHeader-contact_us">Contact Us</a>
            </header>
        </>
    );
}