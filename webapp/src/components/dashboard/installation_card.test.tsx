import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InstallationCard from './installation_card'; 
import { Mattermost, Metadata, Status } from '../../types/Installation'; 

describe('InstallationCard', () => {
    const mockInstallation: Mattermost = {
        metadata: { name: 'Test Installation' } as Metadata,
        status: {
            state: 'stable',
            image: 'test-image',
            version: '1.0.0',
            replicas: 3,
            endpoint: 'example.com',
        } as Status,
    } as Mattermost;

    it('renders installation details correctly when stable', () => {
        render(
            <InstallationCard
                installation={mockInstallation}
                onClick={jest.fn()}
                onClickEdit={jest.fn()}
                onClickDelete={jest.fn()}
            />
        );

        expect(screen.getByText('Test Installation')).toBeInTheDocument();
        expect(screen.getByText('Image: test-image')).toBeInTheDocument();
        expect(screen.getByText('Version: 1.0.0')).toBeInTheDocument();
        expect(screen.getByText('Replicas: 3')).toBeInTheDocument();
        expect(screen.getByText('Endpoint:')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'example.com' })).toHaveAttribute('href', 'http://example.com');
        expect(screen.getByText('stable')).toBeInTheDocument();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(); // No progress bar when stable
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(); // No tooltip when stable
    });

    it('renders installation details correctly when not stable', () => {
        const unstableInstallation = { ...mockInstallation, status: { ...mockInstallation.status, state: 'pending' } };

        render(
            <InstallationCard
                installation={unstableInstallation}
                onClick={jest.fn()}
                onClickEdit={jest.fn()}
                onClickDelete={jest.fn()}
            />
        );

        expect(screen.getByText('pending')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('calls onClickEdit when the edit button is clicked', () => {
        const onClickEditMock = jest.fn();
        render(
            <InstallationCard
                installation={mockInstallation}
                onClick={jest.fn()}
                onClickEdit={onClickEditMock}
                onClickDelete={jest.fn()}
            />
        );


        fireEvent.click(screen.getByTestId('EditIcon'));

        expect(onClickEditMock).toHaveBeenCalledWith(mockInstallation.metadata.name);
    });

    it('calls onClickDelete when the delete button is clicked', () => {
        const onClickDeleteMock = jest.fn();
        render(
            <InstallationCard
                installation={mockInstallation}
                onClick={jest.fn()}
                onClickEdit={jest.fn()}
                onClickDelete={onClickDeleteMock}
            />
        );

        fireEvent.click(screen.getByTestId('DeleteIcon'));

        expect(onClickDeleteMock).toHaveBeenCalledWith(mockInstallation.metadata.name);
    });
});