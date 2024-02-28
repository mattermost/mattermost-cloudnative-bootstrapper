import React from 'react';
import './setup.scss';
import { Button, Option, Select } from '@mui/joy';
import SelectKubernetesOption from './select_kubernetes_option';
import GetCredentials from './get_credentials';

import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setAndCheckCloudCredentials, setCloudCredentials, setCloudProvider, setKubernetesOption } from '../../store/installation/bootstrapperSlice';
import ConnectedLoadingSpinner from '../../components/common/connected_loading_spinner';
import { useNavigate } from 'react-router-dom';


export default function SetupPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const cloudProvider = useSelector((state: RootState) => state.bootstrapper.cloudProvider)
    const kubernetesOption = useSelector((state: RootState) => state.bootstrapper.kubernetesOption)
    const credentials = useSelector((state: RootState) => state.bootstrapper.cloudCredentials)
    const requestState = useSelector((state: RootState) => state.bootstrapper.status)

    const handleSubmit = async () => {
        dispatch(setAndCheckCloudCredentials({credentials, cloudProvider}) as any)
    }

    return (
        <div className="SetupPage">
            <div className="leftPanel">
                <h1 className="title">Mattermost Operator Bootstrapper</h1>
                <div className="description">
                    <p>The Mattermost Operator Bootstrapper will help you to create new, or connect to an existing Kubernetes cluster in order to deploy the Mattermost Operator, all dependencies, and some optional helper utilities. Fill out the information on the right to get started.</p>
                </div>
            </div>
            <div className="rightPanel">
                <div className="setup-card">
                    <div className="setup-card-content">
                        <div className="card-title">
                            <h3>Setup</h3>
                        </div>
                        <div className="inputs">
                            <label>Select Cloud Provider</label>
                            <Select onChange={(event, newValue) => dispatch(setCloudProvider(newValue as string))} size="sm" placeholder="Cloud Provider">
                                <Option value="aws">AWS</Option>
                                <Option value="gcp">GCP</Option>
                                <Option value="azure">Azure</Option>
                                <Option value="custom">Custom</Option>
                            </Select>
                            <SelectKubernetesOption cloudProvider={cloudProvider} onChange={(value) => dispatch(setKubernetesOption(value))} />
                            <GetCredentials cloudProvider={cloudProvider} kubernetesOption={kubernetesOption} onCredentialsChange={(credentials) => dispatch(setCloudCredentials(credentials))}/>
                            {cloudProvider && kubernetesOption && credentials.accessKeyId && credentials.accessKeySecret && requestState !== 'succeeded' && <Button onClick={handleSubmit} size="lg" color="primary">Submit</Button>}
                            <ConnectedLoadingSpinner state={requestState} />
                            {requestState === 'succeeded' && <Button size="lg" color="primary" onClick={() => {navigate(`/${cloudProvider}/${kubernetesOption}`)}}>Next Step</Button>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}