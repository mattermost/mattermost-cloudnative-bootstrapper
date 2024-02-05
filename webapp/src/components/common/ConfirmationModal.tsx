import * as React from 'react';
import Button from '@mui/joy/Button';
import Divider from '@mui/joy/Divider';
import DialogTitle from '@mui/joy/DialogTitle';
import DialogContent from '@mui/joy/DialogContent';
import DialogActions from '@mui/joy/DialogActions';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import { ColorPaletteProp } from '@mui/joy';

interface ConfirmationModalProps {
    open: boolean;
    title: string;
    content: string;
    confirmButton: { text: string, color: string };
    cancelButton: { text: string, color: string };
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmationModal(props: ConfirmationModalProps) {
    const { open, title, content, confirmButton, cancelButton, onConfirm, onCancel } = props;

    return (
        <Modal open={open} onClose={onCancel}>
            <ModalDialog variant="outlined" role="alertdialog">
                <DialogTitle>
                    <WarningRoundedIcon />
                    {title}
                </DialogTitle>
                <Divider />
                <DialogContent>
                    {content}
                </DialogContent>
                <DialogActions>
                    <Button variant="solid" color={confirmButton.color as ColorPaletteProp} onClick={onConfirm}>
                        {confirmButton.text}
                    </Button>
                    <Button variant="plain" color={cancelButton.color as ColorPaletteProp} onClick={onCancel}>
                        {cancelButton.text}
                    </Button>
                </DialogActions>
            </ModalDialog>
        </Modal>
    );
}