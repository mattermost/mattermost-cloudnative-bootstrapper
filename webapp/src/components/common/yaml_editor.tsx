import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/joy';
import './yaml_editor.scss';

interface YamlEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    minHeight?: number;
}

const YamlEditor: React.FC<YamlEditorProps> = ({
    value,
    onChange,
    placeholder = 'Enter YAML configuration...',
    readOnly = false,
    minHeight = 300
}) => {
    const [lineNumbers, setLineNumbers] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);

    // Update line numbers when value changes
    useEffect(() => {
        const lines = value.split('\n');
        const numbers = lines.map((_, index) => (index + 1).toString());
        setLineNumbers(numbers);
    }, [value]);

    // Sync scroll between textarea and line numbers
    const handleScroll = () => {
        if (textareaRef.current && lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = value.substring(0, start) + '  ' + value.substring(end);
            onChange(newValue);
            
            // Set cursor position after the inserted spaces
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 2;
            }, 0);
        }
    };

    return (
        <Box className="yaml-editor-container" sx={{ minHeight: `${minHeight}px` }}>
            <Box className="yaml-editor-wrapper">
                <Box className="line-numbers" ref={lineNumbersRef}>
                    {lineNumbers.map((lineNumber, index) => (
                        <Typography
                            key={index}
                            level="body-xs"
                            className="line-number"
                        >
                            {lineNumber}
                        </Typography>
                    ))}
                </Box>
                <textarea
                    ref={textareaRef}
                    className="yaml-textarea"
                    value={value}
                    onChange={handleChange}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    spellCheck={false}
                />
            </Box>
        </Box>
    );
};

export default YamlEditor;
