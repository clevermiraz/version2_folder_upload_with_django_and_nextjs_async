"use client";
import { useState } from "react";

const ALLOWED_FILE_TYPES = {
    // Images
    ".png": {
        mimeType: "image/png",
        signature: [0x89, 0x50, 0x4e, 0x47],
    },
    ".jpg": {
        mimeType: "image/jpeg",
        signature: [0xff, 0xd8, 0xff],
    },
    ".jpeg": {
        mimeType: "image/jpeg",
        signature: [0xff, 0xd8, 0xff],
    },
    ".webp": {
        mimeType: "image/webp",
        signature: [0x52, 0x49, 0x46, 0x46],
    },

    // Documents
    ".pdf": {
        mimeType: "application/pdf",
        signature: [0x25, 0x50, 0x44, 0x46],
    },
    ".doc": {
        mimeType: "application/msword",
        signature: [0xd0, 0xcf, 0x11, 0xe0],
    },
    ".docx": {
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        signature: [0x50, 0x4b, 0x03, 0x04],
    },
    ".xls": {
        mimeType: "application/vnd.ms-excel",
        signature: [0xd0, 0xcf, 0x11, 0xe0],
    },
    ".xlsx": {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        signature: [0x50, 0x4b, 0x03, 0x04],
    },
};

const ALLOWED_FILE_EXTENSIONS = Object.keys(ALLOWED_FILE_TYPES);

export default function TestPage() {
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const checkFileSignature = async (file, expectedSignature) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const arr = new Uint8Array(e.target.result);
                const isValid = expectedSignature.every((byte, i) => arr[i] === byte);
                resolve(isValid);
            };
            // Read the first few bytes of the file
            reader.readAsArrayBuffer(file.slice(0, 4));
        });
    };

    const validateFile = async (file) => {
        // Get file extension
        const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

        // Check if extension is allowed
        if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
            return {
                isValid: false,
                error: `Invalid file type. Allowed types are: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`,
            };
        }

        const fileType = ALLOWED_FILE_TYPES[fileExtension];

        // Check if MIME type matches
        if (file.type !== fileType.mimeType) {
            return {
                isValid: false,
                error: `Invalid file format. File appears to be modified or corrupted.`,
            };
        }

        // Check file signature/magic numbers
        const isSignatureValid = await checkFileSignature(file, fileType.signature);
        if (!isSignatureValid) {
            return {
                isValid: false,
                error: `File content doesn't match its extension. File may be renamed or corrupted.`,
            };
        }

        return { isValid: true };
    };

    const handleFileChange = async (event) => {
        const selectedFile = event.target.files[0];
        setIsLoading(true);
        setError(null);

        try {
            if (!selectedFile) return;

            // Check file size (50MB limit)
            if (selectedFile.size > 50 * 1024 * 1024) {
                throw new Error("File size exceeds 5MB limit");
            }

            // Validate the file
            const validation = await validateFile(selectedFile);

            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            setFile(selectedFile);
            console.log("Valid file:", selectedFile);
        } catch (err) {
            setError(err.message);
            setFile(null);
            // Reset the input
            event.target.value = "";
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4">
            <input
                type="file"
                onChange={handleFileChange}
                accept={ALLOWED_FILE_EXTENSIONS.join(",")}
                disabled={isLoading}
                className="mb-4"
            />

            {isLoading && <p>Validating file...</p>}

            {error && <p className="text-red-500 mb-2">{error}</p>}

            {file && !error && (
                <div className="mt-4">
                    <p>Selected file: {file.name}</p>
                    <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p>Type: {file.type}</p>
                </div>
            )}
        </div>
    );
}
