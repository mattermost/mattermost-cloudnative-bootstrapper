import React, { useEffect } from 'react';
import { Release } from '../../types/bootstrapper';
import { Input, Option, Select } from '@mui/joy';
import { DatabaseType, ExistingDBConnection } from '../../types/Installation';
import './db_connection.scss';
import SensitiveInput from '../../components/common/text_inputs/sensitive_input';

type DBConnectionInputProps = {
    releases: Release[];
    cloudProvider: string;
    onChange: ({ existingDatabaseConfig, dbConnectionOption }: DBConnectionDetails) => void;
    existingDatabase?: ExistingDBConnection;
    isEdit?: boolean;
}

export type DBConnectionDetails = { existingDatabaseConfig?: ExistingDBConnection, dbConnectionOption: string }

export default function DBConnection({ releases, onChange, cloudProvider, isEdit, existingDatabase }: DBConnectionInputProps) {
    const hasDeployedPGOperator = releases?.some((release) => release.Name === 'cnpg-system');
    const [existingDatabaseConfig, setExistingDatabaseConfig] = React.useState<ExistingDBConnection | undefined>(() => {
        if (isEdit && existingDatabase) return existingDatabase;
        return undefined;
    });
    const [databaseOption, setDatabaseOption] = React.useState(() => {
        if (existingDatabase && isEdit) return DatabaseType.Existing;
        return '';
    }
    );

    const resetForm = () => {
        setExistingDatabaseConfig(undefined);
    }

    useEffect(() => {
        resetForm();
    }, [databaseOption])

    useEffect(() => {
        onChange({ existingDatabaseConfig, dbConnectionOption: databaseOption });
    }, [existingDatabaseConfig, databaseOption, onChange]);

    const handleExistingDBChange = (field: string, value: string) => {
        setExistingDatabaseConfig({ ...existingDatabaseConfig, [field]: value } as ExistingDBConnection);
    }

    const getDatabaseConfigInputs = () => {
        switch (databaseOption) {
            case DatabaseType.Existing:
                return (
                    <>
                        {!isEdit && <div>Connect to an externally managed database through a connection string</div>}
                        <SensitiveInput label={"DB Connection String"} value={existingDatabaseConfig?.dbConnectionString!} onChange={(value) => handleExistingDBChange('dbConnectionString', value)} />
                        <SensitiveInput label={"DB Replicas Connection String"} value={existingDatabaseConfig?.dbReplicasConnectionString!} onChange={(value) => handleExistingDBChange('dbReplicasConnectionString', value)} />
                    </>
                )
            case DatabaseType.CreateCNPG:
                return (
                    <div>We&apos;ll create a database cluster within the same namespace as your installation backed by CloudNative Postgres</div>
                )
            case DatabaseType.CreateRDS:
                return (
                    <div className="coming-soon">RDS Creation support coming soon...</div>
                )
        }
    }

    return (
        <div className="database-connection">
            <label>DB Connection</label>
            {!isEdit && <Select data-testid={'db-connection-selector'} size="sm" placeholder="DB Connection" onChange={(e, newValue) => {
                setDatabaseOption(newValue as string);
            }}>
                <Option value={DatabaseType.Existing}>Use Existing</Option>
                {hasDeployedPGOperator && <Option value={DatabaseType.CreateCNPG}>Create For Me (CNPG)</Option>}
                {cloudProvider === 'aws' && <Option value={DatabaseType.CreateRDS}>Create For Me (RDS)</Option>}
            </Select>}
            {getDatabaseConfigInputs()}
            {isEdit && <div className="database-edit-disclaimer">Note: Editing the database connection does not migrate your data. Only change this if you know what you are doing.</div>}
        </div>
    );
}