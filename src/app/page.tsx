"use client";

import React, { useState } from "react";
import UploadStagesHelp from "./components/UploadStage";

const HomePage = () => {
    const [progressLog, setProgressLog] = useState<string[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);

    const authToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQwODA1MDc4LCJpYXQiOjE3MzgyMTMwNzgsImp0aSI6ImZmZjcyMGI4MWY0ZDRlMDNiMzg4YzZmZWQxZmI3ZTg0IiwidXNlcl9pZCI6Mn0.z79WLRjOFaqRfjYAXhdIVSiJZKeeiLnhU81ay9YepQU";
    // const collectionId = "f050a8c5-16e6-494b-8da5-c3bcbd4c1a7f";
    const collectionId = "9ef1eed3-2741-4098-9173-b6c70058f151";
    // const baseUrl = "https://backend.amal.education";
    const baseUrl = "http://127.0.0.1:8000";

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setUploading(true);

        const filesInput = document.getElementById("files") as HTMLInputElement;
        const progressLogElement = document.getElementById("progress-log") as HTMLDivElement;

        if (filesInput?.files?.length === 0) {
            alert("Please select a directory.");
            setUploading(false);
            return;
        }

        const formData = new FormData();

        // Loop through all selected files and extract the webkitRelativePath for each file
        Array.from(filesInput.files!).forEach((file) => {
            formData.append("files", file);
            formData.append("paths", file.webkitRelativePath);
        });

        try {
            // Use fetch instead of axios for proper streaming support
            const response = await fetch(
                `${baseUrl}/api/ai-assistant/collection-details/${collectionId}/async-folder-upload/`,
                {
                    method: "POST",
                    body: formData,
                    headers: {
                        Authorization: `Bearer ${authToken || ""}`,
                        "X-API-Token": "7ca7c0a9-4d15-4697-81ae-e0b9ded2502d",
                    },
                }
            );

            // Get the reader from the response body stream
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    // Process any remaining data in the buffer
                    if (buffer) {
                        processChunk(buffer, progressLogElement, setProgressLog);
                    }
                    break;
                }

                // Decode the chunk and add it to our buffer
                buffer += decoder.decode(value, { stream: true });

                // Process complete lines from the buffer
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

                // Process each complete line
                lines.forEach((line) => {
                    if (line.trim()) {
                        processChunk(line, progressLogElement, setProgressLog);
                    }
                });
            }

            setProgressLog((prev) => [...prev, "Upload Complete!"]);
            if (progressLogElement) {
                progressLogElement.innerHTML += `<p><strong>Upload Complete!</strong></p>`;
                progressLogElement.scrollTop = progressLogElement.scrollHeight;
            }
        } catch (error) {
            console.error("Error uploading directory:", error);
            setProgressLog((prev) => [...prev, `Error: ${error.message}`]);
            if (progressLogElement) {
                progressLogElement.innerHTML += `<p class="error"><strong>Error:</strong> ${error.message}</p>`;
                progressLogElement.scrollTop = progressLogElement.scrollHeight;
            }
        } finally {
            setUploading(false);
        }
    };

    // Helper function to get Tailwind classes based on stage
    const getMessageClasses = (stage: string) => {
        const baseClasses = "p-3 rounded-md mb-2 flex items-start";

        switch (stage) {
            case "error":
                return `${baseClasses} bg-red-50 text-red-700 border border-red-200`;
            case "upload_complete":
                return `${baseClasses} bg-green-50 text-green-700 border border-green-200`;
            case "document_creation":
                return `${baseClasses} bg-blue-50 text-blue-700 border border-blue-200`;
            case "file_validation":
                return `${baseClasses} bg-yellow-50 text-yellow-700 border border-yellow-200`;
            default:
                return `${baseClasses} bg-gray-50 text-gray-700 border border-gray-200`;
        }
    };

    // Helper function to process each chunk of data
    const processChunk = (
        line: string,
        progressLogElement: HTMLDivElement | null,
        setProgressLog: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        try {
            const json = JSON.parse(line);
            console.log("Received update:", json);

            // Update progress log state
            setProgressLog((prev) => [...prev, `${json.stage}: ${json.message}`]);

            // Update UI
            if (progressLogElement) {
                const messageClasses = getMessageClasses(json.stage);

                let message = `
        <div class="${messageClasses}">
          <div class="flex-1">
            <span class="font-semibold">${json.stage}:</span> ${json.message}
      `;

                // Add additional information if available
                if (json.created_count !== undefined && json.valid_files_count !== undefined) {
                    message += `
          <div class="mt-1 flex items-center space-x-2">
            <div class="flex-1 bg-gray-200 rounded-full h-2">
              <div class="bg-blue-600 h-2 rounded-full" style="width: ${
                  (json.created_count / json.valid_files_count) * 100
              }%"></div>
            </div>
            <span class="text-sm text-gray-600">
              ${json.created_count}/${json.valid_files_count}
            </span>
          </div>
        `;
                }

                message += `
          </div>
        </div>
      `;

                progressLogElement.innerHTML += message;
                progressLogElement.scrollTop = progressLogElement.scrollHeight;
            }
        } catch (err) {
            console.error("Error parsing JSON:", err, "Line:", line);
        }
    };

    // Component JSX
    return (
        <div className="max-w-3xl mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-200">Upload Directory</h2>
                <UploadStagesHelp />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="files" className="block text-sm font-medium text-gray-300">
                        Select Directory
                    </label>
                    <input
                        type="file"
                        id="files"
                        webkitdirectory="true"
                        directory=""
                        multiple
                        className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            cursor-pointer"
                    />
                </div>

                <button
                    type="submit"
                    disabled={uploading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
          ${
              uploading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          }`}
                >
                    {uploading ? (
                        <>
                            <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Uploading...
                        </>
                    ) : (
                        "Upload Directory"
                    )}
                </button>
            </form>

            <div
                id="progress-log"
                className="mt-6 max-h-[400px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm"
            >
                <div className="p-4 space-y-2">
                    {/* Progress messages will be inserted here by the processChunk function */}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
