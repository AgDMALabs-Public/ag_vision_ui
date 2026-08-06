"use client";

import {useState} from "react";
import '@/packages/styles/styles.css';
import MetadataField from "../../upload/components/MetadataField";
import {useVolumeConfig} from "../../context/VolumeConfigContext";
import {buildPathUpTo, type FieldDef} from "../../lib/pathUtils";

interface NoteFormProps {
    title: string;
    volumeFields: FieldDef[];
    pathTemplate: string;
}

interface AttachedFile {
    file: File;
    id: string;
    preview?: string;
}

function resolvePath(
    template: string,
    metadata: Record<string, string>,
    config: { catalog: string; schema: string; volume: string }
): string {
    return template.replace(
        /\{(\w+)\}/g,
        (_, key) => {
            if (key === "catalog") return config.catalog;
            if (key === "schema") return config.schema;
            if (key === "volume") return config.volume;
            return metadata[key] ?? "";
        }
    );
}

const ALLOWED_EXTENSIONS = {
    image: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    audio: [".mp3", ".wav", ".ogg", ".m4a"],
    text: [".txt", ".pdf", ".csv"],
};

export default function NoteForm({
                                     title,
                                     volumeFields,
                                     pathTemplate,
                                 }: NoteFormProps) {
    const initialMetadata = Object.fromEntries(
        volumeFields.map((f) => [f.key, ""])
    );

    const [metadata, setMetadata] = useState<Record<string, string>>(initialMetadata);
    const [noteTitle, setNoteTitle] = useState("");
    const [noteContent, setNoteContent] = useState("");
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const {config} = useVolumeConfig();
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
        setStatus("idle");
    };

    const generateFileName = () => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const sanitizedTitle = noteTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "");
        return `${timestamp}_${sanitizedTitle || "note"}.txt`;
    };

    const getFileType = (fileName: string): "image" | "audio" | "text" | "other" => {
        const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
        if (ALLOWED_EXTENSIONS.image.includes(ext)) return "image";
        if (ALLOWED_EXTENSIONS.audio.includes(ext)) return "audio";
        if (ALLOWED_EXTENSIONS.text.includes(ext)) return "text";
        return "other";
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newFiles: AttachedFile[] = [];

        for (const file of files) {
            const fileType = getFileType(file.name);

            if (fileType === "other") {
                setErrorMessage(`File type not supported: ${file.name}`);
                continue;
            }

            const id = `${Date.now()}_${Math.random()}`;
            let preview: string | undefined;

            if (fileType === "image") {
                try {
                    preview = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.readAsDataURL(file);
                    });
                } catch {
                    // Preview failed, continue without it
                }
            }

            newFiles.push({file, id, preview});
        }

        setAttachedFiles((prev) => [...prev, ...newFiles]);
        if (e.target) e.target.value = "";
        setStatus("idle");
    };

    const removeAttachment = (id: string) => {
        setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const resolvedPath = resolvePath(
        pathTemplate.replace("{noteFileName}", generateFileName()),
        metadata,
        config
    );

    const allFieldsComplete = volumeFields.every(
        (f) => metadata[f.key]?.trim() !== ""
    );
    const canSave = allFieldsComplete && noteContent.trim() !== "";

    const hasAnyData = Object.values(metadata).some((v) => v.trim() !== "") ||
        noteTitle.trim() !== "" ||
        noteContent.trim() !== "" ||
        attachedFiles.length > 0;

    const handleClear = () => {
        setMetadata(initialMetadata);
        setNoteTitle("");
        setNoteContent("");
        setAttachedFiles([]);
        setStatus("idle");
        setErrorMessage("");
        setIsSaving(false);
    };

    const handleSaveNote = async () => {
        setIsSaving(true);
        setStatus("idle");
        setErrorMessage("");

        try {
            const timestamp = new Date().toISOString();

            const fullContent = [
                `Title: ${noteTitle || "Untitled"}`,
                `Date: ${timestamp}`,
                `Field: ${metadata.field || "N/A"}`,
                `Location: ${metadata.location_name || "N/A"}`,
                `Trial: ${metadata.trial || "N/A"}`,
                attachedFiles.length > 0
                    ? `Attachments: ${attachedFiles.map((f) => f.file.name).join(", ")}`
                    : "",
                "---",
                "",
                noteContent,
            ]
                .filter((line) => line !== "")
                .join("\n");

            const blob = new Blob([fullContent], {type: "text/plain"});
            const formData = new FormData();
            formData.append("file", blob, generateFileName());
            formData.append("filePath", resolvedPath);

            const res = await fetch("/api/upload/databricks", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                setStatus("error");
                setErrorMessage(data.error || "Failed to save note");
                setIsSaving(false);
                return;
            }

            const attachmentDir = resolvedPath.substring(
                0,
                resolvedPath.lastIndexOf("/")
            );

            for (const {file} of attachedFiles) {
                const attachmentFormData = new FormData();
                attachmentFormData.append("file", file);
                attachmentFormData.append(
                    "filePath",
                    `${attachmentDir}/attachments/${file.name}`
                );

                const attachRes = await fetch("/api/upload/databricks", {
                    method: "POST",
                    body: attachmentFormData,
                });

                if (!attachRes.ok) {
                    console.warn(`Failed to save attachment: ${file.name}`);
                }
            }

            setStatus("success");
            setNoteTitle("");
            setNoteContent("");
            setAttachedFiles([]);
            setMetadata(initialMetadata);
        } catch (err) {
            setStatus("error");
            setErrorMessage("Network error");
        } finally {
            setIsSaving(false);
        }
    };

    const acceptedFormats = [
        ...ALLOWED_EXTENSIONS.image,
        ...ALLOWED_EXTENSIONS.audio,
        ...ALLOWED_EXTENSIONS.text,
    ].join(",");

    return (
        <main className="page-container">
            <h1 className="title">{title}</h1>

            <section className="card">
                <h2 className="title-2">Select Field</h2>
                <div className="grid-container">
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
                                        className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-40"
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

            <section className="card">
                <h2 className="title-2">Note</h2>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="title-3">Title (optional)</label>
                        <input
                            type="text"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            placeholder="Enter note title..."
                            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="title-3">Content</label>
                        <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Enter your notes about this field trial..."
                            rows={8}
                            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 resize-y"
                        />
                    </div>
                </div>
            </section>

            <section className="card">
                <h2 className="title-2">Attachments</h2>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="title-3">Add Files</label>
                        <input
                            type="file"
                            multiple
                            accept={acceptedFormats}
                            onChange={handleFileSelect}
                            disabled={isSaving}
                            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 file:bg-blue-600 file:text-white file:border-0 file:px-3 file:py-1 file:rounded file:cursor-pointer"
                        />
                        <p className="text-gray-400 text-xs">
                            Images (JPG, PNG, GIF, WebP) • Audio (MP3, WAV, OGG, M4A) •
                            Documents (TXT, PDF, CSV)
                        </p>
                    </div>

                    {attachedFiles.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <h3 className="title-3">
                                Attached Files ({attachedFiles.length})
                            </h3>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {attachedFiles.map(({id, file, preview}) => {
                                    const fileType = getFileType(file.name);
                                    return (
                                        <div
                                            key={id}
                                            className="bg-gray-700 rounded-lg p-2 flex flex-col gap-2"
                                        >
                                            {fileType === "image" && preview && (
                                                <img
                                                    src={preview}
                                                    alt={file.name}
                                                    className="w-full h-24 object-cover rounded"
                                                />
                                            )}
                                            {fileType === "audio" && (
                                                <div
                                                    className="flex items-center justify-center h-24 bg-gray-600 rounded text-2xl">
                                                    🎵
                                                </div>
                                            )}
                                            {fileType === "text" && (
                                                <div
                                                    className="flex items-center justify-center h-24 bg-gray-600 rounded text-2xl">
                                                    📄
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-1">
                                                <p className="text-white text-xs font-medium truncate">
                                                    {file.name}
                                                </p>
                                                <p className="text-gray-400 text-xs">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => removeAttachment(id)}
                                                className="w-full bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1 text-xs font-medium transition"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {status === "success" && (
                <div className="p-3 bg-green-900 border border-green-500 rounded-lg text-green-200 text-sm">
                    ✅ Note and attachments saved successfully!
                </div>
            )}
            {status === "error" && (
                <div className="p-3 bg-red-900 border border-red-500 rounded-lg text-red-200 text-sm">
                    ❌ {errorMessage}
                </div>
            )}

            <div className="flex gap-4">
                <button
                    onClick={handleSaveNote}
                    disabled={!canSave || isSaving}
                    className="nav-button"
                >
                    {isSaving ? "Saving..." : "Save Note"}
                </button>
                <button
                    onClick={handleClear}
                    disabled={!hasAnyData || isSaving}
                    className="nav-button"
                >
                    Clear
                </button>
            </div>
        </main>
    );
}