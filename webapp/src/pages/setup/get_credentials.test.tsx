import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GetCredentials from './get_credentials'; 

describe('GetCredentials', () => {
    const mockOnCredentialsChange = jest.fn();

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('does not render when cloudProvider is undefined', () => {
        render(<GetCredentials cloudProvider={undefined as any} kubernetesOption="" onCredentialsChange={mockOnCredentialsChange} />);
        expect(screen.queryByText('Access Key ID')).not.toBeInTheDocument();
        expect(screen.queryByText('Access Key Secret')).not.toBeInTheDocument();
        expect(screen.queryByText('Authenticate with...')).not.toBeInTheDocument();
    });

    it('renders access key inputs when cloudProvider is not "custom" and kubernetesOption is "new"', () => {
        render(<GetCredentials cloudProvider="aws" kubernetesOption="new" onCredentialsChange={mockOnCredentialsChange} />);

        expect(screen.getByText('Access Key ID')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Access Key ID')).toBeInTheDocument();
        expect(screen.getByText('Access Key Secret')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Access Key Secret')).toBeInTheDocument();
        expect(screen.queryByText('Authenticate with...')).not.toBeInTheDocument();
    });

    it('renders kubeconfig select and input/textarea when cloudProvider is "custom"', async () => {
        const {getByText, getByTestId, getByPlaceholderText} = render(<GetCredentials cloudProvider="custom" kubernetesOption="" onCredentialsChange={mockOnCredentialsChange} />);

        expect(getByText('Authenticate with...')).toBeInTheDocument();

        // Open the select dropdown
        fireEvent.click(getByTestId('kubeconfig-type-select'));
        fireEvent.click(getByText('YAML'));

        // Wait for the options to be rendered
        await waitFor(() => {
            expect(getByPlaceholderText('kubecfg string')).toBeInTheDocument();
        });


        // Select 'File Path' option
        fireEvent.click(getByTestId('kubeconfig-type-select'));
        fireEvent.click(getByText('File Path'));

        // Input should now be present
        await waitFor(() => {
            expect(getByPlaceholderText('~/.kube/config')).toBeInTheDocument();
        });
    });

    it('renders access key inputs when cloudProvider is not "custom" and kubernetesOption is "existing"', () => {
        render(<GetCredentials cloudProvider="aws" kubernetesOption="existing" onCredentialsChange={mockOnCredentialsChange} />);

        expect(screen.getByText('Access Key ID')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Access Key ID')).toBeInTheDocument();
        expect(screen.getByText('Access Key Secret')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Access Key Secret')).toBeInTheDocument();
        expect(screen.queryByText('Authenticate with...')).not.toBeInTheDocument();
    });

    it('calls onCredentialsChange when input values change', () => {
        render(<GetCredentials cloudProvider="aws" kubernetesOption="new" onCredentialsChange={mockOnCredentialsChange} />);

        const accessKeyIdInput = screen.getByPlaceholderText('Access Key ID');
        const accessKeySecretInput = screen.getByPlaceholderText('Access Key Secret');

        fireEvent.change(accessKeyIdInput, { target: { value: 'test-key-id' } });
        fireEvent.change(accessKeySecretInput, { target: { value: 'test-secret' } });

        expect(mockOnCredentialsChange).toHaveBeenCalledWith({
            accessKeyId: 'test-key-id',
            accessKeySecret: 'test-secret',
            kubeconfig: '',
            kubeconfigType: '',
        });
    });

    it('calls onCredentialsChange when kubeconfig input/textarea value changes', async () => {
        const {getByPlaceholderText, getByText, getByTestId} = render(<GetCredentials cloudProvider="custom" kubernetesOption="" onCredentialsChange={mockOnCredentialsChange} />);

        fireEvent.click(getByTestId('kubeconfig-type-select'));
        fireEvent.click(getByText('YAML'));
        const kubeconfigTextarea = getByPlaceholderText('kubecfg string');
        fireEvent.change(kubeconfigTextarea, { target: { value: 'test-kubeconfig-yaml' } });
        expect(mockOnCredentialsChange).toHaveBeenCalledWith({
            accessKeyId: '',
            accessKeySecret: '',
            kubeconfig: 'test-kubeconfig-yaml',
            kubeconfigType: 'yaml',
        });

        // Switch to File Path option
        fireEvent.click(getByTestId('kubeconfig-type-select'));
        fireEvent.click(getByText('File Path'));

        // Wait for the input to be rendered
        await waitFor(() => {
            expect(getByPlaceholderText('~/.kube/config')).toBeInTheDocument();
        });
        fireEvent.change(getByPlaceholderText('~/.kube/config'), { target: { value: '/path/to/kubeconfig' } });

        expect(mockOnCredentialsChange).toHaveBeenCalledWith({
            accessKeyId: '',
            accessKeySecret: '',
            kubeconfig: '/path/to/kubeconfig',
            kubeconfigType: 'file',
        });
    });
});