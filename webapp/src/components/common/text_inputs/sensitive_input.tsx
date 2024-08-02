import * as React from 'react';
import IconButton from '@mui/joy/IconButton';
import Input from '@mui/joy/Input';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { FormControl, FormLabel } from '@mui/joy';

type InputProps = {
    value: string;
    label?: string;
    onChange: (value: string) => void;
}

export default function SensitiveInput({value, onChange, label}: InputProps) {
    const [showPassword, setShowPassword] = React.useState(false);

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    return (
        <FormControl className="sensitive-input">
            {label && <FormLabel>{label}</FormLabel>}
            <Input
                placeholder={label}
                type={showPassword ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                endDecorator={
                    <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        component={"a"}
                    >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>

                }
            />
        </FormControl>
    );
}