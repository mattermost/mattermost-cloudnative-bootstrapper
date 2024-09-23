import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FilestoreConnection from './filestore_connection';
import { FilestoreType } from '../../types/Installation';

describe('FilestoreConnection', () => {
    const mockOnChange = jest.fn();

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders the select with correct options based on cloudProvider', () => {
        render(<FilestoreConnection cloudProvider="aws" onChange={mockOnChange} />);
        expect(screen.getByText('Filestore Connection')).toBeInTheDocument();
        expect(screen.getByTestId('in-cluster-local')).toBeInTheDocument();
        expect(screen.getByText('Use Existing (S3 Compatible)')).toBeInTheDocument();
        expect(screen.getByText('In-Cluster (External PVC)')).toBeInTheDocument();
        expect(screen.getByText('Create For Me (S3)')).toBeInTheDocument(); // AWS specific

    });

    it('Doesn\'t render the Create For Me (S3) option for non-AWS providers', () => {
        render(<FilestoreConnection cloudProvider="gcp" onChange={mockOnChange} />);
        expect(screen.queryByText('Create For Me (S3)')).not.toBeInTheDocument();
    });

    function selectFromDropdown(value: string) {
        const select = screen.getByTestId('filestore-type-selector');
        fireEvent.click(select);
        const option = screen.getByText(value);
        fireEvent.click(option);
    }

    it('renders the correct input fields based on selected filestoreOption', async () => {
        const {getByText, getByPlaceholderText} = render(<FilestoreConnection cloudProvider="aws" onChange={mockOnChange} />);

        // InClusterLocal (default)
        expect(getByText('The Mattermost Operator can configure its own local filestore via PVC-backed storage.')).toBeInTheDocument();
        expect(getByPlaceholderText('Storage Size')).toBeInTheDocument();


        selectFromDropdown('Use Existing (S3 Compatible)');

        await waitFor(() => {
            expect(getByText('Provide connection details for your existing S3 bucket.')).toBeInTheDocument();
        });
        expect(getByPlaceholderText('Filestore URL')).toBeInTheDocument();
        expect(getByPlaceholderText('Bucket Name')).toBeInTheDocument();
        expect(getByPlaceholderText('Access Key ID')).toBeInTheDocument();
        expect(getByPlaceholderText('Access Key Secret')).toBeInTheDocument();

        // InClusterExternal
        selectFromDropdown('In-Cluster (External PVC)');
        await waitFor(() => {
            expect(screen.getByText('Provide information on an externally managed PVC backed storage.')).toBeInTheDocument();
        });
        expect(screen.getByPlaceholderText('Volume Name')).toBeInTheDocument();

        // AWSS3
        selectFromDropdown('Create For Me (S3)');
        await waitFor(() => {
            expect(screen.getByText('S3 Bucket creation support coming soon...')).toBeInTheDocument();
        });
    });

    it('calls onChange with correct details when inputs change', async () => {
        render(<FilestoreConnection cloudProvider="aws" onChange={mockOnChange} />);

        // InClusterLocal
        fireEvent.change(screen.getByPlaceholderText('Storage Size'), { target: { value: '50' } });
        expect(mockOnChange).toHaveBeenCalledWith({
            filestoreOption: FilestoreType.InClusterLocal,
            localFilestoreConfig: { storageSize: '50' },
            s3FilestoreConfig: undefined,
            localExternalFilestoreConfig: undefined
        });

        // ExistingS3
        selectFromDropdown('Use Existing (S3 Compatible)');
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Filestore URL')).toBeInTheDocument();
        });
        fireEvent.change(screen.getByPlaceholderText('Filestore URL'), { target: { value: 'https://example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Bucket Name'), { target: { value: 'my-bucket' } });
        fireEvent.change(screen.getByPlaceholderText('Access Key ID'), { target: { value: 'test-key-id' } });
        fireEvent.change(screen.getByPlaceholderText('Access Key Secret'), { target: { value: 'test-secret' } });

        expect(mockOnChange).toHaveBeenCalledWith({
            filestoreOption: FilestoreType.ExistingS3,
            localFilestoreConfig: undefined,
            s3FilestoreConfig: {
                url: 'https://example.com',
                bucket: 'my-bucket',
                accessKeyId: 'test-key-id',
                accessKeySecret: 'test-secret'
            },
            localExternalFilestoreConfig: undefined
        });

        // InClusterExternal
        selectFromDropdown('In-Cluster (External PVC)');
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Volume Name')).toBeInTheDocument();
        });
        fireEvent.change(screen.getByPlaceholderText('Volume Name'), { target: { value: 'my-volume' } });

        expect(mockOnChange).toHaveBeenCalledWith({
            filestoreOption: FilestoreType.InClusterExternal,
            localFilestoreConfig: undefined,
            s3FilestoreConfig: undefined,
            localExternalFilestoreConfig: { volumeClaimName: 'my-volume' }
        });
    });

    it('renders disclaimer when isEdit is true', () => {
        render(<FilestoreConnection cloudProvider="aws" onChange={mockOnChange} isEdit />);
        expect(screen.getByText('Note: Editing the filestore connection does not migrate your files. Only change this if you know what you are doing.')).toBeInTheDocument();
    });

    it('disables select when isEdit is true', () => {
        render(<FilestoreConnection cloudProvider="aws" onChange={mockOnChange} isEdit />);
        expect(screen.getByRole('combobox')).toBeDisabled();
    });
});