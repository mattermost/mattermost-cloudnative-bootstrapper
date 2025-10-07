import * as React from 'react';
import Button from '@mui/joy/Button';
import Divider from '@mui/joy/Divider';
import DialogTitle from '@mui/joy/DialogTitle';
import DialogContent from '@mui/joy/DialogContent';
import DialogActions from '@mui/joy/DialogActions';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useState } from 'react';
import './ErrorModal.scss';

interface ErrorModalProps {
    open: boolean;
    title?: string;
    error: any;
    onClose: () => void;
}

export default function ErrorModal({ open, title = "Error Details", error, onClose }: ErrorModalProps) {
    const [copied, setCopied] = useState(false);

    const formatError = (error: any): string => {
        if (typeof error === 'string') {
            return error;
        }
        
        try {
            return JSON.stringify(error, null, 2);
        } catch (e) {
            return String(error);
        }
    };

    const handleCopyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(formatError(error));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy error to clipboard:', err);
        }
    };

    const getErrorSummary = (error: any): string => {
        if (typeof error === 'string') {
            return error.length > 100 ? error.substring(0, 100) + '...' : error;
        }
        
        // Handle structured API error responses
        if (error?.data?.message) {
            return error.data.message;
        }
        
        // Handle RTK Query error format
        if (error?.message) {
            return error.message;
        }
        
        // Handle standard error objects
        if (error?.error) {
            return typeof error.error === 'string' ? error.error : error.error.message || 'An error occurred';
        }
        
        return 'An error occurred';
    };

    return (
        <Modal open={open} onClose={onClose}>
            <ModalDialog variant="outlined" role="alertdialog" size="lg" className="error-modal">
                <DialogTitle>
                    <ErrorOutlineIcon color="error" />
                    {title}
                </DialogTitle>
                <Divider />
                <DialogContent>
                    <div className="error-summary">
                        <strong>Summary:</strong> {getErrorSummary(error)}
                    </div>
                    {error?.data?.operation && (
                        <div className="error-operation">
                            <strong>Operation:</strong> {error.data.operation}
                        </div>
                    )}
                    {error?.data?.code && (
                        <div className="error-code">
                            <strong>Error Code:</strong> {error.data.code}
                        </div>
                    )}
                    <div className="error-details">
                        <div className="error-details-header">
                            <strong>Technical Details:</strong>
                            <Button
                                size="sm"
                                variant="outlined"
                                startDecorator={<ContentCopyIcon />}
                                onClick={handleCopyToClipboard}
                                color={copied ? "success" : "neutral"}
                            >
                                {copied ? "Copied!" : "Copy"}
                            </Button>
                        </div>
                        <pre className="error-content">
                            {formatError(error)}
                        </pre>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button variant="solid" color="primary" onClick={onClose}>
                        Close
                    </Button>
                </DialogActions>
            </ModalDialog>
        </Modal>
    );
}
