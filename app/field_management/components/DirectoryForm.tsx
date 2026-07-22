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

interface DirectoryFormProps {
    title: string;
    volumeFields: FieldDef[];
    extraFields?: FieldDef[];
    pathTemplate: string;
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

export default function DirectoryForm({
                                          title,
                                          volumeFields,
                                          extraFields = [],
                                          pathTemplate,
                                      }: DirectoryFormProps) {
    const initialMetadata = Object.fromEntries(
        [...volumeFields, ...extraFields].map((f) => [f.key, ""])
    );

    const [metadata, setMetadata] = useState<Record<string, string>>(initialMetadata);
    const [isCreating, setIsCreating] = useState(false);
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

    const handleExtraFieldChange = (key: string, value: string) => {
        setMetadata((prev) => ({ ...prev, [key]: value }));
        setStatus("idle");
    };

    const resolvedPath = resolvePath(pathTemplate, metadata, config);

    const allFieldsComplete = [...volumeFields, ...extraFields].every(
        (f) => metadata[f.key]?.trim() !== ""
    );

    const handleCreateDirectory = async () => {
        setIsCreating(true);
        setStatus("idle");
        setErrorMessage("");

        try {
            const res = await fetch("/api/upload/databricks/mkdir", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: resolvedPath }),
            });

            if (res.ok) {
                setStatus("success");
            } else {
                const data = await res.json();
                setStatus("error");
                setErrorMessage(data.error || "Failed to create directory");
            }
        } catch (err) {
            setStatus("error");
            setErrorMessage("Network error");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <main className="page-container">
            <h1 className="title">{title}</h1>

            {/* Volume-linked metadata */}
            <section className="card">
                <h2 className="title-2">Directory Path</h2>
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

            {/* Extra fields (not volume-linked) */}
            {extraFields.length > 0 && (
                <section className="card">
                    <h2 className="title-2">Additional Info</h2>
                    <div className="grid-container">
                        {extraFields.map(({ key, label, type, options }) => {
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
                                                <option key={opt} value={opt}>{opt}</option>
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
                                        onChange={(e) => handleExtraFieldChange(key, e.target.value)}
                                        placeholder={label}
                                        className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Preview path */}
            <section className="card">
                <h2 className="title-2">Directory to Create</h2>
                <code className="block bg-gray-800 text-gray-300 p-3 rounded-lg text-sm break-all">
                    {resolvedPath || "Fill in all fields to see the path..."}
                </code>
            </section>

            {/* Status messages */}
            {status === "success" && (
                <div className="p-3 bg-green-900 border border-green-500 rounded-lg text-green-200 text-sm">
                    ✅ Directory created successfully!
                </div>
            )}
            {status === "error" && (
                <div className="p-3 bg-red-900 border border-red-500 rounded-lg text-red-200 text-sm">
                    ❌ {errorMessage}
                </div>
            )}

            <button
                onClick={handleCreateDirectory}
                disabled={!allFieldsComplete || isCreating}
                className="nav-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isCreating ? "Creating..." : "Create Directory"}
            </button>
        </main>
    );
}