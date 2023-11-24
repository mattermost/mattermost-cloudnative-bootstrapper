import React from 'react';
import Box from '@mui/joy/Box';
import {
    Breadcrumbs
} from '@mui/joy';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import OrderTable from '../../components/InstallationsTable';
import OrderList from '../../components/OrderList';
import Link from '@mui/joy/Link';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import ClustersTable from '../../components/ClustersTable';
import { Add } from '@mui/icons-material';



const ClustersPage = () => {
    return (<Box
        component="main"
        className="MainContent"
        sx={{
            px: {
                xs: 2,
                md: 6,
            },
            pt: {
                xs: 'calc(12px + var(--Header-height))',
                sm: 'calc(12px + var(--Header-height))',
                md: 3,
            },
            pb: {
                xs: 2,
                sm: 2,
                md: 3,
            },
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            height: '100dvh',
            gap: 1,
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Breadcrumbs
                size="sm"
                aria-label="breadcrumbs"
                separator={<ChevronRightRoundedIcon />}
                sx={{ pl: 0 }}
            >
                <Link
                    underline="none"
                    color="neutral"
                    href="#some-link"
                    aria-label="Home"
                >
                    <HomeRoundedIcon />
                </Link>
                <Typography color="primary" fontWeight={500} fontSize={12}>
                    Clusters
                </Typography>
            </Breadcrumbs>
        </Box>
        <Box
            sx={{
                display: 'flex',
                my: 1,
                gap: 1,
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'start', sm: 'center' },
                flexWrap: 'wrap',
                justifyContent: 'space-between',
            }}
        >
            <Typography level="h2">Clusters</Typography>
            <Button
                color="primary"
                startDecorator={<Add />}
                size="sm"
            >
                Create
            </Button>
        </Box>
        <ClustersTable />
        {/* <OrderList /> */}
    </Box>)
}


export default ClustersPage;