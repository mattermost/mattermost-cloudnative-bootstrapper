import React, { useEffect, useState } from 'react';
import Sheet from '@mui/joy/Sheet';
import Button from '@mui/joy/Button';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import IconButton from '@mui/joy/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Input } from '@mui/joy';

export interface Row {
    id: number;
    value: string;
}

type Props = {
    onChange?: (rows: Row[]) => void;
}

export default function SubnetEntry(props: Props) {
    const [rows, setRows] = useState<Row[]>([{ id: 1, value: '' }]);

    useEffect(() => {
        props.onChange?.(rows);
    }, [rows])

    const handleAddRow = () => {
        const newRow: Row = { id: rows.length + 1, value: '' };
        setRows([...rows, newRow]);
    };

    const handleDeleteRow = (id: number) => {
        setRows(rows.filter(row => row.id !== id));
    };

    const handleInputChange = (id: number, value: string) => {
        const newRows = rows.map(row => row.id === id ? { ...row, value } : row);
        setRows(newRows);
    };

    return (
        <div className="subnet-entry">
            {rows.map(row => (
                <Sheet key={row.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', marginBottom: 2 }}>
                    <Select defaultValue="" placeholder="Subnet/SG" size="sm" sx={{ flexGrow: 1 }}>
                        <Option value="option1">Subnet ID</Option>
                        <Option value="option2">Security Group ID</Option>
                    </Select>
                    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Input
                            value={row.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(row.id, e.target.value)}
                            placeholder="Enter text"
                            sx={{ flexGrow: 1 }}
                        />
                        <IconButton color="danger" onClick={() => handleDeleteRow(row.id)}>
                            <DeleteIcon />
                        </IconButton>
                    </div>
                </Sheet>
            ))}
            <Button variant="solid" onClick={handleAddRow}>
                <AddIcon />
            </Button>
        </div>
    );
};

