"use client";

import {useRef, useState} from "react";
import '@agv_ui/styles';
import MetadataField from "../mobile/MetadataField";

import {useVolumeConfig} from "../../context/VolumeConfigContext";


export interface FieldDef {
    key: string;
    label: string;
    type?: string;
    min?: number;
    max?: number;
    step?: number;
    requiredWhen?: { key: string; value: string };
    options?: readonly string[];
    metadataSchema?: Record<string, any>;
    metadataFilePath?: string;
}

export interface FileUploadState {
    file: File;
    progress: number;
    status: "pending" | "checking" | "exists" | "uploading" | "done" | "error" | "skipped" | "invalid";
    error?: string;
    validationError?: string;
}

export interface FileValidation {
    type: "csv";
    requiredColumns: readonly string[];
}

interface UploadFormProps {
    title: string;
    volumeFields: FieldDef[];
    extraFields?: FieldDef[];
    pathTemplate: string;
    fileValidation?: FileValidation;
    metadataTemplate?: string; // Path for the JSON, e.g., ".../{fileName}.json"
    metadataSchema?: Record<string, string>; // Maps output JSON key -> metadata source key
    customMetadata?: Record<string, any>; // Add this line
}

const STATUS_LABEL: Record<FileUploadState["status"], string> = {
    pending: "Pending",
    checking: "Checking...",
    exists: "Already exists",
    uploading: "",
    done: "Done",
    error: "Error",
    skipped: "Skipped",
    invalid: "Invalid format",
};

const STATUS_COLOR: Record<FileUploadState["status"], string> = {
    pending: "text-gray-400",
    checking: "text-yellow-400",
    exists: "text-orange-400",
    uploading: "text-blue-400",
    done: "text-green-400",
    error: "text-red-400",
    skipped: "text-gray-500",
    invalid: "text-red-400",

};

const BAR_COLOR: Record<FileUploadState["status"], string> = {
    pending: "bg-gray-600",
    checking: "bg-yellow-500",
    exists: "bg-orange-500",
    uploading: "bg-blue-500",
    done: "bg-green-500",
    error: "bg-red-500",
    skipped: "bg-gray-600",
    invalid: "bg-red-500",

};


function resolvePath(
    template: string,
    metadata: Record<string, string>,
    fileName: string,
    config: { catalog: string; schema: string; volume: string }
): string {
    return template.replace(
        /\{(\w+)\}/g,
        (_, key) => {
            if (key === "fileName") return fileName;
            if (key === "catalog") return config.catalog;
            if (key === "schema") return config.schema;
            if (key === "volume") return config.volume;
            return metadata[key] ?? "";
        }
    );
}

async function validateCsvFile(file: File, requiredColumns: readonly string[]): Promise<{ valid: boolean; error?: string }> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const firstLine = text.split('\n')[0];
            if (!firstLine) {
                resolve({valid: false, error: "File is empty"});
                return;
            }

            // Parse CSV header (handle quoted columns)
            const headers = firstLine.split(',').map(h =>
                h.trim().replace(/^["']|["']$/g, '').toLowerCase()
            );

            const missingColumns = requiredColumns.filter(
                col => !headers.includes(col.toLowerCase())
            );

            if (missingColumns.length > 0) {
                resolve({
                    valid: false,
                    error: `Missing columns: ${missingColumns.join(', ')}`
                });
            } else {
                resolve({valid: true});
            }
        };
        reader.onerror = () => resolve({valid: false, error: "Failed to read file"});
        reader.readAsText(file.slice(0, 4096)); // Only read first 4KB for headers
    });
}

export default function UploadForm({
                                       title,
                                       volumeFields,
                                       extraFields = [],
                                       pathTemplate,
                                       fileValidation,
                                       metadataSchema,
                                       metadataTemplate,
                                       customMetadata = {}
                                   }: UploadFormProps) {
    const initialMetadata = Object.fromEntries(
        [...volumeFields, ...extraFields].map((f) => [f.key, ""])
    );

    const [metadata, setMetadata] = useState<Record<string, string>>(initialMetadata);
    const [uploads, setUploads] = useState<FileUploadState[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {config, isConfigured} = useVolumeConfig();
    const volumeRoot = `/Volumes/${config.catalog}/${config.schema}/${config.volume}`;

    function buildPathUpTo(index: number): string {
        const keys = volumeFields.slice(0, index).map((f) => f.key);
        const segments = keys.map((k) => metadata[k]);
        if (segments.some((s) => !s)) return "";
        return [volumeRoot, ...segments].join("/");
    }

    const handleVolumeFieldChange = (key: string, value: string) => {
        const index = volumeFields.findIndex((f) => f.key === key);
        const reset: Record<string, string> = {};
        volumeFields.slice(index + 1).forEach((f) => {
            reset[f.key] = "";
        });
        setMetadata((prev) => ({...prev, ...reset, [key]: value}));
        setHasChecked(false);
        setUploads((prev) => prev.map((u) => ({...u, status: "pending", progress: 0})));
    };

    const handleExtraFieldChange = (key: string, value: string) => {
        const dependents = extraFields.filter((f) => f.requiredWhen?.key === key);
        const reset: Record<string, string> = {};
        dependents.forEach((f) => {
            reset[f.key] = "";
        });
        setMetadata((prev) => ({...prev, ...reset, [key]: value}));
    };

    const isFieldRequired = (field: FieldDef): boolean => {
        if (!field.requiredWhen) return true;
        return metadata[field.requiredWhen.key] === field.requiredWhen.value;
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        const initialUploads = files.map((file) => ({file, progress: 0, status: "pending" as const}));
        setUploads(initialUploads);
        setHasChecked(false);

        // Validate files if validation config is provided
        if (fileValidation?.type === "csv") {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.name.toLowerCase().endsWith('.csv')) {
                    const result = await validateCsvFile(file, fileValidation.requiredColumns);
                    if (!result.valid) {
                        setUploads((prev) =>
                            prev.map((u, idx) =>
                                idx === i
                                    ? {...u, status: "invalid", validationError: result.error}
                                    : u
                            )
                        );
                    }
                }
            }
        }
    };

    const checkAllFiles = async () => {
        for (let i = 0; i < uploads.length; i++) {
            setUploads((prev) =>
                prev.map((u, idx) => idx === i ? {...u, status: "checking"} : u)
            );
            const path = resolvePath(pathTemplate, metadata, uploads[i].file.name, config);
            try {
                const res = await fetch(`/api/upload/databricks/check?path=${encodeURIComponent(path)}`);
                const data = await res.json();
                setUploads((prev) =>
                    prev.map((u, idx) =>
                        idx === i
                            ? {...u, status: data.exists ? "exists" : "pending", progress: data.exists ? 100 : 0}
                            : u
                    )
                );
            } catch {
                setUploads((prev) =>
                    prev.map((u, idx) => idx === i ? {...u, status: "pending"} : u)
                );
            }
        }
        setHasChecked(true);
    };

    const forceReupload = (index: number) => {
        setUploads((prev) =>
            prev.map((u, i) => i === index ? {...u, status: "pending", progress: 0} : u)
        );
    };

    const skipFile = (index: number) => {
        setUploads((prev) =>
            prev.map((u, i) => i === index ? {...u, status: "skipped"} : u)
        );
    };

    const uploadFile = async (index: number, file: File) => {
        setUploads((prev) =>
            prev.map((u, i) => i === index ? {...u, status: "uploading"} : u)
        );

        const formData = new FormData();
        formData.append("file", file);
        formData.append("metadata", JSON.stringify(metadata));
        formData.append("filePath", resolvePath(pathTemplate, metadata, file.name, config));

        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/upload/databricks");

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    setUploads((prev) =>
                        prev.map((u, i) => i === index ? {...u, progress} : u)
                    );
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setUploads((prev) =>
                        prev.map((u, i) => i === index ? {...u, status: "done", progress: 100} : u)
                    );
                    resolve();
                } else {
                    setUploads((prev) =>
                        prev.map((u, i) => i === index ? {...u, status: "error", error: xhr.responseText} : u)
                    );
                    reject();
                }
            };

            xhr.onerror = () => {
                setUploads((prev) =>
                    prev.map((u, i) => i === index ? {...u, status: "error", error: "Network error"} : u)
                );
                reject();
            };

            xhr.send(formData);
        });
    };

    const handleUpload = async () => {
        setIsUploading(true);
        for (let i = 0; i < uploads.length; i++) {
            if (["exists", "skipped", "done"].includes(uploads[i].status)) continue;

            try {
                const file = uploads[i].file;

                // 1. Upload the main file
                await uploadFile(i, file);

                // 2. If metadata template is provided, upload the sidecar JSON
                if (metadataTemplate && metadataSchema) {
                    const jsonContent = {
                        ...customMetadata, // Merged here
                        ...Object.fromEntries(
                            Object.entries(metadataSchema).map(([jsonKey, metaKey]) => [jsonKey, metadata[metaKey]])
                        )
                    };

                    const jsonBlob = new Blob([JSON.stringify(jsonContent, null, 2)], {type: "application/json"});
                    const jsonFilePath = resolvePath(metadataTemplate, metadata, file.name, config);

                    const formData = new FormData();
                    formData.append("file", jsonBlob, `${file.name}.json`);
                    formData.append("filePath", jsonFilePath);

                    // You can reuse your existing upload API endpoint or create a new one
                    await fetch("/api/upload/databricks", {
                        method: "POST",
                        body: formData
                    });
                }
            } catch (e) {
                console.error("Upload failed", e);
            }
        }
        setIsUploading(false);
    };

    const handleClear = () => {
        setMetadata(initialMetadata);
        setUploads([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        setHasChecked(false);
        setIsUploading(false);
    };

    const volumeComplete = volumeFields.every((f) => metadata[f.key]?.trim() !== "");
    const extraComplete = extraFields.every((f) => {
        if (!isFieldRequired(f)) return true;
        return metadata[f.key]?.trim() !== "";
    });
    const metadataComplete = volumeComplete && extraComplete;
    const existsCount = uploads.filter((u) => u.status === "exists").length;
    const pendingCount = uploads.filter((u) => u.status === "pending").length;
    const canUpload = hasChecked && pendingCount > 0 && !isUploading;
    const hasAnyData = Object.values(metadata).some((v) => v.trim() !== "") || uploads.length > 0;

    return (
        <main className="page-container">
            <h1 className="title">{title}</h1>

            {/* Volume-linked metadata */}
            <section className="card">
                <h2 className="title-2">Collection Metadata</h2>
                <div className="grid-container">
                    {volumeFields.map(({key, label, type}, index) => {
                        const volumePath = buildPathUpTo(index);
                        const isDisabled = index > 0 && !metadata[volumeFields[index - 1].key];
                        return (
                            <MetadataField
                                key={key}
                                label={label}
                                value={metadata[key]}
                                onChange={(val) => handleVolumeFieldChange(key, val)}
                                volumePath={volumePath || volumeRoot}
                                type={type}
                                disabled={isDisabled}
                            />
                        );
                    })}
                </div>
            </section>

            {/* Extra (non-volume) metadata */}
            {extraFields.length > 0 && (
                <section className="card">
                    <h2 className="title-2">Equipment & Capture Settings</h2>
                    <div className="grid-container">
                        {extraFields.map((field) => {
                            const {key, label, type, min, max, step, requiredWhen, options} = field;
                            const required = isFieldRequired(field);
                            const isHidden = requiredWhen && !required;

                            if (isHidden) return null;

                            if (type === "boolean") {
                                return (
                                    <div key={key} className="flex flex-col gap-1">
                                        <label className="title-3">{label}</label>
                                        <div className="flex gap-3 mt-1">
                                            {["yes", "no"].map((opt) => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => handleExtraFieldChange(key, opt)}
                                                    className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                                        metadata[key] === opt
                                                            ? "bg-blue-600 border-blue-500 text-white"
                                                            : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                                                    }`}
                                                >
                                                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            if (options && options.length > 0) {
                                return (
                                    <div key={key} className="flex flex-col gap-1">
                                        <label className="title-3">{label}</label>
                                        <select
                                            value={metadata[key]}
                                            onChange={(e) => handleExtraFieldChange(key, e.target.value)}
                                            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="">Select {label}...</option>
                                            {options.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            }
                            return (
                                <div key={key} className="flex flex-col gap-1">
                                    <label className="title-3">{label}</label>
                                    <input
                                        type={type ?? "text"}
                                        value={metadata[key]}
                                        min={min}
                                        max={max}
                                        step={step}
                                        onChange={(e) => handleExtraFieldChange(key, e.target.value)}
                                        placeholder={label}
                                        className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
                                    />
                                    {(key === "verticalOverlap" || key === "horizontalOverlap") && (
                                        <span className="text-gray-500 text-xs">Enter as a percentage, e.g. 80</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* File selection */}
            <section className="card">
                <h2 className="title-2">Select Files</h2>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden"/>
                <button onClick={() => fileInputRef.current?.click()} className="nav-button">
                    Browse Files
                </button>

                {uploads.length > 0 && (
                    <>
                        {hasChecked && existsCount > 0 && (
                            <div
                                className="mt-4 p-3 bg-orange-900 border border-orange-500 rounded-lg text-orange-200 text-sm">
                                ⚠️ {existsCount} file{existsCount > 1 ? "s" : ""} already
                                exist{existsCount === 1 ? "s" : ""} in the volume.
                                You can skip or force re-upload them individually below.
                            </div>
                        )}
                        <ul className="mt-6 flex flex-col gap-4">
                            {uploads.map(({file, progress, status, error, validationError}, i) => (
                                <li key={i} className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-200 truncate max-w-xs">{file.name}</span>
                                        <span className={STATUS_COLOR[status]}>
                                            {status === "uploading" ? `${progress}%` : STATUS_LABEL[status]}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${BAR_COLOR[status]}`}
                                            style={{width: `${["pending", "checking", "invalid"].includes(status) ? 0 : progress}%`}}
                                        />
                                    </div>
                                    {status === "exists" && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => forceReupload(i)}
                                                className="text-xs px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                            >
                                                Re-upload
                                            </button>
                                            <button
                                                onClick={() => skipFile(i)}
                                                className="text-xs px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                                            >
                                                Skip
                                            </button>
                                        </div>
                                    )}
                                    {validationError && (
                                        <span className="text-red-400 text-xs">⚠️ {validationError}</span>
                                    )}
                                    {error && <span className="text-red-400 text-xs">{error}</span>}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </section>

            <div className="flex gap-4">
                <button
                    onClick={checkAllFiles}
                    disabled={!metadataComplete || uploads.length === 0 || isUploading}
                    className="nav-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Check Files
                </button>
                <button
                    onClick={handleUpload}
                    disabled={!canUpload}
                    className="nav-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isUploading ? "Uploading..." : `Upload${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
                </button>
                <button
                    onClick={handleClear}
                    disabled={!hasAnyData || isUploading}
                    className="nav-button bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Clear
                </button>
            </div>
        </main>
    );
}