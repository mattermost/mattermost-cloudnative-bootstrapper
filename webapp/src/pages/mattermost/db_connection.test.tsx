import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DBConnection from './db_connection';
import { Release } from '../../types/bootstrapper';

describe('DBConnection', () => {
    const mockOnChange = jest.fn();
    const mockReleasesWithPG: Release[] = [{ Name: 'cnpg-system' } as Release, { Name: 'other-release' } as Release];
    const mockReleasesWithoutPG: Release[] = [{ Name: 'some-release' } as Release, { Name: 'another-release' } as Release];

    afterEach(() => {
        jest.clearAllMocks();
    });

    const selectFromDropdown = (option: string) => {
        fireEvent.click(screen.getByTestId('db-connection-selector'));
        fireEvent.click(screen.getByText(option));
    }

    it('renders the select with correct options based on releases and cloudProvider', async () => {
        render(<DBConnection releases={mockReleasesWithPG} cloudProvider="aws" onChange={mockOnChange} />);

        // Open the select dropdown
        // Wait for the options to be rendered
        fireEvent.click(screen.getByTestId('db-connection-selector'));
        await waitFor(() => {
            expect(screen.getByText('Use Existing')).toBeInTheDocument();
        });
        expect(screen.getByText('Create For Me (CNPG)')).toBeInTheDocument(); // Should be present due to cnpg-system release
        expect(screen.getByText('Create For Me (RDS)')).toBeInTheDocument(); // AWS specific
    });


    it('Doesn\'t render the Create For Me (RDS) option for non-AWS providers', async () => {
        render(<DBConnection releases={mockReleasesWithPG} cloudProvider="gcp" onChange={mockOnChange} />);
        fireEvent.click(screen.getByTestId('db-connection-selector'));
        await waitFor(() => {
            expect(screen.queryByText('Create For Me (RDS)')).not.toBeInTheDocument();
        });
    });

    it('Doesn\'t render the Create For Me (CNPG) option if the cnpg-system release is not present', async () => {
        render(<DBConnection releases={mockReleasesWithoutPG} cloudProvider="aws" onChange={mockOnChange} />);
        fireEvent.click(screen.getByTestId('db-connection-selector'));
        await waitFor(() => {
            expect(screen.queryByText('Create For Me (CNPG)')).not.toBeInTheDocument();
        });
    });


    it('renders the correct input fields based on selected databaseOption', async () => {
        render(<DBConnection releases={mockReleasesWithPG} cloudProvider="aws" onChange={mockOnChange} />);

        // Existing
        selectFromDropdown('Use Existing');
        await waitFor(() => {
            expect(screen.getByText('Connect to an externally managed database through a connection string')).toBeInTheDocument();
        });
        expect(screen.getByPlaceholderText('DB Connection String')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('DB Replicas Connection String')).toBeInTheDocument();

        // CreateForMeCNPG
        selectFromDropdown('Create For Me (CNPG)');
        await waitFor(() => {
            expect(screen.getByText("We'll create a database cluster within the same namespace as your installation backed by CloudNative Postgres")).toBeInTheDocument();
        });

        // CreateForMeRDS
        selectFromDropdown('Create For Me (RDS)');
        await waitFor(() => {
            expect(screen.getByText('RDS Creation support coming soon...')).toBeInTheDocument();
        });
    });

    it('calls onChange with correct details when inputs change', async () => {
        render(<DBConnection releases={mockReleasesWithPG} cloudProvider="aws" onChange={mockOnChange} />);

        // Existing
        selectFromDropdown('Use Existing');
        fireEvent.change(screen.getByPlaceholderText('DB Connection String'), { target: { value: 'test-connection-string' } });

        fireEvent.change(screen.getByPlaceholderText('DB Replicas Connection String'), {
            target: { value: 'test-replicas-connection-string' },
        });

        expect(mockOnChange).toHaveBeenCalledWith({
            existingDatabaseConfig: {
                dbConnectionString: 'test-connection-string',
                dbReplicasConnectionString: 'test-replicas-connection-string',
            },
            dbConnectionOption: 'Existing',
        });

        // CreateForMeCNPG
        selectFromDropdown('Create For Me (CNPG)');
        // No input fields to change for this option, so just check that onChange is called with the correct option
        expect(mockOnChange).toHaveBeenCalledWith({
            existingDatabaseConfig: undefined,
            dbConnectionOption: 'CreateForMeCNPG',
        });
    });

    it('resets form when databaseOption changes', async () => {
        render(<DBConnection releases={mockReleasesWithPG} cloudProvider="aws" onChange={mockOnChange} />);

        // Change to Existing and fill in some values
        selectFromDropdown('Use Existing');
        fireEvent.change(screen.getByPlaceholderText('DB Connection String'), {
            target: { value: 'test-connection-string' },
        });

        // Change to CreateForMeCNPG
        selectFromDropdown('Create For Me (CNPG)');
        await waitFor(() => {
            // Assert that the Existing DB fields are cleared
            expect(screen.queryByPlaceholderText('DB Connection String')).not.toBeInTheDocument();
        });
        expect(screen.queryByPlaceholderText('DB Replicas Connection String')).not.toBeInTheDocument();
    });
});