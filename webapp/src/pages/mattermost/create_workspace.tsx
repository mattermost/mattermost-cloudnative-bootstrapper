import React, { useEffect, useState } from 'react';
import { Button, CircularProgress } from '@mui/joy';


import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { createMattermostWorkspace, getInstalledHelmReleases, getNamespaces, setCreateWorkspaceRequestState } from '../../store/installation/bootstrapperSlice';

import { useNavigate, useSearchParams } from 'react-router-dom';

import './create_workspace.scss';
import { getEKSCluster } from '../../store/installation/awsSlice';
import DBConnection, { DBConnectionDetails } from './db_connection';
import FilestoreConnection, { FilestoreConnectionDetails } from './filestore_connection';
import { CSSTransition } from 'react-transition-group';
import WorkspaceInfo, { WorkspaceInfoDetails } from './workspace_info';


export default function CreateWorkspacePage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams,] = useSearchParams();
    const cluster = useSelector((state: RootState) => state.aws.eksCluster);
    const releases = useSelector((state: RootState) => state.bootstrapper.cluster.releases);
    const [dbConnection, setDBConnection] = useState({} as DBConnectionDetails);
    const [filestoreConnection, setFilestoreConnection] = useState({} as FilestoreConnectionDetails);
    const [workspaceInfo, setWorkspaceInfo] = useState({} as WorkspaceInfoDetails)
    const createWorkspaceRequestStatus = useSelector((state: RootState) => state.bootstrapper.createMattermostWorkspaceRequestStatus);

    useEffect(() => {
        if (typeof cluster === 'undefined') {
            const clusterName = searchParams.get('clusterName');
            if (!clusterName) {
                navigate('/aws');
                return;
            }
            dispatch(getEKSCluster(clusterName) as any);
            dispatch(getNamespaces(clusterName) as any);
            dispatch(getInstalledHelmReleases(clusterName) as any);
        } else {
            dispatch(getNamespaces(cluster?.Name as string) as any);
            dispatch(getInstalledHelmReleases(cluster?.Name as string) as any);
        }
    }, [])

    const informationFetched = useSelector((state: RootState) => {
        return state.bootstrapper.cluster.releasesRequestStatus === 'succeeded' && state.bootstrapper.cluster.namespacesRequestStatus === 'succeeded';
    })

    const handleCreateWorkspace = () => {
        dispatch(createMattermostWorkspace({ clusterName: cluster!.Name!, workspaceInfo: { ...filestoreConnection, ...dbConnection, ...workspaceInfo } }) as any);
    };

    const formComplete = () => {
        let dbConnectionComplete = false;
        let filestoreConnectionComplete = false;
        let workspaceInfoComplete = false;

        if (dbConnection.createDBForMe || (dbConnection.dbConnectionString && dbConnection.dbReplicasConnectionString)) {
            dbConnectionComplete = true;
        }

        if (filestoreConnection.createS3ForMe || (filestoreConnection.url && filestoreConnection.bucketName && filestoreConnection.accessKeyId && filestoreConnection.accessKeySecret)) {
            filestoreConnectionComplete = true;
        }

        if (workspaceInfo.installationName && workspaceInfo.domainName) {
            workspaceInfoComplete = true;
        }

        return dbConnectionComplete && filestoreConnectionComplete && workspaceInfoComplete;

    }

    const SuccessComponent = () => {
        return (
            <>
                <h3>Workspace created successfully!</h3>
                <Button size="lg" color="primary" onClick={() => navigate(`/dashboard?clusterName=${cluster?.Name!}`)}>View In Dashboard</Button>
            </>
        )
    }

    const LoadingCreationComponent = () => {
        return (
            <>
                <h3>Workspace creation in progress</h3>
                <div className="initial-fetch-spinner">
                    <CircularProgress size="lg" />
                </div>
            </>
        )
    }

    const ErrorComponent = () => {
        return (
            <>
                <h3>Workspace creation failed</h3>
                <div><Button size="lg" color="primary" onClick={() => dispatch(setCreateWorkspaceRequestState('idle'))}>Retry</Button></div>
            </>
        )
    }

    if (createWorkspaceRequestStatus !== 'idle') {
        return (
            <div className="CreateWorkspacePage">
                <div className="leftPanel">
                    <h1 className="title">Create Mattermost Workspace</h1>
                    <div className="description">
                        <p>Success! Your workspace has now been created. It may take a few minutes before the installation has reconciled and is fully available. In the meantime, you can inspect your new installation and any others in the dashboard.</p>
                    </div>
                </div>
                <div className="rightPanel">
                    <div className="setup-card">
                        <div className="setup-card-content">
                            <div className="creation-result">
                                {createWorkspaceRequestStatus === 'loading' && <LoadingCreationComponent />}
                                {createWorkspaceRequestStatus === 'succeeded' && <SuccessComponent />}
                                {createWorkspaceRequestStatus === 'failed' && <ErrorComponent />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="CreateWorkspacePage">
            <div className="leftPanel">
                <h1 className="title">Create Mattermost Workspace</h1>
                <div className="description">
                    <p>We're ready to create your first Mattermost Workspace! We'll need a few more details before we can proceed.</p>
                </div>
            </div>
            <div className="rightPanel">
                <div className="setup-card">
                    <div className="setup-card-content">
                        <div className="card-title">
                            <h3>Create Workspace</h3>
                        </div>
                        <div className="inputs">
                            {!informationFetched && <div className="initial-fetch-spinner"><CircularProgress size="lg" /></div>}
                            {informationFetched &&
                                <div>
                                    <WorkspaceInfo onChange={(change) => setWorkspaceInfo(change)} />
                                    <DBConnection releases={releases} onChange={(change) => setDBConnection(change)} />
                                    <FilestoreConnection onChange={(change) => setFilestoreConnection(change)} />
                                </div>
                            }
                        </div>
                        <CSSTransition in={formComplete()} timeout={500} classNames="fade" unmountOnExit>
                            <div className="submit-button">
                                <Button size="lg" color="primary" onClick={handleCreateWorkspace}>Create Workspace</Button>
                            </div>
                        </CSSTransition>
                    </div>
                </div>
            </div>
        </div>
    );
}