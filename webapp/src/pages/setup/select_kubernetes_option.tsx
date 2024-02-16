import { Select, Option } from '@mui/joy';
import React from 'react';
import { CSSTransition } from 'react-transition-group';


type Props = {
    cloudProvider?: string;
    onChange: (value: string) => void;
}


export default function SelectKubernetesOption({ cloudProvider, onChange}: Props) {
    return (
        <CSSTransition in={!!cloudProvider && cloudProvider !== 'custom'} timeout={500} classNames="fade" unmountOnExit>
            <div>
                <label>Select Kubernetes Option</label>
                <Select onChange={(event, newValue) => onChange(newValue as string)} size="sm" placeholder="Kubernetes Option">
                    <Option value="existing">Use Existing</Option>
                    <Option value="new">Create New</Option>
                </Select>
            </div>
        </CSSTransition>
    );
}