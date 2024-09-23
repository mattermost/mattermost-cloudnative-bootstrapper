import React from 'react';
import { Card } from '@mui/joy';
import ControlPointIcon from '@mui/icons-material/ControlPoint';


type CreateInstallationCardProps = {
    onClick: () => void;
};

export default function CreateInstallationCard({onClick}: CreateInstallationCardProps) {
    return (
        <Card data-testid={'create-installation-card-root'} onClick={onClick} role="button" className="installation-card">
            <div className="create-installation-card-icon">
                <ControlPointIcon />
            </div>
        </Card>
    );
}