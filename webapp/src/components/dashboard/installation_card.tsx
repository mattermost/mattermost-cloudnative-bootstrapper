import React from 'react';
import { Card, Typography, Chip, IconButton, CircularProgress, Tooltip } from '@mui/joy'; // Import necessary Joy UI components
import { Mattermost } from '../../types/Installation';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import './installation_card.scss';

type InstallationCardProps = {
    installation: Mattermost;
    onClick: (installationName: string) => void;
    onClickEdit: (installationName: string) => void;
    onClickDelete: (installationName: string) => void;
};

export default function InstallationCard({
    installation,
    onClick,
    onClickEdit,
    onClickDelete,
}: InstallationCardProps) {
    const isStable = installation.status.state === 'stable';



    const chipWithTooltipIfApplicable = (isStable: boolean) => {
        if (isStable) {
            return (
                <Chip
                    variant='soft'
                    color='success'
                    size='sm'
                    style={{ marginLeft: '8px' }}
                >
                    {installation.status.state}
                </Chip>
            );
        } else {
            return (
                <Tooltip title="While your installation isn't stable, some data may not be present.">
                <Chip
                    variant='outlined'
                    color='primary'
                    size='sm'
                    style={{ marginLeft: '8px' }}
                >
                    {installation.status.state}
                </Chip>
                </Tooltip>
            );
        }
    }

    return (
        <Card className="installation-card">
            <div style={{ display: 'flex', alignItems: 'center' }}> {/* Header Section */}
                <Typography level="h3" style={{ flexGrow: 1 }}>
                    {installation.metadata.name}
                </Typography>
                {!isStable && <CircularProgress size={"sm"} />}
                {chipWithTooltipIfApplicable(isStable)}
            </div>

            {/* Installation Details */}
            <div>
                <Typography>Image: {installation.status.image}</Typography>
                <Typography>Version: {installation.status.version}</Typography>
                <Typography>Replicas: {installation.status.replicas}</Typography>
                <Typography>Endpoint: <a href={`http://${installation.status.endpoint}`} target="_blank">{installation.status.endpoint}</a></Typography>
            </div>

            {/* Button Area */}
            <div className="button-container" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton onClick={() => onClickEdit(installation.metadata.name)} ><EditIcon /></IconButton>
                <IconButton style={{color: 'red'}}onClick={() => onClickDelete(installation.metadata.name)}><DeleteIcon /></IconButton>
            </div>
        </Card>
    );
}