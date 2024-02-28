import { Option, Select } from '@mui/joy';
import React from 'react';
import { CSSTransition } from 'react-transition-group';



type Props = {
    clusters: string[];
    onChange: (value: string) => void;
}

export default function ClusterSelectDropdown({clusters, onChange}: Props) {

    return (
        <CSSTransition in={!!clusters.length} timeout={500} classNames="fade" unmountOnExit>
            <div className="cluster-select-dropdown">
                <Select onChange={(event, newValue) => onChange(newValue as string)} placeholder={"Cluster"}>
                    {clusters.map((cluster, index) => {
                        return <Option key={index} value={cluster}>{cluster}</Option>
                    })}
                </Select>
            </div>
        </CSSTransition>
    );
}