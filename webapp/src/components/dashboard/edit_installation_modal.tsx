import React, { useEffect } from 'react';
import { Mattermost, PatchMattermostWorkspaceRequest, LocalFileStore, FileStore, S3FileStore } from '../../types/Installation';
import { Button, DialogContent, DialogTitle, Input, Modal, ModalClose, ModalDialog } from '@mui/joy';
import './edit_installation_modal.scss';
import FilestoreConnection, { FilestoreConnectionDetails } from '../../pages/mattermost/filestore_connection';
import { useGetMattermostInstallationSecretsQuery } from '../../client/dashboardApi';
import { useSearchParams } from 'react-router-dom';

type EditInstallationModalProps = {
    installation?: Mattermost;
    cloudProvider: string;
    onSubmit: (installationName: PatchMattermostWorkspaceRequest) => void;
    onChange?: (installation: PatchMattermostWorkspaceRequest) => void;
    onClose: () => void;
    show: boolean;
};

export default function EditInstallationModal({ installation, onSubmit, show, onClose, onChange, cloudProvider }: EditInstallationModalProps) {
    const [searchParams,] = useSearchParams();
    const clusterName = searchParams.get('clusterName') || "";
    const {data: installationSecrets, isSuccess} = useGetMattermostInstallationSecretsQuery({clusterName: clusterName, cloudProvider, installationName: installation?.metadata?.name!}, { refetchOnMountOrArgChange: true });
    
    const [installationPatch, setInstallationPatch] = React.useState({
        image: installation?.status.image,
        version: installation?.status.version,
        replicas: installation?.status.replicas,
        endpoint: installation?.status.endpoint,
        name: installation?.metadata.name,
        license: '',
        fileStore: installation?.spec.fileStore,
        fileStorePatch: {},
    } as PatchMattermostWorkspaceRequest);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const value = e.target.value;
        setInstallationPatch({ ...installationPatch, [field]: value});
    }

    const buildExistingFilestoreObject = (filestore: FileStore) => {
        if (filestore.local) {
            return {
                local: filestore.local as LocalFileStore
            } as FileStore;
        } else if (filestore.external) {
            return {
                external: {
                    ...filestore.external,
                    accessKeySecret: installationSecrets?.filestoreSecret.data.secretkey,
                    accessKeyId: installationSecrets?.filestoreSecret.data.accesskey,

                } as S3FileStore
            } as FileStore;
        } else if (filestore.externalVolume) {
            return {
                externalVolume: filestore.externalVolume
            } as FileStore;
        }
    }

    const handleFilestoreConnectionChange = (change: FilestoreConnectionDetails) => {
        setInstallationPatch({...installationPatch, fileStorePatch: change});
    }

    return (
        <Modal className="edit-installation-modal" open={show} onClose={onClose}>
            <ModalDialog size="lg" style={{width: '400px'}}>
                <ModalClose  onClick={onClose} />
                <DialogTitle>Edit installation</DialogTitle>
                <DialogContent>Update installation {installationPatch?.name}</DialogContent>
                <div className="edit-inputs">
                    {/* Input fields for editing the installation? */}
                    <label>Image</label>
                    <Input size="sm" type="text" placeholder="Image" value={installationPatch?.image} onChange={(e) => handleChange(e, 'image')} />
                    <label>Version</label>
                    <Input size="sm" type="text" placeholder="Version" value={installationPatch?.version} onChange={(e) => handleChange(e, 'version')}/>
                    <label>Replicas</label>
                    <Input size="sm" type="text" placeholder="Replicas" value={installationPatch?.replicas} onChange={(e) => handleChange(e, 'replicas')}/>
                    <label>Endpoint</label>
                    <Input size="sm" type="text" placeholder="Endpoint" value={installationPatch?.endpoint} onChange={(e) => handleChange(e, 'endpoint')}/>
                    {isSuccess && <FilestoreConnection isEdit={true} cloudProvider={cloudProvider} existingFilestore={buildExistingFilestoreObject(installationPatch?.fileStore!)} onChange={(change) => { handleFilestoreConnectionChange(change)}} />}
                    <Button className="submit-button" onClick={() => onSubmit(installationPatch!)}>Save</Button>
                </div>
            </ModalDialog>
        </Modal>
    );
}