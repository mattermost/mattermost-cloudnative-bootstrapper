import React from 'react';
import { render, screen } from '@testing-library/react';
import RTKConnectedLoadingSpinner from './rtk_connected_loading_spinner'; // Adjust the path if needed

describe('RTKConnectedLoadingSpinner', () => {
    it('renders a loading indicator when isLoading is true', () => {
        render(<RTKConnectedLoadingSpinner isLoading isSuccess={false} isError={false} />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders a loading indicator when isFetching is true', () => {
        render(<RTKConnectedLoadingSpinner isLoading={false} isFetching isSuccess={false} isError={false} />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders a success message when isSuccess is true', () => {
        render(<RTKConnectedLoadingSpinner isLoading={false} isSuccess isError={false} />);
        expect(screen.getByText('Connected successfully!')).toBeInTheDocument();
        expect(screen.getByTestId('CheckIcon')).toBeInTheDocument(); // Assuming you have a data-testid on the CheckIcon
    });

    it('renders a custom success message when isSuccessText is provided', () => {
        render(<RTKConnectedLoadingSpinner isLoading={false} isSuccess isSuccessText="Custom success" isError={false} />);
        expect(screen.getByText('Custom success')).toBeInTheDocument();
    });

    it('renders an error message when isError is true', () => {
        render(<RTKConnectedLoadingSpinner isLoading={false} isSuccess={false} isError />);
        expect(screen.getByText('An error has occurred')).toBeInTheDocument();
        expect(screen.getByTestId('ErrorOutlineIcon')).toBeInTheDocument(); // Assuming you have a data-testid on the ErrorOutlineIcon
    });

    it('renders a custom error message when isErrorText is provided', () => {
        render(<RTKConnectedLoadingSpinner isLoading={false} isSuccess={false} isError isErrorText="Custom error" />);
        expect(screen.getByText('Custom error')).toBeInTheDocument();
    });

    it('applies the correct CSS class based on the state', () => {
        const {container: container1} = render(<RTKConnectedLoadingSpinner isLoading isSuccess={false} isError={false} />);
        expect(container1.firstChild).toHaveClass('ConnectedLoadingSpinner__loading');

        const {container: container2} = render(<RTKConnectedLoadingSpinner isLoading={false} isSuccess isError={false} />);
        expect(container2.firstChild).toHaveClass('ConnectedLoadingSpinner__succeeded');

        const {container: container3} = render(<RTKConnectedLoadingSpinner isLoading={false} isSuccess={false} isError />);
        expect(container3.firstChild).toHaveClass('ConnectedLoadingSpinner__failed');
    });
});