import React from 'react';
import { CircularProgress } from '@mui/joy';
import CheckIcon from '@mui/icons-material/Check';

import { ErrorOutline } from '@mui/icons-material';
import './connected_loading_spinner.scss';

type Props = {
    isLoading: boolean;
    isFetching?: boolean;
    isSuccess: boolean;
    isError: boolean;
}

export default function RTKConnectedLoadingSpinner(props: Props) {
    let content = null;
    let className = '';
    // RTK Query refetches don't set isLoading = true, so support checking isFetching as well
    if (props.isLoading || props.isFetching) {
        content = <CircularProgress />;
        className='loading';
    } else if (props.isSuccess) {
        content = <div className="info"><CheckIcon fontSize='small' /> Connected successfully!</div>;
        className='succeeded';
    } else if (props.isError) {
        content = <div className="info"><ErrorOutline /> An error has occurred</div>;
        className='failed';
    }

    return (
        <div className={`ConnectedLoadingSpinner__${className}`}>
            {content}
        </div>
    );
}