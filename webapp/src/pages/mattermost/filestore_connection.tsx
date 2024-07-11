import React, { useEffect } from 'react';
import { Input, Option, Select } from '@mui/joy';

import { FilestoreType, LocalExternalFileStore, LocalFileStore, S3FileStore } from '../../types/Installation';

import './filestore_connection.scss';

type FilestoreConnectionProps = {
    onChange: ({filestoreOption, s3FilestoreConfig, localFilestoreConfig, localExternalFilestoreConfig}: FilestoreConnectionDetails) => void;
    cloudProvider: string;
}

export type FilestoreConnectionDetails = {filestoreOption: string, localFilestoreConfig?: LocalFileStore, s3FilestoreConfig?: S3FileStore, localExternalFilestoreConfig?: LocalExternalFileStore};

export default function FilestoreConnection({onChange, cloudProvider}: FilestoreConnectionProps) {
    const [filestoreOption, setFilestoreOption] = React.useState('');
    const [s3FilestoreConfig, setS3FilestoreConfig] = React.useState<S3FileStore | undefined>(undefined);
    const [localFilestoreConfig, setLocalFilestoreConfig] = React.useState<LocalFileStore | undefined>(undefined);
    const [localExternalFilestoreConfig, setLocalExternalFilestoreConfig] = React.useState<LocalExternalFileStore | undefined>(undefined);

    useEffect(() => {
        onChange({filestoreOption, localFilestoreConfig, s3FilestoreConfig, localExternalFilestoreConfig});
    }, [filestoreOption, localFilestoreConfig, s3FilestoreConfig, localExternalFilestoreConfig])

    useEffect(() => {
        resetForm();
    }, [filestoreOption])
    
    const resetForm = () => {
        setLocalFilestoreConfig(undefined);
        setS3FilestoreConfig(undefined);
    }

    const handleExistingS3Change = (field:string, value: string) => {
        setS3FilestoreConfig({...s3FilestoreConfig, [field]: value} as S3FileStore);
    }

    const getFilestoreConnectionInputs = () => {
        switch(filestoreOption) {
            case FilestoreType.AWSS3:
                return (
                    <div className="coming-soon">S3 Bucket creation support coming soon...</div>
                )
            case FilestoreType.ExistingS3:
                return (
                    <>
                        <div className="filestore-type-descriptor">Provide connection details for your existing S3 bucket.</div>
                        <Input type="text" onChange={(e) => handleExistingS3Change('url', e.target.value)} placeholder="Filestore URL" />
                        <Input type="text" onChange={(e) => handleExistingS3Change('bucketName', e.target.value)} placeholder="Bucket Name" />
                        <Input type="text" onChange={(e) => handleExistingS3Change('accessKeyId', e.target.value)} placeholder="Access Key ID" />
                        <Input type="password" onChange={(e) => handleExistingS3Change('accessKeySecret', e.target.value)} placeholder="Access Key Secret" />
                    </>
                )
            case FilestoreType.InClusterExternal:
                return (
                    <>
                        <div className="filestore-type-descriptor">Provide information on an externally managed PVC backed storage.</div>
                        <div className="filestore-type-incluster-external-inputs" >
                            <Input type="text" onChange={((e) => { setLocalExternalFilestoreConfig({volumeClaimName: e.target.value})})} placeholder={"Volume Name"} />
                        </div>
                    </>
                )
            case FilestoreType.InClusterLocal:
                return (
                    <>
                        <div className="filestore-type-descriptor">The Mattermost Operator can configure its own local filestore via PVC-backed storage.</div>
                        <div className="filestore-type-disclaimer"> Note: This option is <strong>not</strong> recommended for production environments.</div>
                        <div className="filestore-type-incluster-local-inputs">
                            <Input type="text" onChange={(e) => { setLocalFilestoreConfig({storageSize: `${e.target.value}Gi`})}} placeholder={"Storage Size"}/> Gi
                        </div>
                    </>
                )
        }
    }

    return (
        <div className="filestore-connection">
            <label>Filestore Connection</label>
            <Select size="sm" placeholder="Choose type..." onChange={(e, newValue) => {
                setFilestoreOption(newValue as string)
            }}>
                <Option value={FilestoreType.InClusterLocal}>In-Cluster (Local)</Option>
                <Option value={FilestoreType.ExistingS3}>Use Existing (S3 Compatible)</Option>
                {cloudProvider === 'aws' && <Option value={FilestoreType.AWSS3}>Create For Me (S3)</Option>}
                <Option value={FilestoreType.InClusterExternal}>In-Cluster (External PVC)</Option>
            </Select>
            {getFilestoreConnectionInputs()}
        </div>
    )

}