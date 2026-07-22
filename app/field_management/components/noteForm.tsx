"use client";

import { useState } from "react";
import '@agv_ui/styles';
import MetadataField from "../../upload/components/MetadataField";
import { useVolumeConfig } from "../../context/VolumeConfigContext";

export interface FieldDef {
    key: string;
    label: string;
    type?: string;
    options?: readonly string[];
}

interface NoteFormProps {
    title: string;
    volumeFields: FieldDef[];
    pathTemplate: string; // Should include {noteFileName} placeholder
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
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const { config } = useVolumeConfig();
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
        setMetadata((prev) => ({ ...prev, ...reset, [key]: value }));
        setStatus("idle");
    };

    // Generate filename from title and timestamp
    const generateFileName = () => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const sanitizedTitle = noteTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "");
        return `${timestamp}_${sanitizedTitle || "note"}.txt`;
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

    const handleSaveNote = async () => {
        setIsSaving(true);
        setStatus("idle");
        setErrorMessage("");

        try {
            // Create the note content with metadata header
            const fullContent = [
                `Title: ${noteTitle || "Untitled"}`,
                `Date: ${new Date().toISOString()}`,
                `Field: ${metadata.field || "N/A"}`,
                `Location: ${metadata.location || "N/A"}`,
                `Trial: ${metadata.trial || "N/A"}`,
                "---",
                "",
                noteContent,
            ].join("\n");

            // Create a Blob/File from the content
            const blob = new Blob([fullContent], { type: "text/plain" });
            const formData = new FormData();
            formData.append("file", blob, generateFileName());
            formData.append("filePath", resolvedPath);

            const res = await fetch("/api/upload/databricks", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                setStatus("success");
                // Clear the form for the next note
                setNoteTitle("");
                setNoteContent("");
            } else {
                const data = await res.json();
                setStatus("error");
                setErrorMessage(data.error || "Failed to save note");
            }
        } catch (err) {
            setStatus("error");
            setErrorMessage("Network error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className="page-container">
            <h1 className="title">{title}</h1>

            {/* Field selection */}
            <section className="card">
                <h2 className="title-2">Select Field</h2>
                <div className="grid-container">
                    {volumeFields.map(({ key, label, type, options }, index) => {
                        const volumePath = buildPathUpTo(index);
                        const isDisabled = index > 0 && !metadata[volumeFields[index - 1].key];

                        if (options && options.length > 0) {
                            return (
                                <div key={key} className="flex flex-col gap-1">
                                    <label className="title-3">{label}</label>
                                    <select
                                        value={metadata[key]}
                                        onChange={(e) => handleVolumeFieldChange(key, e.target.value)}
                                        disabled={isDisabled}
                                        className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                                    >
                                        <option value="">Select {label}...</option>
                                        {options.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
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
                            />
                        );
                    })}
                </div>
            </section>

            {/* Note content */}
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

            {/* Status messages */}
            {status === "success" && (
                <div className="p-3 bg-green-900 border border-green-500 rounded-lg text-green-200 text-sm">
                    ✅ Note saved successfully!
                </div>
            )}
            {status === "error" && (
                <div className="p-3 bg-red-900 border border-red-500 rounded-lg text-red-200 text-sm">
                    ❌ {errorMessage}
                </div>
            )}

            <button
                onClick={handleSaveNote}
                disabled={!canSave || isSaving}
                className="nav-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? "Saving..." : "Save Note"}
            </button>
        </main>
    );
}