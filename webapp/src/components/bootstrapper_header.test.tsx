import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import BootstrapperHeader from './BootstrapperHeader'; // Adjust the path if needed

// Mock the logo import
jest.mock('../static/logo.png', () => 'test-logo-path');

describe('BootstrapperHeader', () => {
    it('renders the logo and links', async () => {
        render(<BootstrapperHeader currentStep="some-step" />);
        await waitFor(() => {
            const logoImage = screen.getByTestId('mattermost-logo');
            expect(logoImage).toBeInTheDocument();
            expect(logoImage).toHaveAttribute('src', 'test-logo-path');

            const contactUsLink = screen.getByText('Contact Us');
            expect(contactUsLink).toBeInTheDocument();
            expect(contactUsLink).toHaveAttribute('href', 'https://mattermost.com');
        });
    });
});