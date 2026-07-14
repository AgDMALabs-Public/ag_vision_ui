// app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useVolumeConfig } from "../context/VolumeConfigContext";

export default function SettingsPage() {
    const { config, setConfig } = useVolumeConfig();
    const [form, setForm] = useState(config);
    const [saved, setSaved] = useState(false);

    useEffect(() => { setForm(config); }, [config]);

    const handleSave = () => {
        setConfig(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-start gap-8 bg-gray-950 py-12 px-4">
            <h1 className="text-4xl font-bold text-white">Settings</h1>

            <section className="w-full max-w-xl bg-gray-800 rounded-2xl p-8 flex flex-col gap-6">
                <h2 className="text-2xl font-semibold text-white">Volume Configuration</h2>
                <p className="text-gray-400 text-sm">
                    Set the Databricks Unity Catalog target for uploads. This is saved locally in your browser.
                </p>

                {(["catalog", "schema", "volume"] as const).map((field) => (
                    <div key={field} className="flex flex-col gap-1">
                        <label className="text-gray-300 text-sm font-medium capitalize">{field}</label>
                        <input
                            type="text"
                            value={form[field]}
                            onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                            placeholder={`Enter ${field} name`}
                            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                ))}

                <button
                    onClick={handleSave}
                    disabled={!form.catalog || !form.schema || !form.volume}
                    className="nav-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saved ? "✓ Saved!" : "Save Settings"}
                </button>
            </section>
        </main>
    );
}