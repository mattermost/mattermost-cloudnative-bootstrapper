import * as React from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import Box from '@mui/joy/Box';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import Link from '@mui/joy/Link';
import { Outlet, Route, Routes } from 'react-router-dom';
// icons
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';

import useScript from './useScript';
import Sidebar from './components/Sidebar';

import Header from './components/Header';
import InstallationsPage from './pages/installation';
import ClustersPage from './pages/cluster';

const useEnhancedEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

const PageLayout = () => (
  <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
    <Header />
    <Sidebar />
    <Outlet />
  </Box>
);

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
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
        <Routes>
          <Route path="/" element={<PageLayout />}>
            <Route path="/installations" element={<InstallationsPage />}/>
            <Route path="/clusters" element={<ClustersPage />} />
          </Route>
        </Routes>
    </CssVarsProvider>
  );
}