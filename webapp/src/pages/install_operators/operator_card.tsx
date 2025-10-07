import React from 'react';
import Card from '@mui/joy/Card';
import CardOverflow from '@mui/joy/CardOverflow';
import CardContent from '@mui/joy/CardContent';
import Typography from '@mui/joy/Typography';
import Checkbox from '@mui/joy/Checkbox';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';

import './operator_card.scss';
import { Chip, CircularProgress } from '@mui/joy';

export type OperatorCardProps = {
    displayName: string;
    key: string;
    operatorLogoUrl: string;
    operatorDescription: string;
    onClickCheckBox: (checked: boolean) => void;
    onShowOptions?: () => void;
    isRequired: boolean;
    isChecked: boolean;
    deploymentRequestState: 'idle' | 'loading' | 'failed' | 'succeeded';
    isLoading: boolean;
}

const OperatorCard = ({ displayName, operatorLogoUrl, operatorDescription, onClickCheckBox, onShowOptions, isRequired, key, isChecked, deploymentRequestState, isLoading }: OperatorCardProps) => {

    const handleCheckboxChange = () => {
        if (isRequired || isDeployed) {
            return;
        }
        onClickCheckBox(!isChecked); // Notify parent of the change
    };

    const isDeployed = isChecked && deploymentRequestState === 'succeeded';
    const canShowOptions = isChecked && !isDeployed && deploymentRequestState !== 'loading';


    const getChips = () => {
        let chips = [];
        if (isRequired) {
            chips.push(<Chip variant="solid" color="primary" key="required">REQUIRED</Chip>);
        }
        if (isDeployed) {
            chips.push(<Chip variant="solid" color="success" key="deployed">DEPLOYED</Chip>);
        }

        if (isLoading) {
            return [(<CircularProgress key="loading" size="sm" />)];
        }

        return chips;
    }

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
                        <Typography fontWeight="md">{displayName} {getChips().map((chip) => chip)}</Typography>
                        <Typography>{operatorDescription}</Typography>
                    </Box>
                </Box>
            </CardOverflow>
            <CardContent sx={{ textAlign: 'center', py: '8px' }}>
                {isLoading ? null : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                        <Checkbox
                            checked={isChecked}
                            onChange={handleCheckboxChange}
                            variant="soft"
                            color="primary"
                            disabled={isDeployed}
                        />
                        {canShowOptions && onShowOptions && (
                            <Button
                                size="sm"
                                variant="outlined"
                                color="neutral"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onShowOptions();
                                }}
                                sx={{ fontSize: 'xs', px: 2, py: 0.5 }}
                            >
                                Show Options
                            </Button>
                        )}
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default OperatorCard;