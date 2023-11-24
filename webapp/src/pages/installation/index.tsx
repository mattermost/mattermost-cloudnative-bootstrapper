import React from 'react';
import Box from '@mui/joy/Box';
import {
    Breadcrumbs
} from '@mui/joy';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import OrderTable from '../../components/InstallationsTable';
import Link from '@mui/joy/Link';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import { Add } from '@mui/icons-material';
import InstallationCreationModal from '../../components/installation/CreationModal';
import { CreateInstallationRequest } from '../../types/Installation';
import { useDispatch } from 'react-redux';
import { createInstallation } from '../../store/installation/installationSlice';


const InstallationsPage = () => {
    const [showInstallationCreationModal, setShowInstallationCreationModal] = React.useState<boolean>(false);
    const dispatch = useDispatch();
    const handleCreateInstallation = (req: CreateInstallationRequest) => {
        console.log(req);
        dispatch(createInstallation(req) as any);
        setShowInstallationCreationModal(false);
    }

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
                    Installations
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
            <Typography level="h2">Installations</Typography>
            <Button
                color="primary"
                startDecorator={<Add />}
                size="sm"
                onClick={() => setShowInstallationCreationModal(true)}
            >
                Create
            </Button>
        </Box>
        <OrderTable />
        <InstallationCreationModal open={showInstallationCreationModal} onClose={() => setShowInstallationCreationModal(false)} onSubmit={handleCreateInstallation} />
        {/* <OrderList /> */}
    </Box>)
}


export default InstallationsPage;