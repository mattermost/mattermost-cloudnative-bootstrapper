import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import Divider from '@mui/material/Divider';
import ModalClose from '@mui/joy/ModalClose';
import { Mattermost } from '../../../types/Installation';
import { useGetPodsForInstallationQuery, useWatchInstallationLogsQuery } from '../../../client/bootstrapperApi';

import './log_viewer_modal.scss';
import { Checkbox } from '@mui/joy';

interface LogViewerModalProps {
    installation: Mattermost;
    clusterName: string;
    cloudProvider: string;
    onClose?: () => void;
}

const LOG_LINE_PREFIX = '$ '; // Log line indicator

export default function LogViewerModal({ installation, clusterName, cloudProvider, onClose }: LogViewerModalProps) {
    const [selectedPods, setSelectedPods] = useState<string[]>([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const { data: logs, error } = useWatchInstallationLogsQuery({
        cloudProvider,
        clusterName,
        installationName: installation.metadata.name,
        pods: selectedPods,
    }, { skip: !installation?.metadata?.name || !clusterName || !cloudProvider || selectedPods.length === 0 });

    const { data: pods, error: fetchPodsError } = useGetPodsForInstallationQuery({
        cloudProvider,
        clusterName,
        installationName: installation.metadata.name,
    });


    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (autoScroll) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs, autoScroll]);

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const podName = event.target.value;
        if (event.target.checked) {
            setSelectedPods((prevSelected) => [...prevSelected, podName]);
        } else {
            setSelectedPods((prevSelected) => prevSelected.filter((name) => name !== podName));
        }
    };

    return (
        <Modal open={true} onClose={onClose}>
            <ModalDialog
                aria-labelledby="basic-modal-dialog-title"
                aria-describedby="basic-modal-dialog-description"
                sx={{
                    maxWidth: 1500,
                    minWidth:
                        1500,
                    minHeight: 860,
                    maxHeight: 860,
                }}
                className="LogViewerModal"
            >
                <ModalClose />
                <h2
                    id="basic-modal-dialog-title"
                >
                    {installation.metadata.name} logs
                </h2>
                <Divider />
                <div className="pod-selectors">
                    <label>Select pod(s):</label>
                    {/* map pod list to checkboxes for selection */}
                    <div className="pod-list">
                        {pods?.map((pod, index) => (
                            <div key={index}>
                                <Checkbox label={pod.name} id={`pod-${index}`} name={`pod-${index}`} value={pod.name} checked={selectedPods.includes(pod.name)} onChange={handleCheckboxChange} />
                            </div>
                        ))}
                    </div>
                </div>
                {Boolean(selectedPods.length) &&
                    <>
                        <div className="auto-scroll-checkbox">
                            <Checkbox label="Enable auto scroll" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
                        </div>
                        <Box
                            id="basic-modal-dialog-description"
                            sx={{
                                maxHeight: 600,
                                overflow: 'auto',
                                backgroundColor: '#282c34', // Dark background for terminal look
                                color: '#fff',
                                fontFamily: 'monospace',
                                padding: 2,
                                borderRadius: '4px',
                                whiteSpace: 'pre-wrap', // Allow wrapping
                            }}
                        >
                            {error &&

                                <div>
                                    Error fetching logs: {error.message}
                                </div>
                            }
                            {logs?.map((logLine, index) => (
                                <div key={index}>
                                    {index}{' '}{LOG_LINE_PREFIX}
                                    {JSON.stringify(logLine)}
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </Box>
                    </>
                }
                {Boolean(!selectedPods.length) && <div className="no-pods-selected">No pods selected</div>}
            </ModalDialog>
        </Modal>
    );
}
