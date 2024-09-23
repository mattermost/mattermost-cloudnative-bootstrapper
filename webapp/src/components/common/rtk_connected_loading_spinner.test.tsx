import React from 'react';
import { render, screen } from '@testing-library/react';
import RTKConnectedLoadingSpinner from './rtk_connected_loading_spinner'; 

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
        expect(screen.getByTestId('CheckIcon')).toBeInTheDocument(); 
    });

    it('renders a custom success message when isSuccessText is provided', () => {
        render(<RTKConnectedLoadingSpinner isLoading={false} isSuccess isSuccessText="Custom success" isError={false} />);
        expect(screen.getByText('Custom success')).toBeInTheDocument();
    });

    it('renders an error message when isError is true', () => {
        render(<RTKConnectedLoadingSpinner isLoading={false} isSuccess={false} isError />);
        expect(screen.getByText('An error has occurred')).toBeInTheDocument();
        expect(screen.getByTestId('ErrorOutlineIcon')).toBeInTheDocument();
    });

    it('renders a custom error message when isErrorText is provided', () => {
        render(<RTKConnectedLoadingSpinner isLoading={false} isSuccess={false} isError isErrorText="Custom error" />);
        expect(screen.getByText('Custom error')).toBeInTheDocument();
    });

    it('applies the loading CSS class when isLoading is true', () => {
        const {getByTestId} = render(<RTKConnectedLoadingSpinner isLoading isSuccess={false} isError={false} />);
        expect(getByTestId('rtk-loading-spinner-root')).toHaveClass('ConnectedLoadingSpinner__loading');
    });
    
    it('applies the success CSS class when isSuccess is true', () => {
        const {getByTestId} = render(<RTKConnectedLoadingSpinner isLoading={false} isSuccess isError={false} />);
        expect(getByTestId('rtk-loading-spinner-root')).toHaveClass('ConnectedLoadingSpinner__succeeded');
    });
    
    it('applies the error CSS class when isError is true', () => {
        const {getByTestId} = render(<RTKConnectedLoadingSpinner isLoading={false} isSuccess={false} isError />);
        expect(getByTestId('rtk-loading-spinner-root')).toHaveClass('ConnectedLoadingSpinner__failed');
    });
});