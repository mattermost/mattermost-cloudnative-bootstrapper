import React, { useEffect } from 'react';
import { Mattermost, PatchMattermostWorkspaceRequest } from '../../types/Installation';
import { Button, DialogContent, DialogTitle, Input, Modal, ModalClose, ModalDialog } from '@mui/joy';
import './edit_installation_modal.scss';

type EditInstallationModalProps = {
    installation?: PatchMattermostWorkspaceRequest;
    onSubmit: (installationName: PatchMattermostWorkspaceRequest) => void;
    onChange: (installation: PatchMattermostWorkspaceRequest) => void;
    onClose: () => void;
    show: boolean;
};

export default function EditInstallationModal({ installation, onSubmit, show, onClose, onChange }: EditInstallationModalProps) {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const value = e.target.value;
        onChange({ ...installation!, [field]: value });
    }

    return (
        <Modal className="edit-installation-modal" open={show} onClose={onClose}>
            <ModalDialog size="lg" style={{width: '400px'}}>
                <ModalClose  onClick={onClose} />
                <DialogTitle>Edit installation</DialogTitle>
                <DialogContent>Update installation {installation?.name}</DialogContent>
                <div className="edit-inputs">
                    {/* Input fields for editing the installation? */}
                    <label>Image</label>
                    <Input size="sm" type="text" placeholder="Image" value={installation?.image} onChange={(e) => handleChange(e, 'image')} />
                    <label>Version</label>
                    <Input size="sm" type="text" placeholder="Version" value={installation?.version} onChange={(e) => handleChange(e, 'version')}/>
                    <label>Replicas</label>
                    <Input size="sm" type="text" placeholder="Replicas" value={installation?.replicas} onChange={(e) => handleChange(e, 'replicas')}/>
                    <label>Endpoint</label>
                    <Input size="sm" type="text" placeholder="Endpoint" value={installation?.endpoint} onChange={(e) => handleChange(e, 'endpoint')}/>
                    <Button className="submit-button" onClick={() => onSubmit(installation!)}>Save</Button>
                </div>
            </ModalDialog>
        </Modal>
    );
}