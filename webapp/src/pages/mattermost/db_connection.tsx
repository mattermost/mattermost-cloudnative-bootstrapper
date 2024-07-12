import React, { useEffect } from 'react';
import { Release } from '../../types/bootstrapper';
import { Input, Option, Select } from '@mui/joy';
import { ExistingDBConnection } from '../../types/Installation';
import './db_connection.scss';

type DBConnectionInputProps = {
    releases: Release[];
    cloudProvider: string;
    onChange: ({ existingDatabaseConfig, dbConnectionOption }: DBConnectionDetails) => void;
}

export type DBConnectionDetails = { existingDatabaseConfig?: ExistingDBConnection, dbConnectionOption: string }

export default function DBConnection({ releases, onChange, cloudProvider }: DBConnectionInputProps) {
    const hasDeployedPGOperator = releases.some((release) => release.Name === 'cnpg-system');;
    const [existingDatabaseConfig, setExistingDatabaseConfig] = React.useState<ExistingDBConnection | undefined>(undefined);
    const [databaseOption, setDatabaseOption] = React.useState('');

    const handleOnChange = () => {
        onChange({ existingDatabaseConfig, dbConnectionOption: databaseOption });
    }

    const resetForm = () => {
        setExistingDatabaseConfig(undefined);
    }

    useEffect(() => {
        resetForm();
    }, [databaseOption])

    useEffect(() => {
        handleOnChange();
    }, [existingDatabaseConfig, databaseOption]);

    const handleExistingDBChange = (field: string, value: string) => {
        setExistingDatabaseConfig({ ...existingDatabaseConfig, [field]: value } as ExistingDBConnection);
    }

    const getDatabaseConfigInputs = () => {
        switch (databaseOption) {
            case 'Existing':
                return (
                    <>
                        <div>Connect to an externally managed database through a connection string</div>
                        <Input placeholder={"DB Connection String"} type="password" onChange={(e) => handleExistingDBChange('dbConnectionString', e.target.value)} />
                        <Input placeholder={"DB Replicas Connection String"} type="password" onChange={(e) => handleExistingDBChange('dbReplicasConnectionString', e.target.value)} />
                    </>
                )
            case 'CreateForMeCNPG':
                return (
                    <div>We'll create a database cluster within the same namespace as your installation backed by CloudNative Postgres</div>
                )
            case 'CreateForMeRDS':
                return (
                    <div className="coming-soon">Create For Me (RDS) support coming soon...</div>
                )
        }
    }

    return (
        <div className="database-connection">
            <label>DB Connection</label>
            <Select size="sm" placeholder="DB Connection" onChange={(e, newValue) => {
                setDatabaseOption(newValue as string);
            }}>
                <Option value={'Existing'}>Use Existing</Option>
                {hasDeployedPGOperator && <Option value={'CreateForMeCNPG'}>Create For Me (CNPG)</Option>}
                {cloudProvider === 'aws' && <Option value={'CreateForMeRDS'}>Create For Me (RDS)</Option>}
            </Select>
            {getDatabaseConfigInputs()}
        </div>
    );
}