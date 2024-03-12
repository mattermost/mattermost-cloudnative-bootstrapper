import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RootState } from '../../store';
import { useDeleteInstallationMutation, useGetClustersQuery, useGetMattermostInstallationsForClusterQuery, usePatchInstallationMutation } from '../../client/dashboardApi';
import ClusterSelectDropdown from '../aws/cluster_select_dropdown';
import { setInstallationToEdit, setSelectedClusterName } from '../../store/installation/dashboardSlice';
import './dashboard.scss';
import InstallationCard from '../../components/dashboard/installation_card';
import CreateInstallationCard from '../../components/dashboard/create_installation_card';
import { Mattermost, PatchMattermostWorkspaceRequest } from '../../types/Installation';
import { Button, CircularProgress } from '@mui/joy';
import EditInstallationModal from '../../components/dashboard/edit_installation_modal';

export default function InstallationDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams,] = useSearchParams();
    const selectedClusterName = useSelector((state: RootState) => state.dashboard.selectedClusterName);
    const installationToEdit = useSelector((state: RootState) => state.dashboard.installationToEdit);
    const { data: installations, isLoading, error: installationsError, refetch: refetchInstallations } = useGetMattermostInstallationsForClusterQuery({ cloudProvider: 'aws', clusterName: selectedClusterName! }, {
        skip: !selectedClusterName, // Only fetch if cluster name is defined
        pollingInterval: 10000,
    });
    const [deleteInstallation, deleteInstallationData] = useDeleteInstallationMutation();
    const [patchInstallation, patchInstallationData] = usePatchInstallationMutation();

    const { data: clusters, isLoading: clustersLoading, isFetching, error: clustersError, refetch: refetchClusters } = useGetClustersQuery('aws');

    useEffect(() => {
        if (typeof selectedClusterName === 'undefined') {
            const clusterName = searchParams.get('clusterName');
            if (clusterName) {
                dispatch(setSelectedClusterName(clusterName) as any);
            }
        }
    }, [])

    useEffect(() => {
        if (selectedClusterName) {
            console.log("refetching");
            refetchInstallations();
        }
    }, [selectedClusterName])

    const handleEditInstallation = (installationName: string) => {
        const installation = installations?.filter((install) => install.metadata.name === installationName)[0];

        dispatch(setInstallationToEdit({
            image: installation?.status.image,
            version: installation?.status.version,
            replicas: installation?.status.replicas,
            endpoint: installation?.status.endpoint,
            name: installation?.metadata.name,
            license: '',
        }) as any);
    }


    const handleEditModalOnChange = (installation: PatchMattermostWorkspaceRequest) => {
        dispatch(setInstallationToEdit(installation) as any);
    }

    const handleOnCloseEditModal = () => {
        dispatch(setInstallationToEdit(undefined) as any);
    }

    const handleSubmitEditModal = (installation: PatchMattermostWorkspaceRequest) => {
        console.log("Submitting edit modal", installation);
        patchInstallation({ clusterName: selectedClusterName!, cloudProvider: 'aws', installationName: installation.name, patch: installation })
        handleOnCloseEditModal();
    }

    const installationsSection = (installs: Mattermost[]) => {
        return (
            <div className="installation-cards">{installs.map((install) => <InstallationCard installation={install} onClick={() => { }} onClickEdit={handleEditInstallation} onClickDelete={(installationName) => { deleteInstallation({ clusterName: selectedClusterName!, cloudProvider: 'aws', installationName }) }} />)}
                <CreateInstallationCard onClick={() => navigate(`/create_mattermost_workspace?clusterName=${selectedClusterName}`)} />
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
                selectedClusterName && !isLoading && installations && !installationsError && installations.length === 0 && <div className="installations-section-empty">No installations found. <Button onClick={() => navigate(`/create_mattermost_workspace?clusterName=${selectedClusterName}`)} variant="plain" className="create-new-inline">Create one now</Button></div>
            }
            {
                selectedClusterName && !isLoading && !isFetching && installationsError && <div className="installations-section-error">Error fetching installations</div>
            }
            <EditInstallationModal show={typeof installationToEdit !== 'undefined'} installation={installationToEdit} onClose={handleOnCloseEditModal} onChange={handleEditModalOnChange} onSubmit={handleSubmitEditModal} />
        </div>
    );
}