import { Input, Textarea } from '@mui/joy';
import React, { useEffect } from 'react';


type WorkspaceInfoProps = {
    onChange: ({installationName, domainName, enterpriseLicense}: WorkspaceInfoDetails) => void;
}

export type WorkspaceInfoDetails = { installationName: string, domainName: string, enterpriseLicense: string, version: string };

export default function WorkspaceInfo({onChange}: WorkspaceInfoProps) {
    const [installationName, setInstallationName] = React.useState('');
    const [domainName, setDomainName] = React.useState('');
    const [enterpriseLicense, setEnterpriseLicense] = React.useState('');
    const [mattermostVersion, setMattermostVersion] = React.useState('');

    const handleOnChange = () => {
        onChange({installationName, domainName, enterpriseLicense, version: mattermostVersion});
    }

    useEffect(() => {
        handleOnChange();
    }, [installationName, domainName, enterpriseLicense]);

    return (
        <div className="workspace-info">
            <label>Workspace Info</label>
            <Input type="text" required={true} onChange={(e) => setInstallationName(e.target.value)} placeholder="Installation Name*" />
            <Input type="text"required={true} placeholder="Domain Name*" onChange={(e) =>  setDomainName(e.target.value)} />
            <Input type="text" placeholder="Mattermost Version" onChange={(e) => setMattermostVersion(e.target.value)} />
            <Textarea minRows={2} onChange={(e) => setEnterpriseLicense(e.target.value)} placeholder="Mattermost Enterprise License" />
            {/* TODO: Add size selector like we did for node groups */}
        </div>
    )
}