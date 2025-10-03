import React, { useEffect, useState } from 'react';
import './setup.scss';
import { Button, Option, Select } from '@mui/joy';
import SelectKubernetesOption from './select_kubernetes_option';
import GetCredentials from './get_credentials';

import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setCloudCredentials, setCloudProvider, setKubernetesOption, resetState } from '../../store/installation/bootstrapperSlice';
import { resetAWSState } from '../../store/installation/awsSlice';
import { useNavigate } from 'react-router-dom';
import { useSetAndCheckCloudCredentialsMutation, useCheckExistingSessionQuery, useClearSessionMutation } from '../../client/bootstrapperApi';
import RTKConnectedLoadingSpinner from '../../components/common/rtk_connected_loading_spinner';

export default function SetupPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const cloudProvider = useSelector((state: RootState) => state.bootstrapper.cloudProvider)
    const kubernetesOption = useSelector((state: RootState) => state.bootstrapper.kubernetesOption)
    const credentials = useSelector((state: RootState) => state.bootstrapper.cloudCredentials)
    const [setCredentials, result] = useSetAndCheckCloudCredentialsMutation();
    const [clearSession, clearResult] = useClearSessionMutation();
    const lastPageLocalStorage = localStorage.getItem('lastVisitedPage');
    const [lastVisitedPage, setShowLastVisitedPage] = useState(lastPageLocalStorage);
    const [userStartedNewSession, setUserStartedNewSession] = useState(false);
    const showLastVisitedPage = lastVisitedPage && lastVisitedPage !== '/' ? true : false;
    
    // Check for existing server-side session
    const { data: sessionData, isLoading: isSessionLoading, refetch: refetchSession } = useCheckExistingSessionQuery();
    const hasServerSession = sessionData?.hasState && sessionData.provider && sessionData.clusterName;

    useEffect(() => {
        if (cloudProvider === 'custom') {
            dispatch(setKubernetesOption('existing'));
        } else {
            dispatch(setKubernetesOption(''));
        }
    }, [cloudProvider, dispatch]);

    const handleSubmit = async () => {
        console.log(credentials, cloudProvider);
        setCredentials({ credentials, cloudProvider });
    }

    const formComplete = () => {
        const base = !!cloudProvider && !!kubernetesOption && !result.isSuccess;
        if (cloudProvider !== 'custom') {
            return base && !!credentials?.accessKeyId && !!credentials?.accessKeySecret;
        } else {
            return base && !!credentials?.kubeconfig && !!credentials?.kubeconfigType;
        }
    }

    const handleContinueServerSession = () => {
        if (sessionData?.provider && sessionData?.clusterName) {
            // Navigate to the dashboard for the existing session
            navigate(`/${sessionData.provider}/dashboard?clusterName=${sessionData.clusterName}`);
        }
    }

    const handleStartNewSession = async () => {
        try {
            // Clear server-side session first
            await clearSession().unwrap();
            
            // Clear localStorage
            localStorage.removeItem('lastVisitedPage');
            
            // Reset Redux state
            dispatch(resetState());
            dispatch(resetAWSState());
            
            // Clear local component state
            setShowLastVisitedPage("");
            setUserStartedNewSession(true);
            
            // Refetch session data to update hasServerSession
            refetchSession();
        } catch (error) {
            console.error('Failed to clear server session:', error);
            // Still clear local state even if server clear fails
            localStorage.removeItem('lastVisitedPage');
            dispatch(resetState());
            dispatch(resetAWSState());
            setShowLastVisitedPage("");
            setUserStartedNewSession(true);
        }
    }

    const showResumeOptions = showLastVisitedPage || hasServerSession;

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
                            {isSessionLoading && <RTKConnectedLoadingSpinner isLoading={true} isSuccess={false} isError={false} />}
                            
                            {!isSessionLoading && showResumeOptions &&
                                <div className="resume_or_start_over">
                                    {hasServerSession && (
                                        <>
                                            <div className="session-info">
                                                <p>Existing session found: <strong>{sessionData.provider}</strong> cluster <strong>{sessionData.clusterName}</strong></p>
                                            </div>
                                            <Button size="lg" color="primary" onClick={handleContinueServerSession}>
                                                Continue Existing Session
                                            </Button>
                                        </>
                                    )}
                                    {showLastVisitedPage && (
                                        <Button size="lg" color="primary" variant="soft" onClick={() => { navigate(lastVisitedPage!) }}>
                                            Continue From Last Page
                                        </Button>
                                    )}
                                    <Button 
                                        size="lg" 
                                        color="danger" 
                                        variant="outlined" 
                                        onClick={handleStartNewSession}
                                        loading={clearResult.isLoading}
                                        disabled={clearResult.isLoading}
                                    >
                                        Start New Session
                                    </Button>
                                </div>
                            }
                            
                            {!isSessionLoading && !showResumeOptions &&
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
                                    {formComplete() && <Button onClick={handleSubmit} size="lg" color="primary">Submit</Button>}
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