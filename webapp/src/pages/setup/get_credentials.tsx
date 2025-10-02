import React, { useState } from 'react';
import { Input, Option, Select, Textarea } from '@mui/joy';
import { CSSTransition } from 'react-transition-group';

type Props = {
    cloudProvider: string;
    kubernetesOption: string;
    onCredentialsChange: (credentials: { accessKeyId: string, accessKeySecret: string, sessionToken: string, kubeconfig: string }) => void;
};

function GetCredentials({ cloudProvider, kubernetesOption, onCredentialsChange }: Props) {
    const [credentials, setCredentials] = useState({
        accessKeyId: '',
        accessKeySecret: '',
        sessionToken: '',
        kubeconfig: '',
        kubeconfigType: '',
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

    const handleDropdownChange = (name: string, newValue: string) => {
        setCredentials({
            ...credentials,
            [name]: newValue,
        });

        onCredentialsChange({
            ...credentials,
            [name]: newValue,
        });
    }


    const kubeConfigEntry = () => {
        if (credentials.kubeconfigType === 'yaml') {
            return (
                <>
                    <label>Kubecfg string (YAML)</label>
                    <Textarea minRows={2} maxRows={20} name="kubeconfig" value={credentials.kubeconfig} onChange={handleInputChange} placeholder="kubecfg string" />
                </>
            )
        } else if (credentials.kubeconfigType === 'file') {
            return (
                <>
                    <label>Kubecfg file path</label>
                    <Input name="kubeconfig" placeholder={'~/.kube/config'} value={credentials.kubeconfig} onChange={handleInputChange}/>
                </>
            )
        }
    }

    return (
        <CSSTransition in={!!cloudProvider && (!!kubernetesOption || cloudProvider === 'custom')} timeout={500} classNames="fade" unmountOnExit>
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

                {(cloudProvider !== 'custom' && kubernetesOption === 'new') && (
                    <div className="credentials-row">
                        <div className="credentials-column">
                            <label>Session Token (optional)</label>
                            <Input name="sessionToken" value={credentials.sessionToken} onChange={handleInputChange} placeholder="Session Token" />
                        </div>
                    </div>
                )}

                {cloudProvider === 'custom' && (
                    <>
                        <label>Authenticate with...</label>
                        <Select size="sm" placeholder="Kubecfg option" onChange={(event, newValue) => { handleDropdownChange('kubeconfigType', newValue as string) }}>
                            <Option value="yaml">YAML</Option>
                            <Option value="file">File Path</Option>
                        </Select>
                        <div className="kube-entry">
                        {kubeConfigEntry()}

                        </div>
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
                        <div className="credentials-row">
                            <div className="credentials-column">
                                <label>Session Token (optional)</label>
                                <Input name="sessionToken" value={credentials.sessionToken} onChange={handleInputChange} placeholder="Session Token" />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </CSSTransition >
    );
}

export default GetCredentials;