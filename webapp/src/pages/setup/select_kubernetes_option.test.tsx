import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SelectKubernetesOption from './select_kubernetes_option'; 

describe('SelectKubernetesOption', () => {
    const mockOnChange = jest.fn();

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('does not render when cloudProvider is undefined or "custom"', () => {
        render(<SelectKubernetesOption onChange={mockOnChange} />); // No cloudProvider
        expect(screen.queryByText('Select Kubernetes Option')).not.toBeInTheDocument();

        render(<SelectKubernetesOption cloudProvider="custom" onChange={mockOnChange} />);
        expect(screen.queryByText('Select Kubernetes Option')).not.toBeInTheDocument();
    });

    it('renders the select with the "Use Existing" option when cloudProvider is defined and not "custom"', async () => {
        render(<SelectKubernetesOption cloudProvider="aws" onChange={mockOnChange} />);

        expect(screen.getByText('Select Kubernetes Option')).toBeInTheDocument();

        // Open the select dropdown
        fireEvent.mouseDown(screen.getByRole('combobox'));

        // Wait for the options to be rendered
        await waitFor(() => {
            expect(screen.getByText('Use Existing')).toBeInTheDocument();
            // The commented-out option should not be present
            expect(screen.queryByText('Create New')).not.toBeInTheDocument();
        });
    });

    it('calls onChange when an option is selected', async () => {
        render(<SelectKubernetesOption cloudProvider="aws" onChange={mockOnChange} />);

        // Open the select dropdown
        fireEvent.mouseDown(screen.getByRole('combobox'));

        await waitFor(() => {
            fireEvent.click(screen.getByText('Use Existing'));
        });

        expect(mockOnChange).toHaveBeenCalledWith('existing');
    });
});