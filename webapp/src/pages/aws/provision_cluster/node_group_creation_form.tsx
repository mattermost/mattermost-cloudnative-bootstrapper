import React from 'react';
import { useSelector } from 'react-redux';
import { CSSTransition } from 'react-transition-group';
import { RootState } from '../../../store';
import { Button, CircularProgress, Input, Option, Select, Slider } from '@mui/joy';
import { sliderClasses } from '@mui/joy/Slider';
import { useDispatch } from 'react-redux';
import { createNodeGroupValid, setCreateNodeGroup } from '../../../store/installation/awsSlice';
import DynamicRows, { Row } from '../../../components/common/subnet_entry';
import './node_group_creation_form.scss';
import ARNSelector from '../../../components/aws/arn_selector';

function valueText(value: number) {
    return `${value}`;
}

type Props = {
    handleSubmit: () => void;
    createNodeGroupButtonEnabled: boolean;
}

export default function NodeGroupCreationForm(props: Props) {
    const createNodeGroup = useSelector((state: RootState) => state.aws.createNodeGroup);
    const dispatch = useDispatch();
    const arnFetchStatus = useSelector((state: RootState) => state.aws.arnFetchStatus);
    const possibleARNs = useSelector((state: RootState) => state.aws.possibleARNs);

    const handleCreateNodeGroupChange = (key: string, value: any) => {
        dispatch(setCreateNodeGroup({ ...createNodeGroup, [key]: value }));
    }

    if (!createNodeGroup.preset) {
        return null
    }

    const handleSubnetChanges = (rows: Row[]) => {
        let subnetIds: string[] = [];

        rows.forEach(row => {
            if (!row.value.startsWith('sg-')) {
                subnetIds.push(row.value);
            }
        });
        handleCreateNodeGroupChange('subnetIds', subnetIds);
    };

    return (
        <CSSTransition in={!!createNodeGroup.preset} timeout={500} classNames="fade" unmountOnExit>
            <div className="NodeGroupCreationForm">
                <label>Node group name</label>
                <Input name='nodeGroupName' onChange={(event) => handleCreateNodeGroupChange('nodeGroupName', event.target.value)} />
                <label>Instance Type</label>
                <Input name='instanceType' value={createNodeGroup.instanceType} onChange={(event) => handleCreateNodeGroupChange('instanceType', event.target.value)} />
                <label>Scaling Configuration</label>
                <div className="ScalingConfigurationSlider">
                    <Slider
                        track={"normal"}
                        defaultValue={[createNodeGroup.scalingConfig.minSize, createNodeGroup.scalingConfig.maxSize]}
                        getAriaLabel={() => 'Amount'}
                        getAriaValueText={valueText}
                        value={[createNodeGroup.scalingConfig.minSize, createNodeGroup.scalingConfig.maxSize]}
                        max={25}
                        min={1}
                        onChange={(event, newValue) => handleCreateNodeGroupChange('scalingConfig', { minSize: (newValue as number[])[0], maxSize: (newValue as number[])[1] })}
                        marks={[
                            {
                                value: 1,
                                label: 'Min',
                            },
                            {
                                value: 25,
                                label: 'Max',
                            },
                        ]}
                        valueLabelDisplay="on"
                        disableSwap={true}
                    />
                </div>
                <label>AMI Type</label>
                <Input name='amiType' value={createNodeGroup.amiType} onChange={(event) => handleCreateNodeGroupChange('amiType', event.target.value)} />
                <label>Release Version</label>
                <Input name='releaseVersion' value={createNodeGroup.releaseVersion} onChange={(event) => handleCreateNodeGroupChange('releaseVersion', event.target.value)} />
                <ARNSelector onChange={(value) => handleCreateNodeGroupChange('nodeRole', value)} />
                <label>Subnets</label>
                <DynamicRows onChange={handleSubnetChanges} />
                <Button className="submit" onClick={props.handleSubmit} size="lg" color="primary" disabled={!props.createNodeGroupButtonEnabled}>Create Node Group</Button>
            </div>
        </CSSTransition>
    );
}