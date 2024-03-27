import React, { useEffect } from 'react';
import { Release } from '../../types/bootstrapper';
import { Input, Option, Select } from '@mui/joy';


type DBConnectionInputProps = {
    releases: Release[];
    onChange: ({createDBForMe, dbConnectionString, dbReplicasConnectionString}: DBConnectionDetails) => void;
}

export type DBConnectionDetails = {createDBForMe: boolean, dbConnectionString: string, dbReplicasConnectionString: string}

export default function DBConnection({releases, onChange}: DBConnectionInputProps) {
    const hasDeployedPGOperator = releases.some((release) => release.Name === 'cnpg-system');;
    const [createForMe, setCreateForMe] = React.useState<boolean | null>(null);
    const [dbConnectionString, setDBConnectionString] = React.useState('');
    const [dbReplicasConnectionString, setDBReplicasConnectionString] = React.useState('');

    const handleOnChange = () => {
        onChange({createDBForMe: !!createForMe, dbConnectionString, dbReplicasConnectionString});
    }

    useEffect(() => {
        handleOnChange();
    
    }, [createForMe, dbConnectionString, dbReplicasConnectionString]);

    const selectorOptions = () => {
        let options = [];

        if (hasDeployedPGOperator) {
            options.push(<Option key="cnpg" value="cnpg">Create For Me</Option>);
        }

        options.push(<Option key="existing" value="existing">Use Existing</Option>);

        return options;
    }


    return (
        <div className="database-connection">
            <label>DB Connection</label>
            <Select size="sm" placeholder="DB Connection" onChange={(e ,newValue) => {
                if ((newValue as string) === 'cnpg') {
                    setCreateForMe(true);
                    setDBConnectionString('');
                    setDBReplicasConnectionString('');
                } else {
                    setCreateForMe(false);
                }
            }}>
                {selectorOptions()}
            </Select>
            {createForMe === false && <>
                <Input placeholder={"DB Connection String"} type="text" value={dbConnectionString} onChange={(e) => setDBConnectionString(e.target.value)} />
                <Input placeholder={"DB Replicas Connection String"} type="text" value={dbReplicasConnectionString} onChange={(e) => setDBReplicasConnectionString(e.target.value)} />
            </>}

        </div>
    );


}