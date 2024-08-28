import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkspaceInfo, { WorkspaceInfoDetails } from './workspace_info'; // Adjust the path if needed

describe('WorkspaceInfo', () => {
    it('renders all input fields and textarea', () => {
        render(<WorkspaceInfo onChange={jest.fn()} />);

        expect(screen.getByText('Workspace Info')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Installation Name*')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Domain Name*')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Mattermost Version')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Mattermost Enterprise License')).toBeInTheDocument();
    });

    it('calls onChange prop when input values change', () => {
        const onChangeMock = jest.fn();
        render(<WorkspaceInfo onChange={onChangeMock} />);

        const installationNameInput = screen.getByPlaceholderText('Installation Name*');
        const domainNameInput = screen.getByPlaceholderText('Domain Name*');
        const versionInput = screen.getByPlaceholderText('Mattermost Version');
        const licenseTextarea = screen.getByPlaceholderText('Mattermost Enterprise License');

        fireEvent.change(installationNameInput, { target: { value: 'test-installation' } });
        fireEvent.change(domainNameInput, { target: { value: 'example.com' } });
        fireEvent.change(versionInput, { target: { value: '6.5.0' } });
        fireEvent.change(licenseTextarea, { target: { value: 'test-license' } });

        const expectedDetails: WorkspaceInfoDetails = {
            installationName: 'test-installation',
            domainName: 'example.com',
            enterpriseLicense: 'test-license',
            version: '6.5.0',
        };

        expect(onChangeMock).toHaveBeenCalledWith(expectedDetails);
    });

    it('calls onChange on initial render with default values', () => {
        const onChangeMock = jest.fn();
        render(<WorkspaceInfo onChange={onChangeMock} />);

        const expectedDetails: WorkspaceInfoDetails = {
            installationName: '',
            domainName: '',
            enterpriseLicense: '',
            version: '',
        };

        expect(onChangeMock).toHaveBeenCalledWith(expectedDetails);
    });

    it('marks required fields as required', () => {
        render(<WorkspaceInfo onChange={jest.fn()} />);

        const installationNameInput = screen.getByPlaceholderText('Installation Name*');
        const domainNameInput = screen.getByPlaceholderText('Domain Name*');

        expect(installationNameInput).toBeRequired();
        expect(domainNameInput).toBeRequired();
    });
});