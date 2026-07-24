"use client";

import {useEffect, useState} from "react";
import {getBasePath} from "../../lib/basePath";
import {type FieldDef} from "../../lib/pathUtils";

interface MetadataFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    volumePath: string;
    type?: string;
    disabled?: boolean;
    listFiles?: boolean;
    staticPathSegment?: string;
    fieldDef?: FieldDef;
}

export default function MetadataField({
                                          label,
                                          value,
                                          onChange,
                                          volumePath,
                                          type,
                                          disabled = false,
                                          listFiles = false,
                                          staticPathSegment,
                                          fieldDef,
                                      }: MetadataFieldProps) {
    const [options, setOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [freeText, setFreeText] = useState(false);

    useEffect(() => {
        if (type === "date" || !volumePath || volumePath.includes("//")) return;

        setLoading(true);
        setOptions([]);
        setFreeText(false);
        onChange("");

        // Append static segment to path if provided
        const browsePath = staticPathSegment ? `${volumePath}/${staticPathSegment}` : volumePath;

        const base = getBasePath();
        // Add recursive flag and depth if field has recursiveSearch enabled
        const recursiveFlag = fieldDef?.recursiveSearch ? "&recursive=true" : "";
        const depthFlag = fieldDef?.recursiveSearchDepth ? `&depth=${fieldDef.recursiveSearchDepth}` : "";
        const url = `${base}/api/upload/databricks/list?path=${encodeURIComponent(browsePath)}${listFiles ? "&files=true" : ""}${recursiveFlag}${depthFlag}`;

        fetch(url)
            .then((r) => r.json())
            .then((data) => {
                if (data.directories && data.directories.length > 0) {
                    setOptions(data.directories);
                } else {
                    setFreeText(true);
                }
            })
            .catch(() => setFreeText(true))
            .finally(() => setLoading(false));
    }, [volumePath, type, listFiles, staticPathSegment, fieldDef?.recursiveSearch, fieldDef?.recursiveSearchDepth]);


    const handleFreeTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        // Replace spaces with underscores
        const normalizedValue = inputValue.replace(/\s+/g, "_");
        onChange(normalizedValue);
    };

    if (type === "date") {
        return (
            <div className="flex flex-col gap-1">
                <label className="caption">{label}</label>
                <input
                    type="date"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <label className="caption">{label}</label>
            {loading ? (
                <div className="bg-gray-700 rounded-lg px-3 py-2 text-gray-400 text-sm animate-pulse">
                    Loading...
                </div>
            ) : freeText ? (
                <div className="flex flex-col gap-1">
                    <input
                        type="text"
                        value={value}
                        onChange={handleFreeTextChange}
                        disabled={disabled}
                        placeholder={`Enter ${label}`}
                        className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                    />
                    <span className="text-gray-500 text-xs">Not found in volume — enter manually (spaces will be converted to underscores)</span>
                </div>
            ) : (
                <div className="flex gap-2">
                    <select
                        value={value}
                        onChange={(e) => {
                            if (e.target.value === "__freetext__") {
                                setFreeText(true);
                                onChange("");
                            } else {
                                onChange(e.target.value);
                            }
                        }}
                        disabled={disabled}
                        className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                    >
                        <option value="">Select {label}...</option>
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                        <option value="__freetext__">+ Enter manually</option>
                    </select>
                </div>
            )}
        </div>
    );
}