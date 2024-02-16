import React from 'react';
import { CircularProgress } from '@mui/joy';
import CheckIcon from '@mui/icons-material/Check';

import { ErrorOutline } from '@mui/icons-material';
import './connected_loading_spinner.scss';

type Props = {
    state: string;
}


export default function ConnectedLoadingSpinner(props: Props) {
    return (
        <div className={`ConnectedLoadingSpinner__${props.state}`}>
            {props.state === 'idle' && null}
            {props.state === 'loading' && <CircularProgress />}
            {props.state === 'succeeded' && <div className="info"><CheckIcon fontSize='small'/> Connected successfully!</div>}
            {props.state === 'failed' && <div className="info"><ErrorOutline/> An error has occurred</div>}
        </div>
    );
}