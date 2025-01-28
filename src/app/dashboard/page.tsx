"use client";

import { useState } from "react";

interface StageResponse {
    stage: string;
    message: string;
    [key: string]: any; // For additional properties
}

interface StageInfo {
    title: string;
    description: string;
    responseExample: StageResponse;
    icon: string; // Heroicon path
}

const UPLOAD_STAGES: Record<string, StageInfo> = {
    file_validation: {
        title: "File Validation",
        description: "Initial validation of the request and files",
        responseExample: {
            stage: "file_validation",
            message: "Validating files",
            invalid_files: ["example.exe"], // Optional
        },
        icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
    },
    document_creation: {
        title: "Document Creation",
        description: "Creating documents for each valid file",
        responseExample: {
            stage: "document_creation",
            message: "Successfully created document: example.pdf",
            created_count: 1,
            valid_files_count: 5,
        },
        icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    },
    folder_structure: {
        title: "Folder Structure",
        description: "Creating and organizing folder hierarchy",
        responseExample: {
            stage: "folder_structure",
            message: "Creating folder structure",
            renamed_folders: [
                {
                    original_path: "/path/to/folder",
                    new_name: "folder (1)",
                    parent_folder: "parent",
                },
            ],
        },
        icon: "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z",
    },
    file_folder_relation: {
        title: "File-Folder Relation",
        description: "Updating relationships between files and folders",
        responseExample: {
            stage: "file_folder_relation",
            message: "Updating document relationships",
        },
        icon: "M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    },
    error: {
        title: "Error",
        description: "Error occurred during the upload process",
        responseExample: {
            stage: "error",
            message: "Error message here",
            error: "Detailed error description", // Optional
        },
        icon: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
    },
    upload_complete: {
        title: "Upload Complete",
        description: "Upload process successfully completed",
        responseExample: {
            stage: "upload_complete",
            message: "Upload complete",
            total_files: 5,
            total_folders: 2,
        },
        icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
};

const UploadStagesHelp: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedStage, setSelectedStage] = useState<string | null>(null);

    return (
        <div className="relative">
            {/* Help Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </button>

            {/* Help Modal */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-screen max-w-2xl bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Upload Stages Guide</h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        fillRule="evenodd"
                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Stages List */}
                            <div className="space-y-2">
                                {Object.entries(UPLOAD_STAGES).map(([key, stage]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedStage(key)}
                                        className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 transition-colors
                      ${
                          selectedStage === key
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      } border`}
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d={stage.icon}
                                            />
                                        </svg>
                                        <span className="font-medium">{stage.title}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Stage Details */}
                            {selectedStage && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-lg text-gray-900 mb-2">
                                        {UPLOAD_STAGES[selectedStage].title}
                                    </h4>
                                    <p className="text-gray-600 mb-4">{UPLOAD_STAGES[selectedStage].description}</p>
                                    <div className="bg-gray-900 rounded-lg p-4">
                                        <h5 className="text-gray-400 text-sm mb-2">Response Structure:</h5>
                                        <pre className="text-green-400 text-sm overflow-x-auto">
                                            {JSON.stringify(UPLOAD_STAGES[selectedStage].responseExample, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UploadStagesHelp;
