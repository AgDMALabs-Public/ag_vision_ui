"use client";

import { useEffect, useState } from "react";

interface MetadataFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    volumePath: string;
    type?: string;
    disabled?: boolean;
    listFiles?: boolean;
}

export default function MetadataField({
                                          label,
                                          value,
                                          onChange,
                                          volumePath,
                                          type,
                                          disabled = false,
                                          listFiles = false,
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

        const url = `/api/upload/databricks/list?path=${encodeURIComponent(volumePath)}${listFiles ? "&files=true" : ""}`;

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
    }, [volumePath, type, listFiles]);

    if (type === "date") {
        return (
            <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-sm font-medium">{label}</label>
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
            <label className="text-gray-300 text-sm font-medium">{label}</label>
            {loading ? (
                <div className="bg-gray-700 rounded-lg px-3 py-2 text-gray-400 text-sm animate-pulse">
                    Loading...
                </div>
            ) : freeText ? (
                <div className="flex flex-col gap-1">
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        placeholder={`Enter ${label}`}
                        className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                    />
                    <span className="text-gray-500 text-xs">Not found in volume — enter manually</span>
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