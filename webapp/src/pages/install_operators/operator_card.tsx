import React, { useState } from 'react';
import Card from '@mui/joy/Card';
import CardOverflow from '@mui/joy/CardOverflow';
import CardContent from '@mui/joy/CardContent';
import Typography from '@mui/joy/Typography';
import Checkbox from '@mui/joy/Checkbox';
import Box from '@mui/joy/Box';

import './operator_card.scss';
import { Chip } from '@mui/joy';

export type OperatorCardProps = {
    displayName: string;
    key: string;
    operatorLogoUrl: string;
    operatorDescription: string;
    onClickCheckBox: (checked: boolean) => void;
    isRequired: boolean;
    isChecked: boolean;
    deploymentRequestState: 'idle' | 'loading' | 'failed' | 'succeeded';
}

const OperatorCard = ({ displayName, operatorLogoUrl, operatorDescription, onClickCheckBox, isRequired, key, isChecked, deploymentRequestState }: OperatorCardProps) => {

    const handleCheckboxChange = () => {
        if (isRequired || isDeployed) {
            return;
        }
        onClickCheckBox(!isChecked); // Notify parent of the change
    };

    const isDeployed = isChecked && deploymentRequestState === 'succeeded';

    return (
        <Card
            key={key}
            onClick={handleCheckboxChange}
            variant="outlined"
            sx={{
                minWidth: 250,
                boxShadow: 'md',
                borderRadius: 'sm',
                bgcolor: isChecked ? 'neutral.softBg' : 'background.body'
            }}
        >
            <CardOverflow>
                <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                    <img src={operatorLogoUrl} alt={displayName} style={{ height: 40, marginRight: '12px' }} />
                    <Box>
                        <Typography fontWeight="md">{displayName} {isRequired ? <Chip variant="solid" color="primary" >REQUIRED</Chip> : null} {isDeployed ? <Chip variant="solid" color="success">DEPLOYED</Chip> : null}</Typography>
                        <Typography>{operatorDescription}</Typography>
                    </Box>
                </Box>
            </CardOverflow>
            <CardContent sx={{ textAlign: 'center', py: '8px' }}>
                <Checkbox
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                    variant="soft"
                    color="primary"
                    disabled={isDeployed}
                />
            </CardContent>
        </Card>
    );
};

export default OperatorCard;