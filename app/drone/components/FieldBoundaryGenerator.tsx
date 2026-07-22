"use client";

import { useState } from "react";
import { useVolumeConfig } from "../../context/VolumeConfigContext";
import MetadataField from "../../upload/components/MetadataField";
import { FieldDrawer } from "./fieldTool";

const PATH_TEMPLATE =
    "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location}/drone/{missionName}/{flightDate}/orthomosaic/{orthoName}/{cameraType}/{fileName}";

const LOCATION_TEMPLATE =
    "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location}/drone/{missionName}/field_data/location_boundary.geojson";


const FIELDS = [
    { key: "project"     , label: "Project"      , listFiles: false },
    { key: "site"        , label: "Site"         , listFiles: false },
    { key: "trial"       , label: "Trial"        , listFiles: false },
    { key: "season"      , label: "Season"       , listFiles: false },
    { key: "field"       , label: "Field"        , listFiles: false },
    { key: "location"    , label: "Location"     , listFiles: false },
    { key: "missionName" , label: "Mission Name" , listFiles: false },
    { key: "flightDate"  , label: "Flight Date"  , listFiles: false },
    { key: "orthoName"   , label: "Ortho Name"   , listFiles: false },
    { key: "cameraType"  , label: "Camera Type"  , listFiles: false },
    { key: "fileName"    , label: "File Name"    , listFiles: true  },
];

function buildPathForField(
    index: number,
    metadata: Record<string, string>,
    volumeRoot: string
): string {
    const m = metadata;
    const paths: Record<number, string> = {
        0:  volumeRoot,
        1:  `${volumeRoot}/${m.project}`,
        2:  `${volumeRoot}/${m.project}/${m.site}`,
        3:  `${volumeRoot}/${m.project}/${m.site}/${m.trial}`,
        4:  `${volumeRoot}/${m.project}/${m.site}/${m.trial}/${m.season}`,
        5:  `${volumeRoot}/${m.project}/${m.site}/${m.trial}/${m.season}/${m.field}`,
        6:  `${volumeRoot}/${m.project}/${m.site}/${m.trial}/${m.season}/${m.field}/${m.location}/drone`,
        7:  `${volumeRoot}/${m.project}/${m.site}/${m.trial}/${m.season}/${m.field}/${m.location}/drone/${m.missionName}`,
        8:  `${volumeRoot}/${m.project}/${m.site}/${m.trial}/${m.season}/${m.field}/${m.location}/drone/${m.missionName}/${m.flightDate}/orthomosaic`,
        9:  `${volumeRoot}/${m.project}/${m.site}/${m.trial}/${m.season}/${m.field}/${m.location}/drone/${m.missionName}/${m.flightDate}/orthomosaic/${m.orthoName}`,
        10: `${volumeRoot}/${m.project}/${m.site}/${m.trial}/${m.season}/${m.field}/${m.location}/drone/${m.missionName}/${m.flightDate}/orthomosaic/${m.orthoName}/${m.cameraType}`,
    };

    const path = paths[index];
    if (!path) return "";
    return path.includes("//") || path.endsWith("/") ? "" : path;
}

export default function FieldBoundaryGenerator() {
    const { config, isConfigured } = useVolumeConfig();
    const volumeRoot = `/Volumes/${config.catalog}/${config.schema}/${config.volume}`;

    const [metadata, setMetadata] = useState<Record<string, string>>(
        Object.fromEntries(FIELDS.map((f) => [f.key, ""]))
    );
    const [showDrawer, setShowDrawer] = useState(false);
    const [savedPath, setSavedPath] = useState<string | null>(null);

    const handleChange = (key: string, value: string) => {
        const index = FIELDS.findIndex((f) => f.key === key);
        const reset = Object.fromEntries(FIELDS.slice(index + 1).map((f) => [f.key, ""]));
        setMetadata((prev) => ({ ...prev, ...reset, [key]: value }));
        setShowDrawer(false);
    };

    const allSelected = FIELDS.every((f) => metadata[f.key]);

    const resolvedPath = allSelected
        ? PATH_TEMPLATE.replace(/\{(\w+)\}/g, (_, key) => {
            if (key === "catalog") return config.catalog;
            if (key === "schema")  return config.schema;
            if (key === "volume")  return config.volume;
            return metadata[key] ?? "";
        })
        : null;

    const fieldPath = allSelected
        ? LOCATION_TEMPLATE.replace(/\{(\w+)\}/g, (_, key) => {
            if (key === "catalog") return config.catalog;
            if (key === "schema")  return config.schema;
            if (key === "volume")  return config.volume;
            return metadata[key] ?? "";
        })
        : null;

    if (!isConfigured) {
        return (
            <p className="text-yellow-400 text-sm">
                Volume config not set. Please configure it in Settings first.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-3xl">
            <section className="w-full bg-gray-800 rounded-2xl p-8">
                <h2 className="text-2xl font-semibold text-white mb-6">Select Drone Flight</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {FIELDS.map((field, index) => (
                        <MetadataField
                            key={field.key}
                            label={field.label}
                            value={metadata[field.key]}
                            onChange={(val) => handleChange(field.key, val)}
                            volumePath={buildPathForField(index, metadata, volumeRoot)}
                            disabled={index > 0 && !metadata[FIELDS[index - 1].key]}
                            listFiles={field.listFiles}
                        />
                    ))}
                </div>
            </section>

            {resolvedPath && (
                <section className="w-full bg-gray-800 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-2">Resolved Path</h2>
                    <p className="text-green-400 text-sm font-mono break-all">{fieldPath}</p>
                </section>
            )}

            {savedPath && (
                <p className="text-green-400 text-sm text-center">
                    ✓ Boundaries saved for <span className="font-mono">{savedPath}</span>
                </p>
            )}

            {!showDrawer && (
                <button
                    disabled={!allSelected}
                    onClick={() => setShowDrawer(true)}
                    className="nav-button disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Generate Field Boundary
                </button>
            )}

            {showDrawer && resolvedPath && fieldPath && (
                <section className="w-full bg-gray-800 rounded-2xl p-6">
                    <h2 className="text-2xl font-semibold text-white mb-4">Draw Plot Boundaries</h2>
                    <FieldDrawer
                        orthoInfoUrl={`/api/drone/ortho-info?path=${encodeURIComponent(resolvedPath)}`}
                        saveUrl={`/api/field/field_boundary?path=${encodeURIComponent(fieldPath)}`}
                        onSaved={() => {
                            setShowDrawer(false);
                            setSavedPath(fieldPath);
                        }}
                        onCancel={() => setShowDrawer(false)}
                    />
                </section>
            )}
        </div>
    );
}