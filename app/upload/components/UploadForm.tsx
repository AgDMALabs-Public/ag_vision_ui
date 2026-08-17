"use client";

import {useRef, useState} from "react";
import '@agv_ui/styles';
import MetadataField from "./MetadataField";

import {useVolumeConfig} from "../../context/VolumeConfigContext";
import {buildPathUpTo, type FieldDef} from "../../lib/pathUtils";


export interface FileUploadState {
    file: File;
    progress: number;
    status: "pending" | "checking" | "exists" | "uploading" | "done" | "error" | "skipped" | "invalid";
    error?: string;
    validationError?: string;
}

export interface FileTypeConfig {
    extensions: string[];
    mimeTypes: string[];
    label: string; // e.g., "Images", "Videos", "Documents"
}


export type FileValidation =
    | {
        type: "csv";
        requiredColumns: readonly string[];
    }
    | {
        type: "fileType";
        fileTypeConfig: FileTypeConfig;
    };

interface UploadFormProps {
    title: string;
    upload_note?: string;
    volumeFields: FieldDef[];
    extraFields?: FieldDef[];
    pathTemplate: string;
    fileValidation?: FileValidation;
    metadataTemplate?: string; // Path for the JSON, e.g., ".../{fileName}.json"
    metadataSchema?: Record<string, any>; // Maps output JSON key -> metadata source key
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

export const FILE_TYPE_CONFIGS = {
    images: {
        extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"],
        mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml"],
        label: "Images"
    } as FileTypeConfig,
    videos: {
        extensions: [".mp4", ".avi", ".mov", ".mkv", ".flv", ".wmv", ".webm"],
        mimeTypes: ["video/mp4", "video/avi", "video/quicktime", "video/x-matroska", "video/x-flv", "video/x-ms-wmv", "video/webm"],
        label: "Videos"
    } as FileTypeConfig,
    audio: {
        extensions: [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"],
        mimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/flac", "audio/aac"],
        label: "Audio"
    } as FileTypeConfig,
    documents: {
        extensions: [".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx", ".ppt", ".pptx"],
        mimeTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
        label: "Documents"
    } as FileTypeConfig,
} as const;

function setNestedProperty(target: Record<string, any>, path: string, value: any) {
    const keys = path.split(".");
    let current = target;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== "object" || Array.isArray(current[key])) {
            current[key] = {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
}

function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(deepClone) as any;
    const copy: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
        copy[key] = deepClone((obj as Record<string, any>)[key]);
    }
    return copy as T;
}

function populateMetadata(
    schema: Record<string, any>,
    metadata: Record<string, string>,
    target: Record<string, any>
) {
    for (const [key, val] of Object.entries(schema)) {
        if (typeof val === "string") {
            if (key.includes(".")) {
                setNestedProperty(target, key, metadata[val]);
            } else {
                target[key] = metadata[val];
            }
        } else if (val && typeof val === "object" && !Array.isArray(val)) {
            if (!target[key] || typeof target[key] !== "object") {
                target[key] = {};
            }
            populateMetadata(val, metadata, target[key]);
        }
    }
}

function buildJsonMetadata(
    customMetadata: Record<string, any>,
    metadataSchema: Record<string, any>,
    metadata: Record<string, string>
): Record<string, any> {
    const result = deepClone(customMetadata);
    populateMetadata(metadataSchema, metadata, result);
    return result;
}

function getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split(".").reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);
}

function resolvePath(
    template: string,
    metadata: Record<string, any>,
    fileName: string,
    config: { catalog: string; schema: string; volume: string }
): string {
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");

    const context: Record<string, any> = {
        fileName,
        fileNameWithoutExt,
        noteFileName: fileName,
        catalog: config.catalog,
        schema: config.schema,
        volume: config.volume,
        ...metadata,
    };

    return template
        .replace(/\{([\w.-]+)\}/g, (_, key) => {
            if (key in context && context[key] !== undefined && context[key] !== null) {
                return String(context[key]);
            }
            const nested = getNestedValue(metadata, key);
            if (nested !== undefined && nested !== null) {
                return String(nested);
            }
            return "";
        })
        .replace(/\/+/g, "/");
}

async function validateCsvFile(file: File, requiredColumns: readonly string[]): Promise<{
    valid: boolean;
    error?: string
}> {
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
                                       upload_note="",
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

    function getPathUpTo(index: number): string {
        return buildPathUpTo(index, volumeFields, metadata, volumeRoot);
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
        } else if (fileValidation?.type === "fileType" && fileValidation.fileTypeConfig) {
            const {extensions, mimeTypes, label} = fileValidation.fileTypeConfig;
            files.forEach((file, i) => {
                const hasValidExtension = extensions.some((ext) =>
                    file.name.toLowerCase().endsWith(ext.toLowerCase())
                );
                const hasValidMimeType = !file.type || mimeTypes.includes(file.type);
                if (!hasValidExtension || !hasValidMimeType) {
                    setUploads((prev) =>
                        prev.map((u, idx) =>
                            idx === i
                                ? {...u, status: "invalid", validationError: `Only ${label} files are allowed`}
                                : u
                        )
                    );
                }
            });
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
                if (metadataTemplate && (metadataSchema || Object.keys(customMetadata).length > 0)) {
                    const jsonContent = buildJsonMetadata(customMetadata, metadataSchema ?? {}, metadata);

                    const jsonBlob = new Blob([JSON.stringify(jsonContent, null, 2)], {type: "application/json"});
                    const jsonFilePath = resolvePath(metadataTemplate, metadata, file.name, config);

                    const formData = new FormData();
                    formData.append("file", jsonBlob, `${file.name}.json`);
                    formData.append("filePath", jsonFilePath);

                    const res = await fetch("/api/upload/databricks", {
                        method: "POST",
                        body: formData
                    });

                    if (!res.ok) {
                        const err = await res.text();
                        throw new Error(`Metadata upload failed: ${err}`);
                    }
                }
            } catch (e) {
                console.error("Upload failed", e);
                setUploads((prev) =>
                    prev.map((u, idx) =>
                        idx === i
                            ? {...u, status: "error", error: (e as Error)?.message ?? "Upload failed"}
                            : u
                    )
                );
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
            <section className="card">
                <h2 className="title-2">Select Field</h2>
                <div className="cardGrid">
                    {volumeFields.map(({key, label, type, options}, index) => {
                        const volumePath = getPathUpTo(index);
                        const isDisabled = index > 0 && !metadata[volumeFields[index - 1].key];

                        if (options && options.length > 0) {
                            return (
                                <div key={key} className="flex flex-col gap-1">
                                    <label className="title-3">{label}</label>
                                    <select
                                        value={metadata[key]}
                                        onChange={(e) =>
                                            handleVolumeFieldChange(key, e.target.value)
                                        }
                                        disabled={isDisabled}
                                        className="form-input"
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
                            <MetadataField
                                key={key}
                                label={label}
                                value={metadata[key]}
                                onChange={(val) => handleVolumeFieldChange(key, val)}
                                volumePath={volumePath || volumeRoot}
                                type={type}
                                disabled={isDisabled}
                                staticPathSegment={volumeFields[index].staticPathSegment}
                                fieldDef={volumeFields[index]}
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
                                            className="form-input"
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
                                        className="form-input"
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
                <h3 className="note">{upload_note}</h3>
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
                    className="nav-button"
                >
                    Check Files
                </button>
                <button
                    onClick={handleUpload}
                    disabled={!canUpload}
                    className="nav-button"
                >
                    {isUploading ? "Uploading..." : `Upload${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
                </button>
                <button
                    onClick={handleClear}
                    disabled={!hasAnyData || isUploading}
                    className="nav-button"
                >
                    Clear
                </button>
            </div>
        </main>
    );
}