import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/joy';

import { useMatch, useNavigate, useSearchParams } from 'react-router-dom';

import './create_workspace.scss';
import DBConnection, { DBConnectionDetails } from './db_connection';
import FilestoreConnection, { FilestoreConnectionDetails } from './filestore_connection';
import { CSSTransition } from 'react-transition-group';
import WorkspaceInfo, { WorkspaceInfoDetails } from './workspace_info';
import { useGetClusterQuery, useGetInstalledHelmReleasesQuery } from '../../client/bootstrapperApi';
import { useCreateMattermostWorkspaceMutation } from '../../client/dashboardApi';

export default function CreateWorkspacePage() {
    const navigate = useNavigate();
    const [searchParams,] = useSearchParams();
    const clusterName = searchParams.get('clusterName') || "";
    const cloudProvider = useMatch('/:cloudProvider/create_mattermost_workspace')?.params.cloudProvider!;
    const [dbConnection, setDBConnection] = useState({} as DBConnectionDetails);
    const [filestoreConnection, setFilestoreConnection] = useState({} as FilestoreConnectionDetails);
    const [workspaceInfo, setWorkspaceInfo] = useState({} as WorkspaceInfoDetails)

    const { data: cluster, isSuccess: isGetClusterSuccess } = useGetClusterQuery({ cloudProvider, clusterName }, {
        skip: cloudProvider === '' || !clusterName,
    });

    const { data: releases, isSuccess: isGetReleasesSuccess } = useGetInstalledHelmReleasesQuery({ clusterName, cloudProvider }, {
        skip: cloudProvider === '' || !clusterName,
    });

    const [createWorkspace, { isUninitialized: isCreateWorkspaceUninitialized, isLoading: isCreateWorkspaceLoading, isError: isCreateWorkspaceError, isSuccess: isCreateWorkspaceSuccess, reset: resetCreateWorkspace }] = useCreateMattermostWorkspaceMutation();

    const informationFetched = isGetClusterSuccess && isGetReleasesSuccess;

    const handleCreateWorkspace = () => {
        createWorkspace({ clusterName, cloudProvider, workspaceInfo: { ...filestoreConnection, ...dbConnection, ...workspaceInfo } })
    };

    const filestoreComplete = () => {
        if (filestoreConnection.filestoreOption === 'ExistingS3') {
            return !!filestoreConnection.s3FilestoreConfig?.url && !!filestoreConnection.s3FilestoreConfig?.bucket && !!filestoreConnection.s3FilestoreConfig?.accessKeyId && !!filestoreConnection.s3FilestoreConfig?.accessKeySecret;
        } else if (filestoreConnection.filestoreOption === 'InClusterLocal') {
            return filestoreConnection.localFilestoreConfig?.storageSize ? true : false;
        } else if (filestoreConnection.filestoreOption === 'InClusterExternal') {
            return !!filestoreConnection.localExternalFilestoreConfig?.volumeClaimName;
        }
        return false;
    }

    const formComplete = () => {
        let dbConnectionComplete = false;
        let workspaceInfoComplete = false;
        const filestoreConnectionComplete = filestoreComplete();

        if (dbConnection.dbConnectionOption === 'Existing' && !!dbConnection.existingDatabaseConfig?.dbConnectionString && !!dbConnection.existingDatabaseConfig?.dbReplicasConnectionString) {
            dbConnectionComplete = true;
        }

        if (dbConnection.dbConnectionOption === 'CreateForMeCNPG') {
            dbConnectionComplete = true;
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
                <Button size="lg" color="primary" onClick={() => navigate(`/${cloudProvider}/dashboard?clusterName=${cluster?.Name!}`)}>View In Dashboard</Button>
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
                <div><Button size="lg" color="primary" onClick={() => resetCreateWorkspace()}>Retry</Button></div>
            </>
        )
    }

    if (!isCreateWorkspaceUninitialized) {
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
                                {isCreateWorkspaceLoading && <LoadingCreationComponent />}
                                {isCreateWorkspaceSuccess && <SuccessComponent />}
                                {isCreateWorkspaceError && <ErrorComponent />}
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
                    <p>We&apos;re ready to create your first Mattermost Workspace! We&apos;ll need a few more details before we can proceed.</p>
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
                                    <DBConnection cloudProvider={cloudProvider} releases={releases || []} onChange={(change) => setDBConnection(change)} />
                                    <FilestoreConnection cloudProvider={cloudProvider} onChange={(change) => setFilestoreConnection(change)} />
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