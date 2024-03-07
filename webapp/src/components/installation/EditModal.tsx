import React from 'react';
// import { Installation, PatchInstallationRequest, patchInstallationJSONSchema, patchInstallationUISchema } from '../../types/Installation';
// import { DialogContent, DialogTitle, Modal, ModalClose, ModalDialog } from '@mui/joy';
// import { JSONSchema7 } from 'json-schema';
// import { Form } from '@rjsf/mui';
// import validator from '@rjsf/validator-ajv8';
// import _ from 'lodash';

// type Props = {
//     open: boolean;
//     onClose: () => void;
//     onSubmit?: (createRequest: PatchInstallationRequest) => void;
//     installation?: Installation;
//     error?: string;
// };

// const InstallationEditModal: React.FC<Props> = ({ open, onClose, onSubmit, installation, error }: Props) => {
//     const [formData, setFormData] = React.useState<Installation | undefined>(installation);

//     const handleSubmit = () => {
//         if (!onSubmit || !formData || !installation) return;

//         // Find the differences between the form data and the original installation data
//         const differences = _.omitBy(formData, (value, key) => _.isEqual(value, installation[key as keyof Installation]));

//         // Generate the PatchInstallationRequest from the differences
//         const patchRequest = { ...differences };

//         // Call the onSubmit function with the patch request
//         onSubmit(patchRequest as PatchInstallationRequest);
//     };

//     const handleFormChange = (data: any) => {
//         setFormData(data.formData);
//     };


//     return (
//         <Modal open={open} onClose={onClose}>
//             <ModalDialog>
//                 <ModalClose />
//                 <DialogTitle>Edit installation</DialogTitle>
//                 <DialogContent>Select edit parameters</DialogContent>
//                 <div style={{ overflow: 'scroll', padding: '20px' }}>
//                     <Form
//                         onSubmit={handleSubmit}
//                         formData={installation} // Pass the original installation data as initial formData
//                         schema={patchInstallationJSONSchema as JSONSchema7}
//                         uiSchema={patchInstallationUISchema}
//                         validator={validator}
//                         onChange={handleFormChange} // Track changes in the form data
//                     />
//                 </div>
//                 {error && <div style={{ color: 'red' }}>{error}</div>}
//             </ModalDialog>
//         </Modal>
//     );
// };

// export default InstallationEditModal;
