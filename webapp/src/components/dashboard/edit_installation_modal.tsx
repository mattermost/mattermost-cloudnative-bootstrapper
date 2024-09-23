import React from 'react';
import { Mattermost, PatchMattermostWorkspaceRequest, LocalFileStore, FileStore, S3FileStore, ExistingDBConnection } from '../../types/Installation';
import { Button, DialogContent, DialogTitle, Input, Modal, ModalClose, ModalDialog, Textarea } from '@mui/joy';
import './edit_installation_modal.scss';
import FilestoreConnection, { FilestoreConnectionDetails } from '../../pages/mattermost/filestore_connection';
import { useGetMattermostInstallationSecretsQuery } from '../../client/dashboardApi';
import { useSearchParams } from 'react-router-dom';
import DBConnection from '../../pages/mattermost/db_connection';
import { useGetInstalledHelmReleasesQuery } from '../../client/bootstrapperApi';

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
    const {data: releases, isSuccess: isGetReleasesSuccess} = useGetInstalledHelmReleasesQuery({clusterName, cloudProvider}, { skip: cloudProvider === '' || !clusterName });
    
    const [installationPatch, setInstallationPatch] = React.useState({
        image: installation?.status.image,
        version: installation?.status.version,
        replicas: installation?.status.replicas,
        endpoint: installation?.status.endpoint,
        name: installation?.metadata.name,
        fileStore: installation?.spec.fileStore,
        fileStorePatch: {},
        databasePatch: {},
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

    const buildExistingDatabaseObject = (database: ExistingDBConnection) => {
        if (typeof installationSecrets?.databaseSecret !== 'undefined') {
            return {
                dbConnectionString: installationSecrets.databaseSecret?.data?.DB_CONNECTION_STRING,
                dbReplicasConnectionString: installationSecrets.databaseSecret?.data?.MM_SQLSETTINGS_DATASOURCEREPLICAS,
            } as ExistingDBConnection;
        }

        return undefined;
    }

    const buildExistingLicenseObject = () => {
        if (typeof installationSecrets?.licenseSecret !== 'undefined' && typeof installationPatch.license === 'undefined') {
            return installationSecrets.licenseSecret?.data?.license;
        } else {
            return installationPatch.license || '';
        }
    }

    const handleFilestoreConnectionChange = (change: FilestoreConnectionDetails) => {
        setInstallationPatch({...installationPatch, fileStorePatch: change});
    }

    const handleDatabaseConnectionChange = (change: ExistingDBConnection) => {
        setInstallationPatch({...installationPatch, databasePatch: change});
    }

    return (
        <Modal className="edit-installation-modal" open={show} onClose={onClose}>
            <ModalDialog size="lg" style={{width: '400px'}}>
                <ModalClose  onClick={onClose} />
                <DialogTitle>Edit installation</DialogTitle>
                <DialogContent>Update installation {installationPatch?.name}</DialogContent>
                <div className="edit-inputs">
                    <label htmlFor={'image'}>Image</label>
                    <Input id={'image'} size="sm" type="text" placeholder="Image" value={installationPatch?.image} onChange={(e) => handleChange(e, 'image')} />
                    <label htmlFor={'version'}>Version</label>
                    <Input id={'version'} size="sm" type="text" placeholder="Version" value={installationPatch?.version} onChange={(e) => handleChange(e, 'version')}/>
                    <label htmlFor='replicas'>Replicas</label>
                    <Input id='replicas' size="sm" type="text" placeholder="Replicas" value={installationPatch?.replicas} onChange={(e) => handleChange(e, 'replicas')}/>
                    <label htmlFor='endpoint'>Endpoint</label>
                    <Input id='endpoint' size="sm" type="text" placeholder="Endpoint" value={installationPatch?.endpoint} onChange={(e) => handleChange(e, 'endpoint')}/>
                    <label htmlFor='license'>License</label>
                    {isSuccess && <Textarea id='license' minRows={2} maxRows={10} placeholder="License" value={buildExistingLicenseObject()} onChange={(e) => handleChange(e as unknown as React.ChangeEvent<HTMLInputElement>, 'license')} />}
                    {isSuccess && <FilestoreConnection isEdit={true} cloudProvider={cloudProvider} existingFilestore={buildExistingFilestoreObject(installationPatch?.fileStore!)} onChange={(change) => { handleFilestoreConnectionChange(change)}} />}
                    {isSuccess && isGetReleasesSuccess && <DBConnection isEdit={true} cloudProvider={cloudProvider} onChange={({existingDatabaseConfig, dbConnectionOption}) => {handleDatabaseConnectionChange(existingDatabaseConfig!)}} existingDatabase={buildExistingDatabaseObject(installationPatch?.databasePatch!)} releases={releases}/>}
                    <Button className="submit-button" onClick={() => onSubmit(installationPatch!)}>Save</Button>
                </div>
            </ModalDialog>
        </Modal>
    );
}