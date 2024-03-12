import { Card } from '@mui/joy';
import React from 'react';
import ControlPointIcon from '@mui/icons-material/ControlPoint';


type CreateInstallationCardProps = {
    onClick: () => void;
};

export default function CreateInstallationCard({onClick}: CreateInstallationCardProps) {
    return (
        <Card onClick={onClick} className="installation-card">
            <div className="create-installation-card-icon">
                <ControlPointIcon />
            </div>
        </Card>
    );
}