"use client";

import React from "react";
import { Box } from "@mui/material";
import { Worker, Viewer, DocumentLoadEvent, PageChangeEvent } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

interface PDFViewerProps {
    fileUrl: string;
    onDocumentLoad?: (e: DocumentLoadEvent) => void;
    onPageChange?: (e: PageChangeEvent) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl, onDocumentLoad, onPageChange }) => {
    const defaultLayoutPluginInstance = defaultLayoutPlugin();
    console.log(fileUrl);

    return (
        <Box sx={{ height: '100%', width: '100%' }}>
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Box sx={{ height: '100%', width: '100%', overflow: 'hidden' }}>
                    <Viewer
                        fileUrl={fileUrl}
                        plugins={[defaultLayoutPluginInstance]}
                        onDocumentLoad={onDocumentLoad}
                        onPageChange={onPageChange}
                    />
                </Box>
            </Worker>
        </Box>
    );
};

export default PDFViewer;
