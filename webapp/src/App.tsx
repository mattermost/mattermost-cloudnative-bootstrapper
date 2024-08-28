import * as React from 'react';
import { CssVarsProvider as JoyCssVarsProvider } from '@mui/joy/styles';
import {
  experimental_extendTheme as materialExtendTheme,
  Experimental_CssVarsProvider as MaterialCssVarsProvider,
  THEME_ID as MATERIAL_THEME_ID,
} from '@mui/material/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { Route, Routes, useLocation } from 'react-router-dom';
import useScript from './useScript';

import SetupPage from './pages/setup';
import BootstrapperHeader from './components/BootstrapperHeader';
import ClusterSummaryPage from './pages/cluster/cluster_summary';
import InstallOperatorsPage from './pages/install_operators/install_operators';
import ExistingAWSPage from './pages/aws/choose_existing';
import CreateWorkspacePage from './pages/mattermost/create_workspace';
import InstallationDashboard from './pages/dashboard';
import RehydrateAndRedirect from './components/state';

const useEnhancedEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

const materialTheme = materialExtendTheme();

export default function App() {
  const status = useScript(`https://unpkg.com/feather-icons`);
  const location = useLocation();
  const [initialLoad, setInitialLoad] = React.useState(true);

  React.useEffect(() => {
    if (initialLoad) {
      setInitialLoad(false); // Prevent redirection on further navigation
    }
  }, [initialLoad]); // Only run once on initial load

  React.useEffect(() => {
    if (!initialLoad) { //Prevents infinite loop on load
      localStorage.setItem('lastVisitedPage', `${location.pathname}${location.search}`);
    }
  }, [location, initialLoad]);

  useEnhancedEffect(() => {
    // Feather icon setup: https://github.com/feathericons/feather#4-replace
    // @ts-ignore
    if (typeof feather !== 'undefined') {
      // @ts-ignore
      feather.replace();
    }
  }, [status]);


  return (
    <MaterialCssVarsProvider theme={{ [MATERIAL_THEME_ID]: materialTheme }}>
      <RehydrateAndRedirect />
      <JoyCssVarsProvider disableTransitionOnChange>
        <CssBaseline />
        <Routes>
          <Route path="/:cloudProvider/existing" element={
            <>
              <BootstrapperHeader currentStep={'create_eks_cluster'} />
              <ExistingAWSPage />
            </>
          } />
          {/* 
            TODO: Uncomment when we intend to fully support
          
          <Route path="/aws/new" element={
            <>
              <BootstrapperHeader currentStep={'create_eks_cluster'} />
              <AWSPage />
            </>
          } />
          <Route path="/aws/creating_cluster" element={
            <>
              <BootstrapperHeader currentStep={'wait_for_eks'} />
              <CreatingClusterLoadingScreen />
            </>
          } />
          <Route path="/aws/provision_cluster" element={
            <>
              <BootstrapperHeader currentStep={'provision_cluster'} />
              <ProvisionClusterPage />
            </>
          } /> */}
          <Route path="/:cloudProvider/cluster/summary" element={
            <>
              <BootstrapperHeader currentStep={'cluster_summary'} />
              <ClusterSummaryPage />
            </>
          } />
          <Route path="/:cloudProvider/cluster/operators" element={
            <>
              <BootstrapperHeader currentStep={'install_mattermost'} />
              <InstallOperatorsPage />
            </>
          } />
          <Route path="/:cloudProvider/create_mattermost_workspace" element={
            <>
              <BootstrapperHeader currentStep={'create_mattermost_workspace'} />
              <CreateWorkspacePage />
            </>
          } />
          <Route path="/:cloudProvider/dashboard" element={
            <InstallationDashboard />
          } />
          <Route path="/" element={
            <>
              <BootstrapperHeader currentStep={'setup'} />
              <SetupPage />
            </>
          }>
          </Route>
        </Routes>
      </JoyCssVarsProvider>
    </MaterialCssVarsProvider>
  );
}