import React from 'react';
import { MattermostEnvItem } from '../../types/Installation';
import { Button, Input, Select, Option, IconButton } from '@mui/joy';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

type EnvVariablesManagerProps = {
    envVariables: MattermostEnvItem[];
    onChange: (envVariables: MattermostEnvItem[]) => void;
};

type EnvVarType = 'string' | 'fromSecret';

export default function EnvVariablesManager({ envVariables, onChange }: EnvVariablesManagerProps) {
    const getEnvVarType = (envVar: MattermostEnvItem): EnvVarType => {
        return envVar.valueFrom ? 'fromSecret' : 'string';
    };

    const handleAddEnvVar = () => {
        onChange([...envVariables, { name: '', value: '' }]);
    };

    const handleRemoveEnvVar = (index: number) => {
        const newEnvVars = [...envVariables];
        newEnvVars.splice(index, 1);
        onChange(newEnvVars);
    };

    const handleEnvVarChange = (index: number, field: keyof MattermostEnvItem | 'type' | 'secretName' | 'secretKey', value: string) => {
        const newEnvVars = [...envVariables];
        const envVar = { ...newEnvVars[index] };

        if (field === 'name') {
            envVar.name = value;
        } else if (field === 'type') {
            if (value === 'string') {
                delete envVar.valueFrom;
                envVar.value = '';
            } else {
                delete envVar.value;
                envVar.valueFrom = {
                    secretKeyRef: {
                        name: '',
                        key: '',
                        optional: true
                    }
                };
            }
        } else if (field === 'value') {
            envVar.value = value;
        } else if (field === 'secretName') {
            if (envVar.valueFrom) {
                envVar.valueFrom.secretKeyRef.name = value;
            }
        } else if (field === 'secretKey') {
            if (envVar.valueFrom) {
                envVar.valueFrom.secretKeyRef.key = value;
            }
        }

        newEnvVars[index] = envVar;
        onChange(newEnvVars);
    };

    return (
        <div className="env-variables-section">
            <div className="env-var-header">
                <h4>Environment Variables</h4>
                <Button
                    size="sm"
                    startDecorator={<AddIcon />}
                    onClick={handleAddEnvVar}
                >
                    Add Variable
                </Button>
            </div>
            
            {envVariables.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                    No environment variables configured
                </p>
            ) : (
                <div>
                    {envVariables.map((envVar, index) => {
                        const varType = getEnvVarType(envVar);
                        return (
                            <div key={index} className="env-var-row">
                                <Input
                                    size="sm"
                                    placeholder="Variable Name"
                                    value={envVar.name}
                                    onChange={(e) => handleEnvVarChange(index, 'name', e.target.value)}
                                />
                                
                                <Select
                                    size="sm"
                                    value={varType}
                                    onChange={(_, value) => handleEnvVarChange(index, 'type', value as string)}
                                >
                                    <Option value="string">String</Option>
                                    <Option value="fromSecret">From Secret</Option>
                                </Select>
                                
                                <div>
                                    {varType === 'string' ? (
                                        <Input
                                            size="sm"
                                            placeholder="Value"
                                            value={envVar.value || ''}
                                            onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                                        />
                                    ) : (
                                        <div className="secret-inputs">
                                            <Input
                                                size="sm"
                                                placeholder="Secret Name"
                                                value={envVar.valueFrom?.secretKeyRef.name || ''}
                                                onChange={(e) => handleEnvVarChange(index, 'secretName', e.target.value)}
                                            />
                                            <Input
                                                size="sm"
                                                placeholder="Secret Key"
                                                value={envVar.valueFrom?.secretKeyRef.key || ''}
                                                onChange={(e) => handleEnvVarChange(index, 'secretKey', e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                                
                                <IconButton
                                    size="sm"
                                    color="danger"
                                    onClick={() => handleRemoveEnvVar(index)}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

