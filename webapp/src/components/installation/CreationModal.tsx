import * as React from 'react';

// import Modal from '@mui/joy/Modal';
// import ModalDialog from '@mui/joy/ModalDialog';
// import DialogTitle from '@mui/joy/DialogTitle';
// import DialogContent from '@mui/joy/DialogContent';
// import { CreateInstallationRequest} from '../../types/Installation';
// import { ModalClose} from '@mui/joy';
// import Form from '@rjsf/mui';
// import { createInstallationUISchema, createInstallationSchema } from '../../types/json_schema/InstallationRequest';
// import {JSONSchema7} from 'json-schema';
// import validator from '@rjsf/validator-ajv8';

// type Props = {
//     open: boolean;
//     onClose: () => void;
//     onSubmit?: (createRequest: CreateInstallationRequest) => void;
//     error?: string;
// };

// export default function InstallationCreationModal({ open, onClose, onSubmit, error }: Props) {
//     const handleSubmit = (data: any) => {
//         console.log(data.formData);
//         onSubmit?.(data.formData as CreateInstallationRequest);
//     }

//     return (
//         <Modal open={open} onClose={onClose}>
//             <ModalDialog>
//                 <ModalClose />
//                 <DialogTitle>Create new installation</DialogTitle>
//                 <DialogContent style={{paddingBottom: '5px'}}>Select creation parameters</DialogContent>
//                 <div style={{overflow: 'scroll', padding: '20px'}}>
//                     <Form onSubmit={handleSubmit} schema={createInstallationSchema as JSONSchema7} uiSchema={createInstallationUISchema} validator={validator}/>
//                     {error && <div style={{color: 'red'}}>{error}</div>}
//                 </div>
//             </ModalDialog >
//         </Modal >
//     );
// }