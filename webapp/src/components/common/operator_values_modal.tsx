import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalDialog,
    ModalClose,
    Typography,
    Button,
    Box,
    Divider,
    Alert
} from '@mui/joy';
import YamlEditor from './yaml_editor';
import './operator_values_modal.scss';

interface OperatorValuesModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (values: string) => void;
    operatorName: string;
    defaultValues: string;
    currentValues?: string;
}

const OperatorValuesModal: React.FC<OperatorValuesModalProps> = ({
    open,
    onClose,
    onSave,
    operatorName,
    defaultValues,
    currentValues
}) => {
    const [values, setValues] = useState<string>(defaultValues);
    const [hasChanges, setHasChanges] = useState<boolean>(false);
    const [yamlError, setYamlError] = useState<string | null>(null);

    // Initialize values when modal opens
    useEffect(() => {
        if (open) {
            setValues(currentValues || defaultValues);
            setHasChanges(false);
            setYamlError(null);
        }
    }, [open, currentValues, defaultValues]);

    // Check for changes
    useEffect(() => {
        const originalValues = currentValues || defaultValues;
        setHasChanges(values !== originalValues);
    }, [values, currentValues, defaultValues]);

    // Basic YAML validation
    const validateYaml = (yamlString: string): boolean => {
        try {
            // Simple validation - check for basic YAML structure
            if (yamlString.trim() === '') {
                setYamlError(null);
                return true;
            }
            
            // Check for common YAML syntax issues
            const lines = yamlString.split('\n');
            let indentLevel = 0;
            const indentStack: number[] = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();
                
                // Skip empty lines and comments
                if (trimmedLine === '' || trimmedLine.startsWith('#')) {
                    continue;
                }
                
                // Check for proper indentation
                const currentIndent = line.length - line.trimStart().length;
                
                if (trimmedLine.includes(':')) {
                    // This is a key-value pair
                    if (currentIndent > 0 && indentStack.length > 0) {
                        const expectedIndent = indentStack[indentStack.length - 1];
                        if (currentIndent <= expectedIndent) {
                            // Pop from stack until we find the right level
                            while (indentStack.length > 0 && currentIndent <= indentStack[indentStack.length - 1]) {
                                indentStack.pop();
                            }
                        }
                    }
                    
                    if (trimmedLine.endsWith(':')) {
                        // This is a parent key, add to stack
                        indentStack.push(currentIndent);
                    }
                }
            }
            
            setYamlError(null);
            return true;
        } catch (error) {
            setYamlError('Invalid YAML syntax detected');
            return false;
        }
    };

    const handleSave = () => {
        if (validateYaml(values)) {
            onSave(values);
            onClose();
        }
    };

    const handleReset = () => {
        setValues(defaultValues);
        setYamlError(null);
    };

    const handleCancel = () => {
        setValues(currentValues || defaultValues);
        setYamlError(null);
        onClose();
    };

    return (
        <Modal open={open} onClose={handleCancel}>
            <ModalDialog
                variant="outlined"
                role="alertdialog"
                sx={{
                    maxWidth: '80vw',
                    width: '800px',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <ModalClose variant="plain" sx={{ m: 1 }} />
                <Typography
                    component="h2"
                    id="modal-title"
                    level="h4"
                    textColor="inherit"
                    fontWeight="lg"
                    mb={1}
                >
                    Configure {operatorName} Values
                </Typography>
                <Typography level="body-sm" color="neutral" mb={2}>
                    Customize the Helm values for the {operatorName}. You can modify the default configuration below.
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {yamlError && (
                        <Alert color="danger" variant="soft" sx={{ mb: 2 }}>
                            {yamlError}
                        </Alert>
                    )}
                    
                    <Box sx={{ flex: 1, minHeight: '400px' }}>
                        <YamlEditor
                            value={values}
                            onChange={setValues}
                            placeholder="Enter YAML configuration..."
                            minHeight={400}
                        />
                    </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                        variant="plain"
                        color="neutral"
                        onClick={handleReset}
                        disabled={!hasChanges}
                    >
                        Reset to Default
                    </Button>
                    <Button
                        variant="plain"
                        color="neutral"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        onClick={handleSave}
                        disabled={!hasChanges || !!yamlError}
                    >
                        Save Changes
                    </Button>
                </Box>
            </ModalDialog>
        </Modal>
    );
};

export default OperatorValuesModal;
