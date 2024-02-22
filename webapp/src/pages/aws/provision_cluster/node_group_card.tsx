import React from 'react';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Typography from '@mui/joy/Typography';
import { AWSNodeGroup } from '../../../types/bootstrapper';
import { Chip, CircularProgress } from '@mui/joy';

interface NodeGroupCardProps {
    name: string;
    instanceType: string;
    status: string;
    nodeGroup: AWSNodeGroup;
}

interface TypographyComponentProps {
    label: string;
    value: string | JSX.Element;
    className?: string;
}

const TypographyComponent: React.FC<TypographyComponentProps> = ({ label, value, className }) => {
    return (
        <div className={className} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
            <Typography fontWeight="md" mr={2}> {/* Bold label with right margin */}
                {label}
            </Typography>
            <Typography> 
                {value}
            </Typography>
        </div>
    );
};

const NodeGroupCard: React.FC<NodeGroupCardProps> = ({ name, instanceType, status, nodeGroup }) => {

    const ChipWithSpinner = (status: string) => {
        if (status === 'ACTIVE') {
            return <Chip color="success">{status}</Chip>;
        }
        if (status === 'DELETING') {
            return <Chip color="danger">{status}</Chip>;
        }
        if (status === 'FAILED') {
            return <Chip color="danger">{status}</Chip>;
        }
        return <><CircularProgress size="sm"/><Chip color="primary">{status}</Chip></>;
    }

    return (
        <Card sx={{ minWidth: 275 }} style={{boxShadow: '0 12px 32px 0 rgba(0, 0, 0, 0.12)', borderRadius: '8px', border: '1px solid rgba(63, 67, 80, 0.08)'}}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column' }}> 
                <TypographyComponent label="Nodegroup Name:" value={name} />
                <TypographyComponent className={'with-spinner'} label="Status:" value={ChipWithSpinner(status)} />
                <TypographyComponent label="Instance Type:" value={instanceType} />
                <TypographyComponent label="AMI:" value={nodeGroup.AmiType || ''} /> 
                <TypographyComponent 
                    label="Scaling Config:" 
                    value={`${nodeGroup.ScalingConfig?.MinSize} (min) - ${nodeGroup.ScalingConfig?.MaxSize} (max)`} 
                />
                <TypographyComponent label="Last Updated:" value={nodeGroup.UpdatedAt ? new Date(nodeGroup.UpdatedAt).toLocaleDateString("en-US", {}) : 'Unknown'} />
            </CardContent>
        </Card>
    );
};

export default NodeGroupCard;