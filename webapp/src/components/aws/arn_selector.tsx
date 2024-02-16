import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useDispatch } from 'react-redux';
import { fetchPossibleARN } from '../../store/installation/awsSlice';
import { CircularProgress, Input, Option, Select } from '@mui/joy';

type Props = {
    onChange: (value: string) => void;
}

export default function ARNSelector(props: Props) {
    const dispatch = useDispatch();
    const possibleARNs = useSelector((state: RootState) => state.aws.possibleARNs);
    const arnFetchStatus = useSelector((state: RootState) => state.aws.arnFetchStatus);

    useEffect(() => {
        dispatch(fetchPossibleARN() as any)
    }, [])

    return (
        <>
            <label> IAM Role ARN</label>
            {arnFetchStatus == 'succeeded' && <Select size="sm" onChange={(event, newValue) => props.onChange(newValue as string)} placeholder="IAM Role ARN">
                {possibleARNs?.map((arn: any) => {
                    return <Option value={arn.arn}>{arn.arn}</Option>
                })}
            </Select>}
            {arnFetchStatus == 'failed' && <Input size="sm" placeholder="IAM Role ARN" onChange={(event) => props.onChange(event.target.value)} />}
            {arnFetchStatus == 'loading' && <CircularProgress />}
        </>
    );
}