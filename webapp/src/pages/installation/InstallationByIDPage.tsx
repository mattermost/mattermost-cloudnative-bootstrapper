import React, { useEffect } from 'react';
import Box from '@mui/joy/Box';
import {
    Breadcrumbs, Chip, CircularProgress, Grid, Table
} from '@mui/joy';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import Link from '@mui/joy/Link';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import { PatchInstallationRequest, isEnvVarMap } from '../../types/Installation';
import { useDispatch } from 'react-redux';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { deleteInstallation, fetchInstallationByID, patchInstallation, selectInstallationByID } from '../../store/installation/installationSlice';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import InstallationEditModal from '../../components/installation/EditModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';



const InstallationsPage = () => {
    const [showInstallationEditModal, setShowInstallationEditModal] = React.useState<boolean>(false);
    const [editError, setEditError] = React.useState('');
    const [showDeleteConfirmationModal, setShowDeleteConfirmationModal] = React.useState<boolean>(false);
    const params = useParams<{ id: string }>();
    const dispatch = useDispatch();
    const installation = useSelector(selectInstallationByID(params.id!));
    useEffect(() => {
        dispatch(fetchInstallationByID(params.id!) as any);
        const intervalId = setInterval(() => {
            dispatch(fetchInstallationByID(params.id!) as any);
        }, 10000);

        return () => {
            clearInterval(intervalId);
        }
    }, []);

    const renderObjectInTable = (obj: object) => {

        if (!obj) {
            return null;
        }

        if (isEnvVarMap(obj)) {
            return (<Table>
                <tbody>
                    {Object.entries(obj).map(([nestedKey, nestedValue]) => {
                        return (
                            <tr key={nestedKey}>
                                <th scope="row">
                                    {nestedKey}
                                </th>
                                <td>{String(nestedValue.value)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </Table>)
        }
    }

    const handlePatchInstallation = async (req: PatchInstallationRequest) => {
        console.log(req);
        const result = await dispatch(patchInstallation({id: installation?.ID || '', patch: req}) as any);
        if (!result.payload) {
            setEditError('Failed to update installation');
            return;
        }
        setShowInstallationEditModal(false);
    }

    const handleDeleteInstallation = async () => {
        // const result = await dispatch(deleteInstallation(params.id!) as any);
        // console.log(result);
        // const result = await dispatch(deleteInstallation(params.id!) as any);
        // if (!result.payload) {
        //     setEditError('Failed to delete installation');
        //     return;
        // }
        setShowDeleteConfirmationModal(false);

    }

    const getChip = (state:string) => {
        switch (state.toLowerCase()) {
            case 'stable':
                return (<Chip color="success">{state}</Chip>)
            case 'update-requested':
                return (<Chip color="warning">{state}</Chip>)
            case 'deleted':
                return (<Chip color="danger">{state}</Chip>)
            default:
                return (<Chip>{state}</Chip>)
        }
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
                <Link
                    underline="none"
                    color="primary"
                    href="/installations"
                >
                    <Typography color="primary" fontWeight={500} fontSize={12}>
                        Installations
                    </Typography>
                </Link>
                <Link>
                    <Typography color="primary" fontWeight={500} fontSize={12}>
                        {params.id}
                    </Typography>
                </Link>
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
            <Typography level="h2">Installation: {installation?.Name || ''}{'  '}{getChip(installation?.State || '')}</Typography>
            <Grid 
                container
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                spacing={1}
            >
                <Grid>
                    <Button
                        color="primary"
                        startDecorator={<EditOutlinedIcon />}
                        size="sm"
                        onClick={() => setShowInstallationEditModal(true)}
                        disabled={installation?.State !== 'stable'}
                    >
                        Edit
                    </Button>

                </Grid>
                <Grid>
                    <Button
                        color="danger"
                        startDecorator={<DeleteForeverOutlinedIcon />}
                        size="sm"
                        onClick={() => setShowDeleteConfirmationModal(true)}
                        disabled={installation?.State !== 'stable'}
                    >
                        Delete
                    </Button>
                </Grid>

            </Grid>
        </Box>
        <Box
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
            {installation ? (
                    <Table>
                        <tbody>
                            {Object.entries(installation).map(([key, value]) => (
                                <tr key={key}>
                                    <th scope="row">
                                        {key}
                                    </th>
                                    <td>{typeof value === 'object' ? (renderObjectInTable(value)) : (
                                            String(value)
                                        )}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
            ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <CircularProgress />
                </Box>
            )}
        </Box>
        {<InstallationEditModal error={editError} open={showInstallationEditModal} onClose={() => setShowInstallationEditModal(false)} onSubmit={handlePatchInstallation} installation={installation} />}
        <ConfirmationModal open={showDeleteConfirmationModal} title="Delete Installation" content="Are you sure you want to delete this installation?" confirmButton={{ text: 'Delete', color: 'danger' }} cancelButton={{ text: 'Cancel', color: 'neutral' }} onConfirm={handleDeleteInstallation} onCancel={() => setShowDeleteConfirmationModal(false)} />
    </Box>)
}


export default InstallationsPage;