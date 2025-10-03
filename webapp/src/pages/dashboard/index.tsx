import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { RootState } from '../../store';
import { useDeleteInstallationMutation, useGetClustersQuery, useGetMattermostInstallationsForClusterQuery, usePatchInstallationMutation } from '../../client/dashboardApi';
import ClusterSelectDropdown from '../aws/cluster_select_dropdown';
import { setInstallationToEdit, setSelectedClusterName } from '../../store/installation/dashboardSlice';
import InstallationCard from '../../components/dashboard/installation_card';
import CreateInstallationCard from '../../components/dashboard/create_installation_card';
import { Mattermost, PatchMattermostWorkspaceRequest } from '../../types/Installation';
import { Button, CircularProgress } from '@mui/joy';
import EditInstallationModal from '../../components/dashboard/edit_installation_modal';
import LogViewerModal from '../../components/dashboard/logs_modal';
import './dashboard.scss';

export default function InstallationDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams,] = useSearchParams();
    const cloudProvider = useMatch('/:cloudProvider/dashboard')?.params.cloudProvider!;
    const selectedClusterName = useSelector((state: RootState) => state.dashboard.selectedClusterName);
    const installationToEdit = useSelector((state: RootState) => state.dashboard.installationToEdit);
    const [installationToLog, setInstallationToLog] = useState<Mattermost | undefined>(undefined);
    const { data: installations, isLoading, error: installationsError, refetch: refetchInstallations } = useGetMattermostInstallationsForClusterQuery({ cloudProvider, clusterName: selectedClusterName! }, {
        skip: !selectedClusterName, // Only fetch if cluster name is defined
        pollingInterval: 10000,
    });
    const [deleteInstallation, deleteInstallationData] = useDeleteInstallationMutation();
    const [patchInstallation, patchInstallationData] = usePatchInstallationMutation();

    const { data: clusters, isFetching } = useGetClustersQuery(cloudProvider);


    useEffect(() => {
        if (typeof selectedClusterName === 'undefined') {
            const clusterName = searchParams.get('clusterName');
            if (clusterName) {
                dispatch(setSelectedClusterName(clusterName) as any);
            }
        }
    }, [selectedClusterName, dispatch, searchParams])

    useEffect(() => {
        if (selectedClusterName) {
            refetchInstallations();
        }
    }, [selectedClusterName]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleEditInstallation = (installationName: string) => {
        const installation = installations?.filter((install) => install.metadata.name === installationName)[0];

        dispatch(setInstallationToEdit(installation));
    }

    const handleOnClickLogs = (installationName: string) => {
        const installation = installations?.filter((install) => install.metadata.name === installationName)[0];
        setInstallationToLog(installation);
    }

    const handleEditModalOnChange = (installation: PatchMattermostWorkspaceRequest) => {
        // dispatch(setInstallationToEdit(installation) as any);
    }

    const handleOnCloseEditModal = () => {
        dispatch(setInstallationToEdit(undefined) as any);
    }

    const handleSubmitEditModal = (installation: PatchMattermostWorkspaceRequest) => {
        patchInstallation({ clusterName: selectedClusterName!, cloudProvider, installationName: installation.name, patch: installation })
        handleOnCloseEditModal();
    }

    const installationsSection = (installs: Mattermost[]) => {
        return (
            <div className="installation-cards">{installs.map((install) => <InstallationCard key={install.metadata.name} installation={install} onClick={() => { }} onClickEdit={handleEditInstallation} onClickDelete={(installationName) => { deleteInstallation({ clusterName: selectedClusterName!, cloudProvider, installationName }) }} onClickLogs={handleOnClickLogs} />)}
                <CreateInstallationCard onClick={() => navigate(`/${cloudProvider}/create_mattermost_workspace?clusterName=${selectedClusterName}`)} />
            </div>
        )
    }

    return (
        <div className="Dashboard">
            <div className="title">
                <h1>Mattermost Dashboard</h1>
                <Button variant="plain" className="start-bootstrapper-button" size="md" onClick={() => navigate('/')}>Start Bootstrapper</Button>
            </div>
            <ClusterSelectDropdown onChange={(newValue) => { dispatch(setSelectedClusterName(newValue) as any) }} clusters={clusters || []} />
            {
                selectedClusterName && (isFetching || deleteInstallationData.isLoading || patchInstallationData.isLoading) && <div className="installations-section-loading"><CircularProgress /></div>
            }
            {
                selectedClusterName && !isLoading && !isFetching && !deleteInstallationData.isLoading && installations && !installationsError && installations.length > 0 && installationsSection(installations)
            }
            {
                selectedClusterName && !isLoading && installations && !installationsError && installations.length === 0 && <div className="installations-section-empty">No installations found. <Button onClick={() => navigate(`/${cloudProvider}/create_mattermost_workspace?clusterName=${selectedClusterName}`)} variant="plain" className="create-new-inline">Create one now</Button></div>
            }
            {
                selectedClusterName && !isLoading && !isFetching && installationsError && <div className="installations-section-error">Error fetching installations</div>
            }
            {installationToLog && <LogViewerModal installation={installationToLog} clusterName={selectedClusterName!} cloudProvider={cloudProvider} onClose={() => setInstallationToLog(undefined)}/>}
            {typeof installationToEdit !== 'undefined' && <EditInstallationModal show={typeof installationToEdit !== 'undefined'} installation={installationToEdit} onClose={handleOnCloseEditModal} onChange={handleEditModalOnChange} onSubmit={handleSubmitEditModal} cloudProvider={cloudProvider}/>}
        </div>
    );
}