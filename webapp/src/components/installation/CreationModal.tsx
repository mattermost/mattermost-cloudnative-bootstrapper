import * as React from 'react';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import DialogTitle from '@mui/joy/DialogTitle';
import DialogContent from '@mui/joy/DialogContent';
import Stack from '@mui/joy/Stack';
import Add from '@mui/icons-material/Add';
import { fetchClusters, selectClustersForPage } from '../../store/installation/clusterSlice';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { CircularProgress, Option, Select } from '@mui/joy';
import { CreateInstallationRequest, databaseOptions, filestoreOptions } from '../../types/Installation';


type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit?: (createRequest: CreateInstallationRequest) => void;
};


export default function InstallationCreationModal({ open, onClose, onSubmit }: Props) {
    const clusters = useSelector(selectClustersForPage);
    const clusterLoadStatus = useSelector((state: any) => state.clusters.status);
    const [installationDNS, setInstallationDNS] = React.useState<string>('');
    const [installationOwner, setInstallationOwner] = React.useState<string>('');
    const [filestore, setFilestore] = React.useState<string>('');
    const [database, setDatabase] = React.useState<string>('');
    const dispatch = useDispatch();

    React.useEffect(() => {
        dispatch(fetchClusters({ page: 0, per_page: 100 }) as any);
    }, [])
    return (
        <Modal open={open} onClose={onClose}>
            <ModalDialog>
                <DialogTitle>Create new installation</DialogTitle>
                <DialogContent>Select creation parameters</DialogContent>
                <form
                    onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        onSubmit?.({Name: installationDNS, DNSNames: [`${installationDNS}`], OwnerID: installationOwner, Filestore: filestore, Database: database} as CreateInstallationRequest);
                    }}
                >
                    {clusterLoadStatus !== 'succeeded' ? (<CircularProgress variant="solid" />)
                        : (<Stack spacing={2}>
                            <FormControl>
                                <FormLabel>Name (DNS)</FormLabel>
                                <Input value={installationDNS} onChange={(e) => setInstallationDNS(e.target.value)} autoFocus required />(.test.mattermost.cloud)
                            </FormControl>
                            <FormControl>
                                <FormLabel>Owner</FormLabel>
                                <Input value={installationOwner} onChange={(e) => setInstallationOwner(e.target.value)} required />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Filestore Type</FormLabel>
                                <Select
                                    defaultValue={'aws-multitenant-s3'}
                                    value={filestore}
                                    onChange={(e, newValue) => setFilestore(newValue!)}
                                >
                                    {filestoreOptions.map((option) => (
                                        <Option value={option.value}>
                                            {option.label}
                                        </Option>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl>
                                <FormLabel>Database Type</FormLabel>
                                <Select
                                    defaultValue={'aws-multitenant-s3'}
                                    value={database}
                                    onChange={(e, newValue) => setDatabase(newValue!)}
                                >
                                    {databaseOptions.map((option) => (
                                        <Option value={option.value}>
                                            {option.label}
                                        </Option>
                                    
                                    ))}
                                </Select>
                            </FormControl>
                            <Button type="submit">Submit</Button>
                        </Stack>)}
                </form >
            </ModalDialog >
        </Modal >
    );
}