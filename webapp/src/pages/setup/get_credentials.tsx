import React, { useState } from 'react';
import { Input, Textarea } from '@mui/joy';
import { CSSTransition } from 'react-transition-group';

type Props = {
    cloudProvider: string;
    kubernetesOption: string;
    onCredentialsChange: (credentials: { accessKeyId: string, accessKeySecret: string, kubecfg: string }) => void;
};

function GetCredentials({ cloudProvider, kubernetesOption, onCredentialsChange }: Props) {
    const [credentials, setCredentials] = useState({
        accessKeyId: '',
        accessKeySecret: '',
        kubecfg: '',
    });

    const handleInputChange = (event: any) => {
        const { name, value } = event.target;
        setCredentials(prevCredentials => ({
            ...prevCredentials,
            [name]: value,
        }));

        onCredentialsChange({
            ...credentials,
            [name]: value,
        });
    };

    return (
        <CSSTransition in={!!cloudProvider && !!kubernetesOption} timeout={500} classNames="fade" unmountOnExit>
        <div className="credentials">
            {(cloudProvider !== 'custom' && kubernetesOption === 'new') && (
                <div className="credentials-row">
                    <div className="credentials-column">
                        <label>Access Key ID</label>
                        <Input name="accessKeyId" value={credentials.accessKeyId} onChange={handleInputChange} placeholder="Access Key ID" />
                    </div>

                    <div className="credentials-column">
                        <label>Access Key Secret</label>
                        <Input name="accessKeySecret" value={credentials.accessKeySecret} onChange={handleInputChange} placeholder="Access Key Secret" type="password" />
                    </div>
                </div>
            )}

            {cloudProvider === 'custom' && (
                <>
                    <label>Kubecfg string</label>
                    <Textarea minRows={2} name="kubecfg" value={credentials.kubecfg} onChange={handleInputChange} placeholder="kubecfg string" />
                </>
            )}

            {cloudProvider !== 'custom' && kubernetesOption === 'existing' && (
                <>
                    <div className="credentials-row">
                        <div className="credentials-column">
                            <label>Access Key ID</label>
                            <Input name="accessKeyId" value={credentials.accessKeyId} onChange={handleInputChange} placeholder="Access Key ID" />
                        </div>

                        <div className="credentials-column">
                            <label>Access Key Secret</label>
                            <Input name="accessKeySecret" value={credentials.accessKeySecret} onChange={handleInputChange} placeholder="Access Key Secret" type="password" />
                        </div>
                    </div>
                </>
            )}
        </div>
        </CSSTransition >
    );
}

export default GetCredentials;