import * as React from 'react';
import { CssVarsProvider as JoyCssVarsProvider } from '@mui/joy/styles';
import {
  experimental_extendTheme as materialExtendTheme,
  Experimental_CssVarsProvider as MaterialCssVarsProvider,
  THEME_ID as MATERIAL_THEME_ID,
} from '@mui/material/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import Box from '@mui/joy/Box';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import Link from '@mui/joy/Link';
import { Outlet, Route, Routes } from 'react-router-dom';
import useScript from './useScript';
import Sidebar from './components/Sidebar';

import Header from './components/Header';
import InstallationsPage from './pages/installation';
import ClustersPage from './pages/cluster';
import InstallationByIDPage from './pages/installation/InstallationByIDPage';

const useEnhancedEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

const PageLayout = () => (
  <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
    <Header />
    <Sidebar />
    <Outlet />
  </Box>
);

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
          <Route path="/" element={<PageLayout />}>
            <Route path="/installations" element={<InstallationsPage />}/>
            <Route path="/installations/:id" element={<InstallationByIDPage />} />
            <Route path="clusters" element={<ClustersPage />} />
          </Route>
        </Routes>
      </JoyCssVarsProvider>
    </MaterialCssVarsProvider>
  );
}