import * as React from 'react';
import { Link } from 'react-router-dom';
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
                <Link to="/" className="BootstrapperHeader-title">
                    <img src={logo} className="BootstrapperHeader-logo" alt="Mattermost Logo" />
                </Link>
                <a href="https://mattermost.com" className="BootstrapperHeader-contact_us">Contact Us</a>
            </header>
        </>
    );
}