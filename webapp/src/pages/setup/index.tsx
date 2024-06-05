import React, { useState } from 'react';
import './setup.scss';
import { Button, Option, Select } from '@mui/joy';
import SelectKubernetesOption from './select_kubernetes_option';
import GetCredentials from './get_credentials';

import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setCloudCredentials, setCloudProvider, setKubernetesOption } from '../../store/installation/bootstrapperSlice';
import { useNavigate } from 'react-router-dom';
import { useSetAndCheckCloudCredentialsMutation } from '../../client/bootstrapperApi';
import RTKConnectedLoadingSpinner from '../../components/common/rtk_connected_loading_spinner';

export default function SetupPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const cloudProvider = useSelector((state: RootState) => state.bootstrapper.cloudProvider)
    const kubernetesOption = useSelector((state: RootState) => state.bootstrapper.kubernetesOption)
    const credentials = useSelector((state: RootState) => state.bootstrapper.cloudCredentials)
    const [setCredentials, result] = useSetAndCheckCloudCredentialsMutation();
    const lastPageLocalStorage = localStorage.getItem('lastVisitedPage');
    const [lastVisitedPage, setShowLastVisitedPage] = useState(lastPageLocalStorage);
    const showLastVisitedPage = lastVisitedPage && lastVisitedPage !== '/' ? true : false;

    const handleSubmit = async () => {
        setCredentials({ credentials, cloudProvider });
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
                            {showLastVisitedPage &&
                                <div className="resume_or_start_over">
                                    <Button size="lg" color="primary" onClick={() => { navigate(lastVisitedPage!) }}>Continue Last Session</Button>
                                    <Button size="lg" color="danger" variant="outlined" onClick={() => setShowLastVisitedPage("")}>Start Over</Button>
                                </div>
                            }
                            {
                                !showLastVisitedPage &&
                                <>
                                    <label>Select Cloud Provider</label>
                                    <Select onChange={(event, newValue) => dispatch(setCloudProvider(newValue as string))} size="sm" placeholder="Cloud Provider">
                                        <Option value="aws">AWS</Option>
                                        {/* <Option value="gcp">GCP</Option> */}
                                        {/* <Option value="azure">Azure</Option> */}
                                        <Option value="custom">Custom</Option>
                                    </Select>
                                    <SelectKubernetesOption cloudProvider={cloudProvider} onChange={(value) => dispatch(setKubernetesOption(value))} />
                                    <GetCredentials cloudProvider={cloudProvider} kubernetesOption={kubernetesOption} onCredentialsChange={(credentials) => dispatch(setCloudCredentials(credentials))} />
                                    {cloudProvider && kubernetesOption && credentials.accessKeyId && credentials.accessKeySecret && !result.isSuccess && <Button onClick={handleSubmit} size="lg" color="primary">Submit</Button>}
                                    <RTKConnectedLoadingSpinner isLoading={result.isLoading} isSuccess={result.isSuccess} isError={result.isError} />
                                    {result.isSuccess && <Button size="lg" color="primary" onClick={() => { navigate(`/${cloudProvider}/${kubernetesOption}`) }}>Next Step</Button>}
                                </>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}