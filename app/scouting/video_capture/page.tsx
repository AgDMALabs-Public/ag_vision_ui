"use client";

import { useState } from "react";
import '@/packages/styles/styles.css';
import MetadataField from "../../upload/components/MetadataField";
import { useVolumeConfig } from "../../context/VolumeConfigContext";
import { buildPathUpTo } from "../../lib/pathUtils";
import WebcamVideo from "../components/WebcamVideo";
import { WEBCAM_VIDEO_TEMPLATE } from "@/app/lib/constants";

const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season"},
    {key: "field", label: "Field"},
    {key: "location_name", label: "Location"},
    {key: "task", label: "Task"},
    {key: "protocol", label: "Protocol", staticPathSegment: "videos"},
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

export default function VideoCapturePage() {
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

    const handleVideoCapture = async (file: File) => {
        setIsSaving(true);
        setStatus("idle");
        setErrorMessage("");

        try {
            // Use a dummy filename to resolve the directory path
            const dummyResolvedPath = resolvePath(
                WEBCAM_VIDEO_TEMPLATE.replace("{noteFileName}", "dummy.webm"),
                metadata,
                config
            );

            // Extract directory portion
            const targetDir = dummyResolvedPath.substring(
                0,
                dummyResolvedPath.lastIndexOf("/")
            );

            const formData = new FormData();
            formData.append("file", file);
            formData.append("filePath", `${targetDir}/${file.name}`);

            const res = await fetch("/api/upload/databricks", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `Failed to save ${file.name}`);
            }

            setStatus("success");
            // Clear plot ID so user can select next plot
            setMetadata((prev) => ({ ...prev, plot_id: "" }));
        } catch (err: any) {
            setStatus("error");
            setErrorMessage(err.message || "Network error");
        } finally {
            setIsSaving(false);
        }
    };

    const allFieldsComplete = VOLUME_FIELDS.every(
        (f) => metadata[f.key]?.trim() !== ""
    );

    return (
        <main className="page-container">
            <h1 className="title">Video Capture</h1>
            <div className="split-container">
                <section className="card">
                    <h2 className="title-2">Select Field</h2>
                    <div className="cardGrid">
                        {VOLUME_FIELDS.map((fieldDef, index) => {
                            const { key, label, type, options, staticPathSegment } = fieldDef as any;
                            const volumePath = getPathUpTo(index);
                            const isDisabled = index > 0 && !metadata[VOLUME_FIELDS[index - 1].key];

                            if (options && options.length > 0) {
                                return (
                                    <div key={key} className="flex gap-1">
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

                {/* Right Column: Video Capture */}
                <section className="card">
                    <h2 className="title-2">Record Video</h2>

                    {!allFieldsComplete && (
                        <div className="p-3 bg-yellow-900 border border-yellow-600 rounded-lg text-yellow-200 text-sm mb-4">
                            ⚠️ Please complete the field selection to start the camera.
                        </div>
                    )}

                    <div className={!allFieldsComplete ? "opacity-50 pointer-events-none" : ""}>
                        <WebcamVideo onVideoCapture={handleVideoCapture} />
                    </div>

                    {isSaving && (
                        <div className="mt-4 p-3 bg-blue-900 border border-blue-500 rounded-lg text-blue-200 text-sm flex items-center gap-2">
                            ⏳ Uploading video to Databricks...
                        </div>
                    )}
                    {status === "success" && (
                        <div className="mt-4 p-3 bg-green-900 border border-green-500 rounded-lg text-green-200 text-sm">
                            ✅ Video uploaded successfully!
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