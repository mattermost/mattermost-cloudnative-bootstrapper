import * as React from 'react';
import { CssVarsProvider as JoyCssVarsProvider } from '@mui/joy/styles';
import {
  experimental_extendTheme as materialExtendTheme,
  Experimental_CssVarsProvider as MaterialCssVarsProvider,
  THEME_ID as MATERIAL_THEME_ID,
} from '@mui/material/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { Route, Routes } from 'react-router-dom';
import useScript from './useScript';

import SetupPage from './pages/setup';
import BootstrapperHeader from './components/BootstrapperHeader';
import AWSPage from './pages/aws';
import CreatingClusterLoadingScreen from './pages/aws/creating_cluster';
import ProvisionClusterPage from './pages/aws/provision_cluster';
import ClusterSummaryPage from './pages/cluster/cluster_summary';
import InstallOperatorsPage from './pages/install_operators/install_operators';

const useEnhancedEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

const materialTheme = materialExtendTheme();

export default function JoyOrderDashboardTemplate() {
  const status = useScript(`https://unpkg.com/feather-icons`);

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
      <JoyCssVarsProvider disableTransitionOnChange>
        <CssBaseline />
        <Routes>
          <Route path="/" element={
            <>
              <BootstrapperHeader currentStep={'setup'}/>
              <SetupPage />
            </>
          }>
          </Route>
          <Route path="/aws" element={
            <>
              <BootstrapperHeader currentStep={'create_eks_cluster'}/>
              <AWSPage />
            </>
          } />
          <Route path="/aws/creating_cluster" element={
            <>
              <BootstrapperHeader currentStep={'wait_for_eks'}/>
              <CreatingClusterLoadingScreen />
            </>
          } />
          <Route path="/aws/provision_cluster" element={
            <>
              <BootstrapperHeader currentStep={'provision_cluster'}/>
              <ProvisionClusterPage />
            </>
          } />
          <Route path="/cluster/summary" element={
            <>
              <BootstrapperHeader currentStep={'cluster_summary'}/>
              <ClusterSummaryPage />
            </>
          } />
          <Route path="/cluster/operators" element={
            <>
              <BootstrapperHeader currentStep={'install_mattermost'}/>
              <InstallOperatorsPage />
            </>
          } />
        </Routes>
      </JoyCssVarsProvider>
    </MaterialCssVarsProvider>
  );
}