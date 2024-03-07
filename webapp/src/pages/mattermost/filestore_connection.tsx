import React, { useEffect } from 'react';
import { Input, Option, Select } from '@mui/joy';

type FilestoreConnectionProps = {
    onChange: ({url, bucketName, accessKeyId, accessKeySecret, createS3ForMe}: FilestoreConnectionDetails) => void;
}

export type FilestoreConnectionDetails = {url: string, bucketName: string, accessKeyId: string, accessKeySecret: string, createS3ForMe: boolean}

export default function FilestoreConnection({onChange}: FilestoreConnectionProps) {
    const [url, setUrl] = React.useState('');
    const [bucketName, setBucketName] = React.useState('');
    const [accessKeyId, setAccessKeyId] = React.useState('');
    const [accessKeySecret, setAccessKeySecret] = React.useState('');
    const [createForMe, setCreateForMe] = React.useState<null | boolean>(null);


    useEffect(() => {
        onChange({url, bucketName, accessKeyId, accessKeySecret, createS3ForMe: !!createForMe});
    
    }, [url, bucketName, accessKeyId, accessKeySecret, createForMe])

    return (
        <div className="filestore-connection">
            <label>Filestore Connection</label>
            <Select size="sm" placeholder="Choose type..." onChange={(e, newValue) => {
                if ((newValue as string) === 'CreateForMe') {
                    setCreateForMe(true);
                    setUrl('');
                    setAccessKeyId('');
                    setAccessKeySecret('');
                    setBucketName('');
                } else {
                    setCreateForMe(false);
                }
            }}>
                <Option value="CreateForMe">Create For Me</Option>
                <Option value="Existing">Use Existing</Option>
            </Select>
            {createForMe === false && <>
                <Input type="text" onChange={(e) => setUrl(e.target.value)} placeholder="Filestore URL" />
                <Input type="text" onChange={(e) => setBucketName(e.target.value)} placeholder="Bucket Name" />
                <Input type="text" onChange={(e) => setAccessKeyId(e.target.value)} placeholder="Access Key ID" />
                <Input type="text" onChange={(e) => setAccessKeySecret(e.target.value)} placeholder="Access Key Secret" />
            </>}
        </div>
    )

}