import React from 'react';
import { CircularProgress } from '@mui/joy';
import CheckIcon from '@mui/icons-material/Check';

import { ErrorOutline } from '@mui/icons-material';
import './connected_loading_spinner.scss';

type Props = {
    isLoading: boolean;
    isFetching?: boolean;
    isSuccess: boolean;
    isSuccessText?: string;
    isError: boolean;
    isErrorText?: string;
    error?: any;
}

// Helper function to extract error message from different error formats
const getErrorMessage = (error: any): string | null => {
    if (!error) return null;
    
    // Handle structured API error responses
    if (error?.data?.message) {
        return error.data.message;
    }
    
    // Handle RTK Query error format
    if (error?.message) {
        return error.message;
    }
    
    // Handle standard error objects
    if (error?.error) {
        return typeof error.error === 'string' ? error.error : error.error.message || null;
    }
    
    return null;
};

export default function RTKConnectedLoadingSpinner(props: Props) {
    let content = null;
    let className = '';
    // RTK Query refetches don't set isLoading = true, so support checking isFetching as well
    if (props.isLoading || props.isFetching) {
        content = <CircularProgress />;
        className='loading';
    } else if (props.isSuccess) {
        const success = props.isSuccessText || 'Connected successfully!';
        content = <div className="info"><CheckIcon fontSize='small' /> {success}</div>;
        className='succeeded';
    } else if (props.isError) {
        const errorMessage = getErrorMessage(props.error);
        const error = props.isErrorText || errorMessage || 'An error has occurred';
        content = <div className="info"><ErrorOutline /> {error}</div>;
        className='failed';
    }

    return (
        <div className={`ConnectedLoadingSpinner__${className}`}>
            {content}
        </div>
    );
}