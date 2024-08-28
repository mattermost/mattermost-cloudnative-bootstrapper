import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore, {MockStoreEnhanced} from 'redux-mock-store';
import { useSearchParams } from 'react-router-dom';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import EditInstallationModal from './edit_installation_modal'; 
import { useGetMattermostInstallationSecretsQuery } from '../../client/dashboardApi'; 
import FilestoreConnection from '../../pages/mattermost/filestore_connection'; 

jest.mock('../../client/dashboardApi');
jest.mock('../../pages/mattermost/filestore_connection');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useSearchParams: jest.fn(),
}));

const mockStore = configureStore([]);

describe('EditInstallationModal', () => {
    let store: MockStoreEnhanced<any>;
    let mockInstallation: any;
    let mockInstallationSecrets: any;
    let onSubmitMock: jest.Mock;
    let onChangeMock: jest.Mock;
    let onCloseMock: jest.Mock;

    beforeEach(() => {
        mockInstallation = {
            metadata: { name: 'test-installation' },
            status: { image: 'test-image', version: '1.0.0', replicas: 3, endpoint: 'https://example.com' },
            spec: { fileStore: { local: { path: '/data' } } },
        };

        mockInstallationSecrets = {
            licenseSecret: { data: { license: 'test-license' } },
            filestoreSecret: { data: { accesskey: 'test-access-key', secretkey: 'test-secret-key' } },
        };

        onSubmitMock = jest.fn();
        onChangeMock = jest.fn();
        onCloseMock = jest.fn();

        store = mockStore({});

        (useGetMattermostInstallationSecretsQuery as jest.Mock).mockReturnValue({
            data: mockInstallationSecrets,
            isSuccess: true,
        });

        (useSearchParams as jest.Mock).mockReturnValue([
            new URLSearchParams('clusterName=test-cluster'),
            jest.fn(),
        ]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const renderComponent = () => {
        const router = createMemoryRouter([
            {
                path: '/',
                element: (
                    <Provider store={store}>
                        <EditInstallationModal
                            installation={mockInstallation}
                            cloudProvider="aws"
                            onSubmit={onSubmitMock}
                            onChange={onChangeMock}
                            onClose={onCloseMock}
                            show
                        />
                    </Provider>
                ),
            },
        ]);

        return render(<RouterProvider router={router} />);
    };

    it('renders the modal with installation details', () => {
        renderComponent();

        expect(screen.getByText('Edit installation')).toBeInTheDocument();
        expect(screen.getByText('Update installation test-installation')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Image')).toHaveValue('test-image');
        expect(screen.getByPlaceholderText('Version')).toHaveValue('1.0.0');
        expect(screen.getByPlaceholderText('Replicas')).toHaveValue('3');
        expect(screen.getByPlaceholderText('Endpoint')).toHaveValue('https://example.com');
        expect(screen.getByPlaceholderText('License')).toHaveValue('test-license');
    });

    it('renders the FilestoreConnection component', () => {
        renderComponent();

        expect(FilestoreConnection).toHaveBeenCalledWith(
            expect.objectContaining({
                isEdit: true,
                cloudProvider: 'aws',
                existingFilestore: {
                    local: { path: '/data' },
                },
            }),
            expect.anything()
        );
    });

    it('calls onSubmit when the Save button is clicked', async () => {
        renderComponent();

        fireEvent.change(screen.getByLabelText('Image'), { target: { value: 'new-image' } });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(onSubmitMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    image: 'new-image',
                    version: '1.0.0',
                    replicas: 3,
                    endpoint: 'https://example.com',
                    name: 'test-installation',
                    fileStore: { local: { path: '/data' } },
                    fileStorePatch: {}, // Assuming no changes in FilestoreConnection
                })
            );
        });
    });

    it('updates the installationPatch state when input values change', () => {
        renderComponent();

        fireEvent.change(screen.getByPlaceholderText('Image'), { target: { value: 'new-image' } });
        fireEvent.change(screen.getByPlaceholderText('Version'), { target: { value: '2.0.0' } });
        fireEvent.change(screen.getByPlaceholderText('Replicas'), { target: { value: '5' } });
        fireEvent.change(screen.getByPlaceholderText('Endpoint'), { target: { value: 'https://new-endpoint.com' } });
        fireEvent.change(screen.getByPlaceholderText('License'), { target: { value: 'new-license' } });
    });

    it('renders an empty license textarea when installationSecrets is undefined', () => {
        (useGetMattermostInstallationSecretsQuery as jest.Mock).mockReturnValue({
            data: undefined,
            isSuccess: false,
        });

        renderComponent();

        const licenseSection = screen.queryByPlaceholderText('License');

        expect(licenseSection).toBeNull();
    });

    it('renders an empty license textarea when installationSecrets.licenseSecret is undefined', () => {
        (useGetMattermostInstallationSecretsQuery as jest.Mock).mockReturnValue({
            data: { filestoreSecret: mockInstallationSecrets.filestoreSecret }, // No licenseSecret
            isSuccess: true,
        });

        renderComponent();

        expect(screen.getByPlaceholderText('License')).toHaveValue('');
    });

    it('does not render the FilestoreConnection component when isSuccess is false', () => {
        (useGetMattermostInstallationSecretsQuery as jest.Mock).mockReturnValue({
            data: undefined,
            isSuccess: false,
        });

        renderComponent();

        expect(FilestoreConnection).not.toHaveBeenCalled();
    });
});