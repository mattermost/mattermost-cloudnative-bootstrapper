import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RootState } from '../../store';
import { useGetClustersQuery, useGetMattermostInstallationsForClusterQuery } from '../../client/dashboardApi';
import { getEKSClusters, setEksClusterName, setSelectedARN } from '../../store/installation/awsSlice';
import { Option, Select } from '@mui/joy';
import ClusterSelectDropdown from '../aws/cluster_select_dropdown';
import { setSelectedClusterName } from '../../store/installation/dashboardSlice';
import './dashboard.scss';


export default function InstallationDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams,] = useSearchParams();
    const selectedClusterName = useSelector((state: RootState) => state.dashboard.selectedClusterName);
    const { data: installations, isLoading, error, refetch } = useGetMattermostInstallationsForClusterQuery({cloudProvider: 'aws', clusterName: selectedClusterName!}, {
        skip: !selectedClusterName // Only fetch if cluster name is defined
    });

    const { data: clusters, isLoading: clustersLoading, error: clustersError, refetch: refetchClusters } = useGetClustersQuery('aws');

    console.log(clusters, clustersLoading, clustersError)

    console.log(installations, isLoading, error);

    useEffect(() => {
        if (typeof selectedClusterName === 'undefined') {
            const clusterName = searchParams.get('clusterName');
            if (clusterName) {
                dispatch(setSelectedClusterName(clusterName) as any);
            }
        }
    }, [])

    return (
        <div className="Dashboard">
        <h1>Installation Dashboard</h1>
            <ClusterSelectDropdown onChange={(newValue) => {dispatch(setSelectedClusterName(newValue) as any)}} clusters={clusters || []}/>
        </div>
    );
}