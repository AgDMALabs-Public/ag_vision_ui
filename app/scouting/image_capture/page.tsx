"use client";

import { useState } from "react";
import '@/packages/styles/styles.css';
import MetadataField from "../../upload/components/MetadataField";
import { useVolumeConfig } from "../../context/VolumeConfigContext";
import { buildPathUpTo } from "../../lib/pathUtils";
import WebcamCapture from "../components/WebcamCapture";
import { WEBCAM_IMAGE_TEMPLATE } from "@/app/lib/constants";

const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season"},
    {key: "field", label: "Field"},
    {key: "location_name", label: "Location"},
    {key: "task", label: "Task"},
    {key: "protocol", label: "Protocol", staticPathSegment: "images"},
    {key: "collectionDate", label: "Date of Collection", type: "date", skipInPathUpTo: true},
    {key: "plot_id", label: "Plot ID", recursiveSearch: true, recursiveSearchDepth: 1},
];

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

export default function ImageCapturePage() {
    const initialMetadata = Object.fromEntries(
        VOLUME_FIELDS.map((f) => [f.key, ""])
    );

    const [metadata, setMetadata] = useState<Record<string, string>>(initialMetadata);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const { config } = useVolumeConfig();
    const volumeRoot = `/Volumes/${config.catalog}/${config.schema}/${config.volume}`;

    function getPathUpTo(index: number): string {
        return buildPathUpTo(index, VOLUME_FIELDS as any, metadata, volumeRoot);
    }

    const handleVolumeFieldChange = (key: string, value: string) => {
        const index = VOLUME_FIELDS.findIndex((f) => f.key === key);
        const reset: Record<string, string> = {};
        VOLUME_FIELDS.slice(index + 1).forEach((f) => {
            reset[f.key] = "";
        });
        setMetadata((prev) => ({ ...prev, ...reset, [key]: value }));
        setStatus("idle");
    };

    const handlePhotosCapture = async (files: File[]) => {
        setIsSaving(true);
        setStatus("idle");
        setErrorMessage("");

        try {
            // Use a dummy filename just to resolve the directory path based on the template
            const dummyResolvedPath = resolvePath(
                WEBCAM_IMAGE_TEMPLATE.replace("{noteFileName}", "dummy.jpg"),
                metadata,
                config
            );

            // Extract just the directory portion
            const targetDir = dummyResolvedPath.substring(
                0,
                dummyResolvedPath.lastIndexOf("/")
            );

            // Upload each captured photo
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);

                // Save them in an "images" subfolder inside the plot's directory
                formData.append(
                    "filePath",
                    `${targetDir}/${file.name}`
                );

                const res = await fetch("/api/upload/databricks", {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || `Failed to save ${file.name}`);
                }
            }

            setStatus("success");
            // Clear only the plot ID field so the user can easily select the next plot
            setMetadata((prev) => ({ ...prev, plot_id: "" }));
        } catch (err: any) {
            setStatus("error");
            setErrorMessage(err.message || "Network error");
        } finally {
            setIsSaving(false);
        }
    };

    // Require all metadata fields to be filled before allowing camera uploads
    const allFieldsComplete = VOLUME_FIELDS.every(
        (f) => metadata[f.key]?.trim() !== ""
    );

    return (
        <main className="page-container flex flex-col min-h-screen">
            <h1 className="title mb-6">Image Capture</h1>

            {/* Container mapping columns side-by-side on wide screens, stacked on small */}
            <div className="flex flex-col lg:flex-row gap-6 items-start w-full">

                {/* Left Column: Field Selection */}
                <section className="card flex-1 w-full lg:w-1/2 shrink-0">
                    <h2 className="title-2 mb-4">Select Field</h2>
                    <div className="gridContainer">
                        {VOLUME_FIELDS.map((fieldDef, index) => {
                            const { key, label, type, options, staticPathSegment } = fieldDef as any;
                            const volumePath = getPathUpTo(index);
                            const isDisabled = index > 0 && !metadata[VOLUME_FIELDS[index - 1].key];

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
                                            {options.map((opt: string) => (
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
                                    staticPathSegment={staticPathSegment}
                                    fieldDef={fieldDef as any}
                                />
                            );
                        })}
                    </div>
                </section>

                {/* Right Column: Camera View */}
                <section className="card flex-1 w-full lg:w-1/2 shrink-0">
                    <h2 className="title-2 mb-4">Capture Photos</h2>

                    {!allFieldsComplete && (
                        <div className="p-3 bg-yellow-900 border border-yellow-600 rounded-lg text-yellow-200 text-sm mb-4">
                            ⚠️ Please complete the field selection to start the camera.
                        </div>
                    )}

                    {/* Disable the camera UI entirely if fields are missing */}
                    <div className={!allFieldsComplete ? "opacity-50 pointer-events-none" : ""}>
                        <WebcamCapture onPhotosCapture={handlePhotosCapture} />
                    </div>

                    {isSaving && (
                        <div className="mt-4 p-3 bg-blue-900 border border-blue-500 rounded-lg text-blue-200 text-sm flex items-center gap-2">
                            ⏳ Uploading photos to Databricks...
                        </div>
                    )}
                    {status === "success" && (
                        <div className="mt-4 p-3 bg-green-900 border border-green-500 rounded-lg text-green-200 text-sm">
                            ✅ Photos uploaded successfully!
                        </div>
                    )}
                    {status === "error" && (
                        <div className="mt-4 p-3 bg-red-900 border border-red-500 rounded-lg text-red-200 text-sm">
                            ❌ {errorMessage}
                        </div>
                    )}
                </section>

            </div>
        </main>
    );
}